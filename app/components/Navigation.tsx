'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-gray-900">
              PolyEvent
            </Link>
            <div className="flex gap-4">
              <Link
                href="/events"
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  pathname === '/events'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Events
              </Link>
              <Link
                href="/markets"
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  pathname === '/markets'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Markets
              </Link>
            </div>
          </div>
          <a
            href="https://x.com/chrismuktar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Vibe coded by @chrismuktar
          </a>
        </div>
      </div>
    </nav>
  );
}
