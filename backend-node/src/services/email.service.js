/**
 * Envío de correos de verificación mediante Gmail.
 */

import nodemailer from "nodemailer";

import { env } from "../config/env.js";

/**
 * Cliente SMTP reutilizable.
 *
 * La contraseña utilizada es una contraseña de aplicación,
 * nunca la contraseña normal de Gmail.
 */
const transportador = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Evita insertar caracteres HTML procedentes del usuario.
 */
function escaparHtml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Comprueba las credenciales y la conexión con Gmail.
 */
export async function verificarConexionCorreo() {
  await transportador.verify();

  return {
    connected: true,
    provider: "gmail",
    sender: env.SMTP_USER,
  };
}

/**
 * Envía el código de verificación.
 */
export async function enviarCodigoVerificacion({ email, name, code }) {
  const nombreSeguro = escaparHtml(name);

  const minutos = env.EMAIL_VERIFICATION_EXPIRES_MINUTES;

  const asunto = `${code} es tu código de verificación de SmartBin`;

  const texto = [
    `Hola ${name},`,
    "",
    "Gracias por registrarte en SmartBin.",
    "",
    `Tu código de verificación es: ${code}`,
    "",
    `El código caduca en ${minutos} minutos.`,
    "",
    "Si no realizaste este registro, ignora este mensaje.",
  ].join("\n");

  const html = `
        <!doctype html>
        <html lang="es">
            <head>
                <meta charset="utf-8">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                >
                <title>Verificación SmartBin</title>
            </head>

            <body
                style="
                    margin: 0;
                    padding: 24px;
                    background: #f2faf6;
                    font-family: Arial, sans-serif;
                    color: #102e26;
                "
            >
                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                >
                    <tr>
                        <td align="center">
                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"
                                style="
                                    max-width: 560px;
                                    background: #ffffff;
                                    border-radius: 24px;
                                    overflow: hidden;
                                    border: 1px solid #dcece4;
                                "
                            >
                                <tr>
                                    <td
                                        style="
                                            padding: 28px;
                                            background: #003d32;
                                            color: #ffffff;
                                            text-align: center;
                                        "
                                    >
                                        <div
                                            style="
                                                font-size: 28px;
                                                font-weight: 800;
                                            "
                                        >
                                            SmartBin
                                        </div>

                                        <div
                                            style="
                                                margin-top: 6px;
                                                color: #b7f52a;
                                            "
                                        >
                                            Recicla de forma inteligente
                                        </div>
                                    </td>
                                </tr>

                                <tr>
                                    <td
                                        style="
                                            padding: 32px;
                                            text-align: center;
                                        "
                                    >
                                        <h1
                                            style="
                                                margin: 0 0 16px;
                                                font-size: 24px;
                                            "
                                        >
                                            Verifica tu correo
                                        </h1>

                                        <p
                                            style="
                                                margin: 0 0 24px;
                                                line-height: 1.6;
                                                color: #587069;
                                            "
                                        >
                                            Hola ${nombreSeguro}.
                                            Utiliza este código para
                                            completar tu registro:
                                        </p>

                                        <div
                                            style="
                                                display: inline-block;
                                                padding: 18px 28px;
                                                border-radius: 16px;
                                                background: #ddf7ea;
                                                color: #003d32;
                                                font-size: 36px;
                                                font-weight: 900;
                                                letter-spacing: 8px;
                                            "
                                        >
                                            ${code}
                                        </div>

                                        <p
                                            style="
                                                margin: 24px 0 0;
                                                color: #587069;
                                                line-height: 1.6;
                                            "
                                        >
                                            El código caduca en
                                            ${minutos} minutos.
                                        </p>

                                        <p
                                            style="
                                                margin: 18px 0 0;
                                                color: #587069;
                                                font-size: 13px;
                                            "
                                        >
                                            Si no realizaste este registro,
                                            puedes ignorar este mensaje.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;

  const resultado = await transportador.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_USER}>`,

    to: email,

    subject: asunto,

    text: texto,

    html,
  });

  return {
    accepted: resultado.accepted,

    rejected: resultado.rejected,

    messageId: resultado.messageId,
  };
}
