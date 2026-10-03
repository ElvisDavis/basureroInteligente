import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';

import 'automatic_camera_screen.dart';

class ClassificationScreen extends StatefulWidget {
  const ClassificationScreen({super.key});

  @override
  State<ClassificationScreen> createState() => _ClassificationScreenState();
}

class _ClassificationScreenState extends State<ClassificationScreen> {
  final _imagePicker = ImagePicker();

  final _apiService = ApiService();

  XFile? _selectedImage;
  Uint8List? _imageBytes;

  Map<String, dynamic>? _result;

  bool _isSelecting = false;
  bool _isClassifying = false;
  bool _hasClassified = false;

  Future<void> _selectImage(ImageSource source) async {
    if (_isSelecting || _isClassifying) {
      return;
    }

    setState(() {
      _isSelecting = true;
    });

    try {
      final image = await _imagePicker.pickImage(
        source: source,
        imageQuality: 88,
        maxWidth: 1600,
      );

      if (image == null) {
        return;
      }

      final bytes = await image.readAsBytes();

      if (!mounted) {
        return;
      }

      setState(() {
        _selectedImage = image;
        _imageBytes = bytes;
        _result = null;
        _hasClassified = false;
      });
    } on Object {
      if (!mounted) {
        return;
      }

      _showMessage(
        'No fue posible seleccionar '
        'la imagen.',
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSelecting = false;
        });
      }
    }
  }

  Future<void> _openAutomaticCamera() async {
    if (_isSelecting || _isClassifying) {
      return;
    }

    setState(() {
      _isSelecting = true;
    });

    try {
      final image = await Navigator.of(context).push<XFile>(
        MaterialPageRoute<XFile>(builder: (_) => const AutomaticCameraScreen()),
      );

      if (image == null) {
        return;
      }

      final bytes = await image.readAsBytes();

      if (!mounted) {
        return;
      }

      setState(() {
        _selectedImage = image;
        _imageBytes = bytes;
        _result = null;
        _hasClassified = false;
      });
    } on Object {
      if (!mounted) {
        return;
      }

      _showMessage('No fue posible obtener la imagen de la cámara.');
    } finally {
      if (mounted) {
        setState(() {
          _isSelecting = false;
        });
      }
    }
  }

  Future<void> _classifyImage() async {
    final image = _selectedImage;

    if (image == null || _isClassifying || _hasClassified) {
      return;
    }

    setState(() {
      _isClassifying = true;
      _result = null;
    });

    try {
      final result = await _apiService.predictImage(image);

      if (!mounted) {
        return;
      }

      setState(() {
        _result = result;
        _hasClassified = true;
      });
    } on ApiException catch (error) {
      if (mounted) {
        _showMessage(error.message);
      }
    } on Object {
      if (mounted) {
        _showMessage('Ocurrió un error inesperado.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isClassifying = false;
        });
      }
    }
  }

  void _clearImage() {
    setState(() {
      _selectedImage = null;
      _imageBytes = null;
      _result = null;
      _hasClassified = false;
    });
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Clasificar residuo',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
              children: [
                const _IntroductionCard(),
                const SizedBox(height: 20),
                if (_imageBytes == null)
                  _ImageSelector(
                    isSelecting: _isSelecting,
                    onGallery: () {
                      _selectImage(ImageSource.gallery);
                    },
                    onCamera: _openAutomaticCamera,
                  )
                else
                  _ImagePreview(
                    imageBytes: _imageBytes!,
                    imageName: _selectedImage?.name ?? 'imagen',
                    isClassifying: _isClassifying,
                    onClear: _clearImage,
                    onClassify: _classifyImage,
                    hasClassified: _hasClassified,
                  ),
                if (_isClassifying) ...[
                  const SizedBox(height: 20),
                  const _LoadingCard(),
                ],
                if (_result != null) ...[
                  const SizedBox(height: 20),
                  _PredictionResult(result: _result!),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _IntroductionCard extends StatelessWidget {
  const _IntroductionCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.forest,
        borderRadius: BorderRadius.circular(26),
      ),
      child: const Row(
        children: [
          Icon(Icons.document_scanner_rounded, color: AppColors.lime, size: 42),
          SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Escanea tu residuo',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'La inteligencia artificial '
                  'identificará el material '
                  'y abrirá el compartimento.',
                  style: TextStyle(color: Colors.white70, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageSelector extends StatelessWidget {
  const _ImageSelector({
    required this.isSelecting,
    required this.onGallery,
    required this.onCamera,
  });

  final bool isSelecting;
  final VoidCallback onGallery;
  final VoidCallback onCamera;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFDCECE4)),
      ),
      child: Column(
        children: [
          Image.asset(
            'assets/branding/'
            'smartbin_illustration.png',
            height: 190,
            fit: BoxFit.contain,
            semanticLabel: 'Basurero inteligente',
            errorBuilder: (context, error, stackTrace) {
              return const Icon(
                Icons.recycling_rounded,
                color: AppColors.emerald,
                size: 110,
              );
            },
          ),
          const SizedBox(height: 18),
          const Text(
            'Selecciona una imagen',
            style: TextStyle(
              color: AppColors.text,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Utiliza una imagen clara, '
            'centrada y con buena iluminación.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.mutedText),
          ),
          const SizedBox(height: 24),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 12,
            runSpacing: 12,
            children: [
              FilledButton.icon(
                onPressed: isSelecting ? null : onGallery,
                icon: const Icon(Icons.photo_library_rounded),
                label: const Text('Abrir galería'),
              ),
              OutlinedButton.icon(
                onPressed: isSelecting ? null : onCamera,
                icon: const Icon(Icons.camera_alt_rounded),
                label: const Text('Cámara'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(180, 54),
                ),
              ),
            ],
          ),
          if (isSelecting) ...[
            const SizedBox(height: 20),
            const CircularProgressIndicator(),
          ],
        ],
      ),
    );
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({
    required this.imageBytes,
    required this.imageName,
    required this.isClassifying,
    required this.onClear,
    required this.onClassify,
    required this.hasClassified,
  });

  final Uint8List imageBytes;
  final String imageName;
  final bool isClassifying;
  final VoidCallback onClear;
  final VoidCallback onClassify;
  final bool hasClassified;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFDCECE4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.memory(
                imageBytes,
                fit: BoxFit.cover,
                semanticLabel: 'Residuo seleccionado',
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            imageName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              IconButton.outlined(
                tooltip: 'Eliminar imagen',
                onPressed: isClassifying ? null : onClear,
                icon: const Icon(Icons.delete_outline_rounded),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: isClassifying || hasClassified ? null : onClassify,
                  icon: Icon(
                    hasClassified
                        ? Icons.check_circle_rounded
                        : Icons.auto_awesome_rounded,
                  ),
                  label: Text(
                    hasClassified
                        ? 'Residuo clasificado'
                        : 'Clasificar residuo',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFFDDF7EA),
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Row(
        children: [
          CircularProgressIndicator(),
          SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Analizando imagen',
                  style: TextStyle(
                    color: AppColors.text,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'EfficientNetB0 está '
                  'identificando el residuo.',
                  style: TextStyle(color: AppColors.mutedText),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PredictionResult extends StatelessWidget {
  const _PredictionResult({required this.result});

  final Map<String, dynamic> result;

  @override
  Widget build(BuildContext context) {
    final prediction =
        result['prediction'] as Map<String, dynamic>? ?? <String, dynamic>{};

    final deposit =
        result['deposit'] as Map<String, dynamic>? ?? <String, dynamic>{};

    final action =
        result['action'] as Map<String, dynamic>? ?? <String, dynamic>{};

    final mqtt = result['mqtt'] as Map<String, dynamic>? ?? <String, dynamic>{};

    final wasteClass = prediction['class']?.toString() ?? 'desconocido';

    final confidence = prediction['confidence_percent'] ?? 0;

    final status = deposit['status']?.toString() ?? 'PENDING';

    final shouldOpen = action['shouldOpen'] == true;

    final commandPublished = mqtt['commandPublished'] == true;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: shouldOpen ? AppColors.emerald : AppColors.error,
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: shouldOpen
                  ? const Color(0xFFDDF7EA)
                  : const Color(0xFFFFE5E5),
              shape: BoxShape.circle,
            ),
            child: Icon(
              shouldOpen ? Icons.check_rounded : Icons.close_rounded,
              color: shouldOpen ? AppColors.primary : AppColors.error,
              size: 42,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _translateClass(wasteClass),
            style: const TextStyle(
              color: AppColors.text,
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            'Confianza: $confidence %',
            style: const TextStyle(color: AppColors.mutedText, fontSize: 16),
          ),
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 12),
          _ResultRow(label: 'Estado del depósito', value: status),
          _ResultRow(
            label: 'Abrir compartimento',
            value: shouldOpen ? 'Sí' : 'No',
          ),
          _ResultRow(
            label: 'Comando MQTT',
            value: commandPublished ? 'Publicado' : 'No publicado',
          ),
          if (commandPublished) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFDDF7EA),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Row(
                children: [
                  Icon(Icons.sensors_rounded, color: AppColors.primary),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Orden enviada al '
                      'basurero inteligente. '
                      'Los puntos se acreditarán '
                      'al confirmar el depósito.',
                      style: TextStyle(color: AppColors.text, height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _translateClass(String value) {
    const translations = {
      'cardboard': 'Cartón',
      'glass': 'Vidrio',
      'metal': 'Metal',
      'paper': 'Papel',
      'plastic': 'Plástico',
      'trash': 'Basura',
    };

    return translations[value] ?? value;
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: AppColors.mutedText),
            ),
          ),
          const SizedBox(width: 16),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
