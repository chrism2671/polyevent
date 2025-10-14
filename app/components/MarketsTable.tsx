'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useData } from './DataProvider';

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  eventSlug?: string;
  conditionId: string;
  outcomes: string;
  lastTradePrice: number;
  bestBid: number;
  bestAsk: number;
  volume: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  liquidity: number;
  liquidityClob: number;
  oneDayPriceChange: number;
  [key: string]: unknown;
}

export default function MarketsTable() {
  const { events, loading, error, progress } = useData();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'volume24hr', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [includeZeroVolume, setIncludeZeroVolume] = useState(false);

  // Extract markets from events
  const markets = useMemo(() => {
    const allMarkets: PolymarketMarket[] = [];
    for (const event of events) {
      if (event.markets) {
        for (const market of event.markets) {
          allMarkets.push({
            ...market,
            eventSlug: event.slug,
          } as PolymarketMarket);
        }
      }
    }
    return allMarkets;
  }, [events]);

  const filteredMarkets = useMemo(() => {
    if (includeZeroVolume) {
      return markets;
    }
    return markets.filter(m => (m.volume ?? 0) > 0);
  }, [markets, includeZeroVolume]);

  const columns = useMemo<ColumnDef<PolymarketMarket>[]>(
    () => [
      {
        accessorKey: 'question',
        header: 'Question',
        cell: (info) => {
          const question = info.getValue() as string;
          const market = info.row.original;
          const eventSlug = market.eventSlug;
          const marketSlug = market.slug;
          const marketId = market.id;
          const url = eventSlug && marketSlug
            ? `https://polymarket.com/event/${eventSlug}/${marketSlug}?tid=${marketId}`
            : `https://polymarket.com/event/${marketSlug}`;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline max-w-[300px] truncate block"
              title={question}
            >
              {question}
            </a>
          );
        },
      },
      {
        accessorKey: 'lastTradePrice',
        header: 'Last Price',
        accessorFn: (row) => row.lastTradePrice ?? 0,
        cell: (info) => {
          const price = info.getValue() as number;
          return <div className="text-right font-mono">{(price * 100).toFixed(1)}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'bestBid',
        header: 'Bid',
        accessorFn: (row) => row.bestBid ?? 0,
        cell: (info) => {
          const bid = info.getValue() as number;
          return <div className="text-right font-mono">{(bid * 100).toFixed(1)}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'bestAsk',
        header: 'Ask',
        accessorFn: (row) => row.bestAsk ?? 0,
        cell: (info) => {
          const ask = info.getValue() as number;
          return <div className="text-right font-mono">{(ask * 100).toFixed(1)}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'spread',
        header: 'Spread',
        accessorFn: (row) => (row.bestAsk ?? 0) - (row.bestBid ?? 0),
        cell: (info) => {
          const spread = info.getValue() as number;
          return <div className="text-right font-mono">{(spread * 100).toFixed(1)}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'oneDayPriceChange',
        header: '24h Change',
        accessorFn: (row) => row.oneDayPriceChange ?? 0,
        cell: (info) => {
          const change = info.getValue() as number;
          const changePercent = (change * 100).toFixed(1);
          const color = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
          return <div className={`text-right ${color}`}>{change > 0 ? '+' : ''}{changePercent}%</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume',
        header: 'Volume',
        accessorFn: (row) => row.volume ?? 0,
        cell: (info) => {
          const volume = info.getValue() as number;
          return <div className="text-right">${Math.round(volume).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume24hr',
        header: '24h Volume',
        accessorFn: (row) => row.volume24hr ?? 0,
        cell: (info) => {
          const volume = info.getValue() as number;
          return <div className="text-right">${Math.round(volume).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'liquidity',
        header: 'Liquidity',
        accessorFn: (row) => row.liquidity ?? 0,
        cell: (info) => {
          const liquidity = info.getValue() as number;
          return <div className="text-right">${Math.round(liquidity).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: (info) => <div className="text-right">{info.getValue() as string}</div>,
        sortingFn: 'alphanumeric',
        meta: { align: 'right' },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredMarkets,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: false,
    debugHeaders: false,
    debugColumns: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl mb-2">Loading markets...</div>
          {progress > 0 && (
            <div className="text-sm text-gray-600">
              {progress.toLocaleString()} events loaded
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <h1 className="text-2xl font-bold mb-2">Polymarket Markets</h1>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search markets..."
            className="px-3 py-1.5 text-sm border border-gray-300 rounded w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={includeZeroVolume}
                onChange={(e) => setIncludeZeroVolume(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
            </div>
            Include zero volume
          </label>
          <span className="text-sm text-gray-600">
            Showing {table.getFilteredRowModel().rows.length} of {filteredMarkets.length} markets
          </span>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as { align?: string })?.align;
                  return (
                    <th
                      key={header.id}
                      className={`px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                        align === 'right' ? 'text-right' : 'text-left'
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5 text-xs text-gray-900">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
