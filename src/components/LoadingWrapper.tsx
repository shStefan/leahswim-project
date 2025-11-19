import React, { ReactNode } from 'react';
import { useTranslation } from '../context/TranslationContext';

interface LoadingWrapperProps {
  children: ReactNode;
  isContentLoading?: boolean; // Additional loading state for content
  showSkeleton?: boolean; // Whether to show skeleton or spinner
}

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-white">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const ContentSkeleton: React.FC = () => (
  <div className="animate-pulse bg-white min-h-screen">
    {/* Header skeleton */}
    <div className="h-16 bg-gray-200 mb-4"></div>
    
    {/* Content skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * LoadingWrapper prevents FORC (Flash of Russian Content) in the English version
 * by showing a loading state until both translation context and content are ready
 */
export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ 
  children, 
  isContentLoading = false,
  showSkeleton = false
}) => {
  const { isReady } = useTranslation();
  
  // Show loading state if translation context isn't ready or content is still loading
  const isLoading = !isReady || isContentLoading;
  
  if (isLoading) {
    return showSkeleton ? <ContentSkeleton /> : <LoadingSpinner />;
  }
  
  return <>{children}</>;
};