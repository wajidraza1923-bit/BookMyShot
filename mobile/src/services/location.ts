/**
 * BookMyShot Location Service — Production Grade
 *
 * Strategy:
 * 1. Check permission status WITHOUT showing popup (getForegroundPermissionsAsync)
 * 2. Only ask ONCE if status is 'undetermined'
 * 3. Never ask again if already granted or denied
 * 4. Get position: try Balanced accuracy first (fast), then lastKnown fallback
 * 5. Reverse geocode for full address (city, district, state, area)
 * 6. Cache everything in AsyncStorage for instant reload
 * 7. Never block UI — always return something within 10 seconds
 */
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'bms_location_v2';
const PERMISSION_STATUS_KEY = 'bms_location_permission_v2';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  area: string;
  fullAddress: string;
  postalCode: string;
  country: string;
  timestamp: number;
  accuracy: 'gps' | 'network' | 'cached' | 'unknown';
}

// ─── PERMISSION STATUS ──────────────────────────────────────────────────────

export type PermissionResult = 'granted' | 'denied' | 'undetermined';

/**
 * Check current permission status (NO popup)
 */
export async function getLocationPermissionStatus(): Promise<PermissionResult> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    console.log('[Location] Current permission status:', status);
    return status as PermissionResult;
  } catch (e: any) {
    console.log('[Location] Permission check error:', e.message);
    return 'undetermined';
  }
}

/**
 * Request permission ONCE. Returns false if denied.
 * Call this only when the user explicitly agrees to share location.
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    console.log('[Location] Requesting permission from user...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    await AsyncStorage.setItem(PERMISSION_STATUS_KEY, status);
    console.log('[Location] Permission result:', status);
    return granted;
  } catch (e: any) {
    console.log('[Location] Permission request error:', e.message);
    return false;
  }
}

/**
 * Check if GPS hardware is enabled on device
 */
export async function isGPSEnabled(): Promise<boolean> {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    console.log('[Location] GPS services enabled:', enabled);
    return enabled;
  } catch {
    return true; // assume enabled to avoid false negatives
  }
}

// ─── CACHE ──────────────────────────────────────────────────────────────────

export async function getCachedLocation(): Promise<UserLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const loc: UserLocation = JSON.parse(raw);
    if (!loc.latitude || !loc.longitude) return null;
    const age = Date.now() - loc.timestamp;
    console.log(`[Location] Cache: ${loc.city || loc.district || 'coords'} (${Math.floor(age / 60000)}m old)`);
    return loc;
  } catch {
    return null;
  }
}

async function saveToCache(loc: UserLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc));
    await AsyncStorage.setItem(PERMISSION_STATUS_KEY, 'granted');
  } catch {}
}

// ─── REVERSE GEOCODE ─────────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number) {
  const result = { city: '', district: '', state: '', area: '', fullAddress: '', postalCode: '', country: '' };
  try {
    const [addr] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!addr) return result;

    console.log('[Location] Geocode raw:', JSON.stringify({
      name: addr.name,
      street: addr.street,
      district: addr.district,
      subregion: addr.subregion,
      city: addr.city,
      region: addr.region,
      country: addr.country,
      postalCode: addr.postalCode,
    }));

    result.area = addr.name || addr.street || '';
    result.district = addr.subregion || addr.district || '';
    result.city = addr.city || addr.subregion || addr.district || '';
    result.state = addr.region || '';
    result.country = addr.country || '';
    result.postalCode = addr.postalCode || '';

    // Build full address string
    const parts = [result.area, result.district, result.city, result.state, result.country].filter(Boolean);
    result.fullAddress = [...new Set(parts)].join(', ');

    console.log(`[Location] Geocode: ${result.city}, ${result.state}, ${result.country}`);
  } catch (e: any) {
    console.log('[Location] Reverse geocode failed:', e.message);
  }
  return result;
}

// ─── MAIN: GET FRESH LOCATION ─────────────────────────────────────────────

/**
 * Get fresh location. Does NOT ask for permission — call requestLocationPermission() first.
 * Returns null if permission denied or GPS unavailable.
 */
export async function getFreshLocation(): Promise<UserLocation | null> {
  try {
    // 1. Check permission (no popup)
    const permStatus = await getLocationPermissionStatus();
    if (permStatus !== 'granted') {
      console.log('[Location] Permission not granted, status:', permStatus);
      return null;
    }

    // 2. Get position — try getCurrentPositionAsync with timeout
    let position: Location.LocationObject | null = null;

    console.log('[Location] Requesting GPS position...');
    try {
      // Use Balanced accuracy (fast enough, works on most devices)
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 90000, // Accept cached position up to 1.5 min old for speed
      });
      // Hard 10-second timeout
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GPS 10s timeout')), 10000)
      );
      position = await Promise.race([positionPromise, timeout]) as Location.LocationObject;
      console.log(`[Location] Got position: lat=${position.coords.latitude.toFixed(5)}, lng=${position.coords.longitude.toFixed(5)}, accuracy=${Math.round(position.coords.accuracy || 0)}m`);
    } catch (gpserr: any) {
      console.log('[Location] getCurrentPosition failed:', gpserr.message, '— trying lastKnown...');
      try {
        position = await Location.getLastKnownPositionAsync({ maxAge: 600000 }); // up to 10 min
        if (position) {
          console.log(`[Location] lastKnown: lat=${position.coords.latitude.toFixed(5)}, lng=${position.coords.longitude.toFixed(5)}`);
        }
      } catch (lkerr: any) {
        console.log('[Location] lastKnown also failed:', lkerr.message);
      }
    }

    if (!position) {
      console.log('[Location] No position from GPS or lastKnown — returning cache');
      return await getCachedLocation();
    }

    // 3. Reverse geocode
    const geo = await reverseGeocode(position.coords.latitude, position.coords.longitude);

    const loc: UserLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      city: geo.city,
      district: geo.district,
      state: geo.state,
      area: geo.area,
      fullAddress: geo.fullAddress,
      postalCode: geo.postalCode,
      country: geo.country,
      timestamp: Date.now(),
      accuracy: position.coords.accuracy && position.coords.accuracy < 100 ? 'gps' : 'network',
    };

    // 4. Save to cache
    await saveToCache(loc);
    console.log(`[Location] ✅ Location ready: "${loc.city || loc.district || loc.fullAddress || 'coords only'}" (${loc.accuracy})`);
    return loc;
  } catch (e: any) {
    console.log('[Location] getFreshLocation crash:', e.message);
    return await getCachedLocation();
  }
}

/**
 * Haversine distance in km
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Display string for the location (city, state or fallback)
 */
export function getLocationDisplayString(loc: UserLocation | null): string {
  if (!loc) return '';
  if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
  if (loc.city) return loc.city;
  if (loc.district) return loc.district;
  if (loc.state) return loc.state;
  if (loc.fullAddress) return loc.fullAddress;
  if (loc.latitude) return `${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`;
  return '';
}
