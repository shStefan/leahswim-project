interface ProductCardSkeletonProps {
  delay?: string; // e.g. '0ms', '120ms', etc.
}

export const ProductCardSkeleton = ({ delay = '0ms' }: ProductCardSkeletonProps): JSX.Element => {
  return (
    <div
      className="relative border border-gray-200 rounded-md overflow-hidden"
      style={{ animationDelay: delay }}
    >
      {/* Skeleton for Product Media (Image) */}
      <div className="aspect-[3/4] overflow-hidden bg-gray-100 animate-pulse-bg w-full h-full">
        {/* Custom pulse for background */}
      </div>
      {/* Skeleton for Product Info */}
      <div className="mt-2 pl-2 pr-2 pb-2 md:pl-3 md:pr-3 md:pb-3">
        <div className="flex items-center justify-between w-full">
          {/* Skeleton for Product Name */}
          <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse-text"></div>
          {/* Skeleton for Like/Cart Icons */}
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-300 rounded ml-2 animate-pulse-text"></div>
            <div className="h-5 w-5 bg-gray-300 rounded ml-1 animate-pulse-text"></div>
          </div>
        </div>
        {/* Skeleton for Product Price */}
        <div className="h-4 bg-gray-300 rounded w-1/4 mt-1 animate-pulse-text"></div>
        {/* Skeleton for Color Swatches */}
        <div className="flex space-x-1 mt-1">
          <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse-text"></div>
          <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse-text"></div>
          <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse-text"></div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton; // Adding default export as well, can help with some module interop issues. 