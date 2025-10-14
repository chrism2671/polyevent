'use client';

import { useAccount, useSignTypedData, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { useState, useEffect, useRef } from 'react';

interface ApiCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export default function FillMonitor() {
  const { address, isConnected, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [status, setStatus] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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

      const credentials: ApiCredentials = await response.json();

      setStatus('Connecting to WebSocket...');

      // Connect to Polymarket WebSocket
      const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('Subscribing to fill events...');
        // Subscribe to user channel
        ws.send(JSON.stringify({
          subscriptions: [
            {
              topic: 'clob_user',
              type: '*',
              clob_auth: {
                key: credentials.apiKey,
                secret: credentials.secret,
                passphrase: credentials.passphrase,
              },
            },
          ],
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle fill events
          if (data.event_type === 'trade' || data.type === 'FILL') {
            new Notification('Order Filled! 🎉', {
              body: `Market: ${data.market || 'Unknown'}\nPrice: ${data.price || 'N/A'}`,
              icon: '/og-image.png',
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('Error: WebSocket connection failed');
        setIsMonitoring(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        if (isMonitoring) {
          setStatus('Disconnected');
          setIsMonitoring(false);
        }
      };

      setIsMonitoring(true);
      setStatus('Monitoring active');

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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsMonitoring(false);
    setStatus('Stopped');
  };

  if (!isConnected) {
    return (
      <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Fill Monitor</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your wallet to receive browser notifications when your orders are filled.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Please connect your wallet to use this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Fill Monitor</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Get instant browser notifications when your orders are filled.
      </p>

      <div className="space-y-2">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>

        {chain && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Network: {chain.name} {chain.id !== polygon.id && <span className="text-yellow-600 dark:text-yellow-400">(will switch to Polygon)</span>}
          </div>
        )}

        {notificationPermission === 'denied' && (
          <div className="text-sm text-red-600 dark:text-red-400">
            ⚠️ Notification permission denied. Please enable notifications in your browser settings.
          </div>
        )}

        {status && (
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Status: {status}
          </div>
        )}

        {isMonitoring ? (
          <div className="space-y-2">
            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {status || 'Monitoring active'}
            </div>
            <button
              onClick={stopMonitoring}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Stop Monitoring
            </button>
          </div>
        ) : (
          <button
            onClick={startMonitoring}
            disabled={!!status && status.includes('Error')}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Fill Monitor
          </button>
        )}
      </div>
    </div>
  );
}
