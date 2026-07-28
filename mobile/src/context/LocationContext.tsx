/**
 * LocationContext — Shared location state across the entire app
 * 
 * - One source of truth for selected State/District/City
 * - Persists in AsyncStorage
 * - Home and NearMe both read/write from here
 * - Changing location in one screen updates all screens
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bms_service_location';

interface LocationState {
  state: string;
  district: string;
  city: string;
}

interface LocationContextType {
  location: LocationState;
  setLocation: (loc: LocationState) => Promise<void>;
  isLocationSet: boolean;
}

const LocationContext = createContext<LocationContextType>({
  location: { state: '', district: '', city: '' },
  setLocation: async () => {},
  isLocationSet: false,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationState>({ state: '', district: '', city: '' });

  // Load saved location on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.state || parsed.district || parsed.city) {
            setLocationState(parsed);
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const setLocation = useCallback(async (loc: LocationState) => {
    setLocationState(loc);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {}
  }, []);

  const isLocationSet = !!(location.state || location.district || location.city);

  return (
    <LocationContext.Provider value={{ location, setLocation, isLocationSet }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useServiceLocation = () => useContext(LocationContext);
