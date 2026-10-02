// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smartbin_app/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('muestra la pantalla de inicio de sesión', (tester) async {
    await tester.pumpWidget(const SmartBinApp());
    await tester.pumpAndSettle();

    expect(find.text('Iniciar sesión'), findsOneWidget);
    expect(find.text('¿No tienes una cuenta? Regístrate'), findsOneWidget);
    expect(find.text('Verificar mi correo'), findsOneWidget);
  });

  testWidgets('permite abrir la pantalla de registro', (tester) async {
    await tester.pumpWidget(const SmartBinApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('¿No tienes una cuenta? Regístrate'));

    await tester.pumpAndSettle();

    expect(find.text('Únete a SmartBin'), findsOneWidget);
    expect(find.text('Nombre completo'), findsOneWidget);
    expect(find.text('Correo electrónico'), findsOneWidget);
    expect(find.text('Confirmar contraseña'), findsOneWidget);
  });
}
