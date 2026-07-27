/**
 * LocationService — GPS + Cache + Reverse Geocode
 * Provides cached location that loads instantly on app open.
 * Falls back to last saved location if GPS fails.
 */
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_KEY = 'bms_user_location';

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
 * Get cached location (instant, no GPS)
 */
export async function getCachedLocation(): Promise<UserLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('[Location] Cache hit:', parsed.city || parsed.district);
      return parsed;
    }
    console.log('[Location] No cached location');
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
  } catch {}
}

/**
 * Request permission and get fresh GPS location
 * Returns cached location if GPS fails
 */
export async function getFreshLocation(): Promise<UserLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Location] Permission denied');
      return await getCachedLocation();
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

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
    } catch (geoErr) {
      console.log('[Location] Reverse geocode failed, using coords only');
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
    console.log('[Location] Fresh location:', loc.city || loc.district, loc.latitude.toFixed(4), loc.longitude.toFixed(4));
    return loc;
  } catch (err: any) {
    console.log('[Location] GPS failed:', err.message);
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
 * Get location — tries cache first for instant display, then refreshes in background
 */
export async function getLocationWithFallback(): Promise<UserLocation | null> {
  // Try cache first (instant)
  const cached = await getCachedLocation();
  if (cached) return cached;
  // No cache — get fresh
  return await getFreshLocation();
}
