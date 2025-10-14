'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Tag {
  id: string;
  label: string;
  slug: string;
}

export interface Market {
  id: string;
  question: string;
  slug: string;
  [key: string]: unknown;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  description: string;
  slug: string;
  ticker: string;
  endDate: string;
  markets: Market[];
  volume: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  openInterest: number;
  liquidity: number;
  liquidityAmm: number;
  liquidityClob: number;
  competitive: number;
  commentCount: number;
  active: boolean;
  closed: boolean;
  featured: boolean;
  restricted: boolean;
  tags: Tag[];
  [key: string]: unknown;
}

interface CachedData {
  events: PolymarketEvent[];
  timestamp: number;
}

interface DataContextType {
  events: PolymarketEvent[];
  loading: boolean;
  error: string | null;
  progress: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_KEY = 'polyevent_data';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function fetchAllEvents(
  onProgress?: (count: number) => void
): Promise<PolymarketEvent[]> {
  const allEvents: PolymarketEvent[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const response = await fetch(
      `/api/events?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const events: PolymarketEvent[] = await response.json();

    if (events.length === 0) {
      break;
    }

    allEvents.push(...events);
    onProgress?.(allEvents.length);

    if (events.length < limit) {
      break;
    }

    offset += limit;
  }

  return allEvents;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { events: cachedEvents, timestamp }: CachedData = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_DURATION) {
          // Cache is still valid
          setEvents(cachedEvents);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
        console.error('Failed to parse cache:', e);
      }
    }

    // Fetch fresh data
    fetchAllEvents(setProgress)
      .then((fetchedEvents) => {
        setEvents(fetchedEvents);
        // Store in cache
        const cacheData: CachedData = {
          events: fetchedEvents,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DataContext.Provider value={{ events, loading, error, progress }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
