import React, { useState, useEffect, useRef } from 'react';
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
import { Spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const getWsUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/^http/, 'ws');
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
  const isAssigned = status.toLowerCase() === 'assigned';
  const isPending = status.toLowerCase() === 'pending';
  
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
          var statusAssigned = ${isAssigned};
          var statusPending = ${isPending};

          if (statusTransit && coordinates.length > 0) {
            var riderIcon = L.divIcon({
              className: 'rider-marker',
              html: "<div style='background-color:#3C9FFE; width:22px; height:22px; border-radius:11px; border:2px solid #FFFFFF; box-shadow: 0 0 10px #3C9FFE; display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M19 7H16.18C15.66 4.65 13.56 3 11 3C8.44 3 6.34 4.65 5.82 7H3C1.9 7 1 7.9 1 9V15C1 16.1 1.9 17 3 17H5.82C6.34 19.35 8.44 21 11 21C13.56 21 15.66 19.35 16.18 17H19C20.1 17 21 16.1 21 15V9C21 7.9 20.1 7 19 7ZM11 5C12.38 5 13.5 6.12 13.5 7.5C13.5 8.88 12.38 10 11 10C9.62 10 8.5 8.88 8.5 7.5C8.5 6.12 9.62 5 11 5ZM11 19C9.62 19 8.5 17.88 8.5 16.5C8.5 15.12 9.62 14 11 14C12.38 14 13.5 15.12 13.5 16.5C13.5 17.88 12.38 19 11 19Z' fill='#FFFFFF'/></svg></div>",
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            riderMarker = L.marker(coordinates[0], { icon: riderIcon }).addTo(map);
            animateRider();
          } else if (!statusPending) {
            // Show rider at start or end depending on completion
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

        var timerId = null;
        function animateRider() {
          if (timerId) clearTimeout(timerId);
          if (riderIndex < coordinates.length) {
            riderMarker.setLatLng(coordinates[riderIndex]);
            riderIndex++;
            timerId = setTimeout(animateRider, 700);
          } else {
            riderIndex = 0;
            timerId = setTimeout(animateRider, 700);
          }
        }

        function updateRiderPosition(lat, lng) {
          if (timerId) {
            clearTimeout(timerId);
            timerId = null;
          }
          var pos = [lat, lng];
          if (riderMarker) {
            riderMarker.setLatLng(pos);
          } else {
            var riderIcon = L.divIcon({
              className: 'rider-marker',
              html: "<div style='background-color:#3C9FFE; width:22px; height:22px; border-radius:11px; border:2px solid #FFFFFF; box-shadow: 0 0 10px #3C9FFE; display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M19 7H16.18C15.66 4.65 13.56 3 11 3C8.44 3 6.34 4.65 5.82 7H3C1.9 7 1 7.9 1 9V15C1 16.1 1.9 17 3 17H5.82C6.34 19.35 8.44 21 11 21C13.56 21 15.66 19.35 16.18 17H19C20.1 17 21 16.1 21 15V9C21 7.9 20.1 7 19 7ZM11 5C12.38 5 13.5 6.12 13.5 7.5C13.5 8.88 12.38 10 11 10C9.62 10 8.5 8.88 8.5 7.5C8.5 6.12 9.62 5 11 5ZM11 19C9.62 19 8.5 17.88 8.5 16.5C8.5 15.12 9.62 14 11 14C12.38 14 13.5 15.12 13.5 16.5C13.5 17.88 12.38 19 11 19Z' fill='#FFFFFF'/></svg></div>",
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            riderMarker = L.marker(pos, { icon: riderIcon }).addTo(map);
          }
          map.panTo(pos);
        }

        window.addEventListener('message', function(e) {
          try {
            var data = JSON.parse(e.data);
            if (data.type === 'rider_gps') {
              updateRiderPosition(data.lat, data.lng);
            }
          } catch(err) {}
        });

        document.addEventListener('message', function(e) {
          try {
            var data = JSON.parse(e.data);
            if (data.type === 'rider_gps') {
              updateRiderPosition(data.lat, data.lng);
            }
          } catch(err) {}
        });
      </script>
    </body>
    </html>
  `;
};

interface AdminOrdersProps {
  token: string | null;
  user: any;
}

export default function AdminOrders({ token, user }: AdminOrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o._id === selectedOrderId) || null;
  
  // Assignment Modal State
  const [assigningOrder, setAssigningOrder] = useState<any | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Full-screen map modal state
  const [fullscreenOrder, setFullscreenOrder] = useState<any | null>(null);

  const detailWebViewRef = useRef<any>(null);
  const detailIframeRef = useRef<HTMLIFrameElement | null>(null);
  const fullscreenWebViewRef = useRef<any>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Real-Time order tracking WebSocket
  useEffect(() => {
    if (!token) return;

    const wsUrl = getWsUrl();
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.onopen = () => {
      console.log("Admin tracking WebSocket connected successfully");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "rider_location") {
          const { orderId, lat, lng } = data;
          const msg = JSON.stringify({ type: 'rider_gps', lat, lng });

          // Forward to Detail view map
          if (selectedOrderId === orderId) {
            if (Platform.OS === 'web') {
              if (detailIframeRef.current && detailIframeRef.current.contentWindow) {
                detailIframeRef.current.contentWindow.postMessage(msg, '*');
              }
            } else {
              if (detailWebViewRef.current) {
                detailWebViewRef.current.postMessage(msg);
              }
            }
          }

          // Forward to Fullscreen map
          if (fullscreenOrder && fullscreenOrder._id === orderId) {
            if (Platform.OS === 'web') {
              if (fullscreenIframeRef.current && fullscreenIframeRef.current.contentWindow) {
                fullscreenIframeRef.current.contentWindow.postMessage(msg, '*');
              }
            } else {
              if (fullscreenWebViewRef.current) {
                fullscreenWebViewRef.current.postMessage(msg);
              }
            }
          }
        }
      } catch (err) {
        console.warn("WebSocket event handling error:", err);
      }
    };

    ws.onclose = () => {
      console.log("Admin tracking WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [token, selectedOrderId, fullscreenOrder]);

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
  }, [activeStepPulse]);

  const animatedActiveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: activeStepPulse.value }],
      opacity: 0.95
    };
  });

  const fetchOrders = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Sort orders so pending/newest are on top
        const sorted = data.sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrders(sorted);
      }
    } catch (err) {
      console.warn("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRiders = React.useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/riders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRiders(data);
      }
    } catch (err) {
      console.warn("Failed to fetch riders:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [fetchOrders, fetchRiders]);

  const handleAssignRider = async () => {
    if (!token || !assigningOrder || !selectedRiderId) return;
    setSubmittingAssignment(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/orders/${assigningOrder._id}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deliveryRiderId: selectedRiderId
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAssigningOrder(null);
        setSelectedRiderId('');
        fetchOrders();
      } else {
        alert(data.message || "Failed to assign rider");
      }
    } catch (err) {
      console.warn("Failed to assign rider:", err);
    } finally {
      setSubmittingAssignment(false);
    }
  };



  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
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
        return '#6366F1'; // Indigo
      case 'in transit':
      case 'in_transit':
        return '#3B82F6'; // Blue
      case 'completed':
        return '#10B981'; // Emerald
      case 'cancelled':
        return '#FF3B30'; // Red
      default:
        return '#888888';
    }
  };

  const getActiveStep = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 0;
      case 'assigned':
        return 1;
      case 'in transit':
      case 'in_transit':
        return 3;
      case 'completed':
        return 4;
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

      {/* Admin header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="subtitle" style={{ color: '#F8FAFC' }}>Requested Shipments</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Assign riders & track active orders</ThemedText>
        </View>
        <Pressable onPress={fetchOrders} style={[styles.refreshBtn, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
          <SymbolView name="arrow.clockwise" size={18} tintColor="#3C9FFE" />
        </Pressable>
      </View>

      {/* Orders List */}
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
            <SymbolView name="shippingbox" size={48} tintColor="#64748B" />
            <ThemedText type="smallBold" style={{ marginTop: Spacing.two, color: '#F8FAFC' }}>No shipments found</ThemedText>
            <ThemedText style={{ textAlign: 'center', marginTop: Spacing.one, color: '#64748B', fontSize: 13 }}>
              There are no requested orders in the database.
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
              const pickupName = order.pickupLocation?.name || 'Pickup Address';
              const dropoffName = order.dropoffLocation?.name || 'Drop-off Address';
              const clientName = order.userId?.name || 'Client';

              return (
                <Animated.View 
                  key={order._id} 
                  entering={FadeInDown.duration(300)} 
                  style={[styles.orderCard, { borderColor: 'rgba(60, 159, 254, 0.12)', backgroundColor: 'rgba(17, 24, 39, 0.55)' }]}
                >
                  {/* Card Header row */}
                  <Pressable onPress={() => setSelectedOrderId(order._id)} style={styles.cardHeader}>
                    <View style={styles.headerInfo}>
                      <View style={styles.idRow}>
                        <ThemedText type="smallBold" style={[styles.idText, { color: '#F8FAFC' }]}>
                          Order #{order._id.substring(order._id.length - 8).toUpperCase()}
                        </ThemedText>
                        <ThemedText type="code" style={{ color: '#6366F1', fontSize: 10, fontWeight: '700', marginLeft: Spacing.one }}>
                          {clientName}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: '#94A3B8', marginTop: 2 }}>
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
                        name="chevron.right" 
                        size={16} 
                        tintColor="#94A3B8" 
                      />
                    </View>
                  </Pressable>

                  {/* Route overview */}
                  <View style={styles.collapsedRoute}>
                    <ThemedText type="code" numberOfLines={1} style={{ color: '#64748B' }}>
                      {pickupName.split(',')[0]} ➔ {dropoffName.split(',')[0]}
                    </ThemedText>
                  </View>
                </Animated.View>
              );
            })}
          </LayoutAnimationConfig>
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* MODAL: DETAIL POPUP MODAL */}
      <Modal 
        visible={selectedOrder !== null} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setSelectedOrderId(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedOrderId(null)} />
          <Animated.View entering={FadeInDown.duration(250)} style={[styles.detailModalContent, { backgroundColor: '#111827', borderColor: '#334155' }]}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <ThemedText type="smallBold" style={{ color: '#F8FAFC', fontSize: 16 }}>
                  Order #{selectedOrder?._id.substring(selectedOrder._id.length - 8).toUpperCase()}
                </ThemedText>
                <ThemedText type="code" style={{ color: '#6366F1', fontSize: 11, fontWeight: '700' }}>
                  Client: {selectedOrder?.userId?.name || 'Client'}
                </ThemedText>
              </View>
              <Pressable onPress={() => setSelectedOrderId(null)} style={styles.closeBtn}>
                <SymbolView name="xmark" size={18} tintColor="#94A3B8" />
              </Pressable>
            </View>

            {selectedOrder && (
              <ScrollView 
                style={styles.detailScroll} 
                contentContainerStyle={styles.detailScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Client Details */}
                <View style={styles.clientDetailsBox}>
                  <SymbolView name="person.crop.circle.fill" size={24} tintColor="#6366F1" />
                  <View style={{ flex: 1, marginLeft: Spacing.two }}>
                    <ThemedText type="smallBold" style={{ color: '#F8FAFC' }}>Customer Contact</ThemedText>
                    <ThemedText type="code" style={{ color: '#94A3B8', fontSize: 11 }}>
                      Email: {selectedOrder.userId?.mail || 'No Email'}
                    </ThemedText>
                  </View>
                </View>

                {/* Details card */}
                <View style={styles.infoRow}>
                  <View style={styles.infoCol}>
                    <ThemedText type="code" style={{ color: '#64748B', fontSize: 10 }}>WEIGHT</ThemedText>
                    <ThemedText type="smallBold" style={{ color: '#F8FAFC' }}>{selectedOrder.weight} kg</ThemedText>
                  </View>
                  <View style={styles.infoCol}>
                    <ThemedText type="code" style={{ color: '#64748B', fontSize: 10 }}>PAYMENT</ThemedText>
                    <ThemedText type="smallBold" style={{ color: '#F8FAFC' }}>{selectedOrder.paymentmethod?.toUpperCase()}</ThemedText>
                  </View>
                  <View style={styles.infoCol}>
                    <ThemedText type="code" style={{ color: '#64748B', fontSize: 10 }}>STATUS</ThemedText>
                    <ThemedText type="smallBold" style={{ color: getStatusColor(selectedOrder.status), fontSize: 13 }}>
                      {getStatusText(selectedOrder.status)}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />

                {/* Interactive Route Map */}
                <View style={styles.mapTitleRow}>
                  <ThemedText type="smallBold" style={{ color: '#F1F5F9' }}>Route Map Tracker</ThemedText>
                  <Pressable onPress={() => setFullscreenOrder(selectedOrder)} style={styles.fullscreenIconBtn}>
                    <SymbolView name="arrow.up.left.and.arrow.down.right" size={11} tintColor="#3C9FFE" />
                    <ThemedText type="code" style={{ color: '#3C9FFE', fontSize: 10, fontWeight: '700' }}>Full Map</ThemedText>
                  </Pressable>
                </View>

                {Platform.OS === 'web' ? (
                  <iframe
                    ref={detailIframeRef}
                    srcDoc={getLeafletHtml(
                      selectedOrder.pickupLocation?.lat || 37.7749,
                      selectedOrder.pickupLocation?.lng || -122.4194,
                      selectedOrder.pickupLocation?.name || 'Pickup',
                      selectedOrder.dropoffLocation?.lat || 37.7882,
                      selectedOrder.dropoffLocation?.lng || -122.4324,
                      selectedOrder.dropoffLocation?.name || 'Drop-off',
                      selectedOrder.status
                    )}
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: 16, marginTop: 8 }}
                    title={`Detail Route Map`}
                  />
                ) : (
                  <View style={styles.mapWebViewContainer}>
                    <WebView 
                      ref={detailWebViewRef}
                      source={{ 
                        html: getLeafletHtml(
                          selectedOrder.pickupLocation?.lat || 37.7749,
                          selectedOrder.pickupLocation?.lng || -122.4194,
                          selectedOrder.pickupLocation?.name || 'Pickup',
                          selectedOrder.dropoffLocation?.lat || 37.7882,
                          selectedOrder.dropoffLocation?.lng || -122.4324,
                          selectedOrder.dropoffLocation?.name || 'Drop-off',
                          selectedOrder.status
                        ) 
                      }} 
                      style={styles.mapWebView} 
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                    />
                  </View>
                )}

                <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />

                {/* Progress Timeline */}
                {selectedOrder.status.toLowerCase() === 'cancelled' ? (
                  <View style={[styles.cancelledAlertBox, { borderColor: '#FF3B3030', backgroundColor: '#FF3B3010' }]}>
                    <SymbolView name="exclamationmark.octagon.fill" size={18} tintColor="#FF3B30" />
                    <ThemedText type="smallBold" style={{ color: '#FF3B30', flex: 1 }}>
                      This shipment request was cancelled.
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    <ThemedText type="smallBold" style={styles.detailTitle}>Shipment Progress</ThemedText>
                    <View style={styles.timelineContainer}>
                      {[
                        { title: 'Booked', desc: 'Order placed by client' },
                        { title: 'Assigned', desc: 'Rider matches shipment' },
                        { title: 'Picked Up', desc: 'Rider collected cargo' },
                        { title: 'In Transit', desc: 'Rider in route' },
                        { title: 'Delivered', desc: 'Arrived at hub successfully' }
                      ].map((stage, idx) => {
                        const currentActiveStep = getActiveStep(selectedOrder.status);
                        const isDone = idx <= currentActiveStep;
                        const isCurrent = idx === currentActiveStep;
                        const isLast = idx === 4;
                        
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
                                  {getStageTime(selectedOrder.createdAt, idx, currentActiveStep)}
                                </ThemedText>
                              </View>
                              <ThemedText type="code" style={{ color: '#64748B', marginTop: 2 }}>{stage.desc}</ThemedText>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                    <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
                  </>
                )}

                {/* Pickup and Destination Details */}
                <View style={styles.addressSection}>
                  <View style={styles.stepPoint}>
                    <View style={[styles.dotPoint, { backgroundColor: '#10B981' }]} />
                    <View style={[styles.verticalLink, { backgroundColor: 'rgba(255,255,255,0.06)', height: 36 }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="code" style={{ color: '#94A3B8', fontSize: 10 }}>PICKUP HUB</ThemedText>
                      <ThemedText type="smallBold" numberOfLines={2} style={{ color: '#F8FAFC', fontSize: 13 }}>
                        {selectedOrder.pickupLocation?.name || 'Pickup Address'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.stepPoint, { marginTop: Spacing.three }]}>
                    <View style={[styles.dotPoint, { backgroundColor: '#FF3B30' }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="code" style={{ color: '#94A3B8', fontSize: 10 }}>DROP-OFF HUB</ThemedText>
                      <ThemedText type="smallBold" numberOfLines={2} style={{ color: '#F8FAFC', fontSize: 13 }}>
                        {selectedOrder.dropoffLocation?.name || 'Drop-off Address'}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Rider Assignment section */}
                {selectedOrder.status.toLowerCase() !== 'cancelled' && selectedOrder.status.toLowerCase() !== 'completed' && (
                  <View style={{ marginTop: Spacing.four }}>
                    <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)', marginBottom: Spacing.three }]} />
                    
                    {selectedOrder.deliveryRiderId ? (
                      <View style={styles.assignedRiderBox}>
                        <View style={styles.assignedInfo}>
                          <SymbolView name="bicycle" size={20} tintColor="#10B981" />
                          <View style={{ marginLeft: Spacing.two }}>
                            <ThemedText type="smallBold" style={{ color: '#F8FAFC', fontSize: 13 }}>
                              Assigned Rider: {selectedOrder.deliveryRiderId.name || 'Rider'}
                            </ThemedText>
                            <ThemedText type="code" style={{ color: '#94A3B8', fontSize: 11 }}>
                              {selectedOrder.deliveryRiderId.mail}
                            </ThemedText>
                          </View>
                        </View>
                        
                        <Pressable 
                          onPress={() => {
                            setAssigningOrder(selectedOrder);
                            setSelectedRiderId(selectedOrder.deliveryRiderId._id || '');
                          }}
                          style={({ pressed }) => [
                            styles.reassignBtn,
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <ThemedText type="code" style={{ color: '#3C9FFE', fontWeight: '800', fontSize: 11 }}>
                            Change
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable 
                        onPress={() => {
                          setAssigningOrder(selectedOrder);
                          setSelectedRiderId('');
                        }}
                        style={({ pressed }) => [
                          styles.assignRiderBtn,
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        <SymbolView name="person.badge.plus" size={16} tintColor="#FFFFFF" />
                        <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                          Assign Delivery Rider
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Photo Attached */}
                {selectedOrder.images && selectedOrder.images.length > 0 && (
                  <View style={{ marginTop: Spacing.four }}>
                    <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)', marginBottom: Spacing.three }]} />
                    <ThemedText type="smallBold" style={styles.detailTitle}>Verified Cargo Photo</ThemedText>
                    <Image 
                      source={{ uri: selectedOrder.images[0].startsWith('http') ? selectedOrder.images[0] : `${getApiUrl()}${selectedOrder.images[0]}` }} 
                      style={styles.attachedImage} 
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: ASSIGN RIDER BOTTOM SHEET */}
      <Modal 
        visible={assigningOrder !== null} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setAssigningOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAssigningOrder(null)} />
          <Animated.View entering={FadeInDown.duration(250)} style={[styles.modalContent, { backgroundColor: '#111827', borderColor: '#334155' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold" style={{ color: '#F8FAFC', fontSize: 16 }}>Select Delivery Rider</ThemedText>
              <Pressable onPress={() => setAssigningOrder(null)} style={styles.closeBtn}>
                <SymbolView name="xmark" size={16} tintColor="#94A3B8" />
              </Pressable>
            </View>

            <ThemedText type="code" style={{ color: '#94A3B8', marginBottom: Spacing.three }}>
              Assign a rider to Order #{assigningOrder?._id.substring(assigningOrder._id.length - 8).toUpperCase()}
            </ThemedText>

            {riders.length === 0 ? (
              <View style={styles.emptyRiders}>
                <ThemedText type="code" style={{ color: '#64748B' }}>No active riders registered</ThemedText>
              </View>
            ) : (
              <ScrollView style={styles.ridersList} contentContainerStyle={{ gap: Spacing.two }}>
                {riders.map((rider) => {
                  const isSelected = selectedRiderId === rider._id;
                  return (
                    <Pressable
                      key={rider._id}
                      onPress={() => setSelectedRiderId(rider._id)}
                      style={[
                        styles.riderItem,
                        { 
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSelected ? '#6366F1' : 'transparent'
                        }
                      ]}
                    >
                      <View style={styles.riderAvatar}>
                        <SymbolView name="person.fill" size={16} tintColor={isSelected ? '#6366F1' : '#94A3B8'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ color: '#F8FAFC' }}>{rider.name}</ThemedText>
                        <ThemedText type="code" style={{ color: '#64748B', fontSize: 11 }}>{rider.mail}</ThemedText>
                      </View>
                      {isSelected && (
                        <SymbolView name="checkmark.circle.fill" size={18} tintColor="#6366F1" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.05)', marginVertical: Spacing.three }]} />

            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setAssigningOrder(null)} 
                style={[styles.modalBtn, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}
              >
                <ThemedText type="smallBold" style={{ color: '#94A3B8' }}>Cancel</ThemedText>
              </Pressable>
              
              <Pressable 
                onPress={handleAssignRider} 
                disabled={!selectedRiderId || submittingAssignment}
                style={[
                  styles.modalBtn, 
                  { 
                    backgroundColor: selectedRiderId ? '#6366F1' : 'rgba(99, 102, 241, 0.4)',
                  }
                ]}
              >
                {submittingAssignment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Confirm Assignment</ThemedText>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

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
                Track Order: #{fullscreenOrder._id.substring(fullscreenOrder._id.length - 8).toUpperCase()}
              </ThemedText>
            )}
          </View>

          {fullscreenOrder && (
            <View style={{ flex: 1 }}>
              {Platform.OS === 'web' ? (
                <iframe
                  ref={fullscreenIframeRef}
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
                  ref={fullscreenWebViewRef}
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
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    zIndex: -1,
  },
  neonGlowLeft: {
    position: 'absolute',
    top: 400,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
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
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  clientDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.three,
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
  assignRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    backgroundColor: '#6366F1',
    borderRadius: 14,
    gap: Spacing.two,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  assignedRiderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    padding: Spacing.three,
    borderRadius: 16,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reassignBtn: {
    backgroundColor: 'rgba(60, 159, 254, 0.1)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
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
  cancelledAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.five,
    width: '90%',
    maxWidth: 450,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  ridersList: {
    maxHeight: 250,
  },
  emptyRiders: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  riderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalContent: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.five,
    width: '90%',
    maxWidth: 450,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  detailScroll: {
    marginTop: Spacing.three,
  },
  detailScrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
});
