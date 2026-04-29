import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, ShoppingBag, Menu, X, ChevronDown, Filter as FilterIcon, MessageSquare, Send } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLikes } from '../context/LikesContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/TranslationContext';
import { convertAndFormatPrice, parseCurrencyEUR } from '../utils/priceUtils';
import { DynamicText } from './DynamicText';

// Define types for navigation items
interface NavSubItem {
  title: string;
  path: string;
}

interface NavItem {
  title: string;
  path?: string; // Path for main category if it's clickable directly
  subItems?: NavSubItem[];
  megaMenuColumns?: NavSubItem[][]; // For more complex dropdowns like Детская одежда
}

// Navigation items with translation keys
const getNavItems = (t: (key: string) => string, language: string): NavItem[] => [
  {
    title: 'New Collection',
    path: `${language === 'en' ? '/en' : ''}/category/ss26`,
  },
  {
    title: t('nav.sport'),
    path: `${language === 'en' ? '/en' : ''}/category/%25d1%2581%25d0%25bf%25d0%25be%25d1%2580%25d1%2582`,
  },
  {
    title: t('nav.plussize'),
    path: `${language === 'en' ? '/en' : ''}/category/plus-size1`,
  },
  {
    title: t('nav.accessories'),
    path: `${language === 'en' ? '/en' : ''}/category/%25d0%25b0%25d0%25ba%25d1%2581%25d0%25b5%25d1%2581%25d1%2581%25d1%2583%25d0%25b0%25d1%2580%25d1%258b`,
  },
  {
    title: t('nav.basic'),
    path: `${language === 'en' ? '/en' : ''}/category/%25d0%25b1%25d0%25b0%25d0%25b7%25d0%25be%25d0%25b2%25d0%25b0%25d1%258f-%25d0%25ba%25d0%25be%25d0%25bb%25d0%25bb%25d0%25b5%25d0%25ba%25d1%2586%25d0%25b8%25d1%258f`,
  },
  {
    title: t('nav.cruise'),
    path: `${language === 'en' ? '/en' : ''}/category/kupalniki-new`,
  },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLikesMenuOpen, setIsLikesMenuOpen] = useState(false);
  const { likedProducts, likedProductsCache, toggleLike } = useLikes();
  const { cart, removeFromCart, isCartDrawerOpen, setIsCartDrawerOpen } = useCart();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  // Get navigation items with current language
  const navItems = getNavItems(t, language);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // For click outside
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null); // For mobile accordion

  const location = useLocation(); // Get location
  const isHomePage = location.pathname === '/'; // Check if it's the homepage

  // Log cart state whenever Header re-renders
  console.log('[Header Render] Cart items count:', cart?.items?.length, 'Cart Total:', cart?.total);

  const cartCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  // Utility to parse price strings like "€20" safely
  const parseNumeric = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return parseCurrencyEUR(val);
    }
    return 0;
  };

  // Simple total calculation - no discounts for EN version
  const totalAmount = cart?.items?.reduce((sum: number, item: any) => sum + parseNumeric(item.unit_price) * item.quantity, 0) || 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    // Only attach scroll listener if not on homepage, as homepage header is always transparent
    if (!isHomePage) {
      window.addEventListener('scroll', handleScroll);
    } else {
      // Ensure isScrolled is false if we navigate to homepage and it was true
      setIsScrolled(false);
    }
    return () => {
      if (!isHomePage) { // Clean up listener only if it was added
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isHomePage]); // Re-run effect if isHomePage changes

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  // Base classes
  const headerBaseClasses = "fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out";
  // Conditional classes
  const headerDynamicClasses = isHomePage
    ? "bg-transparent border-transparent" // Homepage: always transparent, no border
    : `${isScrolled ? 'shadow-md bg-white' : 'bg-white'} border-b border-gray-200`; // Other pages: normal behavior

  const textColorClass = isHomePage ? 'text-white' : 'text-black';
  const hoverTextColorClass = isHomePage ? 'hover:text-gray-200' : 'hover:text-gray-700';
  const dropdownTextColorClass = isHomePage ? 'text-gray-300' : 'text-gray-700'; // For dropdown open state
  const iconColorClass = isHomePage ? 'text-white' : 'text-black';
  // For dropdown menus, they usually have their own background, so text inside them might remain dark or need specific styling.
  // The cart/likes count badges will have black background and white text, which is fine for both header styles.
  // The logo image will not change color based on these classes.

  const logoSrc = isHomePage
    ? "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/white-1.png"
    : "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/black-1.png";

  const handleCheckout = () => {
    console.log('[handleCheckout triggered] Cart from current render scope:', JSON.parse(JSON.stringify(cart))); // Log a deep copy
    console.log('[handleCheckout] cart.items.length:', cart?.items?.length);

    if (cart && cart.items && cart.items.length > 0) {
      console.log('[handleCheckout] Condition met: Cart has items. Attempting to close drawer and navigate.');
      setIsCartDrawerOpen(false);
      console.log('[handleCheckout] Drawer supposedly set to closed. Navigating next...');
      // Temporarily add a timeout to see if it's a timing issue with drawer closing vs navigating
      setTimeout(() => {
        console.log('[handleCheckout] Navigating to /checkout after timeout...');
        navigate('/checkout');
      }, 100); // 100ms delay
    } else {
      console.log('[handleCheckout] Condition NOT met: Cart is effectively empty or cart object is problematic.');
    }
  };

  return (
    <header
      className={`${headerBaseClasses} ${headerDynamicClasses}`}
    >
      {/* Notification bar - only show on Russian pages */}
      {language === 'ru' && (
        <div className="w-full bg-[#99D6E9] text-black text-xs text-center py-1">
          {t('common.vpnMessage')}
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 md:px-[45px]">
        <div className="flex justify-between items-center h-16 relative">
          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 ${iconColorClass} ${hoverTextColorClass}`}
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          {/* Logo - mobile absolute center */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 md:hidden">
            <img src={logoSrc} alt="Logo" className="h-8 w-auto" />
          </Link>

          {/* Logo - desktop in flex flow */}
          <Link to="/" className="flex-shrink-0 hidden md:block">
            <img src={logoSrc} alt="Logo" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation with Dropdowns */}
          <nav className="hidden md:flex space-x-1 items-center">
            {navItems.map((item) => (
              <div
                key={item.title}
                className="relative group"
                onMouseEnter={() => setOpenDropdown(item.title)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  to={item.path || '#'}
                  className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center
                    ${openDropdown === item.title && (item.subItems || item.megaMenuColumns) ? (isHomePage ? 'text-gray-300 underline' : 'text-gray-700 underline') : textColorClass} ${hoverTextColorClass}
                  `}
                  onClick={(e) => {
                    if (!item.path && (item.subItems || item.megaMenuColumns)) e.preventDefault();
                    if (item.path) setOpenDropdown(null);
                  }}
                >
                  {item.title}
                  {(item.subItems || item.megaMenuColumns) && !item.path && <ChevronDown className={`inline w-4 h-4 ml-1 transition-transform duration-200 ${openDropdown === item.title ? 'transform rotate-180' : ''} ${iconColorClass}`} />}
                </Link>
                {openDropdown === item.title && (item.subItems || item.megaMenuColumns) && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 mt-2 w-auto min-w-max bg-white border border-gray-200 rounded-md shadow-lg py-1 z-40"
                  >
                    {item.subItems && !item.megaMenuColumns && item.subItems.map((subItem) => (
                      <Link
                        key={subItem.title}
                        to={subItem.path}
                        className="block px-4 py-3 text-sm text-black hover:bg-gray-100 hover:text-gray-800 whitespace-nowrap"
                        onClick={() => setOpenDropdown(null)}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                    {item.megaMenuColumns && (
                      <div className="flex p-5 min-w-[340px]">
                        {item.megaMenuColumns.map((column, colIndex) => (
                          <div key={colIndex} className="flex flex-col space-y-1 w-1/2 px-2">
                            {column.map((subItem, subIndex) => {
                              const isTitle = subIndex === 0 && column.length > 1;
                              if (isTitle) {
                                return (
                                  <span
                                    key={subItem.title}
                                    className="block pt-2 pb-2 text-sm font-semibold text-black select-none mb-1"
                                  >
                                    {subItem.title}
                                  </span>
                                );
                              } else {
                                return (
                                  <Link
                                    key={subItem.title}
                                    to={subItem.path}
                                    className="block py-2 text-sm text-black hover:bg-gray-100 hover:text-gray-800 rounded-md px-3"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    {subItem.title}
                                  </Link>
                                );
                              }
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            <button
              className={`p-2 relative ${iconColorClass} ${hoverTextColorClass}`}
              onClick={() => setIsLikesMenuOpen(true)}
              aria-label="Liked products"
            >
              <Heart size={24} />
              <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {likedProducts.length}
              </span>
            </button>
            <button
              className={`p-2 relative ${iconColorClass} ${hoverTextColorClass}`}
              onClick={() => setIsCartDrawerOpen(true)}
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
            onClick={() => {
              setIsMenuOpen(false);
              setOpenMobileSubmenu(null); // Reset mobile submenu on close
            }}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col h-[calc(100%-64px)] p-4">
          <div className="flex-grow overflow-y-auto">
            {navItems.map((item) => (
              <div key={item.title} className="flex flex-col">
                <button
                  onClick={() => {
                    if (item.subItems || item.megaMenuColumns) {
                      setOpenMobileSubmenu(openMobileSubmenu === item.title ? null : item.title);
                    } else if (item.path) {
                      navigate(item.path);
                      setIsMenuOpen(false);
                      setOpenMobileSubmenu(null);
                    }
                  }}
                  className="flex items-center justify-between w-full py-2 px-3 text-left text-black hover:bg-gray-100 rounded-md"
                >
                  <span>{item.title}</span>
                  {(item.subItems || item.megaMenuColumns) && (
                    <ChevronDown
                      className={`w-5 h-5 transform transition-transform duration-200 ${openMobileSubmenu === item.title ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                {item.subItems && openMobileSubmenu === item.title && (
                  <div className="pl-4 mt-1 mb-2 border-l border-gray-200">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.title}
                        to={subItem.path}
                        className="block py-2 px-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setOpenMobileSubmenu(null);
                        }}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </div>
                )}
                {item.megaMenuColumns && openMobileSubmenu === item.title && (
                  <div className="pl-4 mt-1 mb-2 border-l border-gray-200">
                    {item.megaMenuColumns.map((column, colIndex) => (
                      <div key={`${item.title}-col-${colIndex}`} className="mb-2 last:mb-0">
                        {column.map((subItem, subIndex) => {
                          const isTitle = subIndex === 0 && column.length > 1;
                          if (isTitle) {
                            return (
                              <span
                                key={`${subItem.title}-title-${subIndex}`}
                                className="block py-2 px-3 text-sm font-semibold text-black select-none"
                              >
                                {subItem.title}
                              </span>
                            );
                          } else {
                            return (
                              <Link
                                key={`${subItem.title}-link-${subIndex}`}
                                to={subItem.path}
                                className="block py-2 px-3 ml-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  setOpenMobileSubmenu(null);
                                }}
                              >
                                {subItem.title}
                              </Link>
                            );
                          }
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4">
            <hr className="my-2 border-gray-200" />
            <Link to={`${language === 'en' ? '/en' : ''}/`} className="block py-2 px-3 text-black hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.home')}</Link>
            <Link to={`${language === 'en' ? '/en' : ''}/about`} className="block py-2 px-3 text-black hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.about')}</Link>
            <Link to={`${language === 'en' ? '/en' : ''}/contact`} className="block py-2 px-3 text-black hover:bg-gray-100 rounded-md" onClick={() => setIsMenuOpen(false)}>{t('nav.contact')}</Link>

            <hr className="my-2 border-gray-200" />
            <div className="flex justify-around items-center py-2 px-3">
              <a href="https://web.whatsapp.com/send?phone=33640613269&text=" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-black hover:text-gray-700">
                <MessageSquare size={24} />
              </a>
              <a href="https://t.me/swimwithleah" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-black hover:text-gray-700">
                <Send size={24} />
              </a>
            </div>
          </div>
        </nav>
      </div>

      {/* Likes Side Menu & Overlay - always rendered for animation */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${isLikesMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsLikesMenuOpen(false)}
        aria-hidden={!isLikesMenuOpen}
      />
      <div
        className={`fixed top-8 right-8 max-w-[400px] w-[90vw] max-h-[80vh] bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 transition-opacity duration-300 overflow-hidden flex flex-col
          ${isLikesMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isLikesMenuOpen}
      >
        <div className="flex justify-end p-2">
          <button onClick={() => setIsLikesMenuOpen(false)} className="text-black hover:text-gray-600 text-lg">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-4 flex flex-col flex-1 min-h-0">
          <span className="text-base font-bold uppercase mb-2">{t('favorites.title')}</span>
          <div className="w-full h-px bg-gray-200 mb-2" />
          <div className="flex-1 overflow-y-auto flex flex-col">
            {likedProducts.length === 0 ? (
              <div className="text-xs text-gray-400 text-center mt-8">{t('favorites.empty')}</div>
            ) : (
              likedProducts.map((id) => {
                const product = likedProductsCache[id];
                if (!product) return null;
                return (
                  <div key={product.id} className="flex py-4 border-b border-gray-100 last:border-b-0 items-start">
                    <img
                      src={product.images?.[0]?.src || '/placeholder.png'}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded border mr-4"
                    />
                    <div className="flex-1 flex flex-col items-start text-left">
                      <div className="flex justify-between items-start w-full mb-1">
                        <span className="font-semibold text-base text-black mr-2">{product.name}</span>
                        <button
                          className="p-1 text-gray-500 hover:text-red-600 flex-shrink-0"
                          aria-label="Unlike"
                          onClick={() => toggleLike(product.id, product)}
                        >
                          <Heart className="w-5 h-5" fill="currentColor" stroke="currentColor" />
                        </button>
                      </div>
                      <span className="text-sm text-black font-bold">
                        {(() => {
                          const price = product.price;
                          let displayPrice = 'Price not specified';
                          if (price !== undefined && price !== null) {
                            displayPrice = convertAndFormatPrice(price);
                          }
                          return displayPrice;
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cart Side Menu & Overlay - always rendered for animation */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${isCartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsCartDrawerOpen(false)}
        aria-hidden={!isCartDrawerOpen}
      />
      <div
        className={`fixed top-8 right-8 max-w-[400px] w-[90vw] max-h-[80vh] bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 transition-opacity duration-300 overflow-hidden flex flex-col
          ${isCartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isCartDrawerOpen}
      >
        <div className="flex justify-end p-2">
          <button onClick={() => setIsCartDrawerOpen(false)} className="text-black hover:text-gray-600 text-lg">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-0 flex flex-col flex-1 min-h-0">
          <span className="text-base font-bold uppercase mb-2">{t('cart.title')}</span>
          <div className="w-full h-px bg-gray-200 mb-2" />
          <div className="flex-1 overflow-y-auto">
            {cart?.items && cart.items.length > 0 ? (
              cart.items.map((item: any) => {
                const priceNum = parseNumeric(item.unit_price);
                return (
                  <div key={item.id} className="flex py-4 border-b border-gray-100 last:border-b-0 items-start">
                    <img
                      src={item.thumbnail || '/placeholder.png'}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded border mr-4"
                    />
                    <div className="flex-1 flex flex-col items-start text-left">
                      <DynamicText
                        text={item.title}
                        tag="div"
                        className="font-semibold text-base mb-1"
                      />
                      <div className="text-sm text-black font-bold">
                        €{Math.round(priceNum * item.quantity)}
                      </div>
                    </div>
                    <button
                      className="ml-2 text-gray-400 hover:text-black text-xl mt-1 p-1"
                      onClick={async () => {
                        if (item.id) {
                          try {
                            await removeFromCart(item.id);
                            console.log(`Item ${item.id} removed from header cart`);
                          } catch (error) {
                            console.error("Error removing item from header cart:", error);
                          }
                        }
                      }}
                      aria-label={t('cart.remove')}
                    >
                      <X size={18} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-gray-400 text-center mt-8">{t('cart.empty')}</div>
            )}
          </div>
          <div className="pt-4 pb-6 bg-white sticky bottom-0 left-0 right-0 z-10">
            {cart?.items && cart.items.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-3 px-1">
                  <span className="text-lg font-semibold">{t('cart.total')}</span>
                  <span className="text-lg font-bold">€{Math.round(totalAmount)}</span>
                </div>
              </>
            )}
            <button
              className="w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded"
              disabled={!(cart && cart.items && cart.items.length > 0)}
              onClick={handleCheckout}
            >
              {t('cart.checkout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 