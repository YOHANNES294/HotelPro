import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/theme';
import { useAuth } from '../../src/context/auth-context';
import { useSync } from '../../src/context/sync-context';

function TabIcon({ label, badgeCount }: { label: string; badgeCount?: number }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconSymbol}>{label.slice(0, 2).toUpperCase()}</Text>
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const { pendingCount } = useSync();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const isKitchen = user?.role === 'CHEF' || user?.role === 'KITCHEN_STAFF';
  const isHousekeeping = user?.role === 'HOUSEKEEPING';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface, borderBottomColor: Colors.border, borderBottomWidth: 1 },
        headerTintColor: Colors.text,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarLabel: 'Dashboard',
          tabBarIcon: () => <TabIcon label="DB" />,
          href: isKitchen || isHousekeeping ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Hotel Rooms',
          tabBarLabel: 'Rooms',
          tabBarIcon: () => <TabIcon label="RM" />,
          href: isKitchen ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Table Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: () => <TabIcon label="OR" />,
          href: isHousekeeping ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'Kitchen Display',
          tabBarLabel: 'Kitchen',
          tabBarIcon: () => <TabIcon label="KD" />,
          href: isHousekeeping ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync & Shifts',
          tabBarLabel: 'Sync',
          tabBarIcon: () => <TabIcon label="SY" badgeCount={pendingCount} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  iconSymbol: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
