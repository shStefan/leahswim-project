import React from 'react';

export const ProductPageSkeleton = (): JSX.Element => {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column - Image Gallery Skeleton */}
        <div className="md:w-1/2">
          <div className="aspect-square bg-gray-200 animate-pulse-bg rounded-lg"></div>
          {/* Thumbnail Placeholders */}
          <div className="flex space-x-2 mt-4 overflow-x-auto">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 animate-pulse-bg rounded"></div>
            ))}
          </div>
        </div>

        {/* Right Column - Product Details Skeleton */}
        <div className="md:w-1/2 flex flex-col">
          {/* Product Name Placeholder */}
          <div className="h-8 bg-gray-300 animate-pulse-text rounded w-3/4 mb-4"></div>
          {/* Product Price Placeholder */}
          <div className="h-6 bg-gray-300 animate-pulse-text rounded w-1/4 mb-6"></div>
          {/* Color Swatches Placeholder */}
          <div className="mb-6">
            <div className="h-4 bg-gray-300 animate-pulse-text rounded w-1/3 mb-2"></div>
            <div className="flex space-x-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-gray-300 animate-pulse-text rounded-full"></div>
              ))}
            </div>
          </div>

          {/* Size Selection Placeholder */}
          <div className="mb-6">
            <div className="h-4 bg-gray-300 animate-pulse-text rounded w-1/4 mb-2"></div>
            <div className="flex flex-wrap gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-300 animate-pulse-text rounded w-20"></div>
              ))}
            </div>
          </div>

          {/* Add to Cart Button Placeholder */}
          <div className="h-12 bg-gray-400 animate-pulse-text rounded w-full mb-6"></div>
          {/* Accordion/Expandable Sections Placeholder */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-4">
              <div className="h-6 bg-gray-300 animate-pulse-text rounded w-full mb-1"></div>
              <div className="h-4 bg-gray-300 animate-pulse-text rounded w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductPageSkeleton; 