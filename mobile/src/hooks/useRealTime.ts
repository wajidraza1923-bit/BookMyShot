/**
 * useRealTime — Hook for subscribing to Socket.IO real-time events
 * 
 * Usage:
 *   useRealTime('booking:updated', (data) => { reload(); });
 *   useRealTime(['inquiry:new', 'inquiry:updated'], () => { reload(); });
 */
import { useEffect, useRef } from 'react';
import { subscribe } from '../services/socket';

/**
 * Subscribe to one or more Socket.IO events
 * Callback fires whenever the event is received
 * Automatically unsubscribes on unmount
 */
export function useRealTime(
  events: string | string[],
  callback: (data: any) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const eventList = Array.isArray(events) ? events : [events];
    const unsubscribes = eventList.map(event =>
      subscribe(event, (data) => callbackRef.current(data))
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [Array.isArray(events) ? events.join(',') : events]);
}

export default useRealTime;
