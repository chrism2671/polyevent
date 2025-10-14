import MarketsTable from '../components/MarketsTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Polymarket Markets - PolyEvent",
  description: "View all Polymarket prediction markets with live prices, bid/ask spreads, 24h price changes, and trading volume. Filter and sort individual markets.",
  openGraph: {
    title: "Polymarket Markets - PolyEvent",
    description: "View all Polymarket prediction markets with live prices, bid/ask spreads, 24h price changes, and trading volume.",
  },
  twitter: {
    title: "Polymarket Markets - PolyEvent",
    description: "View all Polymarket prediction markets with live prices, bid/ask spreads, 24h price changes, and trading volume.",
  },
};

export default function MarketsPage() {
  return <MarketsTable />;
}
