import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Fill Monitor - PolyEvent",
  description: "Get browser notifications when your Polymarket orders are filled",
};

export default function FillMonitorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">Fill Monitor</h1>

        <div className="space-y-6">
          <section className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">What is Fill Monitor?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Fill Monitor automatically sends browser notifications when your Polymarket orders are filled.
              Once enabled, it runs silently in the background - no need to keep this page open.
            </p>
          </section>

          <section className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">How to Enable</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Connect your wallet</strong> - Click "Connect Wallet" in the navigation bar and connect your Polygon wallet
              </li>
              <li>
                <strong>Sign the message</strong> - You'll be prompted to sign a message to authenticate (one-time setup)
              </li>
              <li>
                <strong>Enable notifications</strong> - Allow browser notifications when prompted
              </li>
              <li>
                <strong>That's it!</strong> - The monitor will automatically start and continue running in the background
              </li>
            </ol>
          </section>

          <section className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Important Notes</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <p>
                  <strong>External wallet required:</strong> This feature only works when using Polymarket with an external wallet
                  (like MetaMask, Rainbow, etc.). It does not work with Polymarket's built-in wallet.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <p>
                  <strong>Polygon network:</strong> Your wallet must be on the Polygon network. The monitor will prompt you to switch if needed.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <p>
                  <strong>Browser notifications:</strong> Make sure notifications are enabled in your browser settings.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <p>
                  <strong>Automatic reconnection:</strong> If the connection drops, the monitor will automatically reconnect.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <p>
                  <strong>No re-signing needed:</strong> After the initial setup, credentials are stored locally and you won't need to sign again.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Privacy & Security</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Your API credentials are stored locally in your browser and never sent to any third-party servers.
              The fill monitor connects directly to Polymarket's official WebSocket API using your authenticated credentials.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              To disable: Simply disconnect your wallet and clear your browser's local storage for this site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
