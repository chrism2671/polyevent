'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { useData, PolymarketEvent, Tag } from './DataProvider';

export default function EventsTable() {
  const { events, loading, error, progress } = useData();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'volume24hr', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [includeZeroVolume, setIncludeZeroVolume] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  const filteredEvents = useMemo(() => {
    if (includeZeroVolume) {
      return events;
    }
    return events.filter(e => (e.volume24hr ?? 0) > 0);
  }, [events, includeZeroVolume]);

  const columns = useMemo<ColumnDef<PolymarketEvent>[]>(
    () => [
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
              className="text-blue-600 dark:text-blue-400 hover:underline max-w-[240px] truncate block"
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
        accessorFn: (row) => row.markets?.length ?? 0,
        cell: (info) => <div className="text-right">{info.getValue() as number}</div>,
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume',
        header: 'Volume',
        accessorFn: (row) => Number(row.volume ?? 0),
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
        accessorFn: (row) => Number(row.volume24hr ?? 0),
        cell: (info) => {
          const volume = info.getValue() as number;
          return <div className="text-right">${Math.round(volume).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume1wk',
        header: '1wk Volume',
        accessorFn: (row) => Number(row.volume1wk ?? 0),
        cell: (info) => {
          const volume = info.getValue() as number;
          return <div className="text-right">${Math.round(volume).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume1mo',
        header: '1mo Volume',
        accessorFn: (row) => Number(row.volume1mo ?? 0),
        cell: (info) => {
          const volume = info.getValue() as number;
          return <div className="text-right">${Math.round(volume).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'volume1yr',
        header: '1yr Volume',
        accessorFn: (row) => Number(row.volume1yr ?? 0),
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
        accessorFn: (row) => Number(row.liquidity ?? 0),
        cell: (info) => {
          const liquidity = info.getValue() as number;
          return <div className="text-right">${Math.round(liquidity).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'liquidityClob',
        header: 'Liquidity CLOB',
        accessorFn: (row) => Number(row.liquidityClob ?? 0),
        cell: (info) => {
          const liquidity = info.getValue() as number;
          return <div className="text-right">${Math.round(liquidity).toLocaleString()}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'competitive',
        header: 'Competitive',
        accessorFn: (row) => Number(row.competitive ?? 0),
        cell: (info) => {
          const comp = info.getValue() as number;
          return <div className="text-right">{comp.toFixed(2)}</div>;
        },
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'commentCount',
        header: 'Comments',
        accessorFn: (row) => Number(row.commentCount ?? 0),
        cell: (info) => <div className="text-right">{info.getValue() as number}</div>,
        sortingFn: 'basic',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        accessorFn: (row) => row.tags?.map(t => t.label).join(' ') ?? '',
        cell: (info) => {
          const tags = info.row.original.tags as Tag[];
          if (!tags || tags.length === 0) return <span className="text-gray-400 dark:text-gray-600">-</span>;
          return (
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs flex-shrink-0"
                >
                  {tag.label}
                </span>
              ))}
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
        sortingFn: 'datetime',
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
    data: filteredEvents,
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
    globalFilterFn: (row, columnId, filterValue) => {
      const searchTerms = String(filterValue).toLowerCase().split(' ').filter(term => term.length > 0);
      if (searchTerms.length === 0) return true;

      // Get tag labels
      const tagLabels = row.original.tags?.map(t => t.label) ?? [];

      // Get all searchable text from the row
      const searchableText = [
        row.original.title,
        row.original.description,
        row.original.slug,
        row.original.ticker,
        row.original.id,
        ...tagLabels,
      ].join(' ').toLowerCase();

      // Separate inclusion and exclusion terms
      const includeTerms = searchTerms.filter(term => !term.startsWith('!'));
      const excludeTerms = searchTerms.filter(term => term.startsWith('!')).map(term => term.slice(1));

      // Check if all inclusion terms are present
      const includesMatch = includeTerms.every(term => searchableText.includes(term));

      // Check if any exclusion terms are present (should NOT be present)
      const excludesMatch = excludeTerms.every(term => !searchableText.includes(term));

      return includesMatch && excludesMatch;
    },
    debugTable: false,
    debugHeaders: false,
    debugColumns: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl dark:text-gray-200">
          Loading events... {progress > 0 && `(${progress.toLocaleString()} loaded)`}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <h1 className="text-2xl font-bold mb-2 dark:text-gray-100">Polymarket Events</h1>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search events... (use ! to exclude, e.g. !sports)"
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded w-96 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={includeZeroVolume}
                onChange={(e) => setIncludeZeroVolume(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
            </div>
            Include zero volume
          </label>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {table.getFilteredRowModel().rows.length} of {filteredEvents.length} active events
          </span>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as { align?: string })?.align;
                  return (
                    <th
                      key={header.id}
                      className={`px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
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
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-200">
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
