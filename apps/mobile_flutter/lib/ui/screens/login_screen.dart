import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/services/storage_service.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'manager@hailehotels.com');
  final _passwordController = TextEditingController(text: 'Password123!');
  final _serverUrlController = TextEditingController();

  bool _showServerConfig = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _loadServerUrl();
  }

  Future<void> _loadServerUrl() async {
    final storage = await StorageService.getInstance();
    setState(() {
      _serverUrlController.text = storage.getApiBaseUrl();
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  void _setPreset(String email) {
    setState(() {
      _emailController.text = email;
      _passwordController.text = 'Password123!';
    });
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter email and password'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    if (_showServerConfig && _serverUrlController.text.trim().isNotEmpty) {
      final storage = await StorageService.getInstance();
      await storage.setApiBaseUrl(_serverUrlController.text.trim());
    }

    final auth = context.read<AuthProvider>();
    final success = await auth.login(email, password);

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Login failed. Please check credentials.'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Branding
                  const Icon(Icons.hotel_rounded, size: 54, color: AppColors.primary),
                  const SizedBox(height: 12),
                  const Text(
                    AppConstants.appName,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    AppConstants.appTagline,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Login Card
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border, width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Sign In',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Email
                        const Text('Email Address', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.email_outlined, size: 20, color: AppColors.textMuted),
                            hintText: 'user@hotelpro.com',
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Password
                        const Text('Password', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.lock_outline, size: 20, color: AppColors.textMuted),
                            hintText: '••••••••',
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                size: 20,
                                color: AppColors.textMuted,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 22),

                        // Submit Button
                        ElevatedButton(
                          onPressed: auth.isLoading ? null : _handleLogin,
                          child: auth.isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text('Sign In'),
                        ),
                        const SizedBox(height: 16),

                        // Server config toggle
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _showServerConfig = !_showServerConfig;
                            });
                          },
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _showServerConfig ? '▲ Hide Server Settings' : '▼ Server Connection Settings',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),

                        if (_showServerConfig) ...[
                          const SizedBox(height: 14),
                          const Divider(color: AppColors.border),
                          const SizedBox(height: 10),
                          const Text('API Base URL', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _serverUrlController,
                            style: const TextStyle(fontSize: 12),
                            decoration: InputDecoration(
                              hintText: AppConstants.defaultApiUrl,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Active Cloudflare tunnel or local network endpoint',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Quick Role Presets
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border, width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Quick Role Presets',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildPresetChip('Manager', 'manager@hailehotels.com'),
                            _buildPresetChip('Front Desk', 'frontdesk@hailehotels.com'),
                            _buildPresetChip('Waiter', 'waiter@hailehotels.com'),
                            _buildPresetChip('Chef', 'chef@hailehotels.com'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPresetChip(String label, String email) {
    return ActionChip(
      backgroundColor: AppColors.surfaceLight,
      side: const BorderSide(color: AppColors.border),
      label: Text(label, style: const TextStyle(color: AppColors.text, fontSize: 12)),
      onPressed: () => _setPreset(email),
    );
  }
}
