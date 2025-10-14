import EventsTable from '../components/EventsTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Polymarket Events - PolyEvent",
  description: "Browse all active Polymarket events with real-time volume, liquidity, and market data. Sort and filter events by 24h volume, total volume, and more.",
  openGraph: {
    title: "Polymarket Events - PolyEvent",
    description: "Browse all active Polymarket events with real-time volume, liquidity, and market data.",
  },
  twitter: {
    title: "Polymarket Events - PolyEvent",
    description: "Browse all active Polymarket events with real-time volume, liquidity, and market data.",
  },
};

export default function EventsPage() {
  return <EventsTable />;
}
