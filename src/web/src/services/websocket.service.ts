// @ts-strict
import ReconnectingWebSocket from 'reconnecting-websocket'; // v4.4.0
import { EventType } from '../../backend/src/types/event.types';

/**
 * Interface defining the structure of WebSocket messages
 */
interface WebSocketMessage {
  type: EventType;
  data: any;
  timestamp: string;
  messageId: string;
  requiresAck: boolean;
}

/**
 * Interface for WebSocket configuration options
 */
interface WebSocketOptions {
  autoConnect?: boolean;
  debug?: boolean;
  heartbeatInterval?: number;
}

/**
 * Configuration options for WebSocket reconnection behavior
 */
const RECONNECTION_OPTIONS = {
  maxRetries: 5,
  reconnectionDelay: 3000,
  maxReconnectionDelay: 30000,
  timeout: 5000,
  debug: false,
} as const;

/**
 * Interval for sending heartbeat messages (30 seconds)
 */
const HEARTBEAT_INTERVAL = 30000;

/**
 * Comprehensive WebSocket service for managing real-time communication
 */
export class WebSocketService {
  private socket: ReconnectingWebSocket | null = null;
  private subscribers: Map<EventType, Set<Function>> = new Map();
  private readonly baseUrl: string;
  private isConnected: boolean = false;
  private heartbeatInterval?: number;
  private messageQueue: Map<string, WebSocketMessage> = new Map();
  private pendingAcks: Set<string> = new Set();
  private readonly options: WebSocketOptions;

  /**
   * Creates a new instance of WebSocketService
   * @param baseUrl - Base URL for WebSocket connection
   * @param options - Configuration options
   */
  constructor(baseUrl: string, options: WebSocketOptions = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      autoConnect: true,
      debug: false,
      heartbeatInterval: HEARTBEAT_INTERVAL,
      ...options,
    };
    
    if (this.options.autoConnect) {
      this.connect();
    }

    // Handle browser tab synchronization
    this.setupTabSynchronization();
  }

  /**
   * Establishes WebSocket connection with automatic reconnection
   */
  public async connect(): Promise<void> {
    if (this.socket) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = new ReconnectingWebSocket(
          this.baseUrl,
          [],
          {
            ...RECONNECTION_OPTIONS,
            debug: this.options.debug,
          }
        );

        this.setupEventListeners(resolve, reject);
        this.startHeartbeat();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gracefully disconnects WebSocket connection
   */
  public async disconnect(): Promise<void> {
    if (!this.socket) {
      return;
    }

    this.clearHeartbeat();
    await this.processQueuedMessages();
    
    this.socket.close();
    this.socket = null;
    this.isConnected = false;
    this.subscribers.clear();
    this.messageQueue.clear();
    this.pendingAcks.clear();
  }

  /**
   * Subscribes to specific event types
   * @param eventType - Type of event to subscribe to
   * @param callback - Callback function for event handling
   * @returns Unsubscribe function
   */
  public subscribe(eventType: EventType, callback: Function): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const subscribers = this.subscribers.get(eventType)!;
    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(eventType);
      }
    };
  }

  /**
   * Emits a message through the WebSocket connection
   * @param type - Event type
   * @param data - Message data
   * @param requiresAck - Whether acknowledgment is required
   */
  public async emit(type: EventType, data: any, requiresAck: boolean = false): Promise<void> {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      requiresAck,
    };

    if (!this.isConnected) {
      this.messageQueue.set(message.messageId, message);
      return;
    }

    await this.sendMessage(message);
  }

  /**
   * Sets up WebSocket event listeners
   */
  private setupEventListeners(resolve: Function, reject: Function): void {
    if (!this.socket) {
      return;
    }

    this.socket.addEventListener('open', () => {
      this.isConnected = true;
      this.processQueuedMessages();
      resolve();
    });

    this.socket.addEventListener('message', (event) => {
      this.handleMessage(event);
    });

    this.socket.addEventListener('close', () => {
      this.isConnected = false;
      this.clearHeartbeat();
    });

    this.socket.addEventListener('error', (error) => {
      if (!this.isConnected) {
        reject(error);
      }
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Handles incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (message.requiresAck) {
        this.sendAcknowledgment(message.messageId);
      }

      const subscribers = this.subscribers.get(message.type);
      if (subscribers) {
        subscribers.forEach(callback => callback(message.data));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Sends acknowledgment for received messages
   */
  private sendAcknowledgment(messageId: string): void {
    this.emit(EventType.REAL_TIME_UPDATE, { 
      type: 'ACK',
      messageId 
    }, false);
  }

  /**
   * Processes queued messages after reconnection
   */
  private async processQueuedMessages(): Promise<void> {
    for (const [messageId, message] of this.messageQueue) {
      await this.sendMessage(message);
      this.messageQueue.delete(messageId);
    }
  }

  /**
   * Sends a message through the WebSocket connection
   */
  private async sendMessage(message: WebSocketMessage): Promise<void> {
    if (!this.socket || !this.isConnected) {
      this.messageQueue.set(message.messageId, message);
      return;
    }

    if (message.requiresAck) {
      this.pendingAcks.add(message.messageId);
    }

    this.socket.send(JSON.stringify(message));
  }

  /**
   * Starts the heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.emit(EventType.REAL_TIME_UPDATE, { type: 'HEARTBEAT' }, false);
    }, this.options.heartbeatInterval);
  }

  /**
   * Clears the heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Sets up synchronization across browser tabs
   */
  private setupTabSynchronization(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'websocket_state') {
        const state = JSON.parse(event.newValue || '{}');
        if (state.connected !== this.isConnected) {
          state.connected ? this.connect() : this.disconnect();
        }
      }
    });
  }

  /**
   * Generates a unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export default new WebSocketService(
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
);