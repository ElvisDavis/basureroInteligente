import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class AutomaticCameraScreen extends StatefulWidget {
  const AutomaticCameraScreen({super.key});

  @override
  State<AutomaticCameraScreen> createState() => _AutomaticCameraScreenState();
}

class _AutomaticCameraScreenState extends State<AutomaticCameraScreen> {
  CameraController? _controller;
  Timer? _countdownTimer;

  int _countdown = 3;
  bool _isInitializing = true;
  bool _isCapturing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();

      if (cameras.isEmpty) {
        throw CameraException(
          'NO_CAMERA',
          'No se encontró una cámara disponible.',
        );
      }

      final frontCameras = cameras.where(
        (camera) => camera.lensDirection == CameraLensDirection.front,
      );
      if (frontCameras.isEmpty) {
        throw CameraException(
          'NO_FRONT_CAMERA',
          'No se encontro una camara frontal dis´pnoble',
        );
      }
      final camera = frontCameras.first;

      final controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await controller.initialize();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _isInitializing = false;
      });

      _startCountdown();
    } on CameraException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isInitializing = false;
        _errorMessage = _cameraErrorMessage(error);
      });
    } on Object {
      if (!mounted) {
        return;
      }

      setState(() {
        _isInitializing = false;
        _errorMessage = 'No fue posible iniciar la cámara.';
      });
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();

    setState(() {
      _countdown = 3;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      if (_countdown <= 1) {
        timer.cancel();
        _captureAutomatically();
        return;
      }

      setState(() {
        _countdown--;
      });
    });
  }

  Future<void> _captureAutomatically() async {
    final controller = _controller;

    if (controller == null ||
        !controller.value.isInitialized ||
        controller.value.isTakingPicture ||
        _isCapturing) {
      return;
    }

    setState(() {
      _isCapturing = true;
      _countdown = 0;
    });

    try {
      final image = await controller.takePicture();

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop<XFile>(image);
    } on CameraException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isCapturing = false;
        _errorMessage = _cameraErrorMessage(error);
      });
    } on Object {
      if (!mounted) {
        return;
      }

      setState(() {
        _isCapturing = false;
        _errorMessage = 'No fue posible capturar la imagen.';
      });
    }
  }

  void _retry() {
    setState(() {
      _errorMessage = null;
      _isCapturing = false;
    });

    _startCountdown();
  }

  String _cameraErrorMessage(CameraException error) {
    switch (error.code) {
      case 'CameraAccessDenied':
      case 'cameraPermission':
        return 'Debes permitir el acceso a la cámara.';
      case 'CameraAccessDeniedWithoutPrompt':
        return 'El permiso de cámara está bloqueado. '
            'Habilítalo desde la configuración del navegador.';
      case 'CameraAccessRestricted':
        return 'El acceso a la cámara está restringido.';
      case 'NO_CAMERA':
        return 'No se encontró una cámara disponible.';
      default:
        return error.description ?? 'No fue posible utilizar la cámara.';
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text(
          'Captura automática',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: SafeArea(child: _buildContent()),
    );
  }

  Widget _buildContent() {
    if (_isInitializing) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.lime),
            SizedBox(height: 18),
            Text('Preparando cámara...', style: TextStyle(color: Colors.white)),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                color: Colors.white,
                size: 68,
              ),
              const SizedBox(height: 20),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                icon: const Icon(Icons.arrow_back_rounded),
                label: const Text('Volver'),
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
              ),
              if (_controller?.value.isInitialized ?? false) ...[
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _retry,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Intentar otra vez'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    final controller = _controller;

    if (controller == null || !controller.value.isInitialized) {
      return const Center(
        child: Text(
          'Cámara no disponible.',
          style: TextStyle(color: Colors.white),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        Center(
          child: AspectRatio(
            aspectRatio: controller.value.aspectRatio,
            child: CameraPreview(controller),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(painter: _CameraFramePainter()),
          ),
        ),
        Positioned(
          top: 26,
          left: 24,
          right: 24,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.62),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Text(
              'Centra un solo residuo dentro del marco',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        Center(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: _isCapturing
                ? const CircularProgressIndicator(
                    key: ValueKey('capturing'),
                    color: AppColors.lime,
                    strokeWidth: 5,
                  )
                : Container(
                    key: ValueKey(_countdown),
                    width: 94,
                    height: 94,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.68),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.lime, width: 4),
                    ),
                    child: Text(
                      '$_countdown',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 46,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
          ),
        ),
        Positioned(
          left: 24,
          right: 24,
          bottom: 28,
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isCapturing
                      ? null
                      : () {
                          Navigator.of(context).pop();
                        },
                  icon: const Icon(Icons.close_rounded),
                  label: const Text('Cancelar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    disabledForegroundColor: Colors.white54,
                    side: const BorderSide(color: Colors.white70),
                    minimumSize: const Size.fromHeight(52),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _isCapturing ? null : _captureAutomatically,
                  icon: const Icon(Icons.camera_alt_rounded),
                  label: const Text('Capturar ahora'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CameraFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final frameWidth = size.width > 620 ? 520.0 : size.width * 0.78;
    final frameHeight = frameWidth * 0.78;

    final frame = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: frameWidth,
      height: frameHeight,
    );

    final overlayPaint = Paint()..color = Colors.black.withValues(alpha: 0.28);

    final overlay = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(RRect.fromRectAndRadius(frame, const Radius.circular(28)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(overlay, overlayPaint);

    final borderPaint = Paint()
      ..color = AppColors.lime
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    canvas.drawRRect(
      RRect.fromRectAndRadius(frame, const Radius.circular(28)),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CameraFramePainter oldDelegate) {
    return false;
  }
}
