import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, TextInput, Pressable, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeInRight,
  FadeInLeft,
  LayoutAnimationConfig
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ClientHome() {
  const theme = useTheme();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [selectedType, setSelectedType] = useState<'document' | 'package' | 'pallet'>('package');

  // Button interaction springs
  const requestScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: requestScale.value }],
    };
  });

  const handleRequest = () => {
    requestScale.value = withSpring(0.95, {}, (finished) => {
      if (finished) {
        requestScale.value = withSpring(1);
      }
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Client Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">Good morning,</ThemedText>
          <ThemedText type="subtitle">Jane Doe</ThemedText>
        </View>
        <ThemedView type="backgroundElement" style={styles.avatar}>
          <SymbolView
            name={{ ios: 'person.fill', android: 'person', web: 'person' }}
            size={18}
            tintColor={theme.text}
          />
        </ThemedView>
      </View>

      {/* Dynamic Active Tracker Widget */}
      <Animated.View entering={FadeInLeft.duration(500)} style={styles.trackerWidget}>
        <ThemedView type="backgroundElement" style={styles.trackerContainer}>
          <View style={styles.trackerHeader}>
            <View style={styles.trackerBadge}>
              <ThemedText type="code" style={styles.trackerBadgeText}>ON THE WAY</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">ETA: 4:30 PM</ThemedText>
          </View>
          
          <ThemedText type="smallBold" style={styles.shipmentId}>Doc shipment #VLC-9801</ThemedText>
          
          {/* Visual Progress Steps */}
          <View style={styles.progressRow}>
            <View style={styles.progressLineOuter}>
              <View style={[styles.progressLineInner, { width: '65%' }]} />
            </View>
            <View style={styles.nodesContainer}>
              <View style={[styles.progressNode, styles.activeNode]} />
              <View style={[styles.progressNode, styles.activeNode]} />
              <View style={styles.progressNode} />
            </View>
          </View>
          
          <View style={styles.nodeLabels}>
            <ThemedText type="code" style={styles.nodeLabelText}>Picked Up</ThemedText>
            <ThemedText type="code" style={[styles.nodeLabelText, styles.activeLabelText]}>Sorting</ThemedText>
            <ThemedText type="code" style={styles.nodeLabelText}>Delivered</ThemedText>
          </View>
        </ThemedView>
      </Animated.View>

      {/* Delivery Request Panel */}
      <ThemedText type="smallBold" style={styles.sectionTitle}>Request a Delivery</ThemedText>
      
      <ThemedView type="backgroundElement" style={styles.requestForm}>
        {/* Input Locations */}
        <View style={styles.inputContainer}>
          <SymbolView name={{ ios: 'circle.fill', android: 'lens', web: 'lens' }} size={12} tintColor="#3C9FFE" />
          <TextInput
            placeholder="Pickup Address"
            placeholderTextColor={theme.textSecondary}
            value={pickup}
            onChangeText={setPickup}
            style={[styles.textInput, { color: theme.text }]}
          />
        </View>

        <View style={styles.lineConnector} />

        <View style={styles.inputContainer}>
          <SymbolView name={{ ios: 'mappin.circle.fill', android: 'place', web: 'place' }} size={14} tintColor="#FF3B30" />
          <TextInput
            placeholder="Drop-off Address"
            placeholderTextColor={theme.textSecondary}
            value={dropoff}
            onChangeText={setDropoff}
            style={[styles.textInput, { color: theme.text }]}
          />
        </View>

        <View style={styles.divider} />

        {/* Package Category Selector */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.formLabel}>Package Type</ThemedText>
        <View style={styles.selectorGrid}>
          <Pressable 
            onPress={() => setSelectedType('document')}
            style={[
              styles.selectorItem, 
              selectedType === 'document' && styles.selectorItemSelected
            ]}
          >
            <SymbolView name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }} size={16} tintColor={selectedType === 'document' ? '#FFFFFF' : '#3C9FFE'} />
            <ThemedText type="code" style={[styles.selectorText, selectedType === 'document' && { color: '#FFFFFF' }]}>Letter</ThemedText>
          </Pressable>

          <Pressable 
            onPress={() => setSelectedType('package')}
            style={[
              styles.selectorItem, 
              selectedType === 'package' && styles.selectorItemSelected
            ]}
          >
            <SymbolView name={{ ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' }} size={16} tintColor={selectedType === 'package' ? '#FFFFFF' : '#3C9FFE'} />
            <ThemedText type="code" style={[styles.selectorText, selectedType === 'package' && { color: '#FFFFFF' }]}>Parcel</ThemedText>
          </Pressable>

          <Pressable 
            onPress={() => setSelectedType('pallet')}
            style={[
              styles.selectorItem, 
              selectedType === 'pallet' && styles.selectorItemSelected
            ]}
          >
            <SymbolView name={{ ios: 'truck.box.fill', android: 'local_shipping', web: 'local_shipping' }} size={16} tintColor={selectedType === 'pallet' ? '#FFFFFF' : '#3C9FFE'} />
            <ThemedText type="code" style={[styles.selectorText, selectedType === 'pallet' && { color: '#FFFFFF' }]}>Freight</ThemedText>
          </Pressable>
        </View>

        {/* Action Button */}
        <Animated.View style={[buttonStyle, { marginTop: Spacing.four }]}>
          <Pressable onPress={handleRequest} style={styles.submitButton}>
            <ThemedText type="smallBold" style={styles.submitText}>Calculate Price & Book</ThemedText>
            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={16} tintColor="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackerWidget: {
    marginBottom: Spacing.four,
  },
  trackerContainer: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3C9FFE30',
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  trackerBadge: {
    backgroundColor: '#3C9FFE15',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 6,
  },
  trackerBadgeText: {
    color: '#3C9FFE',
    fontSize: 9,
    fontWeight: '700',
  },
  shipmentId: {
    marginBottom: Spacing.three,
  },
  progressRow: {
    height: 12,
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  progressLineOuter: {
    height: 3,
    backgroundColor: '#88888820',
    width: '100%',
    borderRadius: 1.5,
  },
  progressLineInner: {
    height: 3,
    backgroundColor: '#3C9FFE',
    borderRadius: 1.5,
  },
  nodesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.one,
  },
  progressNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CCCCCC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activeNode: {
    backgroundColor: '#3C9FFE',
  },
  nodeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nodeLabelText: {
    fontSize: 10,
    color: '#888888',
  },
  activeLabelText: {
    color: '#3C9FFE',
    fontWeight: '700',
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  requestForm: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  lineConnector: {
    width: 1.5,
    height: Spacing.three,
    backgroundColor: '#88888830',
    marginLeft: 5,
    marginVertical: -Spacing.one,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'web' ? 8 : 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#88888830',
    marginVertical: Spacing.one,
  },
  formLabel: {
    fontSize: 12,
    marginBottom: Spacing.half,
  },
  selectorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  selectorItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#3C9FFE10',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectorItemSelected: {
    backgroundColor: '#3C9FFE',
    borderColor: '#0274DF',
  },
  selectorText: {
    fontSize: 11,
    color: '#3C9FFE',
  },
  submitButton: {
    backgroundColor: '#3C9FFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  submitText: {
    color: '#FFFFFF',
  },
});
