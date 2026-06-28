/**
 * BookMyShot Socket.IO Client — Real-Time Updates
 * 
 * Connects to backend Socket.IO server with JWT auth.
 * Auto-reconnects on disconnect.
 * Emits events that screens can subscribe to for live data updates.
 */
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const SOCKET_URL = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run';

let socket: Socket | null = null;
let isConnecting = false;

// Event listeners registry
type EventCallback = (data: any) => void;
const listeners: Map<string, Set<EventCallback>> = new Map();

/**
 * Connect to Socket.IO server with auth token
 */
export async function connect(): Promise<void> {
  if (socket?.connected || isConnecting) return;

  const token = await AsyncStorage.getItem('bms_token');
  if (!token) {
    console.log('[Socket] No auth token — skipping connection');
    return;
  }

  isConnecting = true;

  try {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] ✅ Connected:', socket?.id);
      isConnecting = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      isConnecting = false;
    });

    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
      isConnecting = false;
    });

    // Forward all real-time events to registered listeners
    const events = [
      'booking:updated',
      'inquiry:new',
      'inquiry:updated',
      'notification:new',
      'commission:new',
      'payment:updated',
      'dashboard:refresh',
      'admin:update',
      'subscription:updated',
      'chat:message',
      'chat:read',
      'chat:typing',
    ];

    events.forEach(event => {
      socket!.on(event, (data: any) => {
        const callbacks = listeners.get(event);
        if (callbacks) {
          callbacks.forEach(cb => {
            try { cb(data); } catch (e) {}
          });
        }
      });
    });
  } catch (e: any) {
    console.log('[Socket] Init error:', e.message);
    isConnecting = false;
  }
}

/**
 * Disconnect from Socket.IO
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
}

/**
 * Subscribe to a real-time event
 * Returns unsubscribe function
 */
export function subscribe(event: string, callback: EventCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  return () => {
    listeners.get(event)?.delete(callback);
  };
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}

/**
 * Reconnect with new token (after login)
 */
export async function reconnect(): Promise<void> {
  disconnect();
  await connect();
}

// ═══ App State Handling — reconnect when app comes to foreground ═══
let appStateSubscription: any = null;

export function setupAppStateHandler(): void {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active' && !socket?.connected) {
      connect();
    }
  });
}

export function cleanupAppStateHandler(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
}
