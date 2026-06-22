import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/player_screen.dart';

void main() {
  // Ensure Flutter engine bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();
  
  runApp(
    ChangeNotifierProvider(
      create: (context) => ApiService(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();

    return MaterialApp(
      title: 'VPLAY Stream',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark, // Default Dark mode (Netflix-style)
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A0A0C),
        primaryColor: Colors.red,
        colorScheme: const ColorScheme.dark(
          primary: Colors.red,
          secondary: Colors.purpleAccent,
          background: Color(0xFF0A0A0C),
          surface: Color(0xFF121217),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF121217),
          elevation: 0,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Colors.white),
          bodyMedium: TextStyle(color: Color(0xFFA0A0AB)),
        ),
      ),
      // Initial route based on authentication state
      initialRoute: api.isAuthenticated ? '/dashboard' : '/login',
      onGenerateRoute: (settings) {
        if (settings.name == '/watch') {
          final videoId = settings.arguments as String;
          return MaterialPageRoute(
            builder: (context) => PlayerScreen(videoId: videoId),
          );
        }
        return null;
      },
      routes: {
        '/login': (context) => const LoginScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/profile': (context) => const ProfileScreen(),
      },
    );
  }
}
