import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useLikes } from '../context/LikesContext'; 
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductImage {
  id: number;
  src: string;
}

interface Product {
  id: number;
  name: string;
  price: string;
  images: Array<{ src: string }>;
  slug?: string; 
}

interface RelatedProductsSliderProps {
  products: Product[];
  title: string;
  loading?: boolean; 
}

export const RelatedProductsSlider: React.FC<RelatedProductsSliderProps> = ({ products, title, loading }) => {
  const { likedProducts, toggleLike } = useLikes(); 

  if (loading) {
    return (
      <div className="w-full pt-8 pb-4 px-4">
        <h2 className="text-2xl font-semibold mb-6 text-center md:text-left">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="flex-shrink-0 w-60 md:w-72 animate-pulse">
              <div className="aspect-[3/4] bg-gray-200 rounded-md"></div>
              <div className="mt-2 h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="mt-1 h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    console.log('[RelatedProductsSlider] No products to display (this is expected if filtered list is empty).');
    return null; 
  }

  console.log('[RelatedProductsSlider] Rendering with products:', products);

  return (
    <div className="w-full pt-8 pb-4 px-4"> {/* Original outer styling */}
      <h2 className="text-2xl font-semibold mb-6 text-center md:text-left">{title}</h2>
      <div className="relative">
        <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {products.map((product) => {
            const productLink = `/product/${product.slug || product.id}`;
            
            return (
              <div key={product.id} className="flex-shrink-0 w-60 md:w-72 group">
                <Link to={productLink} className="block">
                  <div className="aspect-[3/4] bg-gray-100 rounded-md overflow-hidden relative">
                    {product.images && product.images.length > 0 && product.images[0].src ? (
                      <img 
                        src={product.images[0].src} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-xs text-gray-500">No image</span>
                      </div>
                    )}
                    {/* Optional: Like button - re-add if needed */}
                    {/* <button 
                      onClick={(e) => { e.preventDefault(); toggleLike(product.id, product as any); }} 
                      className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-black hover:text-red-500 transition-colors z-10"
                      aria-label="Like"
                    >
                      <Heart size={18} fill={likedProducts.includes(product.id) ? 'currentColor' : 'none'} />
                    </button> */}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate group-hover:underline">{product.name}</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      {product.price ? `₽${parseInt(product.price)}` : 'N/A'}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Make sure to export the component
// export default RelatedProductsSlider; // This is often how it's done, or named export 