import React from 'react';
import { Platform } from 'react-native';
import { SymbolView as ExpoSymbolView } from 'expo-symbols';
import { 
  Ionicons, 
  MaterialCommunityIcons, 
  FontAwesome5, 
  Feather 
} from '@expo/vector-icons';

type IconFamily = 'ionicons' | 'mci' | 'fa5' | 'feather';

interface IconConfig {
  family: IconFamily;
  name: string;
}

const symbolFallbackMap: Record<string, IconConfig> = {
  'house.fill': { family: 'ionicons', name: 'home' },
  'house': { family: 'ionicons', name: 'home-outline' },
  'doc.text.fill': { family: 'ionicons', name: 'document-text' },
  'doc.text': { family: 'ionicons', name: 'document-text-outline' },
  'person.crop.circle.fill': { family: 'ionicons', name: 'person-circle' },
  'person.crop.circle': { family: 'ionicons', name: 'person-circle-outline' },
  'safari.fill': { family: 'ionicons', name: 'compass' },
  'safari': { family: 'ionicons', name: 'compass-outline' },
  'chevron.left': { family: 'ionicons', name: 'chevron-back' },
  'chevron.down': { family: 'ionicons', name: 'chevron-down' },
  'chevron.up': { family: 'ionicons', name: 'chevron-up' },
  'person.fill': { family: 'ionicons', name: 'person' },
  'person': { family: 'ionicons', name: 'person-outline' },
  'arrow.right.circle.fill': { family: 'ionicons', name: 'arrow-forward-circle' },
  'doc.plaintext': { family: 'ionicons', name: 'document-text-outline' },
  'arrow.up.left.and.arrow.down.right': { family: 'ionicons', name: 'expand' },
  'exclamationmark.octagon.fill': { family: 'ionicons', name: 'alert-circle' },
  'xmark.circle.fill': { family: 'ionicons', name: 'close-circle' },
  'location.fill': { family: 'ionicons', name: 'location' },
  'map.fill': { family: 'ionicons', name: 'map' },
  'mappin.and.ellipse': { family: 'ionicons', name: 'pin' },
  'arrow.triangle.turn.up.right.diamond.fill': { family: 'ionicons', name: 'navigate' },
  'shippingbox.fill': { family: 'ionicons', name: 'cube' },
  'scalemass.fill': { family: 'mci', name: 'weight-kilogram' },
  'camera.fill': { family: 'ionicons', name: 'camera' },
  'trash.fill': { family: 'ionicons', name: 'trash' },
  'shield.fill': { family: 'ionicons', name: 'shield' },
  'bolt.fill': { family: 'ionicons', name: 'flash' },
  'arrow.right': { family: 'ionicons', name: 'arrow-forward' },
  'xmark': { family: 'ionicons', name: 'close' },
  'checkmark.seal.fill': { family: 'ionicons', name: 'checkmark-circle' },
  'exclamationmark.triangle.fill': { family: 'ionicons', name: 'warning' },
  'person.circle.fill': { family: 'ionicons', name: 'person-circle' },
  'bicycle': { family: 'ionicons', name: 'bicycle' },
  'envelope.fill': { family: 'ionicons', name: 'mail' },
  'phone.fill': { family: 'ionicons', name: 'call' },
  'lock.fill': { family: 'ionicons', name: 'lock-closed' },
  'globe': { family: 'ionicons', name: 'globe-outline' },
};

interface PlatformNames {
  ios?: any;
  android?: string;
  web?: string;
}

interface CrossPlatformSymbolProps {
  name: string | PlatformNames;
  size?: number;
  tintColor?: string;
  style?: any;
}

export function SymbolView({ name, size = 24, tintColor, style }: CrossPlatformSymbolProps) {
  // Handle platform name objects (e.g. { ios: '...', android: '...', web: '...' })
  if (typeof name === 'object') {
    if (Platform.OS === 'ios') {
      return <ExpoSymbolView name={name.ios} size={size} tintColor={tintColor} style={style} />;
    }
    const resolvedName = Platform.OS === 'web' 
      ? (name.web || name.android || '') 
      : (name.android || name.web || '');
    
    // Fallback to MaterialCommunityIcons for custom platform names as they use standard material naming conventions
    return <MaterialCommunityIcons name={resolvedName as any} size={size} color={tintColor} style={style} />;
  }

  // Handle standard SF Symbol string name
  if (Platform.OS === 'ios') {
    return <ExpoSymbolView name={name as any} size={size} tintColor={tintColor} style={style} />;
  }

  // Fallback to cross-platform vector icon set on Android/Web
  const config = symbolFallbackMap[name];
  if (!config) {
    return <Ionicons name="help-circle-outline" size={size} color={tintColor} style={style} />;
  }

  switch (config.family) {
    case 'mci':
      return <MaterialCommunityIcons name={config.name as any} size={size} color={tintColor} style={style} />;
    case 'fa5':
      return <FontAwesome5 name={config.name} size={size} color={tintColor} style={style} />;
    case 'feather':
      return <Feather name={config.name as any} size={size} color={tintColor} style={style} />;
    case 'ionicons':
    default:
      return <Ionicons name={config.name as any} size={size} color={tintColor} style={style} />;
  }
}
