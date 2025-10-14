'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';

export default function FillMonitor() {
  const { address, isConnected } = useAccount();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
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

    // Show test notification
    new Notification('Fill Monitor Started', {
      body: `Monitoring fills for ${address.slice(0, 6)}...${address.slice(-4)}`,
      icon: '/og-image.png',
    });

    setIsMonitoring(true);
    // TODO: Connect to WebSocket and subscribe to user channel
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    // TODO: Disconnect WebSocket
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

        {notificationPermission === 'denied' && (
          <div className="text-sm text-red-600 dark:text-red-400">
            ⚠️ Notification permission denied. Please enable notifications in your browser settings.
          </div>
        )}

        {isMonitoring ? (
          <div className="space-y-2">
            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Monitoring active
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
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Start Fill Monitor
          </button>
        )}
      </div>
    </div>
  );
}
