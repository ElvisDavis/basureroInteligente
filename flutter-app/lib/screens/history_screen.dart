import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final _apiService = ApiService();

  late Future<Map<String, dynamic>> _depositsFuture;

  @override
  void initState() {
    super.initState();

    _depositsFuture = _apiService.getDeposits();
  }

  Future<void> _refresh() async {
    setState(() {
      _depositsFuture = _apiService.getDeposits();
    });

    await _depositsFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Historial',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: SafeArea(
        child: FutureBuilder<Map<String, dynamic>>(
          future: _depositsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              return _HistoryError(
                message: snapshot.error.toString(),
                onRetry: _refresh,
              );
            }

            final response = snapshot.data ?? <String, dynamic>{};

            final rawDeposits = response['deposits'];

            final deposits = rawDeposits is List
                ? rawDeposits.whereType<Map<String, dynamic>>().toList()
                : <Map<String, dynamic>>[];

            if (deposits.isEmpty) {
              return _EmptyHistory(onRefresh: _refresh);
            }

            return Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 820),
                child: RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
                    itemCount: deposits.length + 1,
                    separatorBuilder: (context, index) {
                      return const SizedBox(height: 14);
                    },
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return _HistoryHeader(
                          count: deposits.length,
                          totalPoints: _totalPoints(deposits),
                        );
                      }

                      return _DepositCard(deposit: deposits[index - 1]);
                    },
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  int _totalPoints(List<Map<String, dynamic>> deposits) {
    return deposits.fold<int>(0, (total, deposit) {
      final points = deposit['points'];

      if (points is int) {
        return total + points;
      }

      if (points is num) {
        return total + points.toInt();
      }

      return total;
    });
  }
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader({required this.count, required this.totalPoints});

  final int count;
  final int totalPoints;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.forest,
        borderRadius: BorderRadius.circular(26),
      ),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: const BoxDecoration(
              color: AppColors.lime,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.history_rounded,
              color: AppColors.forest,
              size: 32,
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tu impacto',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$count depósitos '
                  'registrados',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$totalPoints',
                style: const TextStyle(
                  color: AppColors.lime,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const Text('puntos', style: TextStyle(color: Colors.white70)),
            ],
          ),
        ],
      ),
    );
  }
}

class _DepositCard extends StatelessWidget {
  const _DepositCard({required this.deposit});

  final Map<String, dynamic> deposit;

  @override
  Widget build(BuildContext context) {
    final wasteClass = deposit['wasteClass']?.toString() ?? 'unknown';

    final status = deposit['status']?.toString() ?? 'PENDING';

    final points = _numberValue(deposit['points']).toInt();

    final confidence = _numberValue(deposit['confidence']);

    final createdAt = _formatDate(deposit['createdAt']?.toString());

    final statusInfo = _statusInformation(status);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFDCECE4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFDDF7EA),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(
              _wasteIcon(wasteClass),
              color: AppColors.primary,
              size: 30,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _translateClass(wasteClass),
                        style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    _StatusBadge(
                      label: statusInfo.label,
                      color: statusInfo.color,
                      icon: statusInfo.icon,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  createdAt,
                  style: const TextStyle(color: AppColors.mutedText),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 18,
                  runSpacing: 8,
                  children: [
                    _DepositInformation(
                      icon: Icons.analytics_outlined,
                      value: '${(confidence * 100).toStringAsFixed(1)} %',
                    ),
                    _DepositInformation(
                      icon: Icons.eco_outlined,
                      value: '$points puntos',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static num _numberValue(Object? value) {
    if (value is num) {
      return value;
    }

    return 0;
  }

  static String _formatDate(String? value) {
    if (value == null) {
      return 'Fecha no disponible';
    }

    final date = DateTime.tryParse(value);

    if (date == null) {
      return 'Fecha no disponible';
    }

    final local = date.toLocal();

    final day = local.day.toString().padLeft(2, '0');

    final month = local.month.toString().padLeft(2, '0');

    final hour = local.hour.toString().padLeft(2, '0');

    final minute = local.minute.toString().padLeft(2, '0');

    return '$day/$month/${local.year} '
        '$hour:$minute';
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

    return translations[value] ?? 'Residuo';
  }

  static IconData _wasteIcon(String value) {
    switch (value) {
      case 'glass':
        return Icons.wine_bar_rounded;

      case 'metal':
        return Icons.recycling_rounded;

      case 'paper':
      case 'cardboard':
        return Icons.description_rounded;

      case 'plastic':
        return Icons.local_drink_rounded;

      default:
        return Icons.delete_rounded;
    }
  }

  static _StatusInformation _statusInformation(String status) {
    switch (status) {
      case 'CONFIRMED':
        return const _StatusInformation(
          label: 'Confirmado',
          color: AppColors.primary,
          icon: Icons.check_circle_rounded,
        );

      case 'FAILED':
        return const _StatusInformation(
          label: 'Fallido',
          color: AppColors.error,
          icon: Icons.error_rounded,
        );

      case 'CANCELLED':
        return const _StatusInformation(
          label: 'Cancelado',
          color: AppColors.mutedText,
          icon: Icons.cancel_rounded,
        );

      default:
        return const _StatusInformation(
          label: 'Pendiente',
          color: Color(0xFFE09200),
          icon: Icons.schedule_rounded,
        );
    }
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.color,
    required this.icon,
  });

  final String label;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(50),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 15),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _DepositInformation extends StatelessWidget {
  const _DepositInformation({required this.icon, required this.value});

  final IconData icon;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppColors.mutedText, size: 17),
        const SizedBox(width: 6),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.mutedText,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _StatusInformation {
  const _StatusInformation({
    required this.label,
    required this.color,
    required this.icon,
  });

  final String label;
  final Color color;
  final IconData icon;
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          const SizedBox(height: 100),
          Image.asset(
            'assets/branding/'
            'smartbin_illustration.png',
            height: 190,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 24),
          const Text(
            'Todavía no tienes depósitos',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.text,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Clasifica tu primer residuo '
            'para comenzar a generar '
            'un impacto positivo.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.mutedText, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _HistoryError extends StatelessWidget {
  const _HistoryError({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              color: AppColors.error,
              size: 52,
            ),
            const SizedBox(height: 14),
            const Text(
              'No pudimos cargar '
              'el historial',
              style: TextStyle(
                color: AppColors.text,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.mutedText),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
