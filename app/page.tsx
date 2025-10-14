import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "PolyEvent - Browse Polymarket Events & Markets",
  description: "Explore and analyze Polymarket prediction markets. View real-time events, market prices, volume, liquidity, and trends.",
};

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">PolyEvent</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Browse Polymarket events and markets</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/events"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Events
          </Link>
          <Link
            href="/markets"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Markets
          </Link>
        </div>
      </div>
    </div>
  );
}
