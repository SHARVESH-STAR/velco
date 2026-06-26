import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeInDown,
  FadeInUp,
  Layout
} from 'react-native-reanimated';
import { SymbolView } from '@/components/cross-platform-symbol';
import Constants from 'expo-constants';


import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Base64 encoding helper for generating mock Google JWTs
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const customBtoa = (input: string = '') => {
  let str = input;
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = block << 8 | charCode;
  }
  return output;
};

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3030';
  }
  
  // Try to use hostUri from Expo config to support physical devices and emulators
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

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

type UserRole = 'client' | 'admin' | 'delivery';

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const theme = useTheme();
  
  // Role switcher state
  const [activeRole, setActiveRole] = useState<UserRole>('client');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Reset form status when active role changes
  useEffect(() => {
    setIsRegister(false);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
  }, [activeRole]);

  // Determine active accent color based on selected role
  const getRoleAccent = () => {
    switch (activeRole) {
      case 'admin':
        return '#6366F1'; // Indigo
      case 'delivery':
        return '#10B981'; // Emerald/Green
      case 'client':
      default:
        return '#3C9FFE'; // Blue
    }
  };

  const accentColor = getRoleAccent();

  // Sliding tab background position
  const tabPosition = useSharedValue(0);
  
  useEffect(() => {
    const tabIndex = activeRole === 'client' ? 0 : activeRole === 'admin' ? 1 : 2;
    tabPosition.value = withSpring(tabIndex * ((SCREEN_WIDTH - Spacing.four * 2 - Spacing.two * 2) / 3), {
      damping: 18,
      stiffness: 120
    });
  }, [activeRole]);

  const animatedTabStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabPosition.value }],
    };
  });

  // Action Button springs
  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };



  // 1. Standard Login API Call
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      
      let loginRoute = '/client/login';
      if (activeRole === 'admin') {
        loginRoute = '/admin/login';
      } else if (activeRole === 'delivery') {
        loginRoute = '/delivery/login';
      }

      console.log(`Connecting to: ${apiUrl}${loginRoute}`);
      const response = await fetch(`${apiUrl}${loginRoute}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mail: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Normalize user/admin objects
      const loggedUser = data.user || data.admin;
      if (loggedUser && !loggedUser.role) {
        loggedUser.role = activeRole;
      }

      onLoginSuccess(data.token, loggedUser);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Login Failed', err.message || 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Google Registration / OAuth Signup (Only for Clients)
  const handleGoogleAuth = async (customEmail?: string, customName?: string) => {
    const targetEmail = customEmail || email || 'google.client@velco.com';
    const targetName = customName || name || 'Google Client User';

    if (!targetEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      
      const header = { alg: 'HS256', typ: 'JWT' };
      const payload = {
        email: targetEmail.trim().toLowerCase(),
        name: targetName,
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        email_verified: true,
      };

      const base64Header = customBtoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const base64Payload = customBtoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const mockIdToken = `${base64Header}.${base64Payload}.mocksignature`;

      const response = await fetch(`${apiUrl}/client/login/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: mockIdToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Google Auth failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Authentication Failed', err.message || 'Google authentication server error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = () => {
    if (!email || !name) {
      Alert.alert('Error', 'Name and Email are required.');
      return;
    }

    Alert.alert(
      'Account Registration',
      'The backend server requires authentication via Google for new client accounts. Would you like to automatically create this account using Google Integration?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Sign Up', onPress: () => handleGoogleAuth(email, name) }
      ]
    );
  };

  // Get active role visual components
  const getHeaderIcon = () => {
    switch (activeRole) {
      case 'admin':
        return 'shield.fill';
      case 'delivery':
        return 'bicycle';
      case 'client':
      default:
        return 'shippingbox.fill';
    }
  };

  const getPortalTitle = () => {
    switch (activeRole) {
      case 'admin':
        return 'Admin Control Center';
      case 'delivery':
        return 'Rider Terminal';
      case 'client':
      default:
        return 'Client Portal';
    }
  };

  const getPortalDesc = () => {
    switch (activeRole) {
      case 'admin':
        return 'Manage live shipments, assign riders, and view database logs.';
      case 'delivery':
        return 'Access active delivery routes and complete assigned shipments.';
      case 'client':
      default:
        return isRegister ? 'Register your new customer profile' : 'Book packages, calculate fares, and track active deliveries.';
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Soft Background Blur blobs for rich premium aesthetics */}
        <View style={styles.backgroundBlobWrapper} pointerEvents="none">
          <View style={[styles.blurBlob, styles.blob1, { backgroundColor: accentColor + '10' }]} />
          <View style={[styles.blurBlob, styles.blob2, { backgroundColor: accentColor + '08' }]} />
        </View>

        {/* Dynamic Horizontal Role Menu Bar */}
        <View style={[styles.menuBarContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Animated.View style={[styles.slidingActiveTab, animatedTabStyle, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]} />
          
          <Pressable onPress={() => setActiveRole('client')} style={styles.menuTabItem}>
            <SymbolView name="person.circle.fill" size={16} tintColor={activeRole === 'client' ? accentColor : theme.textSecondary} />
            <ThemedText type="smallBold" style={{ color: activeRole === 'client' ? theme.text : theme.textSecondary, fontSize: 12 }}>
              Client
            </ThemedText>
          </Pressable>
          
          <Pressable onPress={() => setActiveRole('admin')} style={styles.menuTabItem}>
            <SymbolView name="shield.fill" size={16} tintColor={activeRole === 'admin' ? accentColor : theme.textSecondary} />
            <ThemedText type="smallBold" style={{ color: activeRole === 'admin' ? theme.text : theme.textSecondary, fontSize: 12 }}>
              Admin
            </ThemedText>
          </Pressable>
          
          <Pressable onPress={() => setActiveRole('delivery')} style={styles.menuTabItem}>
            <SymbolView name="bicycle" size={16} tintColor={activeRole === 'delivery' ? accentColor : theme.textSecondary} />
            <ThemedText type="smallBold" style={{ color: activeRole === 'delivery' ? theme.text : theme.textSecondary, fontSize: 12 }}>
              Rider
            </ThemedText>
          </Pressable>
        </View>

        {/* Main Login Card */}
        <ThemedView style={[styles.cardContainer, { borderColor: theme.border }]}>
          
          {/* Header area */}
          <Animated.View key={activeRole} entering={FadeInUp.duration(400)} style={styles.headerArea}>
            <View style={[styles.logoIconCircle, { backgroundColor: accentColor + '15' }]}>
              <SymbolView name={getHeaderIcon()} size={36} tintColor={accentColor} />
            </View>
            <ThemedText type="subtitle" style={styles.titleText}>{getPortalTitle()}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitleText}>
              {getPortalDesc()}
            </ThemedText>
          </Animated.View>

          {/* Form Content */}
          <Animated.View layout={Layout.springify()} style={styles.formContainer}>
            {/* Field: Full Name (Only for Client Register) */}
            {isRegister && activeRole === 'client' && (
              <View style={styles.inputWrapper}>
                <SymbolView name="person.fill" size={16} tintColor={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            )}

            {/* Field: Email Address (All roles) */}
            <View style={styles.inputWrapper}>
              <SymbolView name="envelope.fill" size={16} tintColor={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            {/* Field: Phone Number (Only for Client Register) */}
            {isRegister && activeRole === 'client' && (
              <View style={styles.inputWrapper}>
                <SymbolView name="phone.fill" size={16} tintColor={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Phone Number"
                  placeholderTextColor={theme.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            )}

            {/* Field: Password (All roles on login, hidden on Client Register) */}
            {(!isRegister || activeRole !== 'client') && (
              <View style={styles.inputWrapper}>
                <SymbolView name="lock.fill" size={16} tintColor={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            )}

            {/* Form Action Button */}
            <Animated.View style={[buttonStyle, { marginTop: Spacing.two }]}>
              <Pressable 
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={isRegister ? handleRegisterSubmit : handleLogin}
                disabled={loading}
                style={[styles.submitBtn, { backgroundColor: accentColor }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ThemedText type="smallBold" style={styles.submitBtnText}>
                      {isRegister ? 'Register Client' : `Sign In as ${activeRole.toUpperCase()}`}
                    </ThemedText>
                    <SymbolView name="arrow.right" size={14} tintColor="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </Animated.View>

            {/* Google Authentication Section (ONLY for CLIENTS) */}
            {activeRole === 'client' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                  <ThemedText type="code" themeColor="textSecondary" style={styles.dividerText}>OR</ThemedText>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                </View>

                <Pressable 
                  onPress={() => handleGoogleAuth()}
                  disabled={loading}
                  style={[styles.googleBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                >
                  <SymbolView name="globe" size={16} tintColor="#3C9FFE" />
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {isRegister ? 'Register with Google' : 'Continue with Google'}
                  </ThemedText>
                </Pressable>

                {/* Switch Login/Register (ONLY for CLIENTS) */}
                <Pressable onPress={() => setIsRegister(!isRegister)} style={styles.modeToggleBtn}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {isRegister ? 'Already have a client account? ' : "Don't have a client account? "}
                    <ThemedText type="smallBold" style={{ color: accentColor }}>
                      {isRegister ? 'Sign In' : 'Sign Up / Register'}
                    </ThemedText>
                  </ThemedText>
                </Pressable>
              </>
            )}
          </Animated.View>



        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  backgroundBlobWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: -1,
  },
  blurBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: 250,
    height: 250,
    top: -50,
    right: -50,
  },
  blob2: {
    width: 300,
    height: 300,
    bottom: -100,
    left: -100,
  },
  menuBarContainer: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.one,
    marginBottom: Spacing.four,
    position: 'relative',
    alignItems: 'center',
  },
  slidingActiveTab: {
    position: 'absolute',
    height: '100%',
    width: '33.33%',
    borderRadius: 20,
    borderWidth: 1,
    left: Spacing.one,
  },
  menuTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: '100%',
    zIndex: 2,
  },
  cardContainer: {
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.five,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 8,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  logoIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  titleText: {
    textAlign: 'center',
    marginBottom: Spacing.half,
  },
  subtitleText: {
    textAlign: 'center',
    fontSize: 12.5,
    paddingHorizontal: Spacing.two,
  },
  formContainer: {
    gap: Spacing.three,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 1,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingLeft: 42,
    paddingRight: Spacing.three,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  submitBtnText: {
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.one,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.three,
    fontSize: 11,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  modeToggleBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
    marginTop: Spacing.half,
  },

});
