import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

// Define the structure for a cart item
interface CartItem {
  id: string; // Product or Variant ID
  parentId?: string; // Parent Product ID, if this item is a variation
  title: string;
  unit_price: string; // Price as a string, e.g., "100.00" or "₽1000"
  quantity: number;
  thumbnail?: string;
  // Add other relevant details like size, color if needed later
}

// Define the structure for the cart state
interface CartState {
  items: CartItem[];
  total: string; // Total price as a formatted string, e.g., "₽5000"
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

const calculateTotal = (items: CartItem[]): string => {
  const totalValue = items.reduce((sum, item) => {
    // Assuming unit_price is a string like "₽123.45" or just "123.45"
    // This parsing needs to be robust based on actual price format
    const priceString = item.unit_price.replace(/[^0-9.]/g, '');
    const price = parseFloat(priceString);
    return sum + (isNaN(price) ? 0 : price * item.quantity);
  }, 0);
  // Assuming currency symbol is desired, and it's Rubles (₽) based on previous code.
  // This should be made more dynamic if other currencies are possible.
  return `₽${totalValue.toFixed(2)}`;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartState>({ items: [], total: '₽0.00' });
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
        const initialCart = { items: [], total: '₽0.00' };
        setCart(initialCart);
        localStorage.setItem('local_cart', JSON.stringify(initialCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
      // Fallback to an empty cart
      const initialCart = { items: [], total: '₽0.00' };
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