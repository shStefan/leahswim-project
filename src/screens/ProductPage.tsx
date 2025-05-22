import { useState, useEffect, useMemo } from 'react';
import { Heart, ChevronDown, Menu, X, ChevronLeft, ChevronRight, Play, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link, useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLikes } from '../context/LikesContext';
import { ProductPageSkeleton } from '../components/ProductPageSkeleton';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface ProductAttribute {
  id: number;
  name: string;
  slug: string;
  options: string[];
}

interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  images: Array<{ id: number; src: string }>;
  attributes: ProductAttribute[];
  variations?: number[];
}

// Interface for individual product variations
interface ProductVariation {
  id: number;
  attributes: Array<{ id: number; name: string; slug: string; option: string }>;
  image?: { id: number; src: string; name: string; alt: string }; // Image is optional
  price?: string;
  // Add other variation-specific fields if needed
}

// WooCommerce API credentials
const WC_CONSUMER_KEY = 'ck_c2758a311f98c4c5a4e44b85a5a66eae4a0581c3';
const WC_CONSUMER_SECRET = 'cs_7b0d34c68e68a5ae5cebf19a6d23338ab83de571';
const WC_API_URL = 'https://zdqksnii.elementor.cloud/wp-json/wc/v3';

export const ProductPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { cart, loading: cartLoading, addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allColors, setAllColors] = useState<string[]>([]);
  const { likedProducts, toggleLike } = useLikes();
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);

  // Stub remove item handler (to be implemented with WooCommerce cart later)
  const handleRemoveItem = (itemId: string): void => {
    console.log('Remove item clicked:', itemId);
  };

  // Calculate total cart quantity
  const cartCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  // Effect to update selectedColor based on URL search parameter 'print'
  useEffect(() => {
    const printParam = searchParams.get('print');
    if (printParam && allColors.includes(printParam)) {
      if (selectedColor !== printParam) { // Only update if different to avoid loops
        setSelectedColor(printParam);
      }
    } else if (!printParam && product && allColors.length > 0 && selectedColor !== allColors[0]) {
      // If no print param, and product is loaded, set to default (first color), if not already set.
      // This handles initial load default or clearing selection if print param is removed.
      // And also ensures we don't navigate away if the first color is already selected.
      // setSelectedColor(allColors[0]); // Keep this commented for now, initial set in fetchProductData
    }
  }, [searchParams, allColors, product, selectedColor]); // selectedColor added to prevent potential re-runs if default logic is complex

  // Get product data (main product and then variations)
  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      setProduct(null); // Reset product and variations on ID change
      setProductVariations([]);
      setAllColors([]);
      setSelectedColor(null);
      setSelectedSize(null);

      try {
        // Define fetch promises
        const productPromise = fetch(`${WC_API_URL}/products/${id}`, {
          headers: {
            'Authorization': 'Basic ' + btoa(WC_CONSUMER_KEY + ':' + WC_CONSUMER_SECRET)
          }
        });

        const variationsPromise = fetch(`${WC_API_URL}/products/${id}/variations?per_page=100`, {
          headers: {
            'Authorization': 'Basic ' + btoa(WC_CONSUMER_KEY + ':' + WC_CONSUMER_SECRET)
          }
        });

        // Await both promises in parallel
        const [productResponse, variationsResponse] = await Promise.all([
          productPromise,
          variationsPromise
        ]);

        if (!productResponse.ok) {
          throw new Error(`Failed to fetch product: ${productResponse.status} ${await productResponse.text()}`);
        }
        const productData: Product = await productResponse.json();
        setProduct(productData);

        if (!variationsResponse.ok) {
          // It might not be critical if variations fail to load, product can still be shown
          console.warn(`Failed to fetch variations: ${variationsResponse.status} ${await variationsResponse.text()}`);
          setProductVariations([]); // Ensure it's an empty array if fetch failed
        } else {
          const variationsData: ProductVariation[] = await variationsResponse.json();
          setProductVariations(variationsData);
        }

        // Extract available colors from attributes for swatches (from main product data)
        const printAttribute = productData.attributes?.find((attr: ProductAttribute) => 
          attr.name.toLowerCase() === 'принт' || 
          attr.name.toLowerCase() === 'print' ||
          attr.slug === 'pa_print'
        );
        const colors = printAttribute?.options || [];
        setAllColors(colors);

        // Set initial selected color and size
        // Use searchParams first, then default to first available from product attributes
        const initialPrintFromUrl = searchParams.get('print');
        if (initialPrintFromUrl && colors.includes(initialPrintFromUrl)) {
          setSelectedColor(initialPrintFromUrl);
        } else if (colors.length > 0) {
          setSelectedColor(colors[0]);
        }

        const sizeAttribute = productData.attributes?.find((attr: ProductAttribute) => 
          attr.name.toLowerCase() === 'размер' || 
          attr.name.toLowerCase() === 'size' ||
          attr.slug === 'pa_size'
        );
        if (sizeAttribute?.options && sizeAttribute.options.length > 0) {
          setSelectedSize(sizeAttribute.options[0]); // Default to first available size
        }

      } catch (err: any) {
        console.error('Error fetching product data and/or variations:', err);
        setError(err.message || 'Failed to load product information');
      } finally {
        setLoading(false);
      }
    };

    if (location.state?.product) {
      // If product data is passed via location state, use it directly
      // This path is less likely now with parallel fetching but kept as a potential optimization
      const productData = location.state.product as Product; // Type assertion
      setProduct(productData);
      const printAttribute = productData.attributes?.find((attr) => attr.slug === 'pa_print');
      setAllColors(printAttribute?.options || []);
      
      const initialPrintFromUrl = searchParams.get('print');
      if (initialPrintFromUrl && (printAttribute?.options?.includes(initialPrintFromUrl))) {
        setSelectedColor(initialPrintFromUrl);
      } else if (printAttribute?.options?.length) {
        setSelectedColor(printAttribute.options[0]);
      }
      
      // If variations are also in state, set them, otherwise fetch them.
      if (location.state.variations) {
         setProductVariations(location.state.variations as ProductVariation[]);
         setLoading(false);
      } else if (productData.variations && productData.variations.length > 0) {
        // Variations IDs are present, but not the full data - trigger fetch.
        // This specific scenario is less likely if we always fetch variations in parallel.
        // Consider removing this else-if if fetchProductData() always gets variations.
        fetchProductData(); // This will re-fetch product too, could be optimized to only fetch variations
      } else {
         setLoading(false); // No variations to fetch
      }

    } else if (id) { // Only fetch if id is present
      fetchProductData();
    }

  }, [id, location.state]); // REMOVED searchParams, this effect now ONLY runs on ID or location.state change

  // Memoize the color to image mapping
  const colorImageMap = useMemo(() => {
    const map: { [color: string]: string } = {};
    productVariations.forEach(variation => {
      const colorAttribute = variation.attributes.find(attr => attr.slug === 'pa_print');
      if (colorAttribute && colorAttribute.option && variation.image?.src) {
        map[colorAttribute.option] = variation.image.src;
      }
    });
    return map;
  }, [productVariations]);

  // Determine the main image based on selected color and variations
  const mainImage = useMemo(() => {
    if (selectedColor && colorImageMap[selectedColor]) {
      return colorImageMap[selectedColor];
    }
    return product?.images?.[0]?.src || '/placeholder.png'; // Fallback to default product image
  }, [selectedColor, colorImageMap, product]);

  // Media items for the gallery
  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    const addedUrls = new Set<string>(); // Use a Set for efficient tracking of added URLs

    // Start with the main/selected color image if available
    if (mainImage && mainImage !== '/placeholder.png') {
      items.push({ type: 'image', url: mainImage });
      addedUrls.add(mainImage);
    }

    // Add other variation images (excluding the one already added as mainImage)
    const allVariationImageUrls = Object.values(colorImageMap);
    allVariationImageUrls.forEach(url => {
      if (url && !addedUrls.has(url)) { // Check if URL is valid and not already added
        items.push({ type: 'image', url });
        addedUrls.add(url);
      }
    });

    // Add default product images not already included
    product?.images?.forEach(img => {
      if (img.src && !addedUrls.has(img.src)) { // Check if img.src is valid and not already added
        items.push({ type: 'image', url: img.src });
        addedUrls.add(img.src);
      }
    });
    
    // If no images found at all, add a placeholder explicitly
    if (items.length === 0) {
       return [{ type: 'image', url: '/placeholder.png' }];
    }

    return items;
  }, [mainImage, colorImageMap, product]);

  // Reset media index only when mediaItems array itself changes (e.g. new product loaded)
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [mediaItems]); // Only depends on mediaItems directly, not its length or the index itself

  const nextMedia = () => {
    if (mediaItems.length === 0) return;
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    if (mediaItems.length === 0) return;
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor || !product) {
      // Optionally, display a message to the user to select size and color
      console.warn("Please select size and color before adding to cart.");
      return;
    }

    const itemDetails = {
      id: String(product.id), // Using product ID as the primary ID for the item
      // Consider creating a more specific variant ID if sizes/colors affect SKU or price significantly
      // For example: id: `${product.id}-${selectedColor}-${selectedSize}`,
      title: product.name,
      unit_price: product.price, // Assuming product.price is like "₽123.00"
      thumbnail: mainImage || product?.images?.[0]?.src || '/placeholder.png' // Use the current mainImage for thumbnail
      // You might want to add selectedSize and selectedColor to itemDetails if they should be displayed in the cart
    };

    try {
      await addToCart(itemDetails, 1); // Pass the itemDetails object and quantity
      setIsCartDrawerOpen(true); // Keep this to open the cart drawer/modal
      console.log('Product added to local cart:', itemDetails);
    } catch (error) {
      console.error('Error adding to local cart:', error);
    }
  };

  // Navigation items
  const navItems = [
    { id: 1, title: "New Arrivals", path: "/catalogue" },
    { id: 2, title: "Best Sellers", path: "/catalogue" },
    { id: 3, title: "Swimwear", path: "/catalogue" },
    { id: 4, title: "Clothing", path: "/catalogue" },
    { id: 5, title: "Campaigns", path: "/catalogue" },
    { id: 6, title: "For Him", path: "/catalogue" },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Color mapping function
  const getColorHex = (colorName: string) => {
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
    const exactMatch = colorMap[colorName.toLowerCase()];
    if (exactMatch) return exactMatch;

    // Try to find a partial match
    const partialMatch = Object.entries(colorMap).find(([key]) => 
      colorName.toLowerCase().includes(key)
    );
    if (partialMatch) return partialMatch[1];

    // If no match found, return a default color
    return '#CCCCCC';
  };

  if (loading) {
    return <ProductPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h2 className="text-2xl font-semibold mb-2 text-red-600">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
        <p className="text-gray-700 mb-4">The product you are looking for does not exist or could not be loaded.</p>
        <Link to="/catalogue"><Button>Back to Catalogue</Button></Link>
      </div>
    );
  }

  // Extract all sizes
  const allSizes = product.attributes?.find((attr: ProductAttribute) => 
    attr.name.toLowerCase() === 'размер' || 
    attr.name.toLowerCase() === 'size' ||
    attr.slug === 'pa_size'
  )?.options || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full flex flex-col md:flex-row mt-20 md:gap-12 md:px-[30px]">
        {/* Left side - Media gallery */}
        <div className="w-full md:w-2/3 flex relative">
          <div className="hidden md:flex flex-col gap-2 p-4">
            {mediaItems.map((item: MediaItem, index: number) => (
              <button 
                key={index} 
                className={"relative w-[60px] h-[80px] overflow-hidden " + 
                  (currentMediaIndex === index ? "border-2 border-black" : "")
                }
                onClick={() => {
                  setCurrentMediaIndex(index);
                }}
              >
                {item.type === 'video' ? (
                  <>
                    <img 
                      src={item.thumbnail} 
                      alt="Video thumbnail" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <img 
                    src={item.url} 
                    alt={`Thumbnail ${index + 1}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            {mediaItems.length > 0 ? (
              mediaItems[currentMediaIndex].type === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  src={mediaItems[currentMediaIndex].url}
                  className="w-full h-[800px] object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                />
              </div>
            ) : (
              <img 
                src={mediaItems[currentMediaIndex].url}
                alt="Main product" 
                className="w-full h-[800px] object-cover"
                  loading="eager"
              />
              )
            ) : (
              <div className="w-full h-[800px] bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">No images available</p>
              </div>
            )}
            {/* Mobile Navigation Arrows */}
            {mediaItems.length > 1 && (
            <div className="md:hidden absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between items-center px-4">
              <button 
                onClick={prevMedia}
                className="bg-white/80 rounded-full p-2 hover:bg-white"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={nextMedia}
                className="bg-white/80 rounded-full p-2 hover:bg-white"
                aria-label="Next media"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            )}
            {/* Media Counter */}
            {mediaItems.length > 1 && (
            <div className="md:hidden absolute bottom-4 right-4 bg-white/80 px-3 py-1 rounded-full">
              <span className="text-sm font-medium">
                {currentMediaIndex + 1} / {mediaItems.length}
              </span>
            </div>
            )}
          </div>
        </div>

        {/* Right side - Product info */}
        <div className="w-full md:w-1/3 p-6 md:p-8">
          <div className="flex justify-between items-start">
            <h1 className="[font-family:'Bebas_Neue',Helvetica] text-2xl">{product.name}</h1>
            <button
              className="ml-2 p-1 text-black hover:text-black"
              aria-label="Like"
              onClick={() => {
                toggleLike(Number(product.id), product);
              }}
            >
              <Heart className="w-5 h-5" fill={likedProducts.includes(Number(product.id)) ? 'currentColor' : 'none'} stroke="currentColor" />
            </button>
          </div>

          <p className="mt-2 [font-family:'Archivo_Narrow',Helvetica] text-lg">
            {product.price ? `₽${product.price}` : 'Price not available'}
          </p>

          {/* Color selector */}
          <div className="mt-8">
            <p className="[font-family:'Archivo_Narrow',Helvetica] mb-2">Select Color</p>
            <div className="flex space-x-2">
              {allColors.map((color) => (
                <button
                  key={String(color)}
                  onClick={() => {
                    navigate(`/product/${id}?print=${encodeURIComponent(String(color))}`);
                  }}
                  className="inline-block"
                >
                  <span
                    className={
                      'w-8 h-8 rounded-full border-2 inline-block ' +
                      (selectedColor === color ? 'border-black' : 'border-gray-300')
                    }
                    style={{ backgroundColor: getColorHex(String(color)) }}
                    title={String(color)}
                  />
                </button>
              ))}
            </div>
            {selectedColor && (
              <div className="mt-2 text-sm text-gray-600">Selected color: <span className="font-semibold">{selectedColor}</span></div>
            )}
          </div>

          {/* Size selector */}
          <div className="mt-8">
            <p className="[font-family:'Archivo_Narrow',Helvetica] mb-2">Select Size</p>
            <div className="grid grid-cols-6 gap-2">
              {allSizes.map((size: string) => (
                <button
                  key={size}
                  className={'h-10 border ' + 
                    (selectedSize === size
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-black')
                  }
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            {selectedSize && (
              <div className="mt-2 text-sm text-gray-600">Selected size: <span className="font-semibold">{selectedSize}</span></div>
            )}
            <button className="mt-2 text-sm underline">What Size Am I?</button>
          </div>

          {/* Add to cart button */}
          <Button
            className="w-full h-12 mt-8 bg-black text-white hover:bg-gray-900 [font-family:'Bebas_Neue',Helvetica]"
            disabled={!selectedSize || !selectedColor || cartLoading}
            onClick={handleAddToCart}
          >
            {cartLoading ? 'ADDING...' : 'ADD TO CART'}
          </Button>

          {/* Expandable sections */}
          <div className="mt-8 space-y-4">
            {['DESCRIPTION', 'CARE AND COMPOSITION', 'DELIVERY AND RETURNS'].map((section) => (
              <div key={section} className="border-t border-gray-200">
                <button
                  className="w-full py-4 flex justify-between items-center"
                  onClick={() => toggleSection(section)}
                >
                  <span className="[font-family:'Bebas_Neue',Helvetica]">{section}</span>
                  <ChevronDown
                    className={'w-5 h-5 transition-transform ' + 
                      (expandedSection === section ? 'rotate-180' : '')
                    }
                  />
                </button>
                {expandedSection === section && (
                  <div className="pb-4 [font-family:'Archivo_Narrow',Helvetica]">
                    {/* Placeholder content */}
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Drawer (right side) */}
      <div>
        {/* Overlay - same as likes card */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${isCartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsCartDrawerOpen(false)}
          aria-hidden={!isCartDrawerOpen}
        />
        {/* Drawer - same as likes card */}
        <div
          className={`fixed top-8 right-8 max-w-[400px] w-[90vw] max-h-[80vh] bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 transition-opacity duration-300
            ${isCartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!isCartDrawerOpen}
        >
          <div className="flex justify-end p-2">
            <button onClick={() => setIsCartDrawerOpen(false)} className="text-black hover:text-gray-600 text-lg">
              <X size={20} />
            </button>
          </div>
          {/* Cart content */}
          <div className="px-4 pb-0 flex flex-col h-full">
            <span className="text-base font-bold uppercase mb-2">Cart</span>
            <div className="w-full h-px bg-gray-200 mb-2" />
            <div className="flex-1 overflow-y-auto">
              {cart?.items && cart.items.length > 0 ? (
                cart.items.map((item: any) => (
                  <div key={item.id} className="flex py-4 border-b border-gray-100 last:border-b-0 items-start">
                    <img
                      src={item.thumbnail || '/placeholder.png'}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded border mr-4"
                    />
                    <div className="flex-1 flex flex-col items-start text-left">
                      <div className="font-semibold text-base mb-2">{item.title}</div>
                      <div className="text-sm text-gray-500 mb-1">Qty: {item.quantity}</div>
                      <div className="text-sm text-black font-bold">
                        {typeof item.unit_price === 'number' ? `₽${item.unit_price.toFixed(2)}` : ''}
                      </div>
                    </div>
                    <button
                      className="ml-2 text-gray-400 hover:text-black text-xl mt-1"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 text-center mt-8">Your cart is empty.</div>
              )}
            </div>
            {/* Fixed Checkout button */}
            <div className="pt-4 pb-6 bg-white sticky bottom-0 left-0 right-0 z-10">
              <button
                className="w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded"
                // onClick={...} // Add checkout logic here
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 