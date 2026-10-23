import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants.dart';
import 'core/theme.dart';
import 'data/services/api_service.dart';
import 'data/services/storage_service.dart';
import 'providers/auth_provider.dart';
import 'providers/sync_provider.dart';
import 'ui/screens/login_screen.dart';
import 'ui/screens/main_scaffold.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storageService = await StorageService.getInstance();
  final apiService = ApiService(storageService);

  runApp(
    MultiProvider(
      providers: [
        Provider<StorageService>.value(value: storageService),
        Provider<ApiService>.value(value: apiService),
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(apiService, storageService),
        ),
        ChangeNotifierProvider<SyncProvider>(
          create: (_) => SyncProvider(apiService, storageService),
        ),
      ],
      child: const HotelProApp(),
    ),
  );
}

class HotelProApp extends StatelessWidget {
  const HotelProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.hotel_rounded, size: 54, color: AppColors.primary),
              SizedBox(height: 16),
              CircularProgressIndicator(color: AppColors.primary),
            ],
          ),
        ),
      );
    }

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    return const MainScaffold();
  }
}
