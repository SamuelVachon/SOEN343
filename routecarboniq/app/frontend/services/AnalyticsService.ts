export type EventName = 
  | 'USER_LOGIN' 
  | 'RIDE_COMPLETED' 
  | 'SESSION_ENDED'
  | 'SCREEN_TIME_LOGGED'
  | 'API_REQUEST_COMPLETED'
  | 'PLAN_TRIP_SEARCH'
  | 'START_NAVIGATION';

export interface EventData {
  userId?: string;
  rideDuration?: number;
  cost?: number;
  stationId?: string;
  durationInSeconds?: number;
  responseTimeMs?: number;
  [key: string]: any;
}

type ObserverCallback = (eventName: EventName, eventData: EventData) => void;

export class AnalyticsService {
  private static instance: AnalyticsService;
  private readonly queue: { eventName: EventName; eventData: EventData }[] = [];
  private isProcessing = false;
  private observers: ObserverCallback[] = [];

  private constructor() {
    // Singleton pattern: private constructor
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Observer pattern: register components that want to listen
  public subscribe(callback: ObserverCallback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter((cb) => cb !== callback);
    };
  }

  // Observers (or UI components) call this to record an event
  public async trackEvent(eventName: EventName, eventData: EventData) {
    // Notify local observers if needed
    for (const observer of this.observers) {
      observer(eventName, eventData);
    }

    // Add to HTTP queue for backend Microservice
    this.queue.push({ eventName, eventData });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    // Process all events in queue
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 10); // Batch limit
      
      try {
        const baseUrl = typeof globalThis !== 'undefined' && globalThis.window ? '' : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
        await fetch(`${baseUrl}/api/analytics/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events: batch }),
        });
      } catch (err) {
        console.error('Failed to send analytics queue to microservice API:', err);
        // Put failed batch back in queue
        this.queue.unshift(...batch);
        break; // Stop processing to avoid spamming on a broken connection
      }
    }

    this.isProcessing = false;
  }

  // --- Fetch Endpoints for Dashboards ---

  // Fetches metrics specific to the logged-in user
  public async getUserMetrics(userId: string) {
    try {
      const response = await fetch(`/api/analytics/metrics/user?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user metrics');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  // Fetches platform-wide global metrics
  public async getGlobalMetrics() {
    try {
      const response = await fetch('/api/analytics/metrics/global');
      if (!response.ok) throw new Error('Failed to fetch global metrics');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}
