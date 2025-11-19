import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { convertToEUR, formatEURPrice, parseCurrencyEUR } from '../utils/priceUtils';

// Define the structure for a cart item
interface CartItem {
  id: string; // Product or Variant ID
  parentId?: string; // Parent Product ID, if this item is a variation
  title: string;
  unit_price: string; // Price as a string, e.g., "100.00" or "€11"
  quantity: number;
  thumbnail?: string;
  // Add other relevant details like size, color if needed later
}

// Define the structure for the cart state
interface CartState {
  items: CartItem[];
  total: string; // Total price as a formatted string, e.g., "€54"
}

interface CartContextType {
  cart: CartState;
  loading: boolean; // Kept for potential async operations or future use
  isCartDrawerOpen: boolean; // New state for drawer visibility
  setIsCartDrawerOpen: (isOpen: boolean) => void; // New setter for drawer visibility
  addToCart: (itemDetails: Omit<CartItem, 'quantity' | 'total'> & { parentId?: string }, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateItemQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  // fetchCart is removed as it's loaded on init now
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

// Helper to safely parse a price string such as "€11" to a number 11.00
// Uses EUR price utility for consistency
const parsePrice = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return parseCurrencyEUR(String(value));
};

// Calculates the total with discount rules:
// - If 2 (or more) products: 10% discount on the two MOST expensive items
// - If 3 (or more) products: + cheapest product is FREE
// - If 4 (or more) products: + 15% discount on the SECOND cheapest product
// Quantities are treated individually (e.g. 2 pcs of the same item = 2 products)
const calculateTotal = (items: CartItem[]): string => {
  // 1. Flatten cart items into an array of individual unit prices
  const unitPrices: number[] = [];
  items.forEach((item) => {
    const priceNum = parsePrice(item.unit_price);
    for (let i = 0; i < item.quantity; i++) {
      unitPrices.push(priceNum);
    }
  });

  if (unitPrices.length === 0) {
    return '€0';
  }

  // Sum before discount for later usage (if needed)
  const totalBefore = unitPrices.reduce((acc, p) => acc + p, 0);

  // Sort prices for discount logic
  const asc = [...unitPrices].sort((a, b) => a - b); // ascending
  const desc = [...unitPrices].sort((a, b) => b - a); // descending

  let discount = 0;

  // Apply 10% on two most expensive if at least 2 products
  if (unitPrices.length >= 2) {
    discount += 0.1 * (desc[0] + desc[1]);
  }

  // Cheapest item free if at least 3 products
  if (unitPrices.length >= 3) {
    discount += asc[0];
  }

  // 15% off second cheapest if at least 4 products
  if (unitPrices.length >= 4) {
    discount += 0.15 * asc[1];
  }

  const finalTotal = Math.max(totalBefore - discount, 0); // Safety: prevent negative

  return formatEURPrice(finalTotal);
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartState>({ items: [], total: '€0' });
  const [loading, setLoading] = useState(true); // For initial load
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false); // New state variable for drawer

  // Load cart from localStorage on mount
  useEffect(() => {
    setLoading(true);
    try {
      const storedCart = localStorage.getItem('local_cart');
      if (storedCart) {
        const parsedCart: CartState = JSON.parse(storedCart);
        // Ensure total is recalculated in case items were manually changed or format needs update
        parsedCart.total = calculateTotal(parsedCart.items);
        setCart(parsedCart);
      } else {
        // Initialize with an empty cart if nothing in storage
        const initialCart = { items: [], total: '€0' };
        setCart(initialCart);
        localStorage.setItem('local_cart', JSON.stringify(initialCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
      // Fallback to an empty cart
      const initialCart = { items: [], total: '€0' };
      setCart(initialCart);
      localStorage.setItem('local_cart', JSON.stringify(initialCart));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCartStateAndStorage = useCallback((newItems: CartItem[]) => {
    const newTotal = calculateTotal(newItems);
    const newCartState = { items: newItems, total: newTotal };
    setCart(newCartState);
    localStorage.setItem('local_cart', JSON.stringify(newCartState));
  }, []);

  const addToCart = useCallback(async (itemDetails: Omit<CartItem, 'quantity' | 'total'> & { parentId?: string }, quantity: number) => {
    setLoading(true);
    const currentItems = [...cart.items];
    // If itemDetails.id is a variation, existingItemIndex should check this variation ID.
    // If it's a simple product, it checks the product ID.
    const existingItemIndex = currentItems.findIndex(i => i.id === String(itemDetails.id));

    if (existingItemIndex > -1) {
      currentItems[existingItemIndex].quantity += quantity;
    } else {
      // Ensure parentId from itemDetails is passed to the new cart item object
      currentItems.push({ 
        ...itemDetails, 
        id: String(itemDetails.id), 
        parentId: itemDetails.parentId, // Store parentId
        quantity 
      });
    }
    updateCartStateAndStorage(currentItems);
    // setIsCartDrawerOpen(true); // Open cart drawer on adding item - REMOVED/COMMENTED OUT
    setLoading(false);
  }, [cart.items, updateCartStateAndStorage]);

  const removeFromCart = useCallback(async (itemId: string) => {
    setLoading(true);
    const updatedItems = cart.items.filter(item => item.id !== itemId);
    updateCartStateAndStorage(updatedItems);
    setLoading(false);
  }, [cart.items, updateCartStateAndStorage]);

  const updateItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    setLoading(true);
    const currentItems = [...cart.items];
    const itemIndex = currentItems.findIndex(item => item.id === itemId);

    if (itemIndex > -1) {
      if (newQuantity > 0) {
        currentItems[itemIndex].quantity = newQuantity;
      } else {
        // Remove item if quantity is 0 or less
        currentItems.splice(itemIndex, 1);
      }
      updateCartStateAndStorage(currentItems);
    }
    setLoading(false);
  }, [cart.items, updateCartStateAndStorage]);

  const clearCart = useCallback(async () => {
    setLoading(true);
    updateCartStateAndStorage([]);
    setLoading(false);
  }, [updateCartStateAndStorage]);

  return (
    <CartContext.Provider value={{ cart, loading, isCartDrawerOpen, setIsCartDrawerOpen, addToCart, removeFromCart, updateItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}; 