import React, { useState, useEffect } from 'react';
import { getProxiedImageUrlWithRetry } from '../utils/imageProxy';

interface ProxiedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  onError?: () => void;
  onLoad?: () => void;
}

export const ProxiedImage: React.FC<ProxiedImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  onError,
  onLoad,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(getProxiedImageUrlWithRetry(src, 0));
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    // Reset state when src changes
    setImageSrc(getProxiedImageUrlWithRetry(src, 0));
    setRetryCount(0);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleImageError = () => {
    if (retryCount < 3) {
      // Try next proxy
      const newSrc = getProxiedImageUrlWithRetry(src, retryCount + 1);
      setImageSrc(newSrc);
      setRetryCount(prev => prev + 1);
    } else {
      // All proxies failed
      setHasError(true);
      setIsLoading(false);
      onError?.();
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-gray-500 text-sm text-center p-4">
          <div className="mb-2">📷</div>
          <div>Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`bg-gray-200 animate-pulse ${className}`} />
      )}
      <img
        {...props}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={loading}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </>
  );
}; 