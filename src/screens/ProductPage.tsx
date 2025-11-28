import { useState, useEffect, useMemo } from 'react';
import { Heart, ChevronDown, Menu, X, ChevronLeft, ChevronRight, Play, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link, useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLikes } from '../context/LikesContext';
import { ProductPageSkeleton } from '../components/ProductPageSkeleton';
import { RelatedProductsSlider } from '../components/RelatedProductsSlider';
import SizeChartModal from '../components/SizeChartModal'; // Import the modal
import { DynamicText } from '../components/DynamicText';
import { useTranslation } from '../context/TranslationContext';
import { convertAndFormatPrice } from '../utils/priceUtils';
import { LoadingWrapper } from '../components/LoadingWrapper';
import { TranslatedHTML } from '../components/TranslatedHTML';
import { apiEndpoints } from '../utils/apiConfig';

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
  short_description?: string;
  images: Array<{ id: number; src: string }>;
  attributes: ProductAttribute[];
  variations?: number[];
  type?: string;
  categories?: any[]; // Added categories property
}

// Interface for individual product variations
interface ProductVariation {
  id: number;
  attributes: Array<{ id: number; name: string; slug: string; option: string }>;
  image?: { id: number; src: string; name: string; alt: string }; // Image is optional
  price?: string;
  description?: string; // Added optional description field
  variation_gallery?: { // Added for variation-specific galleries
    ids: number[];
    urls: string[];
  };
  // Add other variation-specific fields if needed
}


