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
import { useVirtualizer } from '@tanstack/react-virtual';
import { useData } from './DataProvider';
import TokenId from './TokenId';

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  eventSlug?: string;
  conditionId: string;
  outcomes: string;
  clobTokenIds?: string;
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

interface OrderBookLevel {
  price: string;
  size: string;
}

interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp?: string;
}

interface WebSocketWithPing extends WebSocket {
  pingInterval?: NodeJS.Timeout;
}

export default function MarketsTable() {
  const { events, loading, error, progress } = useData();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'volume24hr', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [includeZeroVolume, setIncludeZeroVolume] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number>(0);
  const [orderBooks, setOrderBooks] = useState<Record<string, OrderBook[]>>({});
  const wsRef = useRef<WebSocketWithPing | null>(null);
  const subscribedMarketsRef = useRef<Set<string>>(new Set());
  const marketsRef = useRef<PolymarketMarket[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');
      wsRef.current = ws;

      ws.onopen = () => {
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('PING');
          }
        }, 30000);

        ws.pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string' || event.data === 'PONG') {
          return;
        }

        try {
          const message = JSON.parse(event.data);

          if (Array.isArray(message)) {
            setOrderBooks(prev => {
              const newOrderBooks = { ...prev };

              for (const book of message) {
                const tokenId = book.asset_id;

                for (const [marketId, books] of Object.entries(prev)) {
                  const market = marketsRef.current.find(m => m.id === marketId);
                  if (market?.clobTokenIds) {
                    const tokenIds = JSON.parse(market.clobTokenIds) as string[];
                    const tokenIndex = tokenIds.indexOf(tokenId);

                    if (tokenIndex !== -1) {
                      const currentBooks = newOrderBooks[marketId] || books;
                      const updated = [...currentBooks];
                      updated[tokenIndex] = {
                        bids: book.bids || [],
                        asks: book.asks || [],
                        timestamp: book.timestamp,
                      };
                      newOrderBooks[marketId] = updated;
                      break;
                    }
                  }
                }
              }

              return newOrderBooks;
            });
          }
          else if (message.price_changes && Array.isArray(message.price_changes)) {
            setOrderBooks(prev => {
              const newOrderBooks = { ...prev };

              for (const change of message.price_changes) {
                const tokenId = change.asset_id;

                for (const [marketId, books] of Object.entries(prev)) {
                  const market = marketsRef.current.find(m => m.id === marketId);
                  if (market?.clobTokenIds) {
                    const tokenIds = JSON.parse(market.clobTokenIds) as string[];
                    const tokenIndex = tokenIds.indexOf(tokenId);

                    if (tokenIndex !== -1) {
                      const currentBooks = newOrderBooks[marketId] || books;
                      const currentBook = currentBooks[tokenIndex];
                      if (currentBook) {
                        const newBids = [...currentBook.bids];
                        const newAsks = [...currentBook.asks];

                        if (change.side === 'BUY') {
                          const index = newBids.findIndex(b => b.price === change.price);
                          if (change.size === '0' || change.size === 0) {
                            if (index !== -1) newBids.splice(index, 1);
                          } else {
                            if (index !== -1) {
                              newBids[index].size = String(change.size);
                            } else {
                              newBids.push({ price: change.price, size: String(change.size) });
                            }
                          }
                        } else if (change.side === 'SELL') {
                          const index = newAsks.findIndex(a => a.price === change.price);
                          if (change.size === '0' || change.size === 0) {
                            if (index !== -1) newAsks.splice(index, 1);
                          } else {
                            if (index !== -1) {
                              newAsks[index].size = String(change.size);
                            } else {
                              newAsks.push({ price: change.price, size: String(change.size) });
                            }
                          }
                        }

                        const updated = [...currentBooks];
                        updated[tokenIndex] = {
                          bids: newBids,
                          asks: newAsks,
                          timestamp: message.timestamp,
                        };
                        newOrderBooks[marketId] = updated;
                      }
                      break;
                    }
                  }
                }
              }

              return newOrderBooks;
            });
          }
        } catch (error) {
        }
      };

      ws.onerror = () => {
      };

      ws.onclose = () => {
        // Clear ping interval
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Subscribe/unsubscribe to markets based on selected market
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Determine which token IDs should be subscribed
    const tokenIdsToSubscribe = new Set<string>();
    if (selectedMarketId) {
      const market = marketsRef.current.find(m => m.id === selectedMarketId);
      if (market?.clobTokenIds) {
        const tokenIds = JSON.parse(market.clobTokenIds) as string[];
        tokenIds.forEach(id => tokenIdsToSubscribe.add(id));
      }
    }

    // Find tokens to unsubscribe (currently subscribed but not in selected market)
    const tokensToUnsubscribe: string[] = [];
    for (const tokenId of subscribedMarketsRef.current) {
      if (!tokenIdsToSubscribe.has(tokenId)) {
        tokensToUnsubscribe.push(tokenId);
      }
    }

    // Find tokens to subscribe (in selected market but not currently subscribed)
    const tokensToSubscribeNew: string[] = [];
    for (const tokenId of tokenIdsToSubscribe) {
      if (!subscribedMarketsRef.current.has(tokenId)) {
        tokensToSubscribeNew.push(tokenId);
      }
    }

    // Unsubscribe from markets that are no longer selected
    if (tokensToUnsubscribe.length > 0) {
      ws.send(JSON.stringify({
        assets_ids: tokensToUnsubscribe,
        type: 'unsubscribe',
      }));
      tokensToUnsubscribe.forEach(id => subscribedMarketsRef.current.delete(id));
    }

    // Subscribe to newly selected market
    if (tokensToSubscribeNew.length > 0) {
      ws.send(JSON.stringify({
        assets_ids: tokensToSubscribeNew,
        type: 'market',
      }));
      tokensToSubscribeNew.forEach(id => subscribedMarketsRef.current.add(id));
    }
  }, [selectedMarketId]);

  const openOrderbook = async (marketId: string, clobTokenIds?: string) => {
    // If already selected, close it
    if (selectedMarketId === marketId) {
      setSelectedMarketId(null);
      setSelectedOutcomeIndex(0);
      setOrderBooks((prev) => {
        const newBooks = { ...prev };
        delete newBooks[marketId];
        return newBooks;
      });
      return;
    }

    setSelectedMarketId(marketId);
    setSelectedOutcomeIndex(0);

    // Fetch initial orderbook data via REST API
    if (clobTokenIds) {
      const tokenIds = JSON.parse(clobTokenIds) as string[];
      const emptyBooks = tokenIds.map(() => ({
        bids: [],
        asks: [],
      }));
      setOrderBooks((prev) => ({ ...prev, [marketId]: emptyBooks }));

      // Fetch orderbooks for each token
      const fetchedBooks = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const response = await fetch(`/api/orderbook?token_id=${tokenId}`);
            const data = await response.json();
            return {
              bids: data.bids || [],
              asks: data.asks || [],
            };
          } catch (error) {
            return { bids: [], asks: [] };
          }
        })
      );

      setOrderBooks((prev) => ({ ...prev, [marketId]: fetchedBooks }));
    }
  };

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

  // Keep marketsRef in sync with markets
  useEffect(() => {
    marketsRef.current = markets;
  }, [markets]);

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
              className="text-blue-600 dark:text-blue-400 hover:underline max-w-[300px] truncate block"
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
          const color = change > 0 ? 'text-green-600 dark:text-green-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
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
    globalFilterFn: (row, columnId, filterValue) => {
      const searchTerms = String(filterValue).toLowerCase().split(' ').filter(term => term.length > 0);
      if (searchTerms.length === 0) return true;

      // Get all searchable text from the row
      const searchableText = [
        row.original.question,
        row.original.outcomes,
        row.original.id,
      ].join(' ').toLowerCase();

      // Check if all search terms are present
      return searchTerms.every(term => searchableText.includes(term));
    },
    debugTable: false,
    debugHeaders: false,
    debugColumns: false,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 33, // Fixed row height
    overscan: 10, // Render 10 extra rows above and below viewport
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl mb-2 dark:text-gray-200">Loading markets...</div>
          {progress > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
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
        <div className="text-xl text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <h1 className="text-2xl font-bold mb-2 dark:text-gray-100">Polymarket Markets</h1>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search markets..."
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
            Showing {table.getFilteredRowModel().rows.length} of {filteredMarkets.length} markets
          </span>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="min-w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} className="flex">
                <div className="px-3 py-1.5 flex-shrink-0" style={{ width: '32px' }}></div>
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as { align?: string })?.align;
                  const colId = header.column.id;
                  const width = colId === 'question' ? '400px'
                    : colId === 'lastTradePrice' ? '80px'
                    : colId === 'bestBid' ? '80px'
                    : colId === 'bestAsk' ? '80px'
                    : colId === 'spread' ? '80px'
                    : colId === 'oneDayPriceChange' ? '100px'
                    : colId === 'volume' ? '120px'
                    : colId === 'volume24hr' ? '120px'
                    : colId === 'liquidity' ? '120px'
                    : colId === 'id' ? '60px'
                    : '100px';
                  return (
                    <div
                      key={header.id}
                      className={`px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center flex-shrink-0 ${
                        align === 'right' ? 'justify-end' : ''
                      }`}
                      style={{ width }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : ''}`}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-gray-900 relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const market = row.original;
              const isSelected = selectedMarketId === market.id;
              const hasOrderBook = market.clobTokenIds;

              return (
                <div
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-200 flex items-center flex-shrink-0" style={{ width: '32px' }}>
                    {hasOrderBook && (
                      <button
                        onClick={() => openOrderbook(market.id, market.clobTokenIds)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                      >
                        {isSelected ? '◉' : '○'}
                      </button>
                    )}
                  </div>
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const width = colId === 'question' ? '400px'
                      : colId === 'lastTradePrice' ? '80px'
                      : colId === 'bestBid' ? '80px'
                      : colId === 'bestAsk' ? '80px'
                      : colId === 'spread' ? '80px'
                      : colId === 'oneDayPriceChange' ? '100px'
                      : colId === 'volume' ? '120px'
                      : colId === 'volume24hr' ? '120px'
                      : colId === 'liquidity' ? '120px'
                      : colId === 'id' ? '60px'
                      : '100px';
                    return (
                      <div
                        key={cell.id}
                        className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-200 flex items-center flex-shrink-0"
                        style={{ width }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Panel for Orderbook */}
      {selectedMarketId && (() => {
        const market = markets.find(m => m.id === selectedMarketId);
        const books = orderBooks[selectedMarketId];
        const outcomes = market?.outcomes ? JSON.parse(market.outcomes) : ['Yes', 'No'];

        return (
          <div className="fixed top-0 right-0 h-screen w-2/5 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-sm dark:text-gray-200">{market?.question}</h3>
              </div>
              <button
                onClick={() => setSelectedMarketId(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold leading-none cursor-pointer"
                aria-label="Close orderbook"
              >
                ×
              </button>
            </div>

            {/* Outcome Toggle */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {outcomes.map((outcome, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOutcomeIndex(idx)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    selectedOutcomeIndex === idx
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {outcome}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {books && books[selectedOutcomeIndex] ? (
                (() => {
                  const book = books[selectedOutcomeIndex];
                  const tokenIds = market?.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
                  const tokenId = tokenIds[selectedOutcomeIndex] || '';

                  // Sort and calculate cumulative volumes
                  const sortedAsks = [...book.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                  const sortedBids = [...book.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

                  // Calculate cumulative volumes and USD values
                  let askCumulative = 0;
                  let askCumulativeUSD = 0;
                  const asksWithCumulative = sortedAsks.map(ask => {
                    const size = parseFloat(ask.size);
                    const price = parseFloat(ask.price);
                    const usd = size * price;
                    askCumulative += size;
                    askCumulativeUSD += usd;
                    return { ...ask, cumulative: askCumulative, usd, cumulativeUSD: askCumulativeUSD };
                  });

                  let bidCumulative = 0;
                  let bidCumulativeUSD = 0;
                  const bidsWithCumulative = sortedBids.map(bid => {
                    const size = parseFloat(bid.size);
                    const price = parseFloat(bid.price);
                    const usd = size * price;
                    bidCumulative += size;
                    bidCumulativeUSD += usd;
                    return { ...bid, cumulative: bidCumulative, usd, cumulativeUSD: bidCumulativeUSD };
                  });

                  // Reverse asks so lowest price is at bottom (closest to mid)
                  const displayAsks = [...asksWithCumulative].reverse();

                  // Calculate max values for bar widths
                  const maxSize = Math.max(
                    ...sortedAsks.map(a => parseFloat(a.size)),
                    ...sortedBids.map(b => parseFloat(b.size))
                  );
                  const maxCumulative = Math.max(
                    askCumulative,
                    bidCumulative
                  );
                  const maxUSD = Math.max(
                    ...asksWithCumulative.map(a => a.usd),
                    ...bidsWithCumulative.map(b => b.usd)
                  );
                  const maxCumulativeUSD = Math.max(
                    askCumulativeUSD,
                    bidCumulativeUSD
                  );

                  return (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm dark:text-gray-200">
                        {outcomes[selectedOutcomeIndex]} <TokenId tokenId={tokenId} />
                      </h4>
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex gap-4 text-xs font-medium text-gray-700 dark:text-gray-300 px-1">
                          <span className="w-20">Price</span>
                          <span className="w-24">Size</span>
                          <span className="w-24">Size USD</span>
                          <span className="w-24">Cumulative</span>
                          <span className="w-24">Cum. USD</span>
                        </div>

                        {/* Asks (top, lowest price closest to mid) */}
                        <div className="space-y-0.5">
                          {displayAsks.map((ask, i) => {
                            const sizePercent = (parseFloat(ask.size) / maxSize) * 100;
                            const cumulativePercent = (ask.cumulative / maxCumulative) * 100;
                            const usdPercent = (ask.usd / maxUSD) * 100;
                            const cumulativeUSDPercent = (ask.cumulativeUSD / maxCumulativeUSD) * 100;
                            return (
                              <div key={i} className="flex gap-4 text-xs font-mono px-1">
                                <span className="text-red-600 dark:text-red-400 w-20">{(parseFloat(ask.price) * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-red-100 dark:bg-red-900/50" style={{ width: `${sizePercent}%` }}></span>
                                  <span className="relative text-gray-600 dark:text-gray-400">{parseFloat(ask.size).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-red-100 dark:bg-red-900/50" style={{ width: `${usdPercent}%` }}></span>
                                  <span className="relative text-gray-600 dark:text-gray-400">{ask.usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-red-50 dark:bg-red-900/30" style={{ width: `${cumulativePercent}%` }}></span>
                                  <span className="relative text-gray-500 dark:text-gray-500">{ask.cumulative.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-red-50 dark:bg-red-900/30" style={{ width: `${cumulativeUSDPercent}%` }}></span>
                                  <span className="relative text-gray-500 dark:text-gray-500">{ask.cumulativeUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Spread indicator */}
                        <div className="border-t border-gray-300 dark:border-gray-600 my-4 relative" data-spread-indicator>
                          {sortedBids.length > 0 && sortedAsks.length > 0 && (
                            <div className="absolute left-1 -translate-y-1/2 bg-white dark:bg-gray-900 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 font-medium">
                              Spread: {((parseFloat(sortedAsks[0].price) - parseFloat(sortedBids[0].price)) * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </div>
                          )}
                        </div>

                        {/* Bids (bottom, highest price closest to mid) */}
                        <div className="space-y-0.5">
                          {bidsWithCumulative.map((bid, i) => {
                            const sizePercent = (parseFloat(bid.size) / maxSize) * 100;
                            const cumulativePercent = (bid.cumulative / maxCumulative) * 100;
                            const usdPercent = (bid.usd / maxUSD) * 100;
                            const cumulativeUSDPercent = (bid.cumulativeUSD / maxCumulativeUSD) * 100;
                            return (
                              <div key={i} className="flex gap-4 text-xs font-mono px-1">
                                <span className="text-green-600 dark:text-green-400 w-20">{(parseFloat(bid.price) * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-green-100 dark:bg-green-900/50" style={{ width: `${sizePercent}%` }}></span>
                                  <span className="relative text-gray-600 dark:text-gray-400">{parseFloat(bid.size).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-green-100 dark:bg-green-900/50" style={{ width: `${usdPercent}%` }}></span>
                                  <span className="relative text-gray-600 dark:text-gray-400">{bid.usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-green-50 dark:bg-green-900/30" style={{ width: `${cumulativePercent}%` }}></span>
                                  <span className="relative text-gray-500 dark:text-gray-500">{bid.cumulative.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                                <span className="w-24 relative">
                                  <span className="absolute inset-0 bg-green-50 dark:bg-green-900/30" style={{ width: `${cumulativeUSDPercent}%` }}></span>
                                  <span className="relative text-gray-500 dark:text-gray-500">{bid.cumulativeUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Loading orderbook...
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

