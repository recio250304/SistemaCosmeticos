import 'package:flutter_test/flutter_test.dart';

import 'package:android/main.dart';

void main() {
  testWidgets(
    'La aplicación inicia correctamente',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const SistemaCosmeticosApp(),
      );

      expect(
        find.text('Sistema Cosméticos'),
        findsOneWidget,
      );

      expect(
        find.text('Acceso para operadores'),
        findsOneWidget,
      );

      expect(
        find.text('Iniciar sesión'),
        findsOneWidget,
      );
    },
  );
}