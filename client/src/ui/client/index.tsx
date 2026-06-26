import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  TextInput, 
  Pressable, 
  Platform, 
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence, 
  withTiming,
  FadeInRight,
  FadeInDown,
  FadeInUp,
  FadeOutUp
} from 'react-native-reanimated';
import { SymbolView } from '@/components/cross-platform-symbol';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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

// HTML template for the Map Location Picker
const getMapPickerHtml = (lat: number, lng: number) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #030712; }
        .center-marker {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 38px;
          height: 38px;
          margin-top: -38px;
          margin-left: -19px;
          z-index: 9999;
          pointer-events: none;
        }
      </style>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    </head>
    <body>
      <div id="map"></div>
      <svg class="center-marker" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#3C9FFE" stroke="#FFFFFF" stroke-width="2"/>
      </svg>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        function sendPosition(lat, lng) {
          var msg = JSON.stringify({ type: 'map_dragged', lat: lat, lng: lng });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(msg);
          } else {
            window.parent.postMessage(msg, '*');
          }
        }

        sendPosition(${lat}, ${lng});

        map.on('moveend', function() {
          var center = map.getCenter();
          sendPosition(center.lat, center.lng);
        });
      </script>
    </body>
    </html>
  `;
};

// HTML template for the Route Viewer Popup
const getRouteViewHtml = (
  pLat: number, pLng: number, pName: string,
  dLat: number, dLng: number, dName: string
) => {
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
        var map = L.map('map', { zoomControl: false }).setView([${pLat}, ${pLng}], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var start = [${pLat}, ${pLng}];
        var end = [${dLat}, ${dLng}];

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
          var summary = routes[0].summary;
          var distance = (summary.totalDistance / 1000).toFixed(2);
          
          var data = JSON.stringify({ type: 'route_calculated', distance: distance });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(data);
          } else {
            window.parent.postMessage(data, '*');
          }
        });
      </script>
    </body>
    </html>
  `;
};

// Success Modal Particle Component for Award Winning UI
const Particle = ({ delay }: { delay: number }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4 + Math.random() * 0.8);
  const left = Math.random() * 240 + 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(-150, { duration: 2500 + Math.random() * 1500 }),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0.7, { duration: 1200 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
      left,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.particle, 
        animatedStyle, 
        { backgroundColor: Math.random() > 0.5 ? '#10B981' : '#3C9FFE' }
      ]} 
    />
  );
};

interface ClientHomeProps {
  token: string | null;
  user: any;
}

type PackageType = 'parcel' | 'document' | 'fragile' | 'heavy' | 'express';

const packageTypesInfo = {
  parcel: { title: 'Standard Parcel', desc: 'Standard box delivery', icon: 'shippingbox.fill' },
  document: { title: 'Legal Document', desc: 'Secure envelopes & letters', icon: 'doc.plaintext.fill' },
  fragile: { title: 'Fragile Goods', desc: 'Handle with extra care', icon: 'wineglass.fill' },
  heavy: { title: 'Heavy Freight', desc: 'Items exceeding 20 kg', icon: 'scalemass.fill' },
  express: { title: 'Express Speed', desc: 'Guaranteed 1-hour delivery', icon: 'bolt.fill' }
};

