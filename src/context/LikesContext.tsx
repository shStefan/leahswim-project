import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

interface ProductLikeCache {
  [id: number]: {
    id: number;
    parentId?: number;
    name: string;
    price: string;
    images: Array<{ src: string }>;
  };
}

interface LikesContextType {
  likedProducts: number[];
  likedProductsCache: ProductLikeCache;
  toggleLike: (productId: number, productObj?: any) => void;
}

// 1. Define an initial context value satisfying LikesContextType
const initialContextValue: LikesContextType = {
  likedProducts: [],
  likedProductsCache: {},
  toggleLike: (productId, productObj) => {
    console.warn(
      'Attempted to call toggleLike on the initial LikesContext value. Ensure LikesProvider is correctly wrapping your component tree.',
      { productId, productObj }
    );
  },
};

// 2. Use this default value in createContext
const LikesContext = createContext<LikesContextType>(initialContextValue);

export const LikesProvider = ({ children }: { children: ReactNode }) => {
  const [likedProducts, setLikedProducts] = useState<number[]>([]);
  const [likedProductsCache, setLikedProductsCache] = useState<ProductLikeCache>({});

  useEffect(() => {
    const stored = localStorage.getItem('liked_products');
    setLikedProducts(stored ? JSON.parse(stored) : []);
    const cache = localStorage.getItem('liked_products_cache');
    setLikedProductsCache(cache ? JSON.parse(cache) : {});
  }, []);

  const cacheProductForLikes = useCallback((product: any) => {
    if (!product || typeof product.id === 'undefined') {
      console.error('cacheProductForLikes called with invalid product:', product);
      return;
    }
    setLikedProductsCache(prev => {
      const updated = {
        ...prev,
        [product.id]: {
          id: product.id,
          parentId: product.parentId,
          name: product.name,
          price: product.price,
          images: product.images,
        }
      };
      localStorage.setItem('liked_products_cache', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleLike = useCallback((productId: number, productObj?: any) => {
    setLikedProducts(prevLikedProductIds => {
      let updatedLikedProductIds;
      const isCurrentlyLiked = prevLikedProductIds.includes(productId);

      if (isCurrentlyLiked) {
        updatedLikedProductIds = prevLikedProductIds.filter(id => id !== productId);
        setLikedProductsCache(prevCache => {
          const newCache = { ...prevCache };
          delete newCache[productId];
          localStorage.setItem('liked_products_cache', JSON.stringify(newCache));
          return newCache;
        });
      } else {
        updatedLikedProductIds = [...prevLikedProductIds, productId];
        if (productObj) {
          const productToCache = {
            ...productObj,
            id: productId,
            parentId: productObj.parentId || productObj.id
          };
          cacheProductForLikes(productToCache);
        } else {
          console.warn(`Liking product ID ${productId} without providing productObj for caching.`);
        }
      }
      
      localStorage.setItem('liked_products', JSON.stringify(updatedLikedProductIds));
      return updatedLikedProductIds;
    });
  }, [cacheProductForLikes]);

  // 3. Memoize the context value
  const contextValue = useMemo(() => ({
    likedProducts,
    likedProductsCache,
    toggleLike,
  }), [likedProducts, likedProductsCache, toggleLike]);

  return (
    <LikesContext.Provider value={contextValue}>
      {children}
    </LikesContext.Provider>
  );
};

// 4. Adjust useLikes hook
export const useLikes = () => {
  const context = useContext(LikesContext);
  // Check if the context is the default initial one (meaning no Provider above)
  // A more direct check would be if context.toggleLike === initialContextValue.toggleLike
  // but often this simple check is sufficient if the provider always supplies a new object.
  if (context === initialContextValue) {
    throw new Error('useLikes must be used within a LikesProvider. Did you forget to wrap your component tree?');
  }
  return context;
}; 