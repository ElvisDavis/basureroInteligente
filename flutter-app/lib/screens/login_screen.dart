import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';
import 'register_screen.dart';
import 'verification_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onAuthenticated});

  final VoidCallback onAuthenticated;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  final _emailController = TextEditingController();

  final _passwordController = TextEditingController();

  final _apiService = ApiService();

  bool _isLoading = false;
  bool _hidePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();

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

    try {
      await _apiService.login(
        email: _emailController.text,
        password: _passwordController.text,
      );

      if (!mounted) {
        return;
      }

      widget.onAuthenticated();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }

      _showError(error.message);
    } on Object {
      if (!mounted) {
        return;
      }

      _showError('Ocurrió un error inesperado.');
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(32),
                  side: const BorderSide(color: Color(0xFFDCECE4)),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(28, 28, 28, 32),
                  child: AutofillGroup(
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildBrand(),
                          const SizedBox(height: 30),
                          _buildEmailField(),
                          const SizedBox(height: 16),
                          _buildPasswordField(),
                          const SizedBox(height: 24),
                          _buildLoginButton(),
                          const SizedBox(height: 10),
                          TextButton(
                            onPressed: _isLoading
                                ? null
                                : () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) => const RegisterScreen(),
                                      ),
                                    );
                                  },
                            child: const Text(
                              '¿No tienes una cuenta? Regístrate',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _isLoading
                                ? null
                                : () {
                                    final email = _emailController.text.trim();

                                    if (email.isEmpty ||
                                        !email.contains('@') ||
                                        !email.contains('.')) {
                                      _showError(
                                        'Ingresa primero tu correo electrónico.',
                                      );
                                      return;
                                    }

                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) =>
                                            VerificationScreen(email: email),
                                      ),
                                    );
                                  },
                            icon: const Icon(Icons.mark_email_read_outlined),
                            label: const Text(
                              'Verificar mi correo',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(height: 14),

                          const _EcologyMessage(),
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

  Widget _buildBrand() {
    return Column(
      children: [
        Image.asset(
          'assets/branding/'
          'smartbin_logo.png',
          height: 132,
          fit: BoxFit.contain,
          semanticLabel: 'Logotipo de SmartBin',
          errorBuilder: (context, error, stackTrace) {
            return const Icon(
              Icons.eco_rounded,
              color: AppColors.emerald,
              size: 100,
            );
          },
        ),
        const SizedBox(height: 18),
        const Text(
          'AllpaVision',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.forest,
            fontSize: 34,
            fontWeight: FontWeight.w900,
            letterSpacing: -1.2,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Recicla de forma inteligente',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.mutedText,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
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

        if (email.isEmpty) {
          return 'Ingresa tu correo.';
        }

        if (!email.contains('@') || !email.contains('.')) {
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
      textInputAction: TextInputAction.done,
      autofillHints: const [AutofillHints.password],
      onFieldSubmitted: (_) {
        _submit();
      },
      decoration: InputDecoration(
        labelText: 'Contraseña',
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
        if ((value ?? '').isEmpty) {
          return 'Ingresa tu contraseña.';
        }

        return null;
      },
    );
  }

  Widget _buildLoginButton() {
    return FilledButton.icon(
      onPressed: _isLoading ? null : _submit,
      icon: _isLoading
          ? const SizedBox.square(
              dimension: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : const Icon(Icons.login_rounded),
      label: Text(_isLoading ? 'Ingresando...' : 'Iniciar sesión'),
    );
  }
}

class _EcologyMessage extends StatelessWidget {
  const _EcologyMessage();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.eco_outlined, color: AppColors.emerald, size: 18),
        SizedBox(width: 8),
        Flexible(
          child: Text(
            'Cada residuo cuenta',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.mutedText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
