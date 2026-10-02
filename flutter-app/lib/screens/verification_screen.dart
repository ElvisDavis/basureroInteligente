import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key, required this.email});

  final String email;

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  final _apiService = ApiService();

  bool _isVerifying = false;
  bool _isResending = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid || _isVerifying) {
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      _isVerifying = true;
    });

    try {
      await _apiService.verifyEmail(
        email: widget.email,
        code: _codeController.text,
      );

      if (!mounted) {
        return;
      }

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return AlertDialog(
            icon: const Icon(
              Icons.verified_rounded,
              color: AppColors.emerald,
              size: 52,
            ),
            title: const Text('Correo verificado'),
            content: const Text(
              'Tu cuenta está lista. Ya puedes iniciar sesión.',
              textAlign: TextAlign.center,
            ),
            actions: [
              FilledButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                },
                child: const Text('Continuar'),
              ),
            ],
          );
        },
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).popUntil((route) => route.isFirst);
    } on ApiException catch (error) {
      if (mounted) {
        _showMessage(error.message, isError: true);
      }
    } on Object {
      if (mounted) {
        _showMessage('Ocurrió un error inesperado.', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  Future<void> _resend() async {
    if (_isResending) {
      return;
    }

    setState(() {
      _isResending = true;
    });

    try {
      await _apiService.resendVerification(email: widget.email);

      if (!mounted) {
        return;
      }

      _showMessage('Enviamos un código nuevo a tu correo.', isError: false);
    } on ApiException catch (error) {
      if (mounted) {
        _showMessage(error.message, isError: true);
      }
    } on Object {
      if (mounted) {
        _showMessage('Ocurrió un error inesperado.', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isResending = false;
        });
      }
    }
  }

  void _showMessage(String message, {required bool isError}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: isError ? AppColors.error : AppColors.forest,
          content: Row(
            children: [
              Icon(
                isError
                    ? Icons.error_outline_rounded
                    : Icons.check_circle_outline_rounded,
                color: Colors.white,
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      );
  }

  String _maskedEmail() {
    final parts = widget.email.split('@');

    if (parts.length != 2) {
      return widget.email;
    }

    final localPart = parts.first;
    final visibleCharacters = localPart.length >= 2
        ? localPart.substring(0, 2)
        : localPart;

    return '$visibleCharacters***@${parts.last}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Verificar correo',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Card(
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                  side: const BorderSide(color: Color(0xFFDCECE4)),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(28, 32, 28, 30),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const _VerificationIcon(),
                        const SizedBox(height: 24),
                        const Text(
                          'Revisa tu correo',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.text,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.8,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Enviamos un código de seis dígitos a\n'
                          '${_maskedEmail()}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.mutedText,
                            fontSize: 15,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 28),
                        TextFormField(
                          controller: _codeController,
                          autofocus: true,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.done,
                          textAlign: TextAlign.center,
                          maxLength: 6,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          onFieldSubmitted: (_) {
                            _verify();
                          },
                          style: const TextStyle(
                            color: AppColors.forest,
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 10,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Código de verificación',
                            hintText: '000000',
                            counterText: '',
                            prefixIcon: Icon(Icons.password_rounded),
                          ),
                          validator: (value) {
                            final code = value?.trim() ?? '';

                            if (code.length != 6) {
                              return 'Ingresa los seis dígitos.';
                            }

                            return null;
                          },
                        ),
                        const SizedBox(height: 22),
                        FilledButton.icon(
                          onPressed: _isVerifying ? null : _verify,
                          icon: _isVerifying
                              ? const SizedBox.square(
                                  dimension: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.verified_user_rounded),
                          label: Text(
                            _isVerifying
                                ? 'Verificando...'
                                : 'Verificar cuenta',
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextButton.icon(
                          onPressed: _isResending ? null : _resend,
                          icon: _isResending
                              ? const SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.refresh_rounded),
                          label: Text(
                            _isResending ? 'Enviando...' : 'Reenviar código',
                          ),
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'El código tiene una duración limitada. '
                          'Si caducó, solicita uno nuevo.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.mutedText,
                            fontSize: 13,
                            height: 1.4,
                          ),
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
    );
  }
}

class _VerificationIcon extends StatelessWidget {
  const _VerificationIcon();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 92,
        height: 92,
        decoration: const BoxDecoration(
          color: Color(0xFFD9F7E9),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.mark_email_read_rounded,
          color: AppColors.primary,
          size: 48,
        ),
      ),
    );
  }
}
