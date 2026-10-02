/**
 * Registro, verificación de correo, login y tokens.
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../config/database.js";

import { env } from "../config/env.js";

import { enviarCodigoVerificacion } from "./email.service.js";

/**
 * Cantidad de rondas utilizadas para proteger
 * las contraseñas.
 */
const RONDAS_BCRYPT = 12;

/**
 * Campos públicos que pueden devolverse.
 */
const camposUsuarioPublico = {
  id: true,
  name: true,
  email: true,
  points: true,
  isActive: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
};

function crearError(message, statusCode, code) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

/**
 * Normaliza un correo antes de almacenarlo o buscarlo.
 */
function normalizarEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Oculta una parte del correo en las respuestas.
 */
function ocultarEmail(email) {
  const [localPart, domain] = email.split("@");

  if (!domain) {
    return email;
  }

  const inicio = localPart.slice(0, 2);

  return `${inicio}***@${domain}`;
}

/**
 * Genera un código aleatorio de seis dígitos.
 */
function generarCodigo() {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}

/**
 * Protege el código con HMAC.
 *
 * El correo se incluye para impedir que el hash de un
 * código pueda reutilizarse con otro usuario.
 */
function protegerCodigo(email, code) {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`${email}:${code}`)
    .digest("hex");
}

/**
 * Compara hashes evitando diferencias evidentes de tiempo.
 */
function hashesCoinciden(hashEsperado, hashRecibido) {
  const esperado = Buffer.from(hashEsperado, "hex");

  const recibido = Buffer.from(hashRecibido, "hex");

  if (esperado.length !== recibido.length) {
    return false;
  }

  return timingSafeEqual(esperado, recibido);
}

/**
 * Crea el código, su hash y su fecha de expiración.
 */
function crearDatosVerificacion(email) {
  const code = generarCodigo();

  const hash = protegerCodigo(email, code);

  const expiresAt = new Date(
    Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000,
  );

  return {
    code,
    hash,
    expiresAt,
  };
}

/**
 * Genera un token JWT para Flutter.
 */
function generarToken(usuario) {
  return jwt.sign(
    {
      email: usuario.email,
    },

    env.JWT_SECRET,

    {
      subject: usuario.id,

      expiresIn: env.JWT_EXPIRES_IN,

      issuer: "reciclaje-backend",

      audience: "reciclaje-flutter",
    },
  );
}

/**
 * Registra un usuario no verificado y envía el código.
 */
