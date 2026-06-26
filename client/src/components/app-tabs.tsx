import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from './cross-platform-symbol';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import ClientHome from '@/ui/client';
import ClientOrders from '@/ui/client/orders';
import ClientProfile from '@/ui/client/profile';
import AdminDashboard from '@/ui/admin';
import AdminOrders from '@/ui/admin/orders';
import DeliveryPortal from '@/ui/delivery';
import LoginScreen from '@/ui/auth/login';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function AppTabs() {
  const theme = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'explore' | 'profile'>('home');

  const handleLoginSuccess = (newToken: string, loggedInUser: any) => {
    setToken(newToken);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab('home');
  };

  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Render dashboard based on role
  const renderDashboard = () => {
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') {
      return <AdminDashboard />;
    } else if (role === 'delivery') {
      return <DeliveryPortal token={token} user={user} />;
    } else {
      return <ClientHome token={token} user={user} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {activeTab === 'home' && renderDashboard()}
        {activeTab === 'orders' && <ClientOrders token={token} user={user} />}
        {activeTab === 'explore' && (
          (user && (user.role || '').toLowerCase() === 'admin') ? (
            <AdminOrders token={token} user={user} />
          ) : (
            <View style={styles.centerContainer}>
              <SymbolView name="safari" size={48} tintColor={theme.primary} />
              <ThemedText type="subtitle" style={{ marginTop: Spacing.two }}>Explore Services</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ marginTop: Spacing.one }}>Explore the logistics options & features.</ThemedText>
            </View>
          )
        )}
        {activeTab === 'profile' && (
          <ClientProfile 
            user={user} 
            setUser={setUser} 
            token={token} 
            onLogout={handleLogout} 
          />
        )}
      </View>

      {/* Navigation Tabs */}
      <ThemedView type="backgroundElement" style={[styles.tabBar, { borderTopColor: theme.border }]}>
        <Pressable onPress={() => setActiveTab('home')} style={styles.tabItem}>
          <SymbolView name="house.fill" size={28} tintColor={activeTab === 'home' ? theme.primary : theme.textSecondary} />
          <ThemedText type="code" style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'home' ? theme.primary : theme.textSecondary }}>Home</ThemedText>
        </Pressable>
        {user && (user.role || '').toLowerCase() === 'client' && (
          <Pressable onPress={() => setActiveTab('orders')} style={styles.tabItem}>
            <SymbolView name="doc.text.fill" size={28} tintColor={activeTab === 'orders' ? theme.primary : theme.textSecondary} />
            <ThemedText type="code" style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'orders' ? theme.primary : theme.textSecondary }}>Orders</ThemedText>
          </Pressable>
        )}
        {user && (user.role || '').toLowerCase() !== 'client' && (
          <Pressable onPress={() => setActiveTab('explore')} style={styles.tabItem}>
            <SymbolView 
              name={(user.role || '').toLowerCase() === 'admin' ? 'doc.text.fill' : 'safari.fill'} 
              size={28} 
              tintColor={activeTab === 'explore' ? theme.primary : theme.textSecondary} 
            />
            <ThemedText type="code" style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'explore' ? theme.primary : theme.textSecondary }}>
              {(user.role || '').toLowerCase() === 'admin' ? 'Orders' : 'Explore'}
            </ThemedText>
          </Pressable>
        )}
        <Pressable onPress={() => setActiveTab('profile')} style={styles.tabItem}>
          <SymbolView name="person.crop.circle.fill" size={28} tintColor={activeTab === 'profile' ? theme.primary : theme.textSecondary} />
          <ThemedText type="code" style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'profile' ? theme.primary : theme.textSecondary }}>Profile</ThemedText>
        </Pressable>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  logoutButton: {
    marginTop: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.two,
  },
  tabBar: {
    flexDirection: 'row',
    height: 88,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Spacing.three,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    gap: Spacing.half,
  },
});
