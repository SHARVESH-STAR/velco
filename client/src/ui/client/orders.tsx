import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Pressable, 
  ActivityIndicator, 
  Platform, 
  Modal,
  Dimensions,
  RefreshControl
} from 'react-native';
import Animated, { 
  FadeInDown, 
  LayoutAnimationConfig,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence
} from 'react-native-reanimated';
import { SymbolView } from '@/components/cross-platform-symbol';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Dark Mode Leaflet Route Map template with animated rider movement
const getLeafletHtml = (
  pickupLat: number,
  pickupLng: number,
  pickupName: string,
  dropoffLat: number,
  dropoffLng: number,
  dropoffName: string,
  status: string
) => {
  const isTransit = status.toLowerCase() === 'in transit' || status.toLowerCase() === 'in_transit';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
      <style>
        body { margin: 0; padding: 0; background: #030712; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-bar { display: none !important; }
        .leaflet-routing-container { display: none !important; }
      </style>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${pickupLat}, ${pickupLng}], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var start = [${pickupLat}, ${pickupLng}];
        var end = [${dropoffLat}, ${dropoffLng}];
        var coordinates = [];
        var riderMarker = null;
        var riderIndex = 0;
        var timerId = null;

        var control = L.Routing.control({
          waypoints: [
            L.latLng(start[0], start[1]),
            L.latLng(end[0], end[1])
          ],
          lineOptions: {
            styles: [{ color: '#3C9FFE', opacity: 0.9, weight: 6 }]
          },
          createMarker: function(i, wp, nWps) {
            var markerColor = i === 0 ? '#10B981' : '#FF3B30';
            var label = i === 0 ? 'P' : 'D';
            var icon = L.divIcon({
              className: 'custom-div-icon',
              html: "<div style='background-color:"+markerColor+"; width:24px; height:24px; border-radius:12px; border:2px solid #FFFFFF; display:flex; align-items:center; justify-content:center; color:#FFFFFF; font-weight:bold; font-size:12px;'>"+label+"</div>",
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            return L.marker(wp.latLng, { icon: icon });
          },
          routeWhileDragging: false,
          addWaypoints: false
        }).addTo(map);

        control.on('routesfound', function(e) {
          var routes = e.routes;
          coordinates = routes[0].coordinates;

          var bounds = L.latLngBounds(start, end);
          map.fitBounds(bounds, { padding: [40, 40] });

          var statusTransit = ${isTransit};
          if (statusTransit && coordinates.length > 0) {
            var riderIcon = L.divIcon({
              className: 'rider-marker',
              html: "<div style='background-color:#3C9FFE; width:22px; height:22px; border-radius:11px; border:2px solid #FFFFFF; box-shadow: 0 0 10px #3C9FFE; display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M19 7H16.18C15.66 4.65 13.56 3 11 3C8.44 3 6.34 4.65 5.82 7H3C1.9 7 1 7.9 1 9V15C1 16.1 1.9 17 3 17H5.82C6.34 19.35 8.44 21 11 21C13.56 21 15.66 19.35 16.18 17H19C20.1 17 21 16.1 21 15V9C21 7.9 20.1 7 19 7ZM11 5C12.38 5 13.5 6.12 13.5 7.5C13.5 8.88 12.38 10 11 10C9.62 10 8.5 8.88 8.5 7.5C8.5 6.12 9.62 5 11 5ZM11 19C9.62 19 8.5 17.88 8.5 16.5C8.5 15.12 9.62 14 11 14C12.38 14 13.5 15.12 13.5 16.5C13.5 17.88 12.38 19 11 19Z' fill='#FFFFFF'/></svg></div>",
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            riderMarker = L.marker(coordinates[0], { icon: riderIcon }).addTo(map);
            animateRider();
          } else if (statusTransit === false && status !== 'pending') {
            var isCompleted = "${status.toLowerCase()}" === 'completed';
            var pos = isCompleted ? end : start;
            var riderIcon = L.divIcon({
              className: 'rider-marker',
              html: "<div style='background-color:#3C9FFE; width:22px; height:22px; border-radius:11px; border:2px solid #FFFFFF; box-shadow: 0 0 8px #3C9FFE; display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M19 7H16.18C15.66 4.65 13.56 3 11 3C8.44 3 6.34 4.65 5.82 7H3C1.9 7 1 7.9 1 9V15C1 16.1 1.9 17 3 17H5.82C6.34 19.35 8.44 21 11 21C13.56 21 15.66 19.35 16.18 17H19C20.1 17 21 16.1 21 15V9C21 7.9 20.1 7 19 7ZM11 5C12.38 5 13.5 6.12 13.5 7.5C13.5 8.88 12.38 10 11 10C9.62 10 8.5 8.88 8.5 7.5C8.5 6.12 9.62 5 11 5ZM11 19C9.62 19 8.5 17.88 8.5 16.5C8.5 15.12 9.62 14 11 14C12.38 14 13.5 15.12 13.5 16.5C13.5 17.88 12.38 19 11 19Z' fill='#FFFFFF'/></svg></div>",
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            riderMarker = L.marker(pos, { icon: riderIcon }).addTo(map);
          }
        });

        function animateRider() {
          if (riderIndex < coordinates.length) {
            riderMarker.setLatLng(coordinates[riderIndex]);
            riderIndex++;
            timerId = setTimeout(animateRider, 700);
          } else {
            riderIndex = 0;
            timerId = setTimeout(animateRider, 700);
          }
        }
      </script>
    </body>
    </html>
  `;
};

interface OrdersTabProps {
  token: string | null;
  user: any;
}

export default function ClientOrders({ token, user }: OrdersTabProps) {
  const theme = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Full-screen map modal state
  const [fullscreenOrder, setFullscreenOrder] = useState<any | null>(null);

  // Pulse animation for active step in timeline
  const activeStepPulse = useSharedValue(1);

  useEffect(() => {
    activeStepPulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 750 }),
        withTiming(1.0, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  const animatedActiveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: activeStepPulse.value }],
      opacity: 0.95
    };
  });

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
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
        setOrders(data);
      }
    } catch (err) {
      console.warn("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleCancelOrder = async (orderId: string) => {
    if (!token) return;
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/client/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("Failed to parse JSON response:", responseText);
        alert(responseText || `Error status: ${response.status}`);
        return;
      }

      if (response.ok) {
        fetchOrders();
      } else {
        alert(data.message || "Failed to cancel order");
      }
    } catch (err) {
      console.warn("Failed to cancel order:", err);
      alert("Network error: Failed to connect to server");
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Booked';
      case 'assigned':
        return 'Assigned';
      case 'in transit':
      case 'in_transit':
        return 'In Transit';
      case 'completed':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.toUpperCase();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#F59E0B'; // Amber
      case 'assigned':
        return '#3B82F6'; // Blue
      case 'in transit':
      case 'in_transit':
        return '#10B981'; // Emerald
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#FF3B30'; // Red
      default:
        return '#888888';
    }
  };

  const getActiveStep = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 0; // Booked
      case 'assigned':
        return 1; // Assigned
      case 'in transit':
      case 'in_transit':
        return 3; // In Transit
      case 'completed':
        return 4; // Delivered
      default:
        return 0;
    }
  };

  const getStageTime = (orderDateStr: string, stageIndex: number, currentActiveStep: number) => {
    const date = new Date(orderDateStr);
    if (isNaN(date.getTime())) return '';
    const offsets = [0, 2, 5, 8, 15];
    date.setMinutes(date.getMinutes() + offsets[stageIndex]);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (stageIndex > currentActiveStep) {
      return `Est. ${timeStr}`;
    }
    return timeStr;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#030712' }]}>
      {/* Soft neon glows */}
      <View style={styles.neonGlowRight} pointerEvents="none" />
      <View style={styles.neonGlowLeft} pointerEvents="none" />

      {/* Spacer instead of top header */}
      <View style={{ height: Spacing.four }} />

      {/* Shipments List */}
      {orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchOrders}
              tintColor="#3C9FFE"
              colors={['#3C9FFE']}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <SymbolView name="doc.plaintext" size={48} tintColor="#64748B" />
            <ThemedText type="smallBold" style={{ marginTop: Spacing.two, color: '#F8FAFC' }}>No shipments booked yet</ThemedText>
            <ThemedText style={{ textAlign: 'center', marginTop: Spacing.one, color: '#64748B', fontSize: 13 }}>
              All your pending, transit, and completed orders will list here. Request a delivery to see updates!
            </ThemedText>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchOrders}
              tintColor="#3C9FFE"
              colors={['#3C9FFE']}
            />
          }
        >
          <LayoutAnimationConfig>
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order._id;
              const currentActiveStep = getActiveStep(order.status);
              
              const pickupName = order.pickupLocation?.name || 'Pickup Address';
              const dropoffName = order.dropoffLocation?.name || 'Drop-off Address';
              const pLat = order.pickupLocation?.lat || 37.7749;
              const pLng = order.pickupLocation?.lng || -122.4194;
              const dLat = order.dropoffLocation?.lat || 37.7882;
              const dLng = order.dropoffLocation?.lng || -122.4324;

              const stages = [
                { title: 'Booked', desc: 'Order placed securely' },
                { title: 'Assigned', desc: 'Rider assigned to order' },
                { title: 'Picked Up', desc: 'Cargo loaded onto vehicle' },
                { title: 'In Transit', desc: 'Shipment heading to location' },
                { title: 'Delivered', desc: 'Successfully handed over' }
              ];

              return (
                <Animated.View 
                  key={order._id} 
                  entering={FadeInDown.duration(300)} 
                  style={[styles.orderCard, { borderColor: 'rgba(60, 159, 254, 0.12)', backgroundColor: 'rgba(17, 24, 39, 0.55)' }]}
                >
                  {/* Card Header row */}
                  <Pressable onPress={() => toggleExpand(order._id)} style={styles.cardHeader}>
                    <View style={styles.headerInfo}>
                      <ThemedText type="smallBold" style={[styles.idText, { color: '#F8FAFC' }]}>
                        Order #{order._id.substring(order._id.length - 8).toUpperCase()}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: '#94A3B8' }}>
                        Weight: {order.weight} kg • Pay: {order.paymentmethod.toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={styles.headerRight}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                        <ThemedText type="code" style={{ color: getStatusColor(order.status), fontSize: 10, fontWeight: '800' }}>
                          {getStatusText(order.status)}
                        </ThemedText>
                      </View>
                      <SymbolView 
                        name={isExpanded ? 'chevron.up' : 'chevron.down'} 
                        size={16} 
                        tintColor="#94A3B8" 
                      />
                    </View>
                  </Pressable>

                  {/* Route overview */}
                  {!isExpanded && (
                    <View style={styles.collapsedRoute}>
                      <ThemedText type="code" numberOfLines={1} style={{ color: '#64748B' }}>
                        {pickupName.split(',')[0]} ➔ {dropoffName.split(',')[0]}
                      </ThemedText>
                    </View>
                  )}

                  {/* Expanded Content Details */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
                      
                      {/* Interactive Route Map */}
                      <View style={styles.mapTitleRow}>
                        <ThemedText type="smallBold" style={{ color: '#F1F5F9' }}>Live Shipment Tracker Map</ThemedText>
                        <Pressable onPress={() => setFullscreenOrder(order)} style={styles.fullscreenIconBtn}>
                          <SymbolView name="arrow.up.left.and.arrow.down.right" size={11} tintColor="#3C9FFE" />
                          <ThemedText type="code" style={{ color: '#3C9FFE', fontSize: 10, fontWeight: '700' }}>View Full Map</ThemedText>
                        </Pressable>
                      </View>

                      {Platform.OS === 'web' ? (
                        <iframe
                          srcDoc={getLeafletHtml(pLat, pLng, pickupName, dLat, dLng, dropoffName, order.status)}
                          width="100%"
                          height="230"
                          style={{ border: 0, borderRadius: 16, marginTop: 8 }}
                          title={`Route Map ${order._id}`}
                        />
                      ) : (
                        <View style={styles.mapWebViewContainer}>
                          <WebView 
                            source={{ html: getLeafletHtml(pLat, pLng, pickupName, dLat, dLng, dropoffName, order.status) }} 
                            style={styles.mapWebView} 
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                          />
                        </View>
                      )}

                      <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />

                      {order.status.toLowerCase() === 'cancelled' ? (
                        <View style={[styles.cancelledAlertBox, { borderColor: '#FF3B3030', backgroundColor: '#FF3B3010' }]}>
                          <SymbolView name="exclamationmark.octagon.fill" size={18} tintColor="#FF3B30" />
                          <ThemedText type="smallBold" style={{ color: '#FF3B30', flex: 1 }}>
                            This shipment request was cancelled.
                          </ThemedText>
                        </View>
                      ) : (
                        <>
                          {/* Timeline Progress */}
                          <ThemedText type="smallBold" style={styles.detailTitle}>Real-Time Shipment Progress</ThemedText>
                          
                          <View style={styles.timelineContainer}>
                            {stages.map((stage, idx) => {
                              const isDone = idx <= currentActiveStep;
                              const isCurrent = idx === currentActiveStep;
                              const isLast = idx === stages.length - 1;
                              
                              return (
                                <View key={stage.title} style={styles.timelineItem}>
                                  <View style={styles.timelineIndicators}>
                                    {isCurrent ? (
                                      <Animated.View style={[styles.nodeActiveGlow, animatedActiveStyle, { backgroundColor: '#3C9FFE30' }]}>
                                        <View style={[styles.nodeBullet, { backgroundColor: '#3C9FFE' }]} />
                                      </Animated.View>
                                    ) : (
                                      <View style={[styles.nodeBullet, isDone ? { backgroundColor: '#10B981' } : { backgroundColor: '#334155' }]} />
                                    )}
                                    {!isLast && (
                                      <View style={[styles.nodeLine, isDone && (idx < currentActiveStep) ? { backgroundColor: '#10B981' } : { backgroundColor: '#334155' }]} />
                                    )}
                                  </View>

                                  <View style={styles.timelineDetails}>
                                    <View style={styles.timelineDetailsHeader}>
                                      <ThemedText type="smallBold" style={isCurrent ? { color: '#3C9FFE' } : { color: '#F1F5F9' }}>{stage.title}</ThemedText>
                                      <ThemedText type="code" style={{ color: '#94A3B8' }}>
                                        {getStageTime(order.createdAt, idx, currentActiveStep)}
                                      </ThemedText>
                                    </View>
                                    <ThemedText type="code" style={{ color: '#64748B', marginTop: 2 }}>{stage.desc}</ThemedText>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </>
                      )}

                      <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />

                      {/* Pickup and Destination Details */}
                      <View style={styles.addressSection}>
                        <View style={styles.stepPoint}>
                          <View style={[styles.dotPoint, { backgroundColor: '#10B981' }]} />
                          <View style={[styles.verticalLink, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                          <View style={{ flex: 1 }}>
                            <ThemedText type="code" style={{ color: '#94A3B8' }}>PICKUP HUB</ThemedText>
                            <ThemedText type="smallBold" numberOfLines={2} style={{ color: '#F8FAFC' }}>{pickupName}</ThemedText>
                          </View>
                        </View>

                        <View style={[styles.stepPoint, { marginTop: Spacing.four }]}>
                          <View style={[styles.dotPoint, { backgroundColor: '#FF3B30' }]} />
                          <View style={{ flex: 1 }}>
                            <ThemedText type="code" style={{ color: '#94A3B8' }}>DROP-OFF HUB</ThemedText>
                            <ThemedText type="smallBold" numberOfLines={2} style={{ color: '#F8FAFC' }}>{dropoffName}</ThemedText>
                          </View>
                        </View>
                      </View>

                      {/* Photo Attached */}
                      {order.images && order.images.length > 0 && (
                        <View style={{ marginTop: Spacing.four }}>
                          <ThemedText type="smallBold" style={styles.detailTitle}>Verified Cargo Photo</ThemedText>
                          <Image 
                            source={{ uri: order.images[0].startsWith('http') ? order.images[0] : `${getApiUrl()}${order.images[0]}` }} 
                            style={styles.attachedImage} 
                          />
                        </View>
                      )}

                      {/* Cancel order button: Show within 24h of creation */}
                      {order.status !== 'cancelled' && order.status !== 'completed' && (Date.now() - new Date(order.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                        <View style={{ marginTop: Spacing.four }}>
                          <Pressable 
                            onPress={() => handleCancelOrder(order._id)}
                            style={({ pressed }) => [
                              styles.cancelOrderBtn,
                              pressed && { opacity: 0.8 }
                            ]}
                          >
                            <SymbolView name="xmark.circle.fill" size={16} tintColor="#FF3B30" />
                            <ThemedText type="smallBold" style={{ color: '#FF3B30' }}>Cancel Delivery Request</ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </LayoutAnimationConfig>
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* MODAL: FULL SCREEN LIVE ROUTE MAP */}
      <Modal visible={fullscreenOrder !== null} transparent={false} animationType="slide">
        <View style={styles.fullscreenMapContainer}>
          <View style={styles.fullscreenHeader}>
            <Pressable onPress={() => setFullscreenOrder(null)} style={styles.backFullscreenBtn}>
              <SymbolView name="chevron.left" size={18} tintColor="#FFFFFF" />
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Back</ThemedText>
            </Pressable>
            {fullscreenOrder && (
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                Map Tracker: #{fullscreenOrder._id.substring(fullscreenOrder._id.length - 8).toUpperCase()}
              </ThemedText>
            )}
          </View>

          {fullscreenOrder && (
            <View style={{ flex: 1 }}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={getLeafletHtml(
                    fullscreenOrder.pickupLocation?.lat || 37.7749,
                    fullscreenOrder.pickupLocation?.lng || -122.4194,
                    fullscreenOrder.pickupLocation?.name || 'Pickup',
                    fullscreenOrder.dropoffLocation?.lat || 37.7882,
                    fullscreenOrder.dropoffLocation?.lng || -122.4324,
                    fullscreenOrder.dropoffLocation?.name || 'Drop-off',
                    fullscreenOrder.status
                  )}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  title="Fullscreen Route Map"
                />
              ) : (
                <WebView
                  source={{ 
                    html: getLeafletHtml(
                      fullscreenOrder.pickupLocation?.lat || 37.7749,
                      fullscreenOrder.pickupLocation?.lng || -122.4194,
                      fullscreenOrder.pickupLocation?.name || 'Pickup',
                      fullscreenOrder.dropoffLocation?.lat || 37.7882,
                      fullscreenOrder.dropoffLocation?.lng || -122.4324,
                      fullscreenOrder.dropoffLocation?.name || 'Drop-off',
                      fullscreenOrder.status
                    ) 
                  }}
                  style={{ flex: 1 }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              )}
            </View>
          )}
        </View>
      </Modal>

    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  refreshBtn: {
    padding: Spacing.two,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
  },
  scrollContent: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  orderCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  headerInfo: {
    gap: 2,
    flex: 1,
  },
  idText: {
    fontSize: 14.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 3,
    borderRadius: 8,
  },
  collapsedRoute: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  expandedContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.two,
  },
  mapTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  fullscreenIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(60, 159, 254, 0.1)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapWebViewContainer: {
    height: 230,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing.two,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.25)',
  },
  mapWebView: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 12.5,
    marginBottom: Spacing.two,
    color: '#94A3B8',
  },
  timelineContainer: {
    paddingLeft: Spacing.two,
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIndicators: {
    width: 24,
    alignItems: 'center',
  },
  nodeBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  nodeActiveGlow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    marginVertical: -5,
  },
  nodeLine: {
    width: 2,
    height: 48,
    position: 'absolute',
    top: 10,
    zIndex: 1,
  },
  timelineDetails: {
    flex: 1,
    paddingLeft: Spacing.two,
  },
  timelineDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressSection: {
    paddingLeft: Spacing.one,
    marginTop: Spacing.two,
  },
  stepPoint: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dotPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  verticalLink: {
    position: 'absolute',
    left: 4.5,
    top: 16,
    width: 1,
    height: 42,
  },
  attachedImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginTop: Spacing.two,
  },
  fullscreenMapContainer: {
    flex: 1,
    backgroundColor: '#030712',
  },
  fullscreenHeader: {
    height: 60,
    backgroundColor: '#030712',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backFullscreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cancelOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: 12,
    gap: Spacing.two,
  },
  cancelledAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
});
