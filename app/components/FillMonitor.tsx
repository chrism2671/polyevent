'use client';

import { useAccount, useSignTypedData, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { useState, useEffect, useRef } from 'react';
import { RealTimeDataClient } from '@polymarket/real-time-data-client';
import type { Message } from '@polymarket/real-time-data-client';

interface ApiCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

const CREDENTIALS_STORAGE_KEY = 'polymarket_credentials';

export default function FillMonitor() {
  const { address, isConnected, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [status, setStatus] = useState<string>('');
  const clientRef = useRef<RealTimeDataClient | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Cleanup client on unmount
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  // Clear credentials when address changes
  useEffect(() => {
    if (address) {
      // Clear old credentials from different address
      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.address !== address) {
            localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
          }
        } catch {
          localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        }
      }
    }
  }, [address]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }
    return false;
  };

  const startMonitoring = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    // Request notification permission if not already granted
    if (notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        alert('Notification permission is required for fill alerts');
        return;
      }
    }

    try {
      let credentials: ApiCredentials | null = null;

      // Check localStorage first
      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.address === address && data.credentials) {
            credentials = data.credentials;
            setStatus('Using stored credentials...');
          }
        } catch {
          localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        }
      }

      // Only sign and derive credentials if we don't have them cached
      if (!credentials) {
        // Switch to Polygon if not already on it
        if (chain?.id !== polygon.id) {
          setStatus('Switching to Polygon...');
          try {
            await switchChainAsync({ chainId: polygon.id });
          } catch (error) {
            throw new Error('Please switch to Polygon network to continue');
          }
        }

        setStatus('Signing message...');

        // EIP-712 typed data for Polymarket authentication
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = 0;
        const domain = {
          name: 'ClobAuthDomain',
          version: '1',
          chainId: 137, // Polygon
        };
        const types = {
          ClobAuth: [
            { name: 'address', type: 'address' },
            { name: 'timestamp', type: 'string' },
            { name: 'nonce', type: 'uint256' },
            { name: 'message', type: 'string' },
          ],
        };
        const message = {
          address,
          timestamp: timestamp.toString(),
          nonce: nonce,
          message: 'This message attests that I control the given wallet',
        };

        // Sign the typed data
        const signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: 'ClobAuth',
          message,
        });

        setStatus('Deriving API credentials...');

        // Get API credentials from our backend
        const response = await fetch('/api/polymarket-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, signature, timestamp, nonce }),
        });

        if (!response.ok) {
          throw new Error('Failed to derive API credentials');
        }

        credentials = await response.json();

        // Store credentials in localStorage
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({
          address,
          credentials,
        }));
      }

      setStatus('Connecting to real-time data...');
      shouldReconnectRef.current = true;

      const connectWithReconnect = () => {
        // Create message handler for fill events
        const onMessage = (message: Message) => {
          console.log('Received message:', message);

          // Handle fill events
          if (message.topic === 'clob_user' && message.type === 'trade') {
            const payload = message.payload as any;
            new Notification('Order Filled! 🎉', {
              body: `Market: ${payload.market || 'Unknown'}\nPrice: ${payload.price || 'N/A'}\nSize: ${payload.size || 'N/A'}`,
              icon: '/og-image.png',
            });
          }
        };

        // Create connect handler to subscribe
        const onConnect = (client: RealTimeDataClient) => {
          setStatus('Monitoring active');
          client.subscribe({
            subscriptions: [
              {
                topic: 'clob_user',
                type: 'trade',
                clob_auth: {
                  key: credentials.apiKey,
                  secret: credentials.secret,
                  passphrase: credentials.passphrase,
                },
              },
            ],
          });
        };

        try {
          // Disconnect existing client if any
          if (clientRef.current) {
            clientRef.current.disconnect();
          }

          // Create and connect the client
          const client = new RealTimeDataClient({ onMessage, onConnect });
          clientRef.current = client;
          client.connect();
        } catch (error) {
          console.error('WebSocket connection error:', error);

          // Attempt reconnection if should reconnect
          if (shouldReconnectRef.current) {
            setStatus('Connection lost, reconnecting...');
            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldReconnectRef.current) {
                connectWithReconnect();
              }
            }, 5000); // Reconnect after 5 seconds
          }
        }
      };

      connectWithReconnect();
      setIsMonitoring(true);

      // Show success notification
      new Notification('Fill Monitor Started', {
        body: `Monitoring fills for ${address.slice(0, 6)}...${address.slice(-4)}`,
        icon: '/og-image.png',
      });
    } catch (error) {
      console.error('Error starting monitor:', error);
      setStatus('Error: ' + (error as Error).message);
      alert('Failed to start fill monitor. Please try again.');
    }
  };

  const stopMonitoring = () => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsMonitoring(false);
    setStatus('Stopped');
  };

  if (!isConnected) {
    return null; // Don't show if wallet not connected
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold dark:text-gray-200">Fill Monitor</h3>
          {isMonitoring && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
        </div>

        <div className="space-y-2 text-xs">
          {chain && chain.id !== polygon.id && (
            <div className="text-yellow-600 dark:text-yellow-400">
              ⚠️ Will switch to Polygon
            </div>
          )}

          {notificationPermission === 'denied' && (
            <div className="text-red-600 dark:text-red-400">
              ⚠️ Enable notifications
            </div>
          )}

          {status && (
            <div className="text-gray-700 dark:text-gray-300">
              {status}
            </div>
          )}

          {isMonitoring ? (
            <button
              onClick={stopMonitoring}
              className="w-full px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Stop Monitor
            </button>
          ) : (
            <button
              onClick={startMonitoring}
              disabled={!!status && status.includes('Error')}
              className="w-full px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Monitor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
