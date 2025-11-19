import React, { useState } from 'react';

export const YandexFeedGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateFeed = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Dynamic import to avoid TypeScript compilation issues
      const { generateYandexFeed } = await import('../utils/ymlFeedGenerator');
      const ymlContent = await generateYandexFeed();
      
      // Create a blob and download the file
      const blob = new Blob([ymlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yandex-feed-${new Date().toISOString().split('T')[0]}.yml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewFeed = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Dynamic import to avoid TypeScript compilation issues
      const { generateYandexFeed } = await import('../utils/ymlFeedGenerator');
      const ymlContent = await generateYandexFeed();
      
      // Open in new window for preview
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write('<pre>' + ymlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>');
        newWindow.document.title = 'Yandex YML Feed Preview';
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Yandex YML Feed Generator</h2>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Generate a Yandex-compatible YML feed from your WooCommerce products.
        </p>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            Error: {error}
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={handlePreviewFeed}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Preview Feed'}
          </button>
          
          <button
            onClick={handleGenerateFeed}
            disabled={isGenerating}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Download YML Feed'}
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>• Feed includes only published, in-stock products</p>
                      <p>• Prices are converted to EUR currency (rate: 92 RUB = 1 EUR)</p>
          <p>• Product descriptions are cleaned and truncated</p>
        </div>
      </div>
    </div>
  );
};