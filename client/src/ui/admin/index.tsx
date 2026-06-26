import React, { useState } from 'react';
import { StyleSheet, ScrollView, Pressable, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeInUp,
  LayoutAnimationConfig
} from 'react-native-reanimated';
import { SymbolView } from '@/components/cross-platform-symbol';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Admin Stat Card Component with hover/press animation
function StatCard({ title, value, change, icon, index }: { 
  title: string; 
  value: string; 
  change: string; 
  icon: string;
  index: number;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(index * 100).duration(400)}
      style={[animatedStyle, styles.cardWrapper]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <ThemedView type="backgroundElement" style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={styles.iconContainer}>
              <SymbolView
                name={{ ios: icon as any, android: 'star', web: 'star' }}
                size={20}
                tintColor="#3C9FFE"
              />
            </View>
            <ThemedText type="small" style={{ color: '#3C9FFE' }}>{change}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.statTitle}>{title}</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>{value}</ThemedText>
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

// Admin Delivery Row Component
function DeliveryRow({ id, customer, address, status, time, amount }: {
  id: string;
  customer: string;
  address: string;
  status: 'In Transit' | 'Pending' | 'Completed';
  time: string;
  amount: string;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const toggleExpand = () => {
    setExpanded(!expanded);
    rotation.value = withTiming(expanded ? 0 : 90, { duration: 200 });
  };

  const statusColor = 
    status === 'Completed' ? '#4CD964' : 
    status === 'In Transit' ? '#FF9500' : '#FF3B30';

  return (
    <ThemedView type="backgroundElement" style={styles.deliveryRow}>
      <Pressable onPress={toggleExpand} style={styles.rowPressable}>
        <View style={styles.rowMain}>
          <View>
            <ThemedText type="smallBold">{id}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{customer}</ThemedText>
          </View>
          <View style={styles.rowRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText type="code" style={{ color: statusColor, fontSize: 10 }}>{status}</ThemedText>
            </View>
            <Animated.View style={chevronStyle}>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Animated.View>
          </View>
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeInUp.duration(150)} style={styles.rowExpanded}>
          <View style={styles.divider} />
          <View style={styles.expandedDetail}>
            <SymbolView name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }} size={14} tintColor={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.expandedText}>{address}</ThemedText>
          </View>
          <View style={styles.expandedDetail}>
            <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={14} tintColor={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.expandedText}>ETA / Date: {time}</ThemedText>
          </View>
          <View style={styles.expandedDetail}>
            <SymbolView name={{ ios: 'banknote', android: 'payments', web: 'payments' }} size={14} tintColor={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.expandedText}>Amount: {amount}</ThemedText>
          </View>
        </Animated.View>
      )}
    </ThemedView>
  );
}

export default function AdminDashboard() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="subtitle">Velco Admin</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Logistics Control Center</ThemedText>
        </View>
        <Pressable style={styles.profileButton}>
          <SymbolView
            name={{ ios: 'bell.badge', android: 'notifications_active', web: 'notifications_active' }}
            size={20}
            tintColor={theme.text}
          />
        </Pressable>
      </View>

      {/* Analytics Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard index={0} title="Total Shipments" value="1,248" change="+12.3%" icon="shippingbox" />
        <StatCard index={1} title="Active Riders" value="42" change="+4.7%" icon="person.2" />
        <StatCard index={2} title="Today's Revenue" value="$4,820" change="+8.1%" icon="chart.bar" />
        <StatCard index={3} title="Delivery Rate" value="98.4%" change="+0.5%" icon="checkmark.circle" />
      </View>

      {/* Main Delivery Feed */}
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">Live Shipments Feed</ThemedText>
        <Pressable>
          <ThemedText type="linkPrimary">View All</ThemedText>
        </Pressable>
      </View>

      <LayoutAnimationConfig>
        <View style={styles.listContainer}>
          <DeliveryRow 
            id="#VLC-9801" 
            customer="Alice Vance" 
            address="1482 Pine Ave, San Francisco, CA" 
            status="In Transit" 
            time="10 mins left" 
            amount="$24.50" 
          />
          <DeliveryRow 
            id="#VLC-9802" 
            customer="Jonathan Wick" 
            address="Continental Hotel, New York, NY" 
            status="Pending" 
            time="Assigning Driver" 
            amount="$89.00" 
          />
          <DeliveryRow 
            id="#VLC-9799" 
            customer="Sarah Connor" 
            address="2029 Cyberdyne Blvd, Los Angeles, CA" 
            status="Completed" 
            time="Delivered at 4:12 PM" 
            amount="$15.20" 
          />
        </View>
      </LayoutAnimationConfig>
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
  profileButton: {
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.five,
    gap: Spacing.three,
  },
  cardWrapper: {
    width: '47%',
  },
  statCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#3C9FFE15',
    padding: Spacing.one,
    borderRadius: 8,
  },
  statTitle: {
    marginTop: Spacing.two,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: Spacing.half,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  listContainer: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  deliveryRow: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  rowPressable: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowExpanded: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#88888830',
    marginVertical: Spacing.one,
  },
  expandedDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  expandedText: {
    fontSize: 13,
  },
});
