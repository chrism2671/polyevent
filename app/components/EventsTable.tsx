'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';

interface Tag {
  id: string;
  label: string;
  slug: string;
}

interface Market {
  id: string;
  question: string;
  [key: string]: any;
}

interface PolymarketEvent {
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
  [key: string]: any;
}

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

export default function EventsTable() {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    fetchAllEvents((count) => setLoadingCount(count))
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo<ColumnDef<PolymarketEvent>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: (info) => <div className="text-right">{info.getValue()}</div>,
        meta: { align: 'right' },
      },
      {
        accessorKey: 'ticker',
        header: 'Ticker',
        cell: (info) => {
          const ticker = info.getValue();
          const slug = info.row.original.slug;
          if (!ticker) return '-';
          return (
            <a
              href={`https://polymarket.com/event/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {ticker}
            </a>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: (info) => {
          const title = info.getValue() as string;
          const slug = info.row.original.slug;
          return (
            <a
              href={`https://polymarket.com/event/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline max-w-md truncate block"
              title={title}
            >
              {title}
            </a>
          );
        },
      },
      {
        accessorKey: 'markets',
        header: 'Markets',
        cell: (info) => <div className="text-right">{(info.getValue() as Market[]).length}</div>,
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume',
        header: 'Volume',
        cell: (info) => {
          const volume = info.getValue() as number;
          const formatted = volume == null ? '$0' : `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume24hr',
        header: '24h Volume',
        cell: (info) => {
          const volume = info.getValue() as number;
          const formatted = volume == null ? '$0' : `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume1wk',
        header: '1wk Volume',
        cell: (info) => {
          const volume = info.getValue() as number;
          const formatted = volume == null ? '$0' : `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume1mo',
        header: '1mo Volume',
        cell: (info) => {
          const volume = info.getValue() as number;
          const formatted = volume == null ? '$0' : `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume1yr',
        header: '1yr Volume',
        cell: (info) => {
          const volume = info.getValue() as number;
          const formatted = volume == null ? '$0' : `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'liquidity',
        header: 'Liquidity',
        cell: (info) => {
          const liquidity = info.getValue() as number;
          const formatted = liquidity == null ? '$0' : `$${liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'liquidityClob',
        header: 'Liquidity CLOB',
        cell: (info) => {
          const liquidity = info.getValue() as number;
          const formatted = liquidity == null ? '$0' : `$${liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'openInterest',
        header: 'Open Interest',
        cell: (info) => {
          const oi = info.getValue() as number;
          const formatted = oi == null ? '$0' : `$${oi.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'competitive',
        header: 'Competitive',
        cell: (info) => {
          const comp = info.getValue() as number;
          const formatted = comp == null ? '0.00' : comp.toFixed(2);
          return <div className="text-right">{formatted}</div>;
        },
        meta: { align: 'right' },
      },
      {
        accessorKey: 'commentCount',
        header: 'Comments',
        cell: (info) => <div className="text-right">{info.getValue() ?? 0}</div>,
        meta: { align: 'right' },
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: (info) => {
          const tags = info.getValue() as Tag[];
          if (!tags || tags.length === 0) return '-';
          return (
            <div className="flex flex-wrap gap-0.5">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 bg-gray-100 rounded text-xs"
                  title={tags.map(t => t.label).join(', ')}
                >
                  {tag.label}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-xs text-gray-500">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'endDate',
        header: 'End Date',
        cell: (info) => {
          const date = new Date(info.getValue() as string);
          return date.toLocaleString();
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: events,
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
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">
          Loading events... {loadingCount > 0 && `(${loadingCount.toLocaleString()} loaded)`}
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
        <h1 className="text-2xl font-bold mb-2">Polymarket Events</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search events..."
            className="px-3 py-1.5 text-sm border border-gray-300 rounded w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            Showing {table.getFilteredRowModel().rows.length} of {events.length} active events
          </span>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as any)?.align;
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
