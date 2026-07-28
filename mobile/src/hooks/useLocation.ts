/**
 * useLocation — Shared location hook for HomeScreen and NearMeScreen
 *
 * Permission logic:
 * - First load: check status (no popup). If 'undetermined' → ask ONCE.
 * - Subsequent loads: never ask again.
 * - If denied: show "Enable Location" button, open settings.
 * - If GPS off: show "Turn on GPS" prompt.
 */
import { useState, useEffect, useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import {
  UserLocation,
  getCachedLocation,
  getFreshLocation,
  getLocationPermissionStatus,
  requestLocationPermission,
  isGPSEnabled,
  getLocationDisplayString,
} from '../services/location';

export type LocationState =
  | 'loading'       // first load
  | 'detecting'     // GPS in progress
  | 'ready'         // location obtained
  | 'denied'        // permission denied
  | 'gps_off'       // GPS hardware disabled
  | 'error';        // unexpected error

export interface UseLocationResult {
  location: UserLocation | null;
  displayCity: string;      // e.g. "Poonch"
  displayFull: string;      // e.g. "Poonch, Jammu & Kashmir"
  displayArea: string;      // neighbourhood/street
  state: LocationState;
  refresh: () => void;
  askPermission: () => Promise<void>;
  openSettings: () => void;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [state, setState] = useState<LocationState>('loading');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setState('loading');

      // Step 1: Show cache instantly (zero delay)
      const cached = await getCachedLocation();
      if (cached) {
        setLocation(cached);
        setState('ready');
        console.log('[useLocation] Cache loaded:', getLocationDisplayString(cached));
      }

      // Step 2: Check permission — NO popup
      const permStatus = await getLocationPermissionStatus();
      console.log('[useLocation] Permission status:', permStatus);

      if (permStatus === 'denied') {
        if (!cached) setState('denied');
        return;
      }

      if (permStatus === 'undetermined') {
        // Ask ONCE
        setState('detecting');
        const granted = await requestLocationPermission();
        if (!granted) {
          setState('denied');
          return;
        }
      }

      // Step 3: GPS enabled?
      const gpsOn = await isGPSEnabled();
      if (!gpsOn) {
        console.log('[useLocation] GPS is off');
        if (!cached) setState('gps_off');
        return;
      }

      // Step 4: Get fresh location
      setState('detecting');
      const fresh = await getFreshLocation();

      if (fresh) {
        setLocation(fresh);
        setState('ready');
        console.log('[useLocation] ✅ Fresh location:', getLocationDisplayString(fresh));
      } else if (!cached) {
        setState('error');
      } else {
        setState('ready'); // show cached
      }
    } catch (e: any) {
      console.log('[useLocation] Error:', e.message);
      if (location) setState('ready'); // keep showing existing
      else setState('error');
    }
  }, []);

  useEffect(() => { load(false); }, []);

  const refresh = useCallback(() => { load(true); }, [load]);

  const askPermission = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (granted) load(true);
    else setState('denied');
  }, [load]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('Open Settings', 'Please go to Settings → Apps → BookMyShot → Permissions → Location → Allow');
    });
  }, []);

  const displayCity = location?.city || location?.district || '';
  const displayFull = location ? getLocationDisplayString(location) : '';
  const displayArea = location?.area || '';

  return { location, displayCity, displayFull, displayArea, state, refresh, askPermission, openSettings };
}
