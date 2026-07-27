/**
 * useRealTimeUpdates — Hook for subscribing to Socket.IO events
 * 
 * Usage:
 *   useRealTimeUpdates(['booking:updated', 'payment:updated'], () => { loadData(); });
 * 
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Calls the callback whenever any of the specified events fire.
 */
import { useEffect, useRef } from 'react';
import { subscribe, connect, isConnected } from '../services/socket';

export function useRealTimeUpdates(events: string[], onUpdate: (event: string, data: any) => void) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    // Ensure socket is connected
    if (!isConnected()) {
      connect();
    }

    // Subscribe to all specified events
    const unsubscribers = events.map(event =>
      subscribe(event, (data: any) => {
        callbackRef.current(event, data);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [events.join(',')]);
}

/**
 * useAutoRefresh — Simplified hook that calls refresh on any relevant event
 * 
 * Usage:
 *   useAutoRefresh(['booking:updated', 'dashboard:refresh'], loadData);
 */
export function useAutoRefresh(events: string[], refreshFn: () => void) {
  const fnRef = useRef(refreshFn);
  fnRef.current = refreshFn;

  useEffect(() => {
    if (!isConnected()) {
      connect();
    }

    const unsubscribers = events.map(event =>
      subscribe(event, () => {
        fnRef.current();
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [events.join(',')]);
}
