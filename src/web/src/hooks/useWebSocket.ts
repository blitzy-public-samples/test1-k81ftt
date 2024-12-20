// @ts-strict
import { useState, useEffect, useCallback, useRef } from 'react'; // v18.0.0
import WebSocketService from '../services/websocket.service';
import { EventType } from '../../backend/src/types/event.types';

/**
 * Interface for queued messages during offline periods
 */
interface QueuedMessage {
  channel: string;
  event: EventType;
  data: any;
  timestamp: Date;
}

/**
 * Interface for WebSocket hook state and methods
 */
export interface WebSocketHookState {
  isConnected: boolean;
  connectionLatency: number;
  retryCount: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  emit: (channel: string, event: EventType, data: any) => Promise<void>;
  getQueuedMessages: () => QueuedMessage[];
}

/**
 * Interface for WebSocket configuration options
 */
export interface WebSocketOptions {
  autoReconnect: boolean;
  reconnectInterval: number;
  maxRetries: number;
  queueOfflineMessages: boolean;
  syncAcrossTabs: boolean;
  connectionTimeout: number;
}

/**
 * Default configuration options for WebSocket hook
 */
const DEFAULT_OPTIONS: WebSocketOptions = {
  autoReconnect: true,
  reconnectInterval: 3000,
  maxRetries: 5,
  queueOfflineMessages: true,
  syncAcrossTabs: true,
  connectionTimeout: 30000,
};

/**
 * Enterprise-grade custom hook for managing WebSocket connections with advanced features
 * @param options - Configuration options for WebSocket behavior
 * @returns WebSocket state and control methods
 */
export const useWebSocket = (options: WebSocketOptions = DEFAULT_OPTIONS): WebSocketHookState => {
  // State management
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionLatency, setConnectionLatency] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Refs for persistent data across renders
  const wsService = useRef<WebSocketService>(WebSocketService);
  const messageQueue = useRef<QueuedMessage[]>([]);
  const latencyCheckInterval = useRef<number>();
  const reconnectTimeout = useRef<number>();
  const connectionTimeout = useRef<number>();

  /**
   * Measures and updates connection latency
   */
  const measureLatency = useCallback(() => {
    const start = Date.now();
    wsService.current.emit(EventType.REAL_TIME_UPDATE, { type: 'PING' }, false)
      .then(() => {
        const latency = Date.now() - start;
        setConnectionLatency(latency);
      })
      .catch(() => {
        setConnectionLatency(-1); // Indicates failed measurement
      });
  }, []);

  /**
   * Handles connection establishment
   */
  const connect = useCallback(async (): Promise<void> => {
    try {
      await wsService.current.connect();
      setIsConnected(true);
      setRetryCount(0);

      // Start latency monitoring
      latencyCheckInterval.current = window.setInterval(measureLatency, 30000);

      // Process queued messages if any
      if (options.queueOfflineMessages && messageQueue.current.length > 0) {
        const messages = [...messageQueue.current];
        messageQueue.current = [];
        messages.forEach(msg => {
          wsService.current.emit(msg.event, msg.data, false);
        });
      }

      // Sync connection state across tabs if enabled
      if (options.syncAcrossTabs) {
        localStorage.setItem('websocket_state', JSON.stringify({ connected: true }));
      }
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      handleReconnection();
    }
  }, [options.queueOfflineMessages, options.syncAcrossTabs, measureLatency]);

  /**
   * Handles connection retry logic with exponential backoff
   */
  const handleReconnection = useCallback(() => {
    if (!options.autoReconnect || retryCount >= options.maxRetries) {
      return;
    }

    const backoffTime = Math.min(
      options.reconnectInterval * Math.pow(2, retryCount),
      30000
    );

    setRetryCount(prev => prev + 1);

    reconnectTimeout.current = window.setTimeout(() => {
      connect();
    }, backoffTime);
  }, [options.autoReconnect, options.maxRetries, options.reconnectInterval, retryCount, connect]);

  /**
   * Handles graceful disconnection
   */
  const disconnect = useCallback(() => {
    wsService.current.disconnect();
    setIsConnected(false);
    setConnectionLatency(0);
    setRetryCount(0);

    // Clear all intervals and timeouts
    if (latencyCheckInterval.current) {
      clearInterval(latencyCheckInterval.current);
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
    }

    // Update cross-tab state if enabled
    if (options.syncAcrossTabs) {
      localStorage.setItem('websocket_state', JSON.stringify({ connected: false }));
    }
  }, [options.syncAcrossTabs]);

  /**
   * Subscribes to a specific channel with type-safe event handling
   */
  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    const unsubscribe = wsService.current.subscribe(EventType.REAL_TIME_UPDATE, (data: any) => {
      if (data.channel === channel) {
        callback(data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Emits an event through the WebSocket connection with offline queueing
   */
  const emit = useCallback(async (channel: string, event: EventType, data: any): Promise<void> => {
    if (!isConnected && options.queueOfflineMessages) {
      messageQueue.current.push({
        channel,
        event,
        data,
        timestamp: new Date(),
      });
      return;
    }

    await wsService.current.emit(event, { channel, ...data }, true);
  }, [isConnected, options.queueOfflineMessages]);

  /**
   * Returns currently queued messages
   */
  const getQueuedMessages = useCallback((): QueuedMessage[] => {
    return [...messageQueue.current];
  }, []);

  /**
   * Setup effect for WebSocket initialization and cleanup
   */
  useEffect(() => {
    // Set connection timeout
    connectionTimeout.current = window.setTimeout(() => {
      if (!isConnected) {
        handleReconnection();
      }
    }, options.connectionTimeout);

    // Setup cross-tab synchronization if enabled
    if (options.syncAcrossTabs) {
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'websocket_state') {
          const state = JSON.parse(event.newValue || '{}');
          if (state.connected !== isConnected) {
            state.connected ? connect() : disconnect();
          }
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    // Cleanup function
    return () => {
      disconnect();
    };
  }, [options.connectionTimeout, options.syncAcrossTabs, isConnected, connect, disconnect, handleReconnection]);

  return {
    isConnected,
    connectionLatency,
    retryCount,
    connect,
    disconnect,
    subscribe,
    emit,
    getQueuedMessages,
  };
};

export default useWebSocket;