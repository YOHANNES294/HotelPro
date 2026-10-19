import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/auth-context';
import { SyncProvider } from '../src/context/sync-context';
import { Colors } from '../src/constants/theme';
import { View, Text, TouchableOpacity } from 'react-native';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: Colors.danger, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
        HotelPro Error
      </Text>
      <Text style={{ color: Colors.text, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <TouchableOpacity
        onPress={retry}
        style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
              contentStyle: { backgroundColor: Colors.background },
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
