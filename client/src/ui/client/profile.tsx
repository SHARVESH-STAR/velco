import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Pressable, 
  Modal, 
  ActivityIndicator, 
  Platform
} from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeInUp 
} from 'react-native-reanimated';
import { SymbolView } from '@/components/cross-platform-symbol';
import { Image } from 'expo-image';
import Constants from 'expo-constants';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Helper to get backend URL dynamically
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3030';
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3030`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3030';
  }
  return 'http://localhost:3030';
};

interface ClientProfileProps {
  user: any;
  setUser: (user: any) => void;
  token: string | null;
  onLogout: () => void;
}

export default function ClientProfile({ user, setUser, token, onLogout }: ClientProfileProps) {
  const theme = useTheme();

  // Custom Modals
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile stats & dates
  const joinedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : 'June 24, 2026';

  useEffect(() => {
    const fetchOrderStats = async () => {
      if (!token) return;
      setLoadingOrders(true);
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/client/orders`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTotalOrders(data.length);
        }
      } catch (err) {
        console.warn("Failed to fetch order count stats:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrderStats();
  }, [token]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#030712' }]}>
      {/* Soft gradient glows */}
      <View style={styles.neonGlowRight} pointerEvents="none" />
      <View style={styles.neonGlowLeft} pointerEvents="none" />

      {/* Profile Header Area */}
      <Animated.View entering={FadeInUp.duration(400)} style={styles.profileHeaderCard}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarFrame, { borderColor: '#3C9FFE' }]}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <SymbolView name="person.fill" size={44} tintColor="#64748B" />
              </View>
            )}
          </View>
        </View>

        <ThemedText type="subtitle" style={[styles.nameText, { color: '#F8FAFC' }]}>{user?.name}</ThemedText>
        <ThemedText style={[styles.emailText, { color: '#94A3B8' }]}>{user?.mail}</ThemedText>
        
        <ThemedText type="code" style={[styles.joinedText, { color: '#64748B', marginTop: Spacing.three }]}>
          Member since {joinedDate}
        </ThemedText>
      </Animated.View>

      {/* Stats Cards Section: Only Total Orders */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.statsContainer}>
        <View style={styles.statCard}>
          {loadingOrders ? (
            <ActivityIndicator size="small" color="#3C9FFE" style={{ marginVertical: 6 }} />
          ) : (
            <ThemedText type="subtitle" style={{ color: '#3C9FFE', fontSize: 28, fontWeight: '800' }}>
              {totalOrders}
            </ThemedText>
          )}
          <ThemedText type="code" style={{ color: '#94A3B8', fontWeight: '600', marginTop: 4 }}>
            Total Orders
          </ThemedText>
        </View>
      </Animated.View>

      {/* Log Out button action only */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.menuContainer}>
        <View style={styles.dangerZoneContainer}>
          <Pressable onPress={() => setShowLogoutConfirm(true)} style={styles.outlineBtn}>
            <SymbolView name="arrow.right.circle.fill" size={16} tintColor="#F8FAFC" />
            <ThemedText type="smallBold" style={{ color: '#F8FAFC' }}>Log Out</ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      {/* ============================================================== */}
      {/* MODAL: LOGOUT CONFIRMATION */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: 300 }]}>
            <View style={[styles.iconCircleWarning, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <SymbolView name="arrow.right.circle.fill" size={28} tintColor="#F59E0B" />
            </View>
            <ThemedText type="subtitle" style={[styles.modalTitle, { textAlign: 'center', marginTop: Spacing.two, color: '#F8FAFC' }]}>
              Confirm Logout
            </ThemedText>
            <ThemedText style={{ textAlign: 'center', fontSize: 13, marginVertical: Spacing.two, color: '#94A3B8' }}>
              Are you sure you want to end your current session? You will need to log in again to manage bookings.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowLogoutConfirm(false)} style={styles.modalBtnCancel}>
                <ThemedText type="smallBold" style={{ textAlign: 'center', color: '#94A3B8' }}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={() => { setShowLogoutConfirm(false); onLogout(); }} style={[styles.modalBtnSubmit, { backgroundColor: '#FF3B30' }]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF', textAlign: 'center' }}>Logout</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  neonGlowRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(60, 159, 254, 0.08)',
    zIndex: -1,
  },
  neonGlowLeft: {
    position: 'absolute',
    top: 400,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    zIndex: -1,
  },
  profileHeaderCard: {
    alignItems: 'center',
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatarFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActionsRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -8,
    gap: Spacing.one,
  },
  miniPhotoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(60, 159, 254, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  miniPhotoBtnDanger: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  nameText: {
    fontSize: 21,
    fontWeight: '800',
  },
  emailText: {
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  metaBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  joinedText: {
    fontSize: 10.5,
    marginTop: Spacing.two,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.12)',
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  menuContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.12)',
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    overflow: 'hidden',
  },
  cardHeaderTitle: {
    fontSize: 10.5,
    letterSpacing: 0.8,
    marginVertical: Spacing.one,
    color: '#94A3B8',
    fontWeight: '700',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    height: 48,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dangerZoneContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    borderRadius: 16,
    gap: Spacing.two,
  },
  outlineBtnDanger: {
    borderColor: 'rgba(255, 59, 48, 0.15)',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.15)',
    backgroundColor: '#0F172A',
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  modalForm: {
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 11,
    marginTop: Spacing.one,
  },
  modalInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.2)',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    color: '#F1F5F9',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  passwordInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordTextInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.2)',
    borderRadius: 12,
    paddingLeft: Spacing.three,
    paddingRight: 40,
    fontSize: 14,
    color: '#F1F5F9',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    width: '100%',
  },
  eyeIconBtn: {
    position: 'absolute',
    right: Spacing.three,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  modalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnSubmit: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircleWarning: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  deleteConfirmInput: {
    height: 42,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 12,
    textAlign: 'center',
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    fontWeight: '700',
  },
  cropWindowOuter: {
    height: 220,
    width: '100%',
    backgroundColor: '#030712',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: Spacing.two,
  },
  cropPreviewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  cropOverlayCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#3C9FFE',
    borderStyle: 'dashed',
    shadowColor: '#3C9FFE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