export const ProductPage = (): JSX.Element => {
  const { id: idFromParams } = useParams<{ id:string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine product ID and initial selected color from location state or URL
  const linkState = location.state as { parentProductId?: string; selectedColor?: string; productData?: any }; // productData is DisplayableProduct
  const productIdToFetch = linkState?.parentProductId || idFromParams;
  const initialSelectedColorFromStateOrUrl = linkState?.selectedColor || searchParams.get('print');

  const [product, setProduct] = useState<Product | null>(
    linkState?.productData ? 
    { // Pre-fill from DisplayableProduct if available
      id: parseInt(linkState.productData.parentId),
      name: linkState.productData.name,
      price: linkState.productData.price,
      images: linkState.productData.originalImages || [{id: 0, src: linkState.productData.imageSrc}],
      description: '', // Will be fetched
      short_description: '', // Will be fetched
      attributes: linkState.productData.attributes || [],
      categories: linkState.productData.categories || [], // Added categories pre-fill
      // variations will be fetched
    } 
    : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialSelectedColorFromStateOrUrl);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  // const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false); // This local state is not used for the Header's cart, but might be for a local cart UI if any
  const { cart, loading: cartLoading, addToCart, removeFromCart, isCartDrawerOpen, setIsCartDrawerOpen } = useCart(); // use isCartDrawerOpen from context for the product page cart drawer
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allColors, setAllColors] = useState<string[]>([]);
  const { likedProducts, toggleLike } = useLikes();
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const { t } = useTranslation();
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);
  const [isSizeChartModalOpen, setIsSizeChartModalOpen] = useState(false); // State for size chart modal
  const [displayPrice, setDisplayPrice] = useState<string | null>(null);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Updated currentVariation logic with enhanced safety checks
  const currentVariation = useMemo(() => {
    // Initial guards: need variations and a selected size.
    if (!productVariations || productVariations.length === 0 || !selectedSize) {
      return null;
    }

    // Case 1: Product has color options (allColors array is populated)
    if (allColors && allColors.length > 0) {
      // If color options exist, a color must be selected.
      if (!selectedColor) {
        return null;
      }
      // Find a variation that matches both the selected color and selected size.
      return productVariations.find(variation => {
        // Ensure the variation and its attributes array are valid.
        if (!variation || !Array.isArray(variation.attributes)) {
          return false;
        }
        // Check for a matching color attribute.
        const hasMatchingColor = variation.attributes.some(attr =>
          attr && // Ensure attribute exists
          (attr.slug === 'pa_print' || // Match by slug 'pa_print'
            (attr.name && attr.name.toLowerCase() === 'принт') || // Match by name 'принт'
            (attr.name && attr.name.toLowerCase() === 'color')) && // Match by name 'color'
          attr.option === selectedColor // Option must match selectedColor
        );
        // If no color match, this variation is not the one.
        if (!hasMatchingColor) {
          return false;
        }
        // Check for a matching size attribute.
        return variation.attributes.some(attr =>
          attr && // Ensure attribute exists
          (attr.slug === 'pa_size' || // Match by slug 'pa_size'
            (attr.name && attr.name.toLowerCase() === 'размер')) && // Match by name 'размер'
          attr.option === selectedSize // Option must match selectedSize
        );
      });
    } else {
      // Case 2: Product does NOT have color options (allColors array is empty)
      // Find a variation that matches the selected size only. Color is not a criterion.
      return productVariations.find(variation => {
        // Ensure the variation and its attributes array are valid.
        if (!variation || !Array.isArray(variation.attributes)) {
          return false;
        }
        // Check for a matching size attribute.
        return variation.attributes.some(attr =>
          attr && // Ensure attribute exists
          (attr.slug === 'pa_size' || // Match by slug 'pa_size'
            (attr.name && attr.name.toLowerCase() === 'размер')) && // Match by name 'размер'
          attr.option === selectedSize // Option must match selectedSize
        );
      });
    }
  }, [productVariations, selectedColor, selectedSize, allColors]);

  useEffect(() => {
    if (currentVariation && currentVariation.price) {
      setDisplayPrice(currentVariation.price);
    } else if (product) {
      setDisplayPrice(product.price);
    }
  }, [currentVariation, product]);

  // Updated to use removeFromCart from context
  const handleRemoveItem = async (itemId: string): Promise<void> => {
    console.log('Attempting to remove item from cart:', itemId);
    try {
      await removeFromCart(itemId);
      console.log('Item removal processed by context for:', itemId);
      // Optional: Add any local state updates or notifications if needed
    } catch (err) {
      console.error('Error removing item from cart:', err);
      // Optional: Display an error message to the user
    }
  };

  // Calculate total cart quantity
  const cartCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  // Effect to update URL search parameter 'print' when selectedColor changes
  useEffect(() => {
    const currentPrintParam = searchParams.get('print');
    if (selectedColor && selectedColor !== currentPrintParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('print', selectedColor);
      setSearchParams(newSearchParams, { replace: true });
    } else if (!selectedColor && currentPrintParam) {
      // If selectedColor is cleared, remove 'print' from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('print');
      setSearchParams(newSearchParams, { replace: true });
    }
    // No navigation based on selectedColor here, ProductPage is already loaded.
    // The primary role is to keep URL in sync.
  }, [selectedColor, searchParams, setSearchParams]);

  // Get product data (main product and then variations)
  useEffect(() => {
    // Changed to accept productId as an argument
    const fetchProductData = async (currentProductId: string | undefined) => { 
      if (!currentProductId) return;
      setLoading(true);
      // setError(null); // Keep error until new data is successfully fetched or truly fails
      // setProduct(null); // Don't nullify if we have pre-filled data
      // setProductVariations([]);
      // setAllColors([]);
      // setSelectedColor(null); // Initial selected color is now handled by state initialization
      // setSelectedSize(null);

      try {
        // Define fetch promises
        const productFields = 'id,name,price,regular_price,sale_price,images,attributes,categories,type,status';
        const { url: productUrl, options: productOptions } = apiEndpoints.products(`include=${currentProductId}&_fields=${productFields}`);
        const productPromise = fetch(productUrl, productOptions);

        const { url: variationsUrl, options: variationsOptions } = apiEndpoints.variations(currentProductId, 'per_page=100&_fields=id,price,regular_price,sale_price,attributes,image,status,description,variation_gallery');
        const variationsPromise = fetch(variationsUrl, variationsOptions);

        // Await both promises in parallel
        const [productResponse, variationsResponse] = await Promise.all([
          productPromise,
          variationsPromise
        ]);

        if (!productResponse.ok) {
          throw new Error(`Failed to fetch product: ${productResponse.status} ${await productResponse.text()}`);
        }
        const productDataArray: Product[] = await productResponse.json();
        const productData: Product = productDataArray[0]; // Extract the first product from the array (include returns array)
        
        if (!productData) {
          throw new Error('Product not found in API response');
        }
        
        setProduct(productData);
        console.log('Fetched product data:', productData); // Log the entire product data

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

        // Set initial selected color and size (or confirm existing from link state/URL)
        // The selectedColor state is already initialized from linkState or URL param.
        // Here, we just ensure it's valid if it came from URL, or set default if nothing was provided.
        if (initialSelectedColorFromStateOrUrl && colors.includes(initialSelectedColorFromStateOrUrl)) {
          if (selectedColor !== initialSelectedColorFromStateOrUrl) { // Sync if different
             setSelectedColor(initialSelectedColorFromStateOrUrl);
          }
        } else if (colors.length > 0 && !selectedColor) { // Only set default if no color is selected yet
          setSelectedColor(colors[0]);
        }
        // If selectedColor was already set (e.g. from link state) and is valid, it remains.

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

    // if (location.state?.product) { // Old logic for location.state.product
      // This block will be mostly replaced by the pre-fill in useState and the direct call to fetchProductData
    // } else {
    // Always fetch, productIdToFetch will be from state or params
    fetchProductData(productIdToFetch); 
    // }

  }, [productIdToFetch]); // location.state is not a stable dependency, use derived productIdToFetch

  // Fetch related products when main product data is available
  useEffect(() => {
    if (product && product.categories && product.categories.length > 0) {
      const firstCategoryId = product.categories[0].id;
      if (firstCategoryId) {
        setLoadingRelated(true);
        console.log(`Fetching related products for category ID: ${firstCategoryId}, excluding product ID: ${product.id}`); 
        const { url: relatedUrl, options: relatedOptions } = apiEndpoints.products(`category=${firstCategoryId}&per_page=10&exclude=${product.id}`);
        fetch(relatedUrl, relatedOptions)
        .then(res => res.json())
        .then((data: Product[]) => { // Ensure type is Product[]
          console.log('[ProductPage] Fetched related products raw data:', data);
          const filteredRelatedProducts = data.filter(p => p.id !== product.id);
          console.log('[ProductPage] Filtered related products (to be set in state):', filteredRelatedProducts);
          setRelatedProducts(filteredRelatedProducts); // Double check exclusion
          setLoadingRelated(false);
        })
        .catch(err => {
          console.error("Error fetching related products:", err);
          setLoadingRelated(false);
        });
      } else {
        console.warn("Could not fetch related products: firstCategoryId is missing or invalid.", product.categories);
        setLoadingRelated(false); // Ensure loading is stopped
        setRelatedProducts([]);   // Ensure related products is empty
      }
    } else {
      console.warn("Could not fetch related products: product or product.categories are missing or empty.", product);
      setLoadingRelated(false); // Ensure loading is stopped
      setRelatedProducts([]);   // Ensure related products is empty
    }
  }, [product]); // Depends on product

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
    const addedUrls = new Set<string>(); // To prevent duplicate media by URL
    let videoItem: MediaItem | null = null; // Store video separately to add it first at the end

    if (currentVariation) {
      // 1. Selected variation's main image (add first so it appears first when no video)
      if (currentVariation.image?.src) {
        const imageUrl = currentVariation.image.src;
        if (!addedUrls.has(imageUrl)) {
          items.push({ type: 'image', url: imageUrl });
          addedUrls.add(imageUrl);
        }
      }

      // 2. Variation-specific gallery (if available)
      if (currentVariation.variation_gallery && currentVariation.variation_gallery.urls && currentVariation.variation_gallery.urls.length > 0) {
        currentVariation.variation_gallery.urls.forEach(url => {
          if (url && !addedUrls.has(url)) {
            items.push({ type: 'image', url });
            addedUrls.add(url);
          }
        });
      }

      // 3. Video from selected variation's description (store to add at beginning)
      if (currentVariation.description && typeof currentVariation.description === 'string') {
        const videoMatch = currentVariation.description.match(/<video.*?src=["'](.*?)["']/i);
        if (videoMatch && videoMatch[1]) {
          const videoUrl = videoMatch[1];
          if (!addedUrls.has(videoUrl)) { // Check if video URL itself is already added
            const posterUrl = currentVariation.image?.src; 
            // Try to use variation image as poster, only if it's not the video itself
            const actualPoster = (posterUrl && posterUrl !== videoUrl && !addedUrls.has(posterUrl)) ? posterUrl : undefined;
            
            videoItem = {
              type: 'video', 
              url: videoUrl, 
              thumbnail: actualPoster
            };
            addedUrls.add(videoUrl);
            if (actualPoster) addedUrls.add(actualPoster);
          }
        }
      }
    } else if (mainImage && mainImage !== '/placeholder.png') {
      // Fallback to mainImage (derived from selectedColor or parent product's first image)
      // if no specific currentVariation is resolved but a mainImage is determined
       if (!addedUrls.has(mainImage)) {
        items.push({ type: 'image', url: mainImage });
        addedUrls.add(mainImage);
      }
    }

    // If video exists, add it to the beginning
    if (videoItem) {
      items.unshift(videoItem);
    }

    // 4. Add images from the parent product's gallery (`product.images`)
    // This acts as a fallback ONLY when we have no variation-specific media
    if (items.length === 0 && product?.images) {
      product.images.forEach(img => {
        if (img.src && !addedUrls.has(img.src)) {
          items.push({ type: 'image', url: img.src });
          addedUrls.add(img.src);
        }
      });
    }
    
    // If after all this, no media items, add a default placeholder
    if (items.length === 0) {
       return [{ type: 'image', url: '/placeholder.png' }];
    }

    return items;
  }, [product, currentVariation, mainImage]); // colorImageMap might be less relevant now with direct variation_gallery

  // Reset media index only when mediaItems array itself changes (e.g. new product loaded)
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [mediaItems]); // Only depends on mediaItems directly, not its length or the index itself

  const nextMedia = () => {
    if (!product || !mediaItems || mediaItems.length === 0) return;
    setCurrentMediaIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    if (!product || !mediaItems || mediaItems.length === 0) return;
    setCurrentMediaIndex((prevIndex) => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Determine ID and Parent ID for cart item
    let itemIdToAdd: string;
    let itemParentId: string | undefined = undefined;
    let itemPrice = product.price; // Default to parent product price
    let itemThumbnail = product.images?.[0]?.src;

    if (currentVariation) {
      itemIdToAdd = String(currentVariation.id);
      itemParentId = String(product.id); // Parent product's ID
      if (currentVariation.price) itemPrice = currentVariation.price;
      if (currentVariation.image?.src) itemThumbnail = currentVariation.image.src;
    } else if (product.type === 'simple') { // Assuming you have a 'type' field or similar logic for simple products
      itemIdToAdd = String(product.id);
      // itemParentId remains undefined for simple products
    } else {
      // It's a variable product but no specific variation selected (e.g. if size not chosen yet)
      // Optionally, prevent adding to cart or add default variation if applicable
                    alert(t('common.pleaseSelectOptions'));
      return;
    }

    if (!itemIdToAdd) {
      console.error('Cannot add to cart: item ID is missing.');
      return;
    }

    const itemDetails = {
      id: itemIdToAdd,
      parentId: itemParentId,
      title: product.name + (currentVariation ? ` - ${selectedColor} / ${selectedSize}` : ''), // Add variation details to title
      unit_price: itemPrice,
      thumbnail: itemThumbnail || '/placeholder.png',
    };

    try {
      await addToCart(itemDetails, 1); // Assuming quantity is 1
      setIsCartDrawerOpen(true); // Open cart drawer on successful add
    } catch (err) {
      console.error("Error adding to cart from ProductPage:", err);
      // Handle error (e.g., show a notification)
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
      'infinity': '#639BB9',
      'fantasy': '#B12D31',
      'anchor': '#F7A98C',
      'swim': '#98DCC2',
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
      'pink': '#F6A7E5',
      'yellow': '#FFFF00',
      'green': '#25CD96',
      'blue': '#42B1EA',
      'red': '#FF0000',
      'white': '#FFFFFF',
      'black': '#000000',
      'natural': '#F0E68C',
      'коралл': '#C9313E',
      'фиолетовый': '#800080',
      'чёрный': '#000000',
      'коралл черный': '#4A4A4A',
      'avorio mocaccino': '#27CE5E',
      'jelly bean': '#05936C',
      'lilac': '#C8A2C8',
      'sicilia': '#E3DA73',
      'infiniti caribi': '#0CB7E7',
      'babydoll': '#B1E2C3',
      'nero redcoat': '#9B2633',
      'anchor clie': '#FDB6B3',
      'tie die lime': '#D9D56A',
      'paisley light blue': '#6CC6F1',
      'paisley light blue / pink': '#3E82E0',
      'tie die lime blue': '#EFEC99',
      'swim / babydoll': '#7AD5A1',
      'new blue irlandia': '#3CC181',
      'fantasy sunset фиолетовый': '#EFCCE1',
      'lime': '#ADC251',
      'tie-dye lime lime': '#ADC251',
      'illusion / peakock blue': '#02ADB7',
      'голубой': '#D4EDF9',
      'honey': '#DFBD77',
      'цитрин - аметист': '#A76FC5',
      'цитрин - гранат': '#9D0F30',
      'бирюза': '#81C8D3',
      'leah ropes': '#045AAE',
      'ocean life': '#F87624',
    };
    const lowerColorName = colorName.toLowerCase();
    if (colorMap[lowerColorName]) {
      return colorMap[lowerColorName];
    }
    const partialMatch = Object.entries(colorMap).find(([key]) =>
      lowerColorName.includes(key)
    );
    if (partialMatch) {
      return partialMatch[1];
    }
    return '#CCCCCC'; // Default color if no match
  };

  if (loading) {
    return (
      <LoadingWrapper isContentLoading={true} showSkeleton={true}>
        <div></div>
      </LoadingWrapper>
    );
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
    <LoadingWrapper isContentLoading={false} showSkeleton={false}>
      <div className="min-h-screen bg-white">
      <div className="w-full flex flex-col md:flex-row mt-16 md:mt-20 md:gap-12 md:px-[30px] md:max-w-7xl md:mx-auto">
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
                      className="w-full h-full object-contain"
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
                    className="w-full h-full object-contain" 
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            {mediaItems.length > 0 ? (
              mediaItems[currentMediaIndex].type === 'video' ? (
              <div className="w-full aspect-[9/16]">
                <video
                  src={mediaItems[currentMediaIndex].url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-start justify-center">
                <img 
                  src={mediaItems[currentMediaIndex].url}
                  alt="Main product" 
                  className="max-w-full max-h-[80vh] object-contain"
                  loading="eager"
                />
              </div>
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
            <DynamicText 
              text={product.name}
              tag="h1"
              className="font-sans text-2xl"
            />
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

          <p className="font-sans mt-2 text-lg">
                            {displayPrice ? convertAndFormatPrice(displayPrice) : 'Price not available'}
          </p>

          {/* Color selector */}
          {allColors && allColors.length > 0 && (
            <div className="mt-8">
                              <p className="font-sans mb-2">{t('common.selectColor')}</p>
              <div className="flex items-center space-x-2 mt-4">
                {(allColors || []).map((color) => (
                  <button
                    key={String(color)}
                    onClick={() => {
                      setSelectedColor(String(color)); // Just update state, useEffect will sync URL
                    }}
                    className="inline-block p-0.5 border border-transparent rounded-full focus:outline-none transition-all duration-150 ease-in-out"
                    style={selectedColor === color ? { borderColor: getColorHex(String(color)) } : {}}
                    title={String(color)}
                  >
                    <span
                      className={`block w-6 h-6 md:w-8 md:h-8 rounded-full border border-gray-300 hover:border-black`}
                      style={{
                        backgroundColor: getColorHex(String(color)),
                        // Apply a ring effect if this color is selected
                        boxShadow: selectedColor === color ? `0 0 0 2px white, 0 0 0 4px ${getColorHex(String(color))}` : 'none'
                      }}
                    ></span>
                  </button>
                ))}
              </div>
              {selectedColor && (
                <div className="mt-2 text-sm text-gray-600">{t('common.selectedColor')}: <span className="font-semibold">{selectedColor}</span></div>
              )}
            </div>
          )}

          {/* Size selector */}
          <div className="mt-8">
                            <p className="font-sans mb-2">{t('common.selectSize')}</p>
            <div className="flex flex-wrap gap-2">
              {allSizes.map((size: string) => (
                <button
                  key={size}
                  className={`px-4 py-2 border rounded-full text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black ${
                    selectedSize === size
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-black hover:text-black'
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            {selectedSize && (
                              <div className="mt-2 text-sm text-gray-600">{t('common.selectedSize')}: <span className="font-semibold">{selectedSize}</span></div>
            )}
            <button 
              className="mt-2 text-sm underline"
              onClick={() => setIsSizeChartModalOpen(true)}
            >
                              {t('footer.sizeChart')}
            </button>
          </div>

          {/* Add to cart button */}
          <Button
            className="font-sans w-full h-12 mt-8 bg-black text-white hover:bg-gray-900"
            disabled={cartLoading || (allColors && allColors.length > 0 ? (!selectedSize || !selectedColor) : !selectedSize)}
            onClick={handleAddToCart}
          >
            {cartLoading ? t('product.adding') : t('product.addToCart')}
          </Button>

          {/* Expandable sections */}
          <div className="mt-8 space-y-4">
            {[ 
              { title: t('product.parameters'), contentKey: 'description' },
              { title: t('product.delivery'), contentKey: 'delivery' },
              { title: t('product.returns'), contentKey: 'returns' }
            ].map((section) => (
              <div key={section.title} className="border-t border-gray-200">
                <button
                  className="w-full py-4 flex justify-between items-center"
                  onClick={() => toggleSection(section.contentKey)}
                >
                  <span className="font-sans">{section.title}</span>
                  <ChevronDown
                    className={'w-5 h-5 transition-transform ' + 
                      (expandedSection === section.contentKey ? 'rotate-180' : '')
                    }
                  />
                </button>
                {expandedSection === section.contentKey && (
                  <div className="font-sans pb-4">
                    {section.contentKey === 'description' ? (
                      product.short_description ? (
                        <TranslatedHTML htmlContent={product.short_description} />
                      ) : product.description ? (
                        <TranslatedHTML htmlContent={product.description} />
                      ) : (
                        t('product.noDescription')
                      )
                    ) : section.contentKey === 'delivery' ? (
                      <div className="space-y-2 text-sm">
                        <p>Worldwide shipping (7-14 business days)</p>
                      </div>
                    ) : section.contentKey === 'returns' ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="font-semibold mb-2">Returns:</p>
                          <p className="mb-3">We accept returns within 14 days, starting from the day your order was delivered.</p>
                          <p className="mb-3">Kindly contact our customer service to program your return via email <a href="mailto:info@leahcation.com" className="text-blue-600 underline">info@leahcation.com</a> or by WhatsApp <a href="https://wa.me/33640613269" className="text-blue-600 underline">+33640613269</a> and we will assist you with your order return.</p>
                        </div>
                        
                        <div>
                          <p className="font-semibold mb-2">Returned items must comply with our returns policy:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Items must be returned unworn, undamaged and unused, with all tags attached and the original packaging included</li>
                            <li>Final sale items cannot be returned unless the item arrives damaged or faulty when delivered to you</li>
                            <li>Footwear and accessories must be returned with the original branded boxes and dust bags, where provided, and placed inside a protective box when returned</li>
                            <li>When trying on footwear, please do not mark the soles or damage the shoe box</li>
                            <li>If an item has a security tag or brand tag attached, it must be returned with the tag in its original position</li>
                            <li>Beauty and cosmetic products must be returned unopened and unused, with the seals of any packaging still intact</li>
                            <li>Swimwear items must be returned with the hygiene seals attached and in unopened and undamaged packaging, where applicable</li>
                            <li>Swimwear must only be tried on over your own undergarments. We will not accept any returns that have been worn or are soiled.</li>
                            <li>Made-to-order items cannot be returned as they have been created to your specification, unless the item arrives damaged or faulty when delivered to you</li>
                          </ul>
                        </div>
                        
                        <p className="italic">Please be careful when trying on your purchases and return them in the same condition you received them. Any returns that do not meet our policy will not be accepted.</p>
                        
                        <div>
                          <p className="font-semibold mb-2">Refunds:</p>
                          <p>Once your return has been received, it can take up to 6 calendar days to process. When your return has been accepted, your refund will be processed to your original payment method, excluding any delivery costs. Refunds can take up to 14 days to show in your account, depending on your payment provider.</p>
                        </div>
                      </div>
                    ) : (
                      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wrapper for Related Products Slider to align with page content */}
      <div className="w-full md:max-w-7xl md:mx-auto md:px-[30px] mb-8">
        <RelatedProductsSlider products={relatedProducts} loading={loadingRelated} title={t('related.title', 'You might also like')} />
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal 
        isOpen={isSizeChartModalOpen} 
        onClose={() => setIsSizeChartModalOpen(false)} 
      />
    </div>
    </LoadingWrapper>
  );
};