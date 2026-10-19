import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../src/context/auth-context';
import { Colors } from '../../src/constants/theme';
import { getApiBaseUrl, setApiBaseUrl } from '../../src/services/api-client';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('manager@hailehotels.com');
  const [password, setPassword] = useState('Password123!');
  const [serverUrl, setServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    getApiBaseUrl().then(setServerUrl);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter email and password');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    if (showServerConfig && serverUrl) {
      await setApiBaseUrl(serverUrl.trim());
    }

    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setErrorMessage(result.error || 'Login failed');
    }
  };

  const setPresetUser = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>HotelPro</Text>
          <Text style={styles.brandSubtitle}>Mobile Operations Terminal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverToggleText}>
              {showServerConfig ? '▲ Hide Server Settings' : '▼ Server Connection Settings'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.label}>API Base URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://10.0.2.2:4000"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.helperText}>
                Android emulator uses 10.0.2.2. Real device requires LAN IP (e.g. 192.168.1.X).
              </Text>
            </View>
          )}
        </View>

        <View style={styles.presetsCard}>
          <Text style={styles.presetTitle}>Quick Role Presets</Text>
          <View style={styles.presetButtonsRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPresetUser('manager@hailehotels.com')}
            >
              <Text style={styles.presetBtnText}>Manager</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPresetUser('frontdesk@hailehotels.com')}
            >
              <Text style={styles.presetBtnText}>Front Desk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPresetUser('waiter@hailehotels.com')}
            >
              <Text style={styles.presetBtnText}>Waiter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPresetUser('chef@hailehotels.com')}
            >
              <Text style={styles.presetBtnText}>Kitchen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
  },
  serverToggle: {
    marginTop: 16,
    alignItems: 'center',
  },
  serverToggleText: {
    color: Colors.accent,
    fontSize: 12,
  },
  serverConfigBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  presetsCard: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  presetBtnText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
});
