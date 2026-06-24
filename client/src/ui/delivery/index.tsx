import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeInDown,
  runOnJS
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// An animated Slide to Complete button using React Native Reanimated and Responder API
function SlideButton({ onComplete }: { onComplete: () => void }) {
  const theme = useTheme();
  const [completed, setCompleted] = useState(false);
  const slideX = useSharedValue(0);
  const maxSlide = 220; // Maximum distance to slide

  const handleCompleteJS = () => {
    setCompleted(true);
    onComplete();
  };

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideX.value }],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: slideX.value + 48, // Include thumb width
    };
  });

  const onStartShouldSetResponder = () => true;
  const onResponderMove = (evt: any) => {
    if (completed) return;
    const { locationX, pageX } = evt.nativeEvent;
    // Calculate simple horizontal offset
    const currentX = Math.max(0, Math.min(maxSlide, slideX.value + evt.nativeEvent.locationX - 24));
    slideX.value = currentX;
  };

  const onResponderRelease = () => {
    if (completed) return;
    if (slideX.value >= maxSlide * 0.8) {
      slideX.value = withSpring(maxSlide);
      runOnJS(handleCompleteJS)();
    } else {
      slideX.value = withSpring(0);
    }
  };

  return (
    <View 
      style={[styles.sliderTrack, { backgroundColor: theme.backgroundElement }]}
      onStartShouldSetResponder={onStartShouldSetResponder}
      onResponderMove={onResponderMove}
      onResponderRelease={onResponderRelease}
    >
      <Animated.View style={[styles.sliderProgress, animatedProgressStyle]} />
      
      <Animated.View style={[styles.sliderThumb, animatedThumbStyle]}>
        <SymbolView 
          name={{ ios: completed ? 'checkmark' : 'chevron.right.2', android: completed ? 'check' : 'double_arrow', web: completed ? 'check' : 'double_arrow' }} 
          size={18} 
          tintColor="#FFFFFF" 
        />
      </Animated.View>
      
      <View style={styles.sliderTextContainer} pointerEvents="none">
        <ThemedText type="code" style={styles.sliderText}>
          {completed ? 'DELIVERY COMPLETED' : 'SWIPE TO COMPLETE'}
        </ThemedText>
      </View>
    </View>
  );
}

export default function DeliveryPortal() {
  const theme = useTheme();
  const [jobStatus, setJobStatus] = useState<'assigned' | 'completed'>('assigned');
  
  const refreshScale = useSharedValue(1);
  const refreshStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: refreshScale.value }]
    };
  });

  const handleReset = () => {
    refreshScale.value = withSpring(0.9, {}, (finished) => {
      if (finished) {
        refreshScale.value = withSpring(1);
        setJobStatus('assigned');
      }
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Driver Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">Active Driver:</ThemedText>
          <ThemedText type="subtitle">Rider #402</ThemedText>
        </View>
        <View style={styles.badgeOnline}>
          <View style={styles.dotOnline} />
          <ThemedText type="code" style={styles.textOnline}>ONLINE</ThemedText>
        </View>
      </View>

      {/* Driver Stats Grid */}
      <View style={styles.statsGrid}>
        <ThemedView type="backgroundElement" style={styles.statCard}>
          <ThemedText type="code" themeColor="textSecondary">Earnings</ThemedText>
          <ThemedText type="smallBold" style={styles.statValue}>$184.20</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={styles.statCard}>
          <ThemedText type="code" themeColor="textSecondary">Trips</ThemedText>
          <ThemedText type="smallBold" style={styles.statValue}>12</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={styles.statCard}>
          <ThemedText type="code" themeColor="textSecondary">Rating</ThemedText>
          <ThemedText type="smallBold" style={styles.statValue}>4.92 ★</ThemedText>
        </ThemedView>
      </View>

      {/* Active Trip Details */}
      <ThemedText type="smallBold" style={styles.sectionTitle}>Active Shipment Job</ThemedText>

      {jobStatus === 'assigned' ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.jobWrapper}>
          <ThemedView type="backgroundElement" style={styles.jobCard}>
            {/* Header info */}
            <View style={styles.jobHeader}>
              <ThemedText type="smallBold">Job ID: #VLC-9801</ThemedText>
              <ThemedText type="smallBold" style={{ color: '#4CD964' }}>+$14.50</ThemedText>
            </View>

            <View style={styles.divider} />

            {/* Steps */}
            <View style={styles.jobSteps}>
              <View style={styles.stepPoint}>
                <View style={styles.dotGreen} />
                <View style={styles.lineVertical} />
                <View>
                  <ThemedText type="code" themeColor="textSecondary">PICKUP</ThemedText>
                  <ThemedText type="smallBold">Apple Store, Union Square</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">345 Stockton St, San Francisco</ThemedText>
                </View>
              </View>

              <View style={[styles.stepPoint, { marginTop: Spacing.three }]}>
                <View style={styles.dotRed} />
                <View>
                  <ThemedText type="code" themeColor="textSecondary">DELIVER TO</ThemedText>
                  <ThemedText type="smallBold">Alice Vance</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">1482 Pine Ave, San Francisco</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Slider Action */}
            <View style={styles.sliderContainer}>
              <SlideButton onComplete={() => setJobStatus('completed')} />
            </View>
          </ThemedView>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.completedWrapper}>
          <ThemedView type="backgroundElement" style={styles.completedCard}>
            <View style={styles.iconCircle}>
              <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={48} tintColor="#4CD964" />
            </View>
            <ThemedText type="smallBold" style={{ textAlign: 'center', marginTop: Spacing.three }}>
              Job Completed Successfully!
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.one }}>
              +$14.50 has been credited to your active wallet balance.
            </ThemedText>
            
            <Animated.View style={[refreshStyle, { marginTop: Spacing.four }]}>
              <Pressable onPress={handleReset} style={styles.resetButton}>
                <ThemedText type="code" style={{ color: '#FFFFFF' }}>Get Next Ride</ThemedText>
              </Pressable>
            </Animated.View>
          </ThemedView>
        </Animated.View>
      )}
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
  badgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CD96415',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  dotOnline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CD964',
  },
  textOnline: {
    color: '#4CD964',
    fontSize: 10,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  statCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 17,
    marginTop: Spacing.half,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  jobWrapper: {
    marginBottom: Spacing.six,
  },
  jobCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#88888830',
    marginVertical: Spacing.three,
  },
  jobSteps: {
    paddingLeft: Spacing.one,
  },
  stepPoint: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CD964',
    marginTop: 6,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginTop: 6,
  },
  lineVertical: {
    position: 'absolute',
    left: 4.5,
    top: 16,
    width: 1,
    height: 38,
    backgroundColor: '#88888830',
  },
  sliderContainer: {
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  sliderTrack: {
    width: 280,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4CD96425',
  },
  sliderThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  sliderTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.5,
  },
  completedWrapper: {
    marginBottom: Spacing.six,
  },
  completedCard: {
    borderRadius: Spacing.four,
    padding: Spacing.five,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CD96415',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#3C9FFE',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
});
