/**
 * LocationService — GPS + Cache + Reverse Geocode
 * - Always checks permission status FIRST (no re-asking if already granted)
 * - Uses cache for instant display
 * - Gets high-accuracy GPS with timeout fallback
 * - Never returns null if permission is granted (uses last known position)
 */
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_KEY = 'bms_user_location';
const PERMISSION_KEY = 'bms_location_permission';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  area: string;
  timestamp: number;
}

/**
 * Check if location permission is already granted (no popup)
 */
export async function isLocationPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Check if GPS/Location services are enabled on the device
 */
export async function isGPSEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * Get cached location (instant, no GPS call)
 */
export async function getCachedLocation(): Promise<UserLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.latitude && parsed.longitude) {
        console.log('[Location] Cache hit:', parsed.city || parsed.district, `(${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)})`);
        return parsed;
      }
    }
  } catch (e: any) {
    console.log('[Location] Cache read error:', e.message);
  }
  return null;
}

/**
 * Save location to cache
 */
export async function cacheLocation(loc: UserLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    await AsyncStorage.setItem(PERMISSION_KEY, 'granted');
  } catch {}
}

/**
 * Request permission (only if not already granted) and get fresh GPS location
 * Returns null ONLY if permission is denied. Never returns null for GPS timeout (uses last known).
 */
export async function getFreshLocation(): Promise<UserLocation | null> {
  try {
    // Step 1: Check existing permission (no popup if already granted)
    let { status } = await Location.getForegroundPermissionsAsync();
    
    // Step 2: Request only if not yet determined
    if (status !== 'granted') {
      const result = await Location.requestForegroundPermissionsAsync();
      status = result.status;
    }

    if (status !== 'granted') {
      console.log('[Location] Permission DENIED by user');
      await AsyncStorage.setItem(PERMISSION_KEY, 'denied');
      return null; // null = permission denied
    }

    // Permission granted — save this fact
    await AsyncStorage.setItem(PERMISSION_KEY, 'granted');

    // Step 3: Try to get current position with 8-second timeout
    let position: Location.LocationObject | null = null;
    try {
      // Race between GPS and a timeout
      const gpsPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Balanced is much faster than High
        timeInterval: 3000,
        maximumAge: 120000, // Accept position up to 2 min old (fast!)
      });
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('GPS timeout after 8s')), 8000)
      );
      position = await Promise.race([gpsPromise, timeoutPromise as any]) as Location.LocationObject;
    } catch (e: any) {
      console.log('[Location] getCurrentPosition failed, trying lastKnown:', e.message);
      // Fallback: get last known position (instant, no GPS needed)
      try {
        position = await Location.getLastKnownPositionAsync({
          maxAge: 600000, // Accept up to 10 min old
        });
      } catch {}
    }

    if (!position) {
      console.log('[Location] No position available, using cache');
      return await getCachedLocation();
    }

    // Step 4: Reverse geocode
    let city = '', district = '', state = '', area = '';
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (address) {
        city = address.city || address.subregion || '';
        district = address.subregion || address.district || address.region || '';
        state = address.region || '';
        area = address.name || address.street || address.district || '';
      }
    } catch (geoErr: any) {
      console.log('[Location] Reverse geocode failed:', geoErr.message);
      // Still return coords without city name
    }

    const loc: UserLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      city,
      district,
      state,
      area,
      timestamp: Date.now(),
    };

    await cacheLocation(loc);
    console.log('[Location] ✅ Fresh GPS:', loc.latitude.toFixed(5), loc.longitude.toFixed(5), '|', loc.city || loc.district || 'No city name');
    return loc;
  } catch (err: any) {
    console.log('[Location] getFreshLocation error:', err.message);
    // Return cache as fallback (don't return null — permission might be granted)
    return await getCachedLocation();
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Quick check: was permission previously granted? (instant, no async permission check)
 */
export async function wasPermissionPreviouslyGranted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PERMISSION_KEY);
    return val === 'granted';
  } catch {
    return false;
  }
}
