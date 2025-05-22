import { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Menu, X, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLikes } from '../context/LikesContext';
import { useCart } from '../context/CartContext';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import SelectedFiltersDisplay from '../components/SelectedFiltersDisplay';

// Navigation items
const navItems = [
  { id: 1, title: "New Arrivals", path: "/catalogue" },
  { id: 2, title: "Best Sellers", path: "/catalogue" },
  { id: 3, title: "Swimwear", path: "/catalogue" },
  { id: 4, title: "Clothing", path: "/catalogue" },
  { id: 5, title: "Campaigns", path: "/catalogue" },
  { id: 6, title: "For Him", path: "/catalogue" },
];

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  price: string;
  images: Array<{ src: string }>;
  attributes?: Array<{
    name: string;
    slug: string;
    options: string[];
  }>;
  categories?: Array<{ id: number; name: string }>;
  status: string;
}

export const CataloguePage = (): JSX.Element => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileFilterDropdown, setMobileFilterDropdown] = useState<string | null>(null);
  const [isLikesMenuOpen, setIsLikesMenuOpen] = useState(false);
  const { likedProducts, toggleLike } = useLikes();
  const { addToCart } = useCart();
  const [productDisplayImages, setProductDisplayImages] = useState<{[productId: number]: string}>({});

  // WooCommerce API credentials
  const WC_CONSUMER_KEY = 'ck_c2758a311f98c4c5a4e44b85a5a66eae4a0581c3';
  const WC_CONSUMER_SECRET = 'cs_7b0d34c68e68a5ae5cebf19a6d23338ab83de571';
  const WC_API_URL = 'https://zdqksnii.elementor.cloud/wp-json/wc/v3';

  // Extract unique filter options from products
  const allSizes = Array.from(new Set(products?.flatMap(product =>
    product.attributes?.find((attr) => 
      attr.name.toLowerCase() === 'размер' || 
      attr.name.toLowerCase() === 'size' ||
      attr.slug === 'pa_size'
    )?.options || []
  ) || [])).filter(Boolean);

  const allColors = Array.from(new Set(products?.flatMap(product =>
    product.attributes?.find((attr) => 
      attr.name.toLowerCase() === 'принт' || 
      attr.name.toLowerCase() === 'print' ||
      attr.slug === 'pa_print'
    )?.options || []
  ) || [])).filter(Boolean);

  // Filter products based on selected filters
  const filteredProducts = products.filter(product => {
    // Skip products that are still importing
    if (product.status !== 'publish') return false;
    
    // Category filter
    if (selectedCategory) {
      if (!product.categories || !product.categories.some((cat: any) => cat.id === parseInt(selectedCategory))) return false;
    }
    // Color filter
    if (selectedColor) {
      const colorAttr = product.attributes?.find((attr: any) => 
        attr.name.toLowerCase() === 'принт' || 
        attr.name.toLowerCase() === 'print' ||
        attr.slug === 'pa_print'
      );
      if (!colorAttr || !colorAttr.options?.includes(selectedColor)) return false;
    }
    // Size filter
    if (selectedSize) {
      const sizeAttr = product.attributes?.find((attr: any) => 
        attr.name.toLowerCase() === 'размер' || 
        attr.name.toLowerCase() === 'size' ||
        attr.slug === 'pa_size'
      );
      if (!sizeAttr || !sizeAttr.options?.includes(selectedSize)) return false;
    }
    return true;
  });

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${WC_API_URL}/products/categories?consumer_key=${WC_CONSUMER_KEY}&consumer_secret=${WC_CONSUMER_SECRET}`)
      .then(res => res.json())
      .then((data: Category[]) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error('Categories data is not an array:', data);
          setCategories([]);
        }
      })
      .catch(err => {
        console.error('Error fetching categories:', err);
        setCategories([]);
      });
  }, []);

  // Fetch products
  useEffect(() => {
    setLoading(true);
    setError(null); // Reset error state on new fetch
    fetch(`${WC_API_URL}/products?per_page=100&consumer_key=${WC_CONSUMER_KEY}&consumer_secret=${WC_CONSUMER_SECRET}`)
      .then(async res => { // Make this callback async to await res.text() if needed
        console.log('Raw response from API:', res);
        if (!res.ok) {
          const errorText = await res.text(); // Get error message from response body
          console.error(`API Error: ${res.status} ${res.statusText}`, errorText);
          throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}. ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Fetched WooCommerce products (raw data from zdqksnii):', data); // Log raw data
        if (!Array.isArray(data)) {
          console.error('Fetched data is not an array:', data);
          setProducts([]);
          setError('Received invalid product data from server.');
          setLoading(false);
          return;
        }
        // Filter out products that are still importing or don't have required data
        const validProducts = data.filter((product: Product) => 
          product.status === 'publish' && 
          product.images && 
          product.images.length > 0 &&
          product.price
        );
        setProducts(validProducts);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products (in .catch block):', err);
        setError(err.message || 'Failed to load products');
        setLoading(false);
      });
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick() {
      setOpenDropdown(null);
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [openDropdown]);

  // Category data for the top section
  const categoriesData = [
    { name: "Sets", image: "/Sets.png" },
    { name: "Separates", image: "/Separates.png" },
    { name: "One piece", image: "/onepiece.png" },
  ];

  // Add to cart handler
  const handleAddToCart = async (product: Product) => {
    // The product object itself is passed now
    if (!product) return;

    const itemDetails = {
      id: String(product.id),
      title: product.name,
      unit_price: product.price, // Ensure this format is compatible with calculateTotal
      thumbnail: product.images?.[0]?.src || '/placeholder.png'
    };

    try {
      await addToCart(itemDetails, 1);
      console.log(`Product ${product.name} added to local cart:`, itemDetails);
      // Optionally, trigger a visual confirmation like opening a cart modal/drawer
    } catch (error) {
      console.error('Error adding to local cart from catalogue:', error);
    }
  };

  // Helper to render dropdown
  function FilterDropdown({ label, options, selected, onSelect, id, alignRight = false }: { label: string, options: string[], selected: string, onSelect: (val: string) => void, id: string, alignRight?: boolean }) {
    const safeOptions = Array.isArray(options) ? options : [];
    return (
      <div className="relative">
        <button
          className="flex items-center font-bold text-xs tracking-wider uppercase focus:outline-none"
          onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
          type="button"
        >
          {label}
          <ChevronDown className="ml-1 w-4 h-4" />
        </button>
        {openDropdown === id && (
          <div
            className={
              (alignRight
                ? "absolute left-full top-0 ml-2"
                : "absolute right-0 mt-2") +
              " bg-white/90 border border-gray-100 rounded-2xl shadow-2xl z-30 min-w-[200px] backdrop-blur"
            }
            onMouseDown={e => e.stopPropagation()}
          >
            <div
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
              onClick={() => { onSelect(''); setOpenDropdown(null); }}
              style={{ fontWeight: !selected ? 'bold' : 'normal' }}
            >
              All
            </div>
            {safeOptions.map((opt) => (
              <div
                key={opt}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                onClick={() => { onSelect(opt); setOpenDropdown(null); }}
                style={{ fontWeight: selected === opt ? 'bold' : 'normal' }}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const skeletonDelays = ['delay-0', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500'];

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <div className="w-full">
          {/* Header REMOVED - Now uses global header from App.tsx */}

          <div className="w-full mt-0 pb-20">
            {/* Category selection */}
            <div className="w-full flex justify-center mb-0 pt-[30px] pb-[40px]">
              <div className="flex flex-row items-center justify-center space-x-8">
                {categoriesData.map((category, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-[60px] md:h-[120px] object-contain"
                    />
                    <p className="mt-3 [font-family:'Bebas_Neue',Helvetica] font-normal text-[#000000d9] text-xs md:text-sm tracking-[0] leading-[18px] text-center">
                      {category.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* Divider above filter bar */}
            <div className="w-full h-px bg-gray-100 mb-1" />

            {/* Filter Bar (Desktop) */}
            <div className="hidden md:flex flex-row items-center justify-between mb-0 pl-[5px] py-2 md:px-[45px]" style={{ minHeight: 48 }}>
              {/* Filters on the left */}
              <div className="flex flex-row items-center space-x-8">
                <FilterDropdown
                  label="SIZE"
                  options={allSizes}
                  selected={selectedSize}
                  onSelect={val => { console.log('Selected size:', val); setSelectedSize(val); }}
                  id="size"
                  alignRight
                />
                <FilterDropdown
                  label="COLOUR"
                  options={allColors}
                  selected={selectedColor}
                  onSelect={val => { console.log('Selected color:', val); setSelectedColor(val); }}
                  id="color"
                  alignRight
                />
                <FilterDropdown
                  label="STYLE"
                  options={Array.isArray(categories) ? categories.map((cat: Category) => cat.name) : []}
                  selected={categories.find((cat: Category) => cat.id === parseInt(selectedCategory))?.name || ''}
                  onSelect={val => {
                    console.log('Selected style:', val);
                    const cat = categories.find((cat: Category) => cat.name === val);
                    setSelectedCategory(cat ? String(cat.id) : '');
                  }}
                  id="style"
                  alignRight
                />
              </div>

              {/* Sort button on the right */}
              <div className="flex items-center">
                <FilterDropdown
                  label="SORT"
                  options={['Newest', 'Price: Low to High', 'Price: High to Low', 'Most Popular']}
                  selected=""
                  onSelect={() => {}}
                  id="sort"
                  alignRight={false}
                />
              </div>
            </div>

            {(selectedSize || selectedColor || selectedCategory) && (
              <div className="hidden md:block md:px-[45px]">
                <SelectedFiltersDisplay
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  selectedCategory={selectedCategory}
                  categories={categories}
                  onClearSize={() => setSelectedSize('')}
                  onClearColor={() => setSelectedColor('')}
                  onClearCategory={() => setSelectedCategory('')}
                  onClearAll={() => { setSelectedSize(''); setSelectedColor(''); setSelectedCategory(''); }}
                />
              </div>
            )}

            {/* Divider below filter bar (added) */}
            <div className="w-full h-px bg-gray-100 mb-1" />

            {/* Mobile Filter/Sort Bar */}
            <div className="flex md:hidden flex-row items-center justify-between mb-0 py-2" style={{ minHeight: 48 }}>
              <button
                className="flex items-center pl-6 py-2 text-xs font-bold uppercase tracking-wider bg-transparent"
                onClick={() => setIsFilterDrawerOpen(true)}
              >
                Filters
                <FilterIcon className="ml-2 w-4 h-4" />
              </button>
              <div className="flex items-center pr-6">
                <FilterDropdown
                  label="SORT"
                  options={['Newest', 'Price: Low to High', 'Price: High to Low', 'Most Popular']}
                  selected=""
                  onSelect={() => {}}
                  id="sort-mobile"
                  alignRight={false}
                />
              </div>
            </div>

            {/* Always render overlay and drawer for animation */}
            <div>
              {/* Overlay with fade animation */}
              <div
                className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 md:hidden z-40 ${isFilterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsFilterDrawerOpen(false)}
                aria-hidden={!isFilterDrawerOpen}
              />
              {/* Drawer with slide animation and 80vw width */}
              <div
                className={`fixed inset-y-0 left-0 w-[80vw] max-w-[400px] bg-white transform transition-transform duration-300 ease-in-out z-50
                  ${isFilterDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
                  ${isFilterDrawerOpen ? '' : 'pointer-events-none'}`}
                aria-hidden={!isFilterDrawerOpen}
              >
                <div className="flex justify-end p-2">
                  <button onClick={() => setIsFilterDrawerOpen(false)} className="text-black hover:text-gray-600 text-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="px-4 pb-4 flex flex-col h-full">
                  <span className="text-base font-bold uppercase mb-2">Filters</span>
                  <div className="w-full h-px bg-gray-200 mb-2" />
                  <SelectedFiltersDisplay
                    selectedSize={selectedSize}
                    selectedColor={selectedColor}
                    selectedCategory={selectedCategory}
                    categories={categories}
                    onClearSize={() => setSelectedSize('')}
                    onClearColor={() => setSelectedColor('')}
                    onClearCategory={() => setSelectedCategory('')}
                    onClearAll={() => { setSelectedSize(''); setSelectedColor(''); setSelectedCategory(''); }}
                  />
                  {/* Accordion Filters */}
                  <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                    {/* Size Dropdown */}
                    <div>
                      <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b border-gray-100" onClick={() => setMobileFilterDropdown(mobileFilterDropdown === 'size' ? null : 'size')}>
                        Size{selectedSize ? ` (${selectedSize})` : ''}
                        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${mobileFilterDropdown === 'size' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileFilterDropdown === 'size' && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">
                          {allSizes.map(size => (
                            <button
                              key={size}
                              className={`border px-2 py-1 rounded text-xs ${selectedSize === size ? 'bg-black text-white' : 'bg-white text-black'}`}
                              onClick={() => setSelectedSize(selectedSize === size ? '' : size)}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Colour Dropdown */}
                    <div>
                      <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b border-gray-100" onClick={() => setMobileFilterDropdown(mobileFilterDropdown === 'color' ? null : 'color')}>
                        Colour{selectedColor ? ` (${selectedColor})` : ''}
                        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${mobileFilterDropdown === 'color' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileFilterDropdown === 'color' && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">
                          {allColors.map(color => (
                            <button
                              key={color}
                              className={`border px-2 py-1 rounded text-xs ${selectedColor === color ? 'bg-black text-white' : 'bg-white text-black'}`}
                              onClick={() => setSelectedColor(selectedColor === color ? '' : color)}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Style Dropdown */}
                    <div>
                      <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b border-gray-100" onClick={() => setMobileFilterDropdown(mobileFilterDropdown === 'style' ? null : 'style')}>
                        Style{categories.find((cat: Category) => cat.id === parseInt(selectedCategory))?.name ? ` (${categories.find((cat: Category) => cat.id === parseInt(selectedCategory))?.name})` : ''}
                        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${mobileFilterDropdown === 'style' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileFilterDropdown === 'style' && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">
                          {categories.map((cat: Category) => (
                            <button
                              key={cat.id}
                              className={`border px-2 py-1 rounded text-xs ${selectedCategory === String(cat.id) ? 'bg-black text-white' : 'bg-white text-black'}`}
                              onClick={() => setSelectedCategory(selectedCategory === String(cat.id) ? '' : String(cat.id))}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show Results Button */}
                  <button
                    className="mt-6 w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded"
                    onClick={() => setIsFilterDrawerOpen(false)}
                  >
                    Show {filteredProducts.length} Results
                  </button>
                  <button
                    className="mt-2 w-full text-center text-black underline text-xs"
                    onClick={() => { setSelectedSize(''); setSelectedColor(''); setSelectedCategory(''); }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>

            {/* Product grid */}
            <div className="w-full">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                  {[...Array(6)].map((_, idx) => {
                    const isLastCol = ((idx + 1) % 3 === 0);
                    const isLastRow = idx >= 6 - 3;
                    return (
                      <div
                        key={idx}
                        className={
                          (isLastCol ? '' : 'border-r border-gray-100') +
                          (isLastRow ? '' : ' border-b border-gray-100')
                        }
                      >
                        <ProductCardSkeleton delay={`${idx * 120}ms`} />
                      </div>
                    );
                  })}
                </div>
              ) : error ? (
                <p>{error}</p>
              ) : filteredProducts.length === 0 ? (
                <p>No products found</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                  {filteredProducts.map((product, idx) => {
                    const isLastCol = ((idx + 1) % 3 === 0);
                    const isLastRow = idx >= filteredProducts.length - (filteredProducts.length % 3 || 3);
                    return (
                      <div
                        key={product.id}
                        className={
                          (isLastCol ? '' : 'border-r border-gray-100') +
                          (isLastRow ? '' : ' border-b border-gray-100')
                        }
                      >
                        <div className="relative">
                          {/* Product Media (Image) */}
                          <Link 
                            to={`/product/${product.id}`} 
                            state={{ product }}
                            className="block"
                          >
                            <div className="aspect-[3/4] overflow-hidden bg-gray-100 w-full h-full">
                              <img
                                src={productDisplayImages[product.id] || product.images?.[0]?.src || '/placeholder.png'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                style={{ display: 'block' }}
                                loading="lazy"
                                width="300"
                                height="400"
                                decoding="async"
                              />
                            </div>
                          </Link>
                          {/* Product Info */}
                          <div className="mt-2 pl-2 pr-2 pb-2 md:pl-3 md:pr-3 md:pb-3">
                            <Link 
                              to={`/product/${product.id}`} 
                              state={{ product }}
                              className="block"
                            >
                              <div className="flex items-center justify-between w-full">
                                <h3 className="[font-family:'Archivo_Narrow',Helvetica] text-xs md:text-sm font-normal text-black">
                                  {product.name}
                                </h3>
                                <div className="flex items-center">
                                  <button
                                    className="ml-2 p-1 text-black hover:text-black"
                                    aria-label="Like"
                                    onClick={e => { e.preventDefault(); toggleLike(product.id, product); }}
                                  >
                                    <Heart className="w-5 h-5" fill={likedProducts.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" />
                                  </button>
                                  <button
                                    className="ml-1 p-1 text-black hover:text-black"
                                    aria-label="Add to cart"
                                    onClick={e => { e.preventDefault(); handleAddToCart(product); }}
                                  >
                                    <ShoppingBag className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                              <p className="[font-family:'Archivo_Narrow',Helvetica] text-xs md:text-sm font-normal text-black mt-1">
                                {product.price ? `₽${product.price}` : 'Price not available'}
                              </p>
                              {/* Color Swatches */}
                              <div className="flex space-x-1 mt-1">
                                {(() => {
                                  // Find the print/color attribute
                                  const printAttribute = product.attributes?.find((attr: any) => 
                                    attr.name.toLowerCase() === 'принт' || 
                                    attr.name.toLowerCase() === 'print' ||
                                    attr.slug === 'pa_print'
                                  );
                                  if (!printAttribute?.options || printAttribute.options.length === 0) return null;
                                  return printAttribute.options.map((color: string, idx: number) => {
                                    // Convert color names to hex codes if needed
                                    const getColorHex = (color: string) => {
                                      const colorMap: { [key: string]: string } = {
                                        'princess blue': '#4169E1',
                                        'fantasie sunset': '#FF7F50',
                                        'fantasie black and white': '#000000',
                                        'meow blue': '#1E90FF',
                                        'infinity': '#4B0082',
                                        'fantasy': '#F8F8FF',
                                        'anchor': '#2B2B2B',
                                        'swim': '#00BFFF',
                                        'biscay green': '#1B4D3E',
                                        'sakura': '#FFB7C5',
                                        'peacock blue': '#004D98',
                                        'bitter orange': '#FF6B00',
                                        'espresso': '#4B3621',
                                        'electric blue': '#0000FF',
                                        'deep green': '#006400',
                                        'cornflower': '#6495ED',
                                        'terracotta': '#E2725B',
                                        'olive': '#808000',
                                        'mint': '#98FF98',
                                        'coral': '#FF7F50',
                                        'burgundy': '#800020',
                                        'navy': '#000080',
                                        'beige': '#F5F5DC',
                                        'brown': '#A52A2A',
                                        'grey': '#808080',
                                        'gray': '#808080',
                                        'orange': '#FFA500',
                                        'purple': '#800080',
                                        'pink': '#FFC0CB',
                                        'yellow': '#FFFF00',
                                        'green': '#008000',
                                        'blue': '#0000FF',
                                        'red': '#FF0000',
                                        'white': '#FFFFFF',
                                        'black': '#000000',
                                      };
                                      // Try to find an exact match first
                                      const exactMatch = colorMap[color.toLowerCase()];
                                      if (exactMatch) return exactMatch;
                                      // Try to find a partial match
                                      const partialMatch = Object.entries(colorMap).find(([key]) => 
                                        color.toLowerCase().includes(key)
                                      );
                                      if (partialMatch) return partialMatch[1];
                                      // If no match found, return a default color
                                      return '#CCCCCC';
                                    };
                                    return (
                                      <Link
                                        key={idx}
                                        to={`/product/${product.id}?print=${encodeURIComponent(String(color))}`}
                                        className="inline-block"
                                        title={String(color)}
                                      >
                                        <span 
                                          className="w-5 h-5 rounded-full border border-gray-300 inline-block hover:border-black transition-colors" 
                                          style={{ backgroundColor: getColorHex(color) }} 
                                        />
                                      </Link>
                                    );
                                  });
                                })()}
                              </div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Product count */}
            <div className="w-full flex flex-col items-center py-6">
              <p className="[font-family:'Archivo_Narrow',Helvetica] font-normal text-black text-sm text-center">
                Showing {products.length} products
              </p>
            </div>
          </div>
        </div>
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
                const product = products.find(p => p.id === id);
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
    </div>
  );
};