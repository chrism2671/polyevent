'use client';

import { useState } from 'react';

interface TokenIdProps {
  tokenId: string;
}

export default function TokenId({ tokenId }: TokenIdProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(tokenId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const displayText = tokenId.slice(0, 6) + '...';

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center px-2 py-0.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
      title={copied ? 'Copied!' : `Token ID: ${tokenId} (click to copy)`}
    >
      {copied ? 'Copied!' : displayText}
    </button>
  );
}