export default function ClientHome({ token, user }: ClientHomeProps) {
  const theme = useTheme();
  
  // Addresses and coordinates states
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number, lng: number } | null>(null);
  
  // Geocomplete lists
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDropoff, setSearchingDropoff] = useState(false);
  const [ignorePickupChange, setIgnorePickupChange] = useState(false);
  const [ignoreDropoffChange, setIgnoreDropoffChange] = useState(false);
  const [detectingGps, setDetectingGps] = useState<'pickup' | 'dropoff' | null>(null);
  
  // Map Picker Modals
  const [showMapPicker, setShowMapPicker] = useState<'pickup' | 'dropoff' | null>(null);
  const [pickerAddress, setPickerAddress] = useState('');
  const [pickerCoords, setPickerCoords] = useState<{ lat: number, lng: number }>({ lat: 37.7749, lng: -122.4194 });
  const [loadingReverseGeocode, setLoadingReverseGeocode] = useState(false);
  
  // Route Map Popup Modal
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string>('0.00');

  // Animated Custom dropdown
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [packageType, setPackageType] = useState<PackageType>('parcel');

  // Package weight floating input label states
  const [weight, setWeight] = useState('1');
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  
  // Photo states
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Success / Error Alerts
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');
  const [validationError, setValidationError] = useState('');

  // Submit states
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // CTA button springs
  const submitScale = useSharedValue(1);
  const ctaAnimatedStyle = useAnimatedStyle(() => {
    return { transform: [{ scale: submitScale.value }] };
  });

  // Success Checkmark spring scale
  const successCheckScale = useSharedValue(0.3);
  useEffect(() => {
    if (bookingSuccess) {
      successCheckScale.value = withTiming(1, { duration: 600 });
    } else {
      successCheckScale.value = 0.3;
    }
  }, [bookingSuccess]);

  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successCheckScale.value }]
    };
  });

  // Debounced geocoding search
  useEffect(() => {
    if (ignorePickupChange) {
      setIgnorePickupChange(false);
      return;
    }
    const timer = setTimeout(() => {
      triggerAddressSearch(pickup, true);
    }, 600);
    return () => clearTimeout(timer);
  }, [pickup]);

  useEffect(() => {
    if (ignoreDropoffChange) {
      setIgnoreDropoffChange(false);
      return;
    }
    const timer = setTimeout(() => {
      triggerAddressSearch(dropoff, false);
    }, 600);
    return () => clearTimeout(timer);
  }, [dropoff]);

  // Window listener for web communication
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'map_dragged') {
            handleCenterCoordinateUpdate(data.lat, data.lng);
          } else if (data.type === 'route_calculated') {
            setRouteDistance(data.distance);
          }
        } catch {
          // ignore
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const triggerAddressSearch = async (query: string, isPickup: boolean) => {
    if (!query.trim() || query.length < 3) {
      if (isPickup) setPickupSuggestions([]);
      else setDropoffSuggestions([]);
      return;
    }
    if (isPickup) setSearchingPickup(true);
    else setSearchingDropoff(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        { headers: { 'User-Agent': 'VelcoLogistics/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (isPickup) setPickupSuggestions(data);
        else setDropoffSuggestions(data);
      }
    } catch {
      // ignore
    } finally {
      if (isPickup) setSearchingPickup(false);
      else setSearchingDropoff(false);
    }
  };

  const handleSelectSuggestion = (item: any, isPickup: boolean) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const name = item.display_name;

    if (isPickup) {
      setIgnorePickupChange(true);
      setPickup(name);
      setPickupCoords({ lat, lng });
      setPickupSuggestions([]);
    } else {
      setIgnoreDropoffChange(true);
      setDropoff(name);
      setDropoffCoords({ lat, lng });
      setDropoffSuggestions([]);
    }
  };

  const handleGpsDetect = (isPickup: boolean) => {
    setDetectingGps(isPickup ? 'pickup' : 'dropoff');
    
    const successCallback = async (pos: any) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'VelcoLogistics/1.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          const address = data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          if (isPickup) {
            setIgnorePickupChange(true);
            setPickup(address);
            setPickupCoords({ lat, lng });
          } else {
            setIgnoreDropoffChange(true);
            setDropoff(address);
            setDropoffCoords({ lat, lng });
          }
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setDetectingGps(null);
      }
    };

    const errorCallback = () => {
      setTimeout(async () => {
        const mockLat = 37.7749 + (Math.random() - 0.5) * 0.04;
        const mockLng = -122.4194 + (Math.random() - 0.5) * 0.04;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${mockLat}&lon=${mockLng}`,
            { headers: { 'User-Agent': 'VelcoLogistics/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const address = data.display_name || 'San Francisco Center';
            if (isPickup) {
              setIgnorePickupChange(true);
              setPickup(address);
              setPickupCoords({ lat: mockLat, lng: mockLng });
            } else {
              setIgnoreDropoffChange(true);
              setDropoff(address);
              setDropoffCoords({ lat: mockLat, lng: mockLng });
            }
          }
        } catch {
          // ignore
        } finally {
          setDetectingGps(null);
        }
      }, 1200);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, { enableHighAccuracy: true });
    } else {
      errorCallback();
    }
  };

  const handleOpenMapPicker = (type: 'pickup' | 'dropoff') => {
    const defaultCoords = type === 'pickup' 
      ? (pickupCoords || { lat: 37.7749, lng: -122.4194 })
      : (dropoffCoords || { lat: 37.7882, lng: -122.4324 });
    setPickerCoords(defaultCoords);
    setPickerAddress(type === 'pickup' ? pickup : dropoff);
    setShowMapPicker(type);
  };

  const handleCenterCoordinateUpdate = async (lat: number, lng: number) => {
    setPickerCoords({ lat, lng });
    setLoadingReverseGeocode(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'VelcoLogistics/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        setPickerAddress(data.display_name || `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch {
      setPickerAddress(`Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setLoadingReverseGeocode(false);
    }
  };

  const handleNativePickerMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'map_dragged') {
        handleCenterCoordinateUpdate(data.lat, data.lng);
      }
    } catch {
      // ignore
    }
  };

  const handleConfirmMapLocation = () => {
    if (showMapPicker === 'pickup') {
      setIgnorePickupChange(true);
      setPickup(pickerAddress);
      setPickupCoords(pickerCoords);
    } else {
      setIgnoreDropoffChange(true);
      setDropoff(pickerAddress);
      setDropoffCoords(pickerCoords);
    }
    setShowMapPicker(null);
  };

  // Image upload picker with validation
  const handleSelectPhoto = async (useCamera: boolean) => {
    try {
      const { status } = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setValidationError(`We need camera/gallery access to take a photo of the package.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        
        // Compression
        if (Platform.OS === 'web') {
          compressWebImage(localUri, (compressed) => {
            setPhotoUri(compressed);
          });
        } else {
          setPhotoUri(localUri);
        }
      }
    } catch (err) {
      console.warn(err);
    }
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

  const handleCalculateRoute = () => {
    if (!pickupCoords || !dropoffCoords) {
      setValidationError('Please select valid pickup and drop-off locations first.');
      return;
    }
    setShowRouteModal(true);
  };

  const handleConfirmRouteMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'route_calculated') {
        setRouteDistance(data.distance);
      }
    } catch {
      // ignore
    }
  };

  // Multipart uploading with file presence validation
  const handleConfirmBooking = async () => {
    // 1. Validations
    if (!pickup.trim()) {
      setValidationError('Pickup address is required.');
      return;
    }
    if (!dropoff.trim()) {
      setValidationError('Drop-off address is required.');
      return;
    }

    // VALIDATE ATTACHED IMAGE (MUST NOT BE EMPTY)
    if (!photoUri) {
      setValidationError('Please attach a parcel photo before booking.');
      return;
    }

    submitScale.value = withSpring(0.95, {}, (done) => {
      if (done) submitScale.value = withSpring(1);
    });

    setSubmittingOrder(true);
    setUploadProgress(0);
    setIsPhotoUploading(true);

    try {
      const apiUrl = getApiUrl();
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', `${apiUrl}/client/orders`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          setIsPhotoUploading(false);
          setSubmittingOrder(false);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              setSuccessOrderId(res.order._id);
              setBookingSuccess(true);
              // reset fields
              setPickup('');
              setDropoff('');
              setPickupCoords(null);
              setDropoffCoords(null);

              setPhotoUri(null);
            } catch (err) {
              setValidationError('Failed to parse booking response.');
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              setValidationError(res.message || 'Server returned booking error.');
            } catch {
              setValidationError('Connection to delivery server failed.');
            }
          }
        }
      };

      xhr.onerror = () => {
        setIsPhotoUploading(false);
        setSubmittingOrder(false);
        setValidationError('Network connection failed. Please retry.');
      };

      const formData = new FormData();
      formData.append('pickupLocationName', pickup.trim());
      formData.append('dropoffLocationName', dropoff.trim());
      formData.append('weight', weight);
      formData.append('paymentmethod', 'cash');

      if (pickupCoords) {
        formData.append('pickupLocation', JSON.stringify({
          name: pickup.trim(),
          lat: pickupCoords.lat,
          lng: pickupCoords.lng
        }));
      }
      if (dropoffCoords) {
        formData.append('dropoffLocation', JSON.stringify({
          name: dropoff.trim(),
          lat: dropoffCoords.lat,
          lng: dropoffCoords.lng
        }));
      }
      
      const distanceVal = parseFloat(routeDistance) || 5;
      const calculatedAmount = Math.max(15, Math.round(distanceVal * 3.5 + Number(weight) * 2));
      formData.append('totalAmount', String(calculatedAmount));

      if (photoUri) {
        const filename = `parcel_${Date.now()}.jpg`;
        if (Platform.OS === 'web') {
          const res = await fetch(photoUri);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/jpeg' });
          formData.append('photos', file);
        } else {
          formData.append('photos', {
            uri: Platform.OS === 'ios' ? photoUri.replace('file://', '') : photoUri,
            name: filename,
            type: 'image/jpeg',
          } as any);
        }
      }

      xhr.send(formData);

    } catch (err: any) {
      setIsPhotoUploading(false);
      setSubmittingOrder(false);
      setValidationError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#030712' }]}>
      {/* Background glowing gradients */}
      <View style={styles.neonGlowRight} pointerEvents="none" />
      <View style={styles.neonGlowLeft} pointerEvents="none" />

      {/* Spacer instead of top header */}
      <View style={{ height: Spacing.four }} />

      {/* Address Form: Connected Glassmorphism Cards */}
      <View style={styles.glassCardWrapper}>
        <ThemedText type="smallBold" style={styles.cardHeaderTitle}>ROUTE DIRECTORY</ThemedText>

        <View style={styles.locationCardsContainer}>
          {/* Vertical Glowing Route Line Indicator */}
          <View style={styles.verticalRouteTrack} pointerEvents="none">
            <View style={styles.glowingTrackDotGreen} />
            <View style={styles.dashedTrackLine} />
            <View style={styles.glowingTrackDotRed} />
          </View>

          <View style={styles.locationInputsRow}>
            {/* Pickup Interactive Card */}
            <View style={[styles.addressInputCard, { borderColor: 'rgba(60, 159, 254, 0.2)' }]}>
              <View style={styles.addressCardHeader}>
                <ThemedText type="code" style={{ color: '#10B981', fontWeight: '800' }}>PICKUP POINT</ThemedText>
                <View style={styles.addressCardActions}>
                  <Pressable onPress={() => handleGpsDetect(true)} style={styles.glassIconButton}>
                    {detectingGps === 'pickup' ? (
                      <ActivityIndicator size="small" color="#3C9FFE" />
                    ) : (
                      <SymbolView name="location.fill" size={14} tintColor="#3C9FFE" />
                    )}
                  </Pressable>
                  <Pressable onPress={() => handleOpenMapPicker('pickup')} style={styles.glassIconButton}>
                    <SymbolView name="map.fill" size={14} tintColor="#3C9FFE" />
                  </Pressable>
                </View>
              </View>
              <TextInput
                placeholder="Search pickup address..."
                placeholderTextColor="#64748B"
                value={pickup}
                onChangeText={setPickup}
                style={styles.cardTextInput}
              />
              {searchingPickup && <ActivityIndicator size="small" color="#3C9FFE" style={styles.inputSpinner} />}
            </View>

            {/* Suggestions pickup list */}
            {pickupSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {pickupSuggestions.map((item, idx) => (
                  <Pressable 
                    key={idx} 
                    onPress={() => handleSelectSuggestion(item, true)} 
                    style={styles.suggestionItem}
                  >
                    <SymbolView name="mappin.and.ellipse" size={13} tintColor="#3C9FFE" />
                    <ThemedText type="small" numberOfLines={1} style={{ flex: 1, color: '#F1F5F9' }}>{item.display_name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Dropoff Interactive Card */}
            <View style={[styles.addressInputCard, { borderColor: 'rgba(60, 159, 254, 0.2)' }]}>
              <View style={styles.addressCardHeader}>
                <ThemedText type="code" style={{ color: '#FF3B30', fontWeight: '800' }}>DESTINATION POINT</ThemedText>
                <View style={styles.addressCardActions}>
                  <Pressable onPress={() => handleGpsDetect(false)} style={styles.glassIconButton}>
                    {detectingGps === 'dropoff' ? (
                      <ActivityIndicator size="small" color="#3C9FFE" />
                    ) : (
                      <SymbolView name="location.fill" size={14} tintColor="#3C9FFE" />
                    )}
                  </Pressable>
                  <Pressable onPress={() => handleOpenMapPicker('dropoff')} style={styles.glassIconButton}>
                    <SymbolView name="map.fill" size={14} tintColor="#3C9FFE" />
                  </Pressable>
                </View>
              </View>
              <TextInput
                placeholder="Search drop-off destination..."
                placeholderTextColor="#64748B"
                value={dropoff}
                onChangeText={setDropoff}
                style={styles.cardTextInput}
              />
              {searchingDropoff && <ActivityIndicator size="small" color="#3C9FFE" style={styles.inputSpinner} />}
            </View>

            {/* Suggestions dropoff list */}
            {dropoffSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {dropoffSuggestions.map((item, idx) => (
                  <Pressable 
                    key={idx} 
                    onPress={() => handleSelectSuggestion(item, false)} 
                    style={styles.suggestionItem}
                  >
                    <SymbolView name="mappin.and.ellipse" size={13} tintColor="#3C9FFE" />
                    <ThemedText type="small" numberOfLines={1} style={{ flex: 1, color: '#F1F5F9' }}>{item.display_name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {pickupCoords && dropoffCoords && (
          <Pressable onPress={handleCalculateRoute} style={styles.gradientCalcBtn}>
            <SymbolView name="arrow.triangle.turn.up.right.diamond.fill" size={14} tintColor="#FFFFFF" />
            <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>View Active Route & Pricing</ThemedText>
          </Pressable>
        )}
      </View>

      {/* Shipment Configuration: Only Standard Parcel */}
      <View style={styles.glassCardWrapper}>
        <ThemedText type="smallBold" style={styles.cardHeaderTitle}>SHIPMENT CONFIGURATION</ThemedText>
        <View style={[styles.dropdownHeader, { borderColor: 'rgba(60, 159, 254, 0.2)', marginBottom: Spacing.three }]}>
          <View style={styles.dropdownHeaderLeft}>
            <SymbolView name="shippingbox.fill" size={18} tintColor="#3C9FFE" />
            <View>
              <ThemedText type="smallBold" style={{ color: '#F8FAFC' }}>Standard Parcel</ThemedText>
              <ThemedText type="code" style={{ color: '#94A3B8', fontSize: 10 }}>Standard box delivery</ThemedText>
            </View>
          </View>
        </View>

        {/* Weight Input Field */}
        <View style={[styles.weightInputCard, { borderColor: isWeightFocused ? '#3C9FFE' : 'rgba(60, 159, 254, 0.2)' }]}>
          <SymbolView name="scalemass.fill" size={16} tintColor="#3C9FFE" style={styles.inputLeftIcon} />
          <View style={{ flex: 1, position: 'relative' }}>
            <ThemedText
              style={[
                styles.floatingLabel,
                (isWeightFocused || weight !== '') ? styles.floatingLabelActive : styles.floatingLabelInactive,
                { color: (isWeightFocused || weight !== '') ? '#3C9FFE' : '#64748B' }
              ]}
            >
              Weight (kg)
            </ThemedText>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              style={[styles.floatingTextInput, { width: '100%' }]}
              onFocus={() => setIsWeightFocused(true)}
              onBlur={() => setIsWeightFocused(false)}
            />
          </View>
        </View>
      </View>

      {/* Drag & Drop Style Parcel Photo Upload Card */}
      <View style={styles.glassCardWrapper}>
        <ThemedText type="smallBold" style={styles.cardHeaderTitle}>IMAGE ATTACHMENT (REQUIRED)</ThemedText>

        {photoUri ? (
          <View style={styles.uploadPreviewCard}>
            <Image source={{ uri: photoUri }} style={styles.uploadPreviewImage} />
            <View style={styles.previewControls}>
              <Pressable onPress={() => handleSelectPhoto(true)} style={styles.previewControlMiniBtn}>
                <SymbolView name="camera.fill" size={13} tintColor="#3C9FFE" />
                <ThemedText type="code" style={{ fontSize: 9, color: '#3C9FFE' }}>Retake</ThemedText>
              </Pressable>
              <Pressable onPress={() => setPhotoUri(null)} style={styles.previewControlMiniBtn}>
                <SymbolView name="trash.fill" size={13} tintColor="#FF3B30" />
                <ThemedText type="code" style={{ fontSize: 9, color: '#FF3B30' }}>Remove</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.dragUploadCard, { borderColor: 'rgba(60, 159, 254, 0.3)' }]}>
            <View style={styles.uploadCameraFrame}>
              <SymbolView name="camera.fill" size={24} tintColor="#3C9FFE" />
            </View>
            <ThemedText type="smallBold" style={{ color: '#F8FAFC', marginTop: Spacing.two }}>Upload Parcel Picture</ThemedText>
            <ThemedText type="code" style={{ color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
              Supports JPG, PNG, WEBP formats up to 10 MB.
            </ThemedText>
            
            <View style={styles.uploadActionsGroup}>
              <Pressable onPress={() => handleSelectPhoto(true)} style={[styles.selectorMiniBtn, { backgroundColor: '#3C9FFE20' }]}>
                <SymbolView name="camera.fill" size={12} tintColor="#3C9FFE" />
                <ThemedText type="code" style={{ color: '#3C9FFE', fontSize: 11, fontWeight: '700' }}>Camera</ThemedText>
              </Pressable>
              <Pressable onPress={() => handleSelectPhoto(false)} style={[styles.selectorMiniBtn, { backgroundColor: '#10B98120' }]}>
                <SymbolView name="photo.fill" size={12} tintColor="#10B981" />
                <ThemedText type="code" style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Upload</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Upload Progress Loader overlay card */}
      {isPhotoUploading && (
        <View style={styles.uploadProgressBarCard}>
          <View style={styles.uploadProgressBarHeader}>
            <ThemedText type="smallBold" style={{ color: '#F1F5F9' }}>Uploading parcel attachment...</ThemedText>
            <ThemedText type="code" style={{ color: '#3C9FFE', fontWeight: '800' }}>{uploadProgress}%</ThemedText>
          </View>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarInner, { width: `${uploadProgress}%`, backgroundColor: '#3C9FFE' }]} />
          </View>
        </View>
      )}

      {/* Colorful Trust Badges Section */}
      <View style={styles.trustBadgesRow}>
        <View style={styles.badgeItem}>
          <SymbolView name="shield.fill" size={14} tintColor="#10B981" />
          <ThemedText type="code" style={styles.badgeText}>Secure Delivery</ThemedText>
        </View>
        <View style={styles.badgeItem}>
          <SymbolView name="map.fill" size={14} tintColor="#3C9FFE" />
          <ThemedText type="code" style={styles.badgeText}>Live Tracking</ThemedText>
        </View>
        <View style={styles.badgeItem}>
          <SymbolView name="bolt.fill" size={14} tintColor="#F59E0B" />
          <ThemedText type="code" style={styles.badgeText}>Fast Pickup</ThemedText>
        </View>
      </View>

      {/* Confirm and calculate gradient CTA button */}
      <Animated.View style={[ctaAnimatedStyle, styles.bookingCTAWrapper]}>
        <Pressable 
          onPress={handleConfirmBooking} 
          disabled={submittingOrder}
          style={styles.bookingGradientBtn}
        >
          {submittingOrder ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Calculate Price & Book</ThemedText>
              <SymbolView name="arrow.right" size={16} tintColor="#FFFFFF" />
            </>
          )}
        </Pressable>
      </Animated.View>

      <View style={{ height: Spacing.six }} />

      {/* ============================================================== */}
      {/* MODAL: INTERACTIVE MAP PICKER */}
      <Modal visible={showMapPicker !== null} transparent animationType="slide">
        <View style={styles.modalMapOverlay}>
          <View style={styles.modalMapHeader}>
            <Pressable onPress={() => setShowMapPicker(null)} style={styles.closeMapBtn}>
              <SymbolView name="xmark" size={18} tintColor="#FFFFFF" />
            </Pressable>
            <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
              Drag Pin: {showMapPicker === 'pickup' ? 'Pickup' : 'Drop-off'}
            </ThemedText>
          </View>

          {showMapPicker && (
            <View style={styles.mapContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={getMapPickerHtml(pickerCoords.lat, pickerCoords.lng)}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  title="Picker Map"
                />
              ) : (
                <WebView
                  source={{ html: getMapPickerHtml(pickerCoords.lat, pickerCoords.lng) }}
                  onMessage={handleNativePickerMessage}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}

          {/* Draggable footer address overlay */}
          <View style={[styles.mapPickerFooter, { backgroundColor: '#111827', borderTopColor: '#27272A' }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="code" style={{ color: '#94A3B8' }}>CONFIRM MAP POSITION</ThemedText>
              {loadingReverseGeocode ? (
                <ActivityIndicator size="small" color="#3C9FFE" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              ) : (
                <ThemedText type="smallBold" numberOfLines={2} style={{ marginTop: 2, color: '#F1F5F9' }}>{pickerAddress || 'Point picked...'}</ThemedText>
              )}
            </View>
            <Pressable onPress={handleConfirmMapLocation} style={[styles.mapPickerConfirmBtn, { backgroundColor: '#3C9FFE' }]}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Select Location</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: PREMIUM ROUTE DETAILS PREVIEW */}
      <Modal visible={showRouteModal} transparent animationType="slide">
        <View style={styles.modalMapOverlay}>
          <View style={styles.modalMapHeader}>
            <Pressable onPress={() => setShowRouteModal(false)} style={styles.closeMapBtn}>
              <SymbolView name="xmark" size={18} tintColor="#FFFFFF" />
            </Pressable>
            <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Live Route Map Viewer</ThemedText>
          </View>

          {showRouteModal && pickupCoords && dropoffCoords && (
            <View style={styles.mapContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={getRouteViewHtml(pickupCoords.lat, pickupCoords.lng, pickup, dropoffCoords.lat, dropoffCoords.lng, dropoff)}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  title="Route Map"
                />
              ) : (
                <WebView
                  source={{ html: getRouteViewHtml(pickupCoords.lat, pickupCoords.lng, pickup, dropoffCoords.lat, dropoffCoords.lng, dropoff) }}
                  onMessage={handleConfirmRouteMapMessage}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}

          {/* Details Overlay Card - PERSISTENT IN MODAL */}
          <View style={[styles.routePickerFooter, { backgroundColor: '#111827', borderTopColor: '#27272A' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: Spacing.two }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="code" style={{ color: '#94A3B8' }}>TOTAL ROUTE DISTANCE</ThemedText>
                <ThemedText type="subtitle" style={{ color: '#3C9FFE', fontWeight: '800' }}>Distance: {routeDistance} km</ThemedText>
              </View>
            </View>
            <Pressable onPress={() => setShowRouteModal(false)} style={[styles.mapPickerConfirmBtn, { alignSelf: 'stretch', height: 46, backgroundColor: '#3C9FFE' }]}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Confirm Location Details</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* AWARD-WINNING SUCCESS MODAL UI WITH FLOATING PARTICLES */}
      <Modal visible={bookingSuccess} transparent animationType="fade">
        <View style={styles.modalAlertOverlay}>
          <ThemedView type="backgroundElement" style={[styles.awardSuccessCard, { borderColor: 'rgba(60, 159, 254, 0.3)' }]}>
            
            {/* Particle Effects container */}
            <View style={styles.particleContainer} pointerEvents="none">
              <Particle delay={0} />
              <Particle delay={400} />
              <Particle delay={800} />
              <Particle delay={1200} />
              <Particle delay={1600} />
              <Particle delay={2000} />
            </View>

            {/* Glowing success ring */}
            <Animated.View style={[checkmarkAnimatedStyle, styles.successRingGlow, { borderColor: '#10B981' }]}>
              <SymbolView name="checkmark.seal.fill" size={38} tintColor="#10B981" />
            </Animated.View>

            <ThemedText type="subtitle" style={{ textAlign: 'center', marginTop: Spacing.three, color: '#F8FAFC', fontWeight: '800' }}>
              Booking Confirmed!
            </ThemedText>
            
            <ThemedText style={{ textAlign: 'center', marginVertical: Spacing.two, fontSize: 13, color: '#94A3B8', paddingHorizontal: Spacing.two }}>
              Your order has been registered successfully. You can track this shipment in real-time.
            </ThemedText>

            <View style={[styles.idBadgeContainer, { backgroundColor: '#3C9FFE15', borderColor: '#3C9FFE30' }]}>
              <ThemedText type="code" style={{ color: '#3C9FFE', fontWeight: '800' }}>
                ID: #{successOrderId.substring(successOrderId.length - 8).toUpperCase()}
              </ThemedText>
            </View>

            <Pressable onPress={() => setBookingSuccess(false)} style={styles.successGradientBtn}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Track Shipment</ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: CUSTOM ERROR / VALIDATION DIALOG */}
      <Modal visible={validationError !== ''} transparent animationType="fade">
        <View style={styles.modalAlertOverlay}>
          <ThemedView type="backgroundElement" style={[styles.alertCard, { borderColor: 'rgba(255, 59, 48, 0.3)' }]}>
            <View style={[styles.alertIconCircle, { backgroundColor: '#FF3B3015' }]}>
              <SymbolView name="exclamationmark.triangle.fill" size={32} tintColor="#FF3B30" />
            </View>
            <ThemedText type="subtitle" style={{ textAlign: 'center', marginTop: Spacing.three, color: '#F8FAFC' }}>Required Information</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginVertical: Spacing.two, fontSize: 13, color: '#94A3B8' }}>
              {validationError}
            </ThemedText>
            <Pressable onPress={() => setValidationError('')} style={[styles.alertBtn, { backgroundColor: '#FF3B30' }]}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Review Booking Form</ThemedText>
            </Pressable>
          </ThemedView>
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
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  glassCardWrapper: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.12)',
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeaderTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#94A3B8',
    marginBottom: Spacing.three,
    fontWeight: '700',
  },
  locationCardsContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  verticalRouteTrack: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  glowingTrackDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  glowingTrackDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dashedTrackLine: {
    flex: 1,
    width: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  locationInputsRow: {
    flex: 1,
    gap: Spacing.three,
  },
  addressInputCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressCardActions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  glassIconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(60, 159, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextInput: {
    color: '#F1F5F9',
    fontSize: 13.5,
    paddingVertical: Platform.OS === 'web' ? 6 : 2,
  },
  inputSpinner: {
    position: 'absolute',
    right: 76,
    top: 24,
  },
  suggestionsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(60, 159, 254, 0.2)',
    overflow: 'hidden',
    marginTop: -8,
    zIndex: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  gradientCalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#3C9FFE22',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(60, 159, 254, 0.3)',
    marginTop: Spacing.three,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    height: 52,
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dropdownOptionsList: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.2)',
    marginTop: Spacing.one,
    overflow: 'hidden',
    zIndex: 20,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionRowActive: {
    backgroundColor: '#3C9FFE30',
  },
  dividerSpacer: {
    height: Spacing.one,
  },
  weightInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  inputLeftIcon: {
    marginRight: Spacing.two,
  },
  floatingTextInput: {
    color: '#F8FAFC',
    fontSize: 14,
    height: '100%',
    paddingTop: 10,
  },
  floatingLabel: {
    position: 'absolute',
    fontWeight: '600',
  },
  floatingLabelActive: {
    top: 2,
    fontSize: 9.5,
  },
  floatingLabelInactive: {
    top: 13,
    fontSize: 13.5,
  },
  uploadPreviewCard: {
    height: 150,
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(60, 159, 254, 0.3)',
  },
  uploadPreviewImage: {
    width: '100%',
    height: '100%',
  },
  previewControls: {
    position: 'absolute',
    bottom: Spacing.two,
    left: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewControlMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragUploadCard: {
    height: 160,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(30, 41, 59, 0.25)',
  },
  uploadCameraFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(60, 159, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3C9FFE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadActionsGroup: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  selectorMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    borderRadius: 10,
  },
  uploadProgressBarCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    padding: Spacing.three,
    backgroundColor: 'rgba(60, 159, 254, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(60, 159, 254, 0.2)',
    borderRadius: 14,
    gap: Spacing.one,
  },
  uploadProgressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBarOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.four,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
  },
  bookingCTAWrapper: {
    paddingHorizontal: Spacing.four,
  },
  bookingGradientBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#3C9FFE',
    shadowColor: '#3C9FFE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  modalMapOverlay: {
    flex: 1,
    backgroundColor: '#030712',
  },
  modalMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 60,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  closeMapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  mapPickerFooter: {
    padding: Spacing.four,
    borderTopWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  routePickerFooter: {
    padding: Spacing.four,
    borderTopWidth: 1.5,
    flexDirection: 'column',
    gap: Spacing.two,
  },
  mapPickerConfirmBtn: {
    paddingHorizontal: Spacing.four,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAlertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: Spacing.four,
  },
  awardSuccessCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.five,
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    position: 'relative',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  successRingGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 3,
  },
  idBadgeContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  successGradientBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  particle: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertCard: {
    width: '100%',
    maxWidth: 310,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.four,
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  alertIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
