/**
 * useLocation hook — uses IP + GPS approach
 *
 * Flow:
 * 1. Show cache immediately (0ms)
 * 2. Get fresh location in background (IP fallback + GPS if permitted)
 * 3. Never shows "detecting" for more than 3 seconds
 * 4. Never asks permission automatically — only when user taps "Enable GPS"
 */
import { useState, useEffect, useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import {
  UserLocation,
  getCachedLocation,
  getFreshLocation,
  requestAndGetGPS,
  getLocationDisplay,
} from '../services/location';

export type LocationState = 'loading' | 'ready' | 'error';

export interface UseLocationResult {
  location: UserLocation | null;
  displayCity: string;
  displayFull: string;
  displayArea: string;
  state: LocationState;
  refresh: () => void;
  askPermission: () => Promise<void>;
  openSettings: () => void;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [state, setState] = useState<LocationState>('loading');

  const load = useCallback(async () => {
    try {
      // Show cache immediately
      const cached = await getCachedLocation();
      if (cached) {
        setLocation(cached);
        setState('ready');
      }

      // On first ever load: ask permission once (if not yet determined)
      const { status } = await (await import('expo-location')).getForegroundPermissionsAsync();
      if (status === 'undetermined') {
        // First time — ask permission once
        const gps = await requestAndGetGPS();
        if (gps) { setLocation(gps); setState('ready'); return; }
      }

      // Get fresh location in background (GPS if permitted, else IP)
      const fresh = await getFreshLocation();
      if (fresh) {
        setLocation(fresh);
        setState('ready');
      } else if (!cached) {
        setState('error');
      }
    } catch {
      if (!location) setState('error');
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Force timeout — never stay loading more than 4 seconds
  useEffect(() => {
    if (state === 'loading') {
      const timer = setTimeout(() => {
        if (state === 'loading') setState(location ? 'ready' : 'error');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const refresh = useCallback(() => {
    setState('loading');
    load();
  }, [load]);

  const askPermission = useCallback(async () => {
    const result = await requestAndGetGPS();
    if (result) {
      setLocation(result);
      setState('ready');
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('Settings', 'Go to Settings → Apps → BookMyShot → Permissions → Location');
    });
  }, []);

  return {
    location,
    displayCity: location?.city || location?.district || '',
    displayFull: getLocationDisplay(location),
    displayArea: location?.area || '',
    state,
    refresh,
    askPermission,
    openSettings,
  };
}
