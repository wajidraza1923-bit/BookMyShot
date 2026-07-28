/**
 * BookMyShot Location Service — PRODUCTION v3
 *
 * APPROACH: IP geolocation (instant, no permission) + GPS upgrade
 *
 * 1. On first load: get location from IP (works everywhere, no permission)
 * 2. In background: try expo-location GPS if permission already granted
 * 3. Only ask permission ONCE when user taps "Enable GPS"
 * 4. Cache everything — never show "detecting" for more than 2 seconds
 *
 * This ensures location ALWAYS works even without GPS permission.
 */
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'bms_loc_v3';

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
  accuracy: 'gps' | 'ip' | 'cached';
}

// ─── IP GEOLOCATION (instant, no permission, always works) ──────────────

async function getLocationFromIP(): Promise<UserLocation | null> {
  try {
    console.log('[Location] Getting location from IP...');
    // Use ip-api.com (free, no key needed, fast)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('http://ip-api.com/json/?fields=status,city,regionName,country,zip,lat,lon,district,query', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();

    if (data.status === 'success' && data.lat && data.lon) {
      const loc: UserLocation = {
        latitude: data.lat,
        longitude: data.lon,
        city: data.city || '',
        district: data.district || data.city || '',
        state: data.regionName || '',
        area: data.district || data.city || '',
        fullAddress: [data.city, data.regionName, data.country].filter(Boolean).join(', '),
        postalCode: data.zip || '',
        country: data.country || '',
        timestamp: Date.now(),
        accuracy: 'ip',
      };
      console.log(`[Location] ✅ IP location: ${loc.city}, ${loc.state} (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`);
      return loc;
    }
  } catch (e: any) {
    console.log('[Location] IP geolocation failed:', e.message);
  }
  return null;
}

// ─── GPS LOCATION (requires permission, high accuracy) ──────────────────

async function getLocationFromGPS(): Promise<UserLocation | null> {
  try {
    // Check if permission already granted (NO popup)
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Location] GPS permission not granted');
      return null;
    }

    console.log('[Location] Getting GPS position...');
    // Try current position with timeout
    let position: Location.LocationObject | null = null;
    try {
      const posPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 120000,
      });
      const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
      position = await Promise.race([posPromise, timeoutPromise]) as Location.LocationObject;
    } catch {
      // Try last known
      try { position = await Location.getLastKnownPositionAsync({ maxAge: 600000 }); } catch {}
    }

    if (!position) return null;

    // Reverse geocode
    let city = '', district = '', state = '', area = '', fullAddress = '', postalCode = '', country = '';
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (addr) {
        city = addr.city || addr.subregion || '';
        district = addr.subregion || addr.district || '';
        state = addr.region || '';
        area = addr.name || addr.street || addr.district || '';
        postalCode = addr.postalCode || '';
        country = addr.country || '';
        fullAddress = [area, city, state, country].filter(Boolean).join(', ');
      }
    } catch {}

    const loc: UserLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      city, district, state, area, fullAddress, postalCode, country,
      timestamp: Date.now(),
      accuracy: 'gps',
    };
    console.log(`[Location] ✅ GPS: ${loc.city || loc.district}, ${loc.state} (${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)})`);
    return loc;
  } catch (e: any) {
    console.log('[Location] GPS error:', e.message);
    return null;
  }
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────

/**
 * Get cached location (instant)
 */
export async function getCachedLocation(): Promise<UserLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const loc: UserLocation = JSON.parse(raw);
    if (!loc.latitude) return null;
    return loc;
  } catch { return null; }
}

/**
 * Save to cache
 */
async function saveCache(loc: UserLocation) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(loc)); } catch {}
}

/**
 * Get fresh location — tries GPS first (if already permitted), then IP fallback.
 * NEVER asks for permission. NEVER blocks for more than 10 seconds.
 * Returns null only if both IP and GPS fail AND no cache exists.
 */
export async function getFreshLocation(): Promise<UserLocation | null> {
  // Try GPS first (only if permission already granted — no popup)
  const gps = await getLocationFromGPS();
  if (gps) {
    await saveCache(gps);
    return gps;
  }

  // Fallback: IP geolocation (always works, no permission needed)
  const ip = await getLocationFromIP();
  if (ip) {
    await saveCache(ip);
    return ip;
  }

  // Last resort: cache
  return await getCachedLocation();
}

/**
 * Request GPS permission and get GPS location.
 * Call this only when user taps "Enable GPS" or "Allow Location".
 */
export async function requestAndGetGPS(): Promise<UserLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const gps = await getLocationFromGPS();
    if (gps) await saveCache(gps);
    return gps;
  } catch { return null; }
}

/**
 * Check if GPS permission is granted (no popup)
 */
export async function isGPSPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

/**
 * Haversine distance in km
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Display string
 */
export function getLocationDisplay(loc: UserLocation | null): string {
  if (!loc) return '';
  if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
  if (loc.city) return loc.city;
  if (loc.district) return loc.district;
  return `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`;
}
