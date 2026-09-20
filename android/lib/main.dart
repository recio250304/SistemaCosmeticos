import 'package:flutter/material.dart';

import 'screens/login/pantalla_login.dart';

void main() {
  runApp(
    const SistemaCosmeticosApp(),
  );
}

class SistemaCosmeticosApp
    extends StatelessWidget {
  const SistemaCosmeticosApp({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title:
          'Sistema de Cosméticos',
      debugShowCheckedModeBanner:
          false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed:
            const Color.fromARGB(
          255,
          127,
          76,
          216,
        ),
      ),
      home:
          const PantallaLogin(),
    );
  }
}