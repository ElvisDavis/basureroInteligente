import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';
import 'verification_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmationController = TextEditingController();
  final _apiService = ApiService();

  bool _isLoading = false;
  bool _hidePassword = true;
  bool _hideConfirmation = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmationController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid || _isLoading) {
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      _isLoading = true;
    });

    final email = _emailController.text.trim().toLowerCase();

    try {
      await _apiService.register(
        name: _nameController.text,
        email: email,
        password: _passwordController.text,
      );

      if (!mounted) {
        return;
      }

      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => VerificationScreen(email: email),
        ),
      );
    } on ApiException catch (error) {
      if (mounted) {
        _showError(error.message);
      }
    } on Object {
      if (mounted) {
        _showError('Ocurrió un error inesperado.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Row(
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Crear cuenta',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                  side: const BorderSide(color: Color(0xFFDCECE4)),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(28, 30, 28, 32),
                  child: AutofillGroup(
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _RegisterHeader(),
                          const SizedBox(height: 28),
                          _buildNameField(),
                          const SizedBox(height: 16),
                          _buildEmailField(),
                          const SizedBox(height: 16),
                          _buildPasswordField(),
                          const SizedBox(height: 16),
                          _buildConfirmationField(),
                          const SizedBox(height: 24),
                          FilledButton.icon(
                            onPressed: _isLoading ? null : _submit,
                            icon: _isLoading
                                ? const SizedBox.square(
                                    dimension: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.person_add_rounded),
                            label: Text(
                              _isLoading ? 'Creando cuenta...' : 'Crear cuenta',
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: _isLoading
                                ? null
                                : () {
                                    Navigator.of(context).pop();
                                  },
                            child: const Text('Ya tengo una cuenta'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNameField() {
    return TextFormField(
      controller: _nameController,
      textCapitalization: TextCapitalization.words,
      textInputAction: TextInputAction.next,
      autofillHints: const [AutofillHints.name],
      decoration: const InputDecoration(
        labelText: 'Nombre completo',
        prefixIcon: Icon(Icons.person_outline_rounded),
      ),
      validator: (value) {
        final name = value?.trim() ?? '';

        if (name.length < 2) {
          return 'Ingresa tu nombre.';
        }

        return null;
      },
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      autofillHints: const [AutofillHints.email],
      decoration: const InputDecoration(
        labelText: 'Correo electrónico',
        hintText: 'usuario@correo.com',
        prefixIcon: Icon(Icons.alternate_email_rounded),
      ),
      validator: (value) {
        final email = value?.trim() ?? '';
        final validEmail = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

        if (email.isEmpty) {
          return 'Ingresa tu correo.';
        }

        if (!validEmail.hasMatch(email)) {
          return 'Ingresa un correo válido.';
        }

        return null;
      },
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: _passwordController,
      obscureText: _hidePassword,
      textInputAction: TextInputAction.next,
      autofillHints: const [AutofillHints.newPassword],
      decoration: InputDecoration(
        labelText: 'Contraseña',
        helperText: 'Mínimo 8 caracteres, mayúscula y número',
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        suffixIcon: IconButton(
          tooltip: _hidePassword ? 'Mostrar contraseña' : 'Ocultar contraseña',
          onPressed: () {
            setState(() {
              _hidePassword = !_hidePassword;
            });
          },
          icon: Icon(
            _hidePassword
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
          ),
        ),
      ),
      validator: (value) {
        final password = value ?? '';

        if (password.length < 8) {
          return 'Utiliza al menos 8 caracteres.';
        }

        if (!RegExp('[A-Z]').hasMatch(password)) {
          return 'Incluye al menos una mayúscula.';
        }

        if (!RegExp('[0-9]').hasMatch(password)) {
          return 'Incluye al menos un número.';
        }

        return null;
      },
    );
  }

  Widget _buildConfirmationField() {
    return TextFormField(
      controller: _confirmationController,
      obscureText: _hideConfirmation,
      textInputAction: TextInputAction.done,
      autofillHints: const [AutofillHints.newPassword],
      onFieldSubmitted: (_) {
        _submit();
      },
      decoration: InputDecoration(
        labelText: 'Confirmar contraseña',
        prefixIcon: const Icon(Icons.lock_reset_rounded),
        suffixIcon: IconButton(
          tooltip: _hideConfirmation
              ? 'Mostrar contraseña'
              : 'Ocultar contraseña',
          onPressed: () {
            setState(() {
              _hideConfirmation = !_hideConfirmation;
            });
          },
          icon: Icon(
            _hideConfirmation
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
          ),
        ),
      ),
      validator: (value) {
        if ((value ?? '').isEmpty) {
          return 'Confirma tu contraseña.';
        }

        if (value != _passwordController.text) {
          return 'Las contraseñas no coinciden.';
        }

        return null;
      },
    );
  }
}

class _RegisterHeader extends StatelessWidget {
  const _RegisterHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        CircleAvatar(
          radius: 43,
          backgroundColor: Color(0xFFD9F7E9),
          child: Icon(
            Icons.person_add_alt_1_rounded,
            color: AppColors.primary,
            size: 44,
          ),
        ),
        SizedBox(height: 20),
        Text(
          'Únete a SmartBin',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.text,
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.8,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'Crea tu cuenta y convierte cada residuo '
          'en un impacto positivo.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.mutedText,
            fontSize: 15,
            height: 1.4,
          ),
        ),
      ],
    );
  }
}
