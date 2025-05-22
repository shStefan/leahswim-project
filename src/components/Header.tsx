import { useState } from 'react';
import { Heart, ShoppingBag, Menu, X, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLikes } from '../context/LikesContext';
import { useCart } from '../context/CartContext';

const WC_CONSUMER_KEY = 'ck_d170e090d396f69f0d671275b8fa2af3b6239829';
const WC_CONSUMER_SECRET = 'cs_272080de1a154339f0799d1845f64c144e090640';
const WC_API_URL = 'https://leahcation.ru/wp-json/wc/v3';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLikesMenuOpen, setIsLikesMenuOpen] = useState(false);
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);
  const { likedProducts, likedProductsCache, toggleLike } = useLikes();
  const { cart } = useCart();
  const cartCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-black hover:text-gray-600"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-black hover:text-gray-600">Home</Link>
            <Link to="/catalogue" className="text-black hover:text-gray-600">Catalogue</Link>
            <Link to="/about" className="text-black hover:text-gray-600">About</Link>
            <Link to="/contact" className="text-black hover:text-gray-600">Contact</Link>
          </nav>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            <button
              className="p-2 text-black hover:text-gray-600 relative"
              onClick={() => setIsLikesMenuOpen(true)}
              aria-label="Liked products"
            >
              <Heart size={24} />
              <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {likedProducts.length}
              </span>
            </button>
            <button
              className="p-2 text-black hover:text-gray-600 relative"
              onClick={() => setIsCartMenuOpen(true)}
              aria-label="Shopping cart"
            >
              <ShoppingBag size={24} />
              <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 md:hidden z-40 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden={!isMenuOpen}
      />

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 md:hidden ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex justify-end p-4">
          <button
            className="text-black hover:text-gray-600"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col space-y-4 p-4">
          <Link to="/" className="text-black hover:text-gray-600">Home</Link>
          <Link to="/catalogue" className="text-black hover:text-gray-600">Catalogue</Link>
          <Link to="/about" className="text-black hover:text-gray-600">About</Link>
          <Link to="/contact" className="text-black hover:text-gray-600">Contact</Link>
        </nav>
      </div>

      {/* Likes Side Menu & Overlay - always rendered for animation */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${isLikesMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsLikesMenuOpen(false)}
        aria-hidden={!isLikesMenuOpen}
      />
      <div
        className={`fixed top-8 right-8 max-w-[400px] w-[90vw] max-h-[80vh] bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 transition-opacity duration-300
          ${isLikesMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isLikesMenuOpen}
      >
        <div className="flex justify-end p-2">
          <button onClick={() => setIsLikesMenuOpen(false)} className="text-black hover:text-gray-600 text-lg">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-4 flex flex-col h-full">
          <span className="text-base font-bold uppercase mb-2">Liked Products</span>
          <div className="w-full h-px bg-gray-200 mb-2" />
          <div className="flex-1 overflow-y-auto flex flex-col">
            {likedProducts.length === 0 ? (
              <div className="text-xs text-gray-400 text-center mt-8">No liked products yet.</div>
            ) : (
              likedProducts.map((id, idx) => {
                const product = likedProductsCache[id];
                if (!product) return null;
                return (
                  <div key={product.id}>
                    <div className="flex items-center gap-4 py-2">
                      <img src={product.images?.[0]?.src || '/placeholder.png'} alt={product.name} className="w-12 h-12 object-cover rounded-lg border" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-black">{product.name}</span>
                          <button
                            className="ml-2 p-1 text-black hover:text-black"
                            aria-label="Unlike"
                            onClick={() => toggleLike(product.id, product)}
                          >
                            <Heart className="w-5 h-5" fill={'currentColor'} stroke="currentColor" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-600">{product.price ? `₽${product.price}` : 'Price not available'}</span>
                      </div>
                    </div>
                    {idx < likedProducts.length - 1 && <div className="w-full h-px bg-gray-200 my-1" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cart Side Menu & Overlay - always rendered for animation */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${isCartMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsCartMenuOpen(false)}
        aria-hidden={!isCartMenuOpen}
      />
      <div
        className={`fixed top-8 right-8 max-w-[400px] w-[90vw] max-h-[80vh] bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 transition-opacity duration-300
          ${isCartMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isCartMenuOpen}
      >
        <div className="flex justify-end p-2">
          <button onClick={() => setIsCartMenuOpen(false)} className="text-black hover:text-gray-600 text-lg">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-4 flex flex-col h-full">
          <span className="text-base font-bold uppercase mb-2">Shopping Cart</span>
          <div className="w-full h-px bg-gray-200 mb-2" />
          <div className="flex-1 overflow-y-auto flex flex-col">
            {!cart || cart.items?.length === 0 ? (
              <div className="text-xs text-gray-400 text-center mt-8">Your cart is empty.</div>
            ) : (
              cart.items.map((item: any, idx: number) => (
                <div key={item.id}>
                  <div className="flex items-center gap-4 py-2">
                    <img src={item.thumbnail || '/placeholder.png'} alt={item.title} className="w-12 h-12 object-cover rounded-lg border" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-black">{item.title}</span>
                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                      </div>
                      <span className="text-xs text-gray-600">{item.unit_price ? `₽${item.unit_price}` : 'Price not available'}</span>
                    </div>
                  </div>
                  {idx < cart.items.length - 1 && <div className="w-full h-px bg-gray-200 my-1" />}
                </div>
              ))
            )}
          </div>
          {cart && cart.items?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-sm">Total:</span>
                <span className="font-semibold text-sm">{cart.total ? `₽${cart.total}` : 'Price not available'}</span>
              </div>
              <button
                className="w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded"
                onClick={() => {
                  setIsCartMenuOpen(false);
                  navigate('/checkout');
                }}
              >
                Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 