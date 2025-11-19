import { useState } from 'react';

// Utility to handle image URLs with CORS issues
export const getProxiedImageUrl = (originalUrl: string): string => {
  // If it's already a data URL or doesn't need proxying, return as is
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return originalUrl;
  }
  
  // For leahcationhost images, use our proxy server
  if (originalUrl.includes('leahcationhost-d181bc.ingress-erytho.ewp.live')) {
    // Replace the domain with our proxy server
    return originalUrl.replace(
      'https://leahcationhost-d181bc.ingress-erytho.ewp.live',
      'https://prox-two-alpha.vercel.app'
    );
  }
  
  // For Railway/WordPress images, use multiple proxy options
  if (originalUrl.includes('eaaw-production.up.railway.app')) {
    // Try multiple proxy services for better reliability
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
      `https://cors-anywhere.herokuapp.com/${originalUrl}`,
      `https://thingproxy.freeboard.io/fetch/${originalUrl}`
    ];
    
    // For now, use the first proxy. In a real app, you'd implement retry logic
    return proxies[0];
  }
  
  return originalUrl;
};

// Enhanced version with retry logic
export const getProxiedImageUrlWithRetry = (originalUrl: string, proxyIndex: number = 0): string => {
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return originalUrl;
  }
  
  // For leahcationhost images, we only have one proxy option (our dedicated proxy)
  if (originalUrl.includes('leahcationhost-d181bc.ingress-erytho.ewp.live')) {
    return originalUrl.replace(
      'https://leahcationhost-d181bc.ingress-erytho.ewp.live',
      'https://prox-two-alpha.vercel.app'
    );
  }
  
  if (originalUrl.includes('eaaw-production.up.railway.app')) {
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
      `https://cors-anywhere.herokuapp.com/${originalUrl}`,
      `https://thingproxy.freeboard.io/fetch/${originalUrl}`
    ];
    
    return proxies[proxyIndex % proxies.length] || originalUrl;
  }
  
  return originalUrl;
};

// Alternative: Convert image to base64 to avoid CORS
export const convertImageToBase64 = async (url: string): Promise<string> => {
  try {
    // Use our proxy for the fetch request
    const proxiedUrl = getProxiedImageUrl(url);
    const response = await fetch(proxiedUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return url; // Fallback to original URL
  }
};

// React hook for handling image loading with fallbacks
export const useImageWithFallback = (originalUrl: string) => {
  const [imageSrc, setImageSrc] = useState<string>(getProxiedImageUrl(originalUrl));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const handleImageError = () => {
    if (retryCount < 3) {
      // Try next proxy
      const newSrc = getProxiedImageUrlWithRetry(originalUrl, retryCount + 1);
      setImageSrc(newSrc);
      setRetryCount(prev => prev + 1);
    } else {
      // All proxies failed, show error
      setError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  return {
    imageSrc,
    isLoading,
    error,
    handleImageError,
    handleImageLoad
  };
}; 