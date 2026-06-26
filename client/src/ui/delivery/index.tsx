import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeInDown,
  runOnJS
} from 'react-native-reanimated';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { SymbolView } from '@/components/cross-platform-symbol';

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

const getWsUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/^http/, 'ws');
};

const compressWebImage = (uri: string, callback: (c: string) => void) => {
  const img = new window.Image();
  img.src = uri;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    const MAX_SIZE = 1000;
    if (width > height) {
      if (width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      }
    } else {
      if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, width, height);
    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
    callback(compressedDataUrl);
  };
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
  const isTransit = status.toLowerCase() === 'in_transit';
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

          if (statusTransit && coordinates.length > 0) {
            var riderIcon = L.divIcon({
              className: 'rider-marker',
              html: "<div style='background-color:#3C9FFE; width:22px; height:22px; border-radius:11px; border:2px solid #FFFFFF; box-shadow: 0 0 10px #3C9FFE; display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M19 7H16.18C15.66 4.65 13.56 3 11 3C8.44 3 6.34 4.65 5.82 7H3C1.9 7 1 7.9 1 9V15C1 16.1 1.9 17 3 17H5.82C6.34 19.35 8.44 21 11 21C13.56 21 15.66 19.35 16.18 17H19C20.1 17 21 16.1 21 15V9C21 7.9 20.1 7 19 7ZM11 5C12.38 5 13.5 6.12 13.5 7.5C13.5 8.88 12.38 10 11 10C9.62 10 8.5 8.88 8.5 7.5C8.5 6.12 9.62 5 11 5ZM11 19C9.62 19 8.5 17.88 8.5 16.5C8.5 15.12 9.62 14 11 14C12.38 14 13.5 15.12 13.5 16.5C13.5 17.88 12.38 19 11 19Z' fill='#FFFFFF'/></svg></div>",
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            riderMarker = L.marker(coordinates[0], { icon: riderIcon }).addTo(map);
            animateRider();
          } else if (!statusAssigned) {
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

// SlideButton component...
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

interface DeliveryPortalProps {
  token: string | null;
  user: any;
}

export default function DeliveryPortal({ token, user }: DeliveryPortalProps) {
  const theme = useTheme();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);
  
  // Real-Time rider tracking state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveredPhoto, setDeliveredPhoto] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Map refs
  const mapWebViewRef = useRef<any>(null);
  const mapIframeRef = useRef<HTMLIFrameElement | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const refreshScale = useSharedValue(1);

  const refreshStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: refreshScale.value }]
    };
  });

  const fetchJobs = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/delivery/jobs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (err) {
      console.warn("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Connect to WebSocket Server for Real-Time order assignments
  useEffect(() => {
    if (!token) return;

    const wsUrl = getWsUrl();
    const ws = new WebSocket(`${wsUrl}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Delivery WebSocket connected successfully");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_order") {
          console.log("Immediate Order Assigned Event:", data.order);
          fetchJobs();
        }
      } catch (err) {
        console.warn("WebSocket parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("Delivery WebSocket closed");
    };

    ws.onerror = (error) => {
      console.warn("Delivery WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [token, fetchJobs]);

  // Find the current active order
  const activeJob = jobs.find(job => job.status !== 'completed' && job.status !== 'cancelled') || null;

  // Sync rider's initial coordinates
  useEffect(() => {
    if (activeJob) {
      if (activeJob.status === 'assigned') {
        setCurrentCoords(activeJob.pickupLocation);
        setDeliveredPhoto(null);
      } else if (activeJob.status === 'completed') {
        setCurrentCoords(activeJob.dropoffLocation);
      }
    } else {
      setCurrentCoords(null);
      setDeliveredPhoto(null);
    }
  }, [activeJob?._id, activeJob?.status]);

  // Post coordinates to rider's own map
  useEffect(() => {
    if (currentCoords && activeJob) {
      const msg = JSON.stringify({ type: 'rider_gps', lat: currentCoords.lat, lng: currentCoords.lng });
      if (Platform.OS === 'web') {
        if (mapIframeRef.current && mapIframeRef.current.contentWindow) {
          mapIframeRef.current.contentWindow.postMessage(msg, '*');
        }
      } else {
        if (mapWebViewRef.current) {
          mapWebViewRef.current.postMessage(msg);
        }
      }
    }
  }, [currentCoords, activeJob?._id]);

  // GPS Simulation Triggered automatically when order status is "in_transit"
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'in_transit' || !token) {
      return;
    }

    const pickup = activeJob.pickupLocation;
    const dropoff = activeJob.dropoffLocation;

    if (!pickup || !dropoff) return;

    let step = 0;
    const totalSteps = 12;

    console.log("Starting active GPS Simulation for Order:", activeJob._id);

    const interval = setInterval(() => {
      if (step > totalSteps) {
        clearInterval(interval);
        return;
      }

      // Interpolate current simulated location
      const ratio = step / totalSteps;
      const lat = pickup.lat + (dropoff.lat - pickup.lat) * ratio;
      const lng = pickup.lng + (dropoff.lng - pickup.lng) * ratio;

      // Update local tracking coords
      setCurrentCoords({ lat, lng });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "location_update",
          orderId: activeJob._id,
          lat,
          lng
        }));
      }

      step++;
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [activeJob?._id, activeJob?.status, token]);

  const handleUpdateStatus = async (status: string) => {
    if (!token || !activeJob) return;
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/delivery/jobs/${activeJob._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.warn("Failed to update job status:", err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('We need camera permissions to take a package confirmation photo!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (Platform.OS === 'web') {
          compressWebImage(uri, (compressed) => {
            setDeliveredPhoto(compressed);
          });
        } else {
          setDeliveredPhoto(uri);
        }
      }
    } catch (err) {
      console.warn("Camera execution error:", err);
    }
  };

  const handleCompleteJob = async () => {
    if (!activeJob) return;
    if (!deliveredPhoto) {
      alert("Please capture a delivery confirmation photo first!");
      return;
    }

    setCompleting(true);
    try {
      const apiUrl = getApiUrl();
      const xhr = new XMLHttpRequest();
      
      xhr.open('PUT', `${apiUrl}/delivery/jobs/${activeJob._id}/status`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          setCompleting(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            const completedId = activeJob._id;
            setLastCompletedId(completedId);
            setDeliveredPhoto(null);
            fetchJobs();
          } else {
            alert('Failed to complete order. Please try again.');
          }
        }
      };

      const formData = new FormData();
      formData.append('status', 'completed');

      const filename = `delivered_${Date.now()}.jpg`;
      if (Platform.OS === 'web') {
        const res = await fetch(deliveredPhoto);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });
        formData.append('photos', file);
      } else {
        formData.append('photos', {
          uri: Platform.OS === 'ios' ? deliveredPhoto.replace('file://', '') : deliveredPhoto,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      xhr.send(formData);
    } catch (err) {
      setCompleting(false);
      console.warn("Failed to complete job:", err);
    }
  };

  const handleReset = () => {
    refreshScale.value = withSpring(0.9, {}, (finished) => {
      if (finished) {
        refreshScale.value = withSpring(1);
        setLastCompletedId(null);
        fetchJobs();
      }
    });
  };

  const clientUser = activeJob?.userId;
  const dropoff = activeJob?.dropoffLocation;

  // Determine if the rider is exactly at the drop point
  const isAtDestination = !!(
    currentCoords && 
    dropoff && 
    Math.abs(currentCoords.lat - dropoff.lat) < 0.0001 && 
    Math.abs(currentCoords.lng - dropoff.lng) < 0.0001
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Driver Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">Active Driver:</ThemedText>
          <ThemedText type="subtitle">{user?.name || 'Delivery Partner'}</ThemedText>
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
          <ThemedText type="smallBold" style={styles.statValue}>$248.50</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={styles.statCard}>
          <ThemedText type="code" themeColor="textSecondary">Trips</ThemedText>
          <ThemedText type="smallBold" style={styles.statValue}>{jobs.filter(j => j.status === 'completed').length + 5}</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={styles.statCard}>
          <ThemedText type="code" themeColor="textSecondary">Rating</ThemedText>
          <ThemedText type="smallBold" style={styles.statValue}>4.98 ★</ThemedText>
        </ThemedView>
      </View>

      {/* Active Trip Details */}
      <ThemedText type="smallBold" style={styles.sectionTitle}>Active Shipment Job</ThemedText>

      {loading && jobs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : activeJob ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.jobWrapper}>
          <ThemedView type="backgroundElement" style={styles.jobCard}>
            {/* Header info */}
            <View style={styles.jobHeader}>
              <View>
                <ThemedText type="smallBold">Job ID: #{activeJob._id.substring(activeJob._id.length - 8).toUpperCase()}</ThemedText>
                <ThemedText type="code" style={{ color: '#6366F1', fontSize: 11, marginTop: 4 }}>
                  Client: {clientUser?.name || 'N/A'}
                </ThemedText>
                {clientUser?.phone && (
                  <ThemedText type="code" style={{ color: '#888888', fontSize: 11, marginTop: 2 }}>
                    Phone: {clientUser.phone}
                  </ThemedText>
                )}
              </View>
              <ThemedText type="smallBold" style={{ color: '#4CD964' }}>+${activeJob.totalAmount}</ThemedText>
            </View>

            <View style={styles.divider} />

            {/* Details */}
            <View style={{ marginBottom: Spacing.three, gap: Spacing.one }}>
              <ThemedText type="small" themeColor="textSecondary">
                Weight: <ThemedText type="smallBold" style={{ color: theme.text }}>{activeJob.weight} kg</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Payment Method: <ThemedText type="smallBold" style={{ color: theme.text }}>{activeJob.paymentmethod?.toUpperCase()}</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Status: <ThemedText type="smallBold" style={{ color: activeJob.status === 'in_transit' ? theme.primary : '#F59E0B' }}>
                  {activeJob.status === 'in_transit' ? (isAtDestination ? 'Arrived at Destination' : 'In Transit (GPS Sim Active)') : 'Assigned (Waiting to Start)'}
                </ThemedText>
              </ThemedText>
            </View>

            <View style={styles.divider} />

            {/* Steps */}
            <View style={styles.jobSteps}>
              <View style={styles.stepPoint}>
                <View style={styles.dotGreen} />
                <View style={styles.lineVertical} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="code" themeColor="textSecondary">PICKUP FROM</ThemedText>
                  <ThemedText type="smallBold" numberOfLines={2}>{activeJob.pickupLocation?.name || 'Pickup Hub'}</ThemedText>
                </View>
              </View>

              <View style={[styles.stepPoint, { marginTop: Spacing.four }]}>
                <View style={styles.dotRed} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="code" themeColor="textSecondary">DELIVER TO</ThemedText>
                  <ThemedText type="smallBold" numberOfLines={2}>{activeJob.dropoffLocation?.name || 'Drop-off Hub'}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Active Delivery Route Map */}
            <ThemedText type="smallBold" style={{ color: '#F1F5F9', marginBottom: Spacing.two }}>Delivery Route Map</ThemedText>
            <View style={styles.mapWebViewContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  ref={mapIframeRef}
                  srcDoc={getLeafletHtml(
                    activeJob.pickupLocation?.lat || 37.7749,
                    activeJob.pickupLocation?.lng || -122.4194,
                    activeJob.pickupLocation?.name || 'Pickup',
                    activeJob.dropoffLocation?.lat || 37.7882,
                    activeJob.dropoffLocation?.lng || -122.4324,
                    activeJob.dropoffLocation?.name || 'Drop-off',
                    activeJob.status
                  )}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  title="Rider Delivery Map"
                />
              ) : (
                <WebView
                  ref={mapWebViewRef}
                  source={{ 
                    html: getLeafletHtml(
                      activeJob.pickupLocation?.lat || 37.7749,
                      activeJob.pickupLocation?.lng || -122.4194,
                      activeJob.pickupLocation?.name || 'Pickup',
                      activeJob.dropoffLocation?.lat || 37.7882,
                      activeJob.dropoffLocation?.lng || -122.4324,
                      activeJob.dropoffLocation?.name || 'Drop-off',
                      activeJob.status
                    ) 
                  }}
                  style={{ flex: 1 }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              )}
            </View>

            <View style={styles.divider} />

            {/* Actions */}
            {activeJob.status === 'assigned' ? (
              <Pressable 
                onPress={() => handleUpdateStatus('in_transit')}
                style={styles.startButton}
              >
                <ThemedText type="code" style={{ color: '#FFFFFF', fontWeight: '800' }}>START TRIP</ThemedText>
              </Pressable>
            ) : (
              <View>
                {isAtDestination ? (
                  <View style={styles.deliveryCompleteBox}>
                    <ThemedText type="smallBold" style={{ color: '#4CD964', textAlign: 'center', marginBottom: Spacing.two }}>
                      You have arrived at the Drop Point!
                    </ThemedText>
                    
                    {/* Confirmation Photo Section */}
                    {deliveredPhoto ? (
                      <View style={styles.photoContainer}>
                        <Image source={{ uri: deliveredPhoto }} style={styles.photoPreview} />
                        <Pressable onPress={() => setDeliveredPhoto(null)} style={styles.retakeBtn}>
                          <SymbolView name="camera.fill" size={14} tintColor="#FFFFFF" />
                          <ThemedText type="code" style={{ color: '#FFFFFF', fontSize: 11 }}>Retake Photo</ThemedText>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={handleTakePhoto} style={styles.cameraBtn}>
                        <SymbolView name="camera.fill" size={18} tintColor="#FFFFFF" />
                        <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Take Delivery Confirmation Photo</ThemedText>
                      </Pressable>
                    )}

                    <View style={styles.sliderContainer}>
                      {completing ? (
                        <ActivityIndicator size="small" color="#4CD964" />
                      ) : (
                        <SlideButton onComplete={handleCompleteJob} />
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.transitBox}>
                    <ActivityIndicator size="small" color={theme.primary} style={{ marginBottom: Spacing.two }} />
                    <ThemedText type="smallBold" style={{ color: theme.primary, textAlign: 'center' }}>
                      Riding to destination...
                    </ThemedText>
                    <ThemedText type="code" style={{ color: '#888888', fontSize: 11, textAlign: 'center', marginTop: Spacing.one }}>
                      The camera and complete slider will show when you reach the drop point coordinates exactly.
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </ThemedView>
        </Animated.View>
      ) : lastCompletedId ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.completedWrapper}>
          <ThemedView type="backgroundElement" style={styles.completedCard}>
            <View style={styles.iconCircle}>
              <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={48} tintColor="#4CD964" />
            </View>
            <ThemedText type="smallBold" style={{ textAlign: 'center', marginTop: Spacing.three }}>
              Job Completed Successfully!
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.one }}>
              Your earnings wallet and confirmation photo have been saved.
            </ThemedText>
            
            <Animated.View style={[refreshStyle, { marginTop: Spacing.four }]}>
              <Pressable onPress={handleReset} style={styles.resetButton}>
                <ThemedText type="code" style={{ color: '#FFFFFF' }}>Get Next Ride</ThemedText>
              </Pressable>
            </Animated.View>
          </ThemedView>
        </Animated.View>
      ) : (
        <ThemedView type="backgroundElement" style={styles.waitingContainer}>
          <SymbolView name="bell" size={32} tintColor="#FF9500" />
          <ThemedText type="smallBold" style={{ color: '#F1F5F9' }}>Waiting for Assignments...</ThemedText>
          <ThemedText style={{ color: '#888888', fontSize: 13, textAlign: 'center' }}>
            You are online. New delivery shipments assigned by Admin will appear here instantly.
          </ThemedText>
        </ThemedView>
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
    alignItems: 'flex-start',
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
    height: 48,
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
  startButton: {
    backgroundColor: '#3C9FFE',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  waitingContainer: {
    padding: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  loadingContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryCompleteBox: {
    gap: Spacing.three,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3C9FFE',
    paddingVertical: Spacing.three,
    borderRadius: 14,
    gap: Spacing.two,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    gap: Spacing.one,
  },
  transitBox: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 159, 254, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(60, 159, 254, 0.08)',
  },
  mapWebViewContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.25)',
  },
});
