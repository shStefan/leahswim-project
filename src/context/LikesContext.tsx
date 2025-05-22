import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProductLikeCache {
  [id: number]: {
    id: number;
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

const LikesContext = createContext<LikesContextType | undefined>(undefined);

export const LikesProvider = ({ children }: { children: ReactNode }) => {
  const [likedProducts, setLikedProducts] = useState<number[]>([]);
  const [likedProductsCache, setLikedProductsCache] = useState<ProductLikeCache>({});

  useEffect(() => {
    const stored = localStorage.getItem('liked_products');
    setLikedProducts(stored ? JSON.parse(stored) : []);
    const cache = localStorage.getItem('liked_products_cache');
    setLikedProductsCache(cache ? JSON.parse(cache) : {});
  }, []);

  const cacheProductForLikes = (product: any) => {
    if (!product) return;
    setLikedProductsCache(prev => {
      const updated = { ...prev, [product.id]: {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images,
      }};
      localStorage.setItem('liked_products_cache', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleLike = (productId: number, productObj?: any) => {
    setLikedProducts(prev => {
      let updated;
      if (prev.includes(productId)) {
        updated = prev.filter(id => id !== productId);
      } else {
        updated = [...prev, productId];
        if (productObj) cacheProductForLikes(productObj);
      }
      localStorage.setItem('liked_products', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <LikesContext.Provider value={{ likedProducts, likedProductsCache, toggleLike }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikes = () => {
  const context = useContext(LikesContext);
  if (!context) throw new Error('useLikes must be used within a LikesProvider');
  return context;
}; 