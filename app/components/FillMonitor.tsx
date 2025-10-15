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

  // Auto-start monitoring when wallet connects
  useEffect(() => {
    if (isConnected && address && !isMonitoring) {
      // Check if we have stored credentials
      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.address === address && data.credentials) {
            // Auto-start with stored credentials
            startMonitoring();
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }, [isConnected, address]);

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
      console.log('🚀 STARTING FILL MONITOR FOR ADDRESS:', address);
      let credentials: ApiCredentials | null = null;

      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.address === address && data.credentials) {
            credentials = data.credentials;
            console.log('✅ Using stored credentials');
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
        const onMessage = (message: Message) => {
          console.log('============ USER CHANNEL MESSAGE ============');
          console.log('Full message object:', JSON.stringify(message, null, 2));
          console.log('Message topic:', message.topic);
          console.log('Message type:', message.type);
          console.log('Message payload:', message.payload);
          console.log('============================================');

          if (message.topic === 'clob_user' && message.type === 'trade') {
            console.log('✅ TRADE MESSAGE DETECTED!');
            const payload = message.payload as any;
            new Notification('Order Filled! 🎉', {
              body: `Market: ${payload.market || 'Unknown'}\nPrice: ${payload.price || 'N/A'}\nSize: ${payload.size || 'N/A'}`,
              icon: '/og-image.png',
            });
          } else {
            console.log(`❌ Not a trade: topic=${message.topic}, type=${message.type}`);
          }
        };

        const onConnect = (client: RealTimeDataClient) => {
          console.log('🟢 WEBSOCKET CONNECTED');
          setStatus('Monitoring active');

          const subscription = {
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
          };

          console.log('📤 SUBSCRIBING TO USER CHANNEL:', JSON.stringify(subscription, null, 2));
          client.subscribe(subscription);
          console.log('✅ SUBSCRIPTION SENT');
        };

        try {
          if (clientRef.current) {
            console.log('🔴 Disconnecting existing client');
            clientRef.current.disconnect();
          }

          console.log('🔵 Creating new RealTimeDataClient');
          const client = new RealTimeDataClient({ onMessage, onConnect });
          clientRef.current = client;

          console.log('🔌 Calling client.connect()...');
          client.connect();
        } catch (error) {
          console.error('❌ WebSocket connection error:', error);

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

  // Run silently in the background, no UI needed
  return null;
}