export async function registrarUsuario(datos) {
  const emailNormalizado = normalizarEmail(datos.email);

  const usuarioExistente = await prisma.user.findUnique({
    where: {
      email: emailNormalizado,
    },

    select: {
      id: true,
      isEmailVerified: true,
    },
  });

  if (usuarioExistente?.isEmailVerified) {
    throw crearError(
      "Ya existe un usuario registrado con este correo.",
      409,
      "EMAIL_ALREADY_REGISTERED",
    );
  }

  if (usuarioExistente) {
    throw crearError(
      "La cuenta ya existe y está pendiente de verificación.",
      409,
      "EMAIL_VERIFICATION_PENDING",
    );
  }

  const passwordHash = await bcrypt.hash(datos.password, RONDAS_BCRYPT);

  const verificacion = crearDatosVerificacion(emailNormalizado);

  let usuario;

  try {
    usuario = await prisma.user.create({
      data: {
        name: datos.name.trim(),

        email: emailNormalizado,

        passwordHash,

        isEmailVerified: false,

        emailVerificationCodeHash: verificacion.hash,

        emailVerificationExpiresAt: verificacion.expiresAt,
      },

      select: camposUsuarioPublico,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw crearError(
        "Ya existe un usuario registrado con este correo.",
        409,
        "EMAIL_ALREADY_REGISTERED",
      );
    }

    throw error;
  }

  try {
    await enviarCodigoVerificacion({
      email: usuario.email,

      name: usuario.name,

      code: verificacion.code,
    });
  } catch {
    throw crearError(
      "La cuenta fue creada, pero no fue posible enviar el código. Solicita un nuevo código.",
      503,
      "EMAIL_DELIVERY_FAILED",
    );
  }

  return {
    user: usuario,

    verificationRequired: true,

    email: ocultarEmail(usuario.email),
  };
}

/**
 * Verifica el código enviado por correo.
 */
export async function verificarCorreo(datos) {
  const emailNormalizado = normalizarEmail(datos.email);

  const usuario = await prisma.user.findUnique({
    where: {
      email: emailNormalizado,
    },
  });

  if (!usuario) {
    throw crearError(
      "El código de verificación no es válido.",
      400,
      "INVALID_VERIFICATION_CODE",
    );
  }

  if (usuario.isEmailVerified) {
    return {
      user: {
        id: usuario.id,

        name: usuario.name,

        email: usuario.email,

        points: usuario.points,

        isActive: usuario.isActive,

        isEmailVerified: true,

        createdAt: usuario.createdAt,

        updatedAt: usuario.updatedAt,
      },

      alreadyVerified: true,
    };
  }

  if (
    !usuario.emailVerificationCodeHash ||
    !usuario.emailVerificationExpiresAt
  ) {
    throw crearError(
      "El código de verificación no es válido.",
      400,
      "INVALID_VERIFICATION_CODE",
    );
  }

  if (usuario.emailVerificationExpiresAt < new Date()) {
    throw crearError(
      "El código ha caducado. Solicita uno nuevo.",
      410,
      "VERIFICATION_CODE_EXPIRED",
    );
  }

  const hashRecibido = protegerCodigo(emailNormalizado, datos.code);

  if (
    !hashesCoinciden(
      usuario.emailVerificationCodeHash,

      hashRecibido,
    )
  ) {
    throw crearError(
      "El código de verificación no es válido.",
      400,
      "INVALID_VERIFICATION_CODE",
    );
  }

  const usuarioVerificado = await prisma.user.update({
    where: {
      id: usuario.id,
    },

    data: {
      isEmailVerified: true,

      emailVerificationCodeHash: null,

      emailVerificationExpiresAt: null,
    },

    select: camposUsuarioPublico,
  });

  return {
    user: usuarioVerificado,

    alreadyVerified: false,
  };
}

/**
 * Genera y envía un código nuevo.
 */
export async function reenviarCodigo(datos) {
  const emailNormalizado = normalizarEmail(datos.email);

  const usuario = await prisma.user.findUnique({
    where: {
      email: emailNormalizado,
    },
  });

  /**
   * Respuesta genérica para no confirmar si un
   * correo desconocido está registrado.
   */
  if (!usuario) {
    return {
      sent: true,
    };
  }

  if (usuario.isEmailVerified) {
    throw crearError(
      "El correo ya fue verificado.",
      409,
      "EMAIL_ALREADY_VERIFIED",
    );
  }

  const verificacion = crearDatosVerificacion(emailNormalizado);

  await prisma.user.update({
    where: {
      id: usuario.id,
    },

    data: {
      emailVerificationCodeHash: verificacion.hash,

      emailVerificationExpiresAt: verificacion.expiresAt,
    },
  });

  try {
    await enviarCodigoVerificacion({
      email: usuario.email,

      name: usuario.name,

      code: verificacion.code,
    });
  } catch {
    throw crearError(
      "No fue posible enviar el nuevo código.",
      503,
      "EMAIL_DELIVERY_FAILED",
    );
  }

  return {
    sent: true,

    email: ocultarEmail(usuario.email),
  };
}

/**
 * Inicia sesión.
 */
export async function iniciarSesion(datos) {
  const emailNormalizado = normalizarEmail(datos.email);

  const usuario = await prisma.user.findUnique({
    where: {
      email: emailNormalizado,
    },
  });

  const credencialesInvalidas = crearError(
    "Correo o contraseña incorrectos.",
    401,
    "INVALID_CREDENTIALS",
  );

  if (!usuario) {
    throw credencialesInvalidas;
  }

  const passwordValida = await bcrypt.compare(
    datos.password,
    usuario.passwordHash,
  );

  if (!passwordValida) {
    throw credencialesInvalidas;
  }

  if (!usuario.isActive) {
    throw crearError(
      "La cuenta se encuentra desactivada.",
      403,
      "USER_DISABLED",
    );
  }

  if (!usuario.isEmailVerified) {
    throw crearError(
      "Debes verificar tu correo antes de iniciar sesión.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const usuarioPublico = {
    id: usuario.id,

    name: usuario.name,

    email: usuario.email,

    points: usuario.points,

    isActive: usuario.isActive,

    isEmailVerified: usuario.isEmailVerified,

    createdAt: usuario.createdAt,

    updatedAt: usuario.updatedAt,
  };

  return {
    user: usuarioPublico,

    token: generarToken(usuario),
  };
}
