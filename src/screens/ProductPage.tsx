import { useState, useEffect, useMemo, useRef } from 'react';
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
import { apiEndpoints } from '../utils/apiConfig';
import { DiscountPrice } from '../components/DiscountPrice';
import { getActualPrice } from '../utils/priceHelpers';
import { getColorHex, slugifyColor, resolveColorFromSlug } from '../utils/colorMap';

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
  regular_price?: string; // Original price
  sale_price?: string; // Discounted price  
  price_html?: string; // HTML formatted price with discount display
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
  stock_status?: string; // 'instock', 'outofstock', 'onbackorder'
  variation_gallery?: { // Added for variation-specific galleries
    ids: number[];
    urls: string[];
  };
  // Add other variation-specific fields if needed
}

// WooCommerce API credentials


export const ProductPage = (): JSX.Element => {
  const { id: idFromParams } = useParams<{ id: string }>();
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
        images: linkState.productData.originalImages || [{ id: 0, src: linkState.productData.imageSrc }],
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

  // Add simple cache to prevent refetching the same product
  const [cachedProductId, setCachedProductId] = useState<string | null>(null);

  // Ref and state for lazy loading related products
  const relatedProductsRef = useRef<HTMLDivElement>(null);
  const [relatedProductsFetched, setRelatedProductsFetched] = useState(false);

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
          attr &&
          (attr.slug === 'pa_print' ||
            (attr.name && attr.name.toLowerCase() === 'принт') ||
            (attr.name && attr.name.toLowerCase() === 'color')) &&
          attr.option === selectedColor
        );

        // If no color match, this variation is not the one.
        if (!hasMatchingColor) {
          return false;
        }

        // Check for a matching size attribute.
        return variation.attributes.some(attr =>
          attr &&
          (attr.slug === 'pa_size' ||
            (attr.name && attr.name.toLowerCase() === 'размер')) &&
          attr.option === selectedSize
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
  // Writes a clean ASCII slug to the URL instead of raw Russian text
  useEffect(() => {
    const currentPrintParam = searchParams.get('print');
    if (selectedColor) {
      const slugged = slugifyColor(selectedColor);
      if (slugged && slugged !== currentPrintParam) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('print', slugged);
        setSearchParams(newSearchParams, { replace: true });
      }
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
    // Helper function to add delay for retry logic
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Retry function with exponential backoff for 429 errors
    const fetchWithRetry = async (url: string, options: any, maxRetries = 3): Promise<Response> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, options);

        if (response.status === 429) {
          if (attempt === maxRetries) {
            throw new Error(`Rate limited after ${maxRetries} attempts. Please wait and try again.`);
          }

          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.warn(`Rate limited (429), retrying in ${waitTime / 1000}s... (attempt ${attempt}/${maxRetries})`);
          await delay(waitTime);
          continue;
        }

        return response; // Return successful response or non-429 error
      }

      throw new Error('Max retries exceeded');
    };

    // Changed to accept productId as an argument
    const fetchProductData = async (currentProductId: string | undefined) => {
      if (!currentProductId) return;

      // Check cache to prevent refetching the same product
      if (cachedProductId === currentProductId && product) {
        console.log(`Product ${currentProductId} already cached, skipping fetch`);
        return;
      }

      setLoading(true);
      // setError(null); // Keep error until new data is successfully fetched or truly fails
      // setProduct(null); // Don't nullify if we have pre-filled data
      // setProductVariations([]);
      // setAllColors([]);
      // setSelectedColor(null); // Initial selected color is now handled by state initialization
      // setSelectedSize(null);

      try {
        // Define fetch promises with optimized field selection
        const productFields = 'id,name,price,regular_price,sale_price,price_html,description,short_description,images,attributes,categories,type,status';
        const variationFields = 'id,price,regular_price,sale_price,attributes,image,status,description,variation_gallery,stock_status';

        const { url: productUrl, options: productOptions } = apiEndpoints.products(`include=${currentProductId}&_fields=${productFields}`);
        const { url: variationsUrl, options: variationsOptions } = apiEndpoints.variations(currentProductId.toString(), `per_page=20&_fields=${variationFields}`);

        // Use retry logic for both requests
        const [productResponse, variationsResponse] = await Promise.all([
          fetchWithRetry(productUrl, productOptions),
          fetchWithRetry(variationsUrl, variationsOptions)
        ]);

        if (!productResponse.ok) {
          throw new Error(`Failed to fetch product: ${productResponse.status} ${await productResponse.text()}`);
        }
        const productDataArray: Product[] = await productResponse.json();
        const productData: Product = productDataArray[0]; // Extract the first product from the array

        if (!productData) {
          throw new Error('Product not found in API response');
        }

        setProduct(productData);
        setCachedProductId(currentProductId); // Cache the product ID to prevent refetching
        // Reset related products fetch state for new product
        setRelatedProductsFetched(false);
        setRelatedProducts([]);
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
        const printAttribute = productData?.attributes?.find((attr: ProductAttribute) =>
          attr.name.toLowerCase() === 'принт' ||
          attr.name.toLowerCase() === 'print' ||
          attr.slug?.startsWith('pa_print')
        );
        const colors = printAttribute?.options || [];
        setAllColors(colors);

        // Set initial selected color and size (or confirm existing from link state/URL)
        // The selectedColor state is already initialized from linkState or URL param.
        // Here, we resolve slugs or legacy URL-encoded names back to real color names.
        if (initialSelectedColorFromStateOrUrl) {
          // Try to resolve: exact match, case-insensitive, or slug-based
          const resolved = resolveColorFromSlug(initialSelectedColorFromStateOrUrl, colors);
          if (resolved) {
            if (selectedColor !== resolved) {
              setSelectedColor(resolved);
            }
          } else if (colors.length > 0 && !selectedColor) {
            setSelectedColor(colors[0]);
          }
        } else if (colors.length > 0 && !selectedColor) { // Only set default if no color is selected yet
          setSelectedColor(colors[0]);
        }
        // If selectedColor was already set (e.g. from link state) and is valid, it remains.

        const sizeAttribute = productData?.attributes?.find((attr: ProductAttribute) =>
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

  // Intersection Observer for lazy loading related products
  useEffect(() => {
    if (!relatedProductsRef.current || relatedProductsFetched) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !relatedProductsFetched) {
          setRelatedProductsFetched(true);
          fetchRelatedProducts();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before the section is visible
      }
    );

    observer.observe(relatedProductsRef.current);

    return () => observer.disconnect();
  }, [relatedProductsRef.current, relatedProductsFetched, product?.id]);

  // Function to fetch related products
  const fetchRelatedProducts = async () => {
    if (!product || !product.categories || product.categories.length === 0) {
      console.warn("Could not fetch related products: product or product.categories are missing or empty.", product);
      return;
    }

    // Helper functions for retry logic
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const fetchWithRetry = async (url: string, options: any, maxRetries = 3): Promise<Response> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, options);

        if (response.status === 429) {
          if (attempt === maxRetries) {
            throw new Error(`Rate limited after ${maxRetries} attempts. Please wait and try again.`);
          }

          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.warn(`Related products rate limited (429), retrying in ${waitTime / 1000}s... (attempt ${attempt}/${maxRetries})`);
          await delay(waitTime);
          continue;
        }

        return response; // Return successful response or non-429 error
      }

      throw new Error('Max retries exceeded');
    };

    const firstCategoryId = product.categories[0].id;
    if (firstCategoryId) {
      setLoadingRelated(true);
      console.log(`[Lazy Loading] Fetching related products for category ID: ${firstCategoryId}, excluding product ID: ${product.id}`);

      try {
        // Limit fields for related products to reduce payload
        const relatedFields = 'id,name,price,regular_price,sale_price,price_html,images';
        const { url, options } = apiEndpoints.products(`category=${firstCategoryId}&per_page=6&exclude=${product.id}&_fields=${relatedFields}`);
        const response = await fetchWithRetry(url, options);
        const data: Product[] = await response.json();

        console.log('[ProductPage] Fetched related products raw data:', data);
        const filteredRelatedProducts = data.filter(p => p.id !== product.id);
        console.log('[ProductPage] Filtered related products (to be set in state):', filteredRelatedProducts);
        setRelatedProducts(filteredRelatedProducts); // Double check exclusion
        setLoadingRelated(false);
      } catch (err) {
        console.error("Error fetching related products:", err);
        setLoadingRelated(false);
      }
    } else {
      console.warn("Could not fetch related products: firstCategoryId is missing or invalid.", product.categories);
      setLoadingRelated(false); // Ensure loading is stopped
      setRelatedProducts([]);   // Ensure related products is empty
    }
  };

  // Memoize the color to image mapping
  const colorImageMap = useMemo(() => {
    const map: { [color: string]: string } = {};
    productVariations.forEach(variation => {
      const colorAttribute = variation.attributes?.find(attr =>
        attr.slug?.startsWith('pa_print') ||
        attr.name?.toLowerCase() === 'принт'
      );
      if (colorAttribute && colorAttribute.option && variation.image?.src) {
        map[colorAttribute.option] = variation.image.src;
      }
    });
    return map;
  }, [productVariations]);

  // Memoize the color stock status mapping - a color is in stock if at least one variation has stock_status === 'instock'
  const colorStockStatus = useMemo(() => {
    const stockMap: { [color: string]: boolean } = {};
    productVariations.forEach(variation => {
      const colorAttribute = variation.attributes?.find(attr =>
        attr.slug?.startsWith('pa_print') ||
        attr.name?.toLowerCase() === 'принт' ||
        attr.name?.toLowerCase() === 'print'
      );
      if (colorAttribute && colorAttribute.option) {
        const color = colorAttribute.option;
        // Mark as in stock if any variation of this color is in stock
        if (variation.stock_status === 'instock') {
          stockMap[color] = true;
        } else if (stockMap[color] === undefined) {
          stockMap[color] = false;
        }
      }
    });
    return stockMap;
  }, [productVariations]);

  // Memoize the size stock status based on selected color - tracks which sizes are available for the current color
  const sizeStockStatus = useMemo(() => {
    const stockMap: { [size: string]: boolean } = {};
    if (!selectedColor) return stockMap;

    productVariations.forEach(variation => {
      const colorAttribute = variation.attributes?.find(attr =>
        attr.slug?.startsWith('pa_print') ||
        attr.name?.toLowerCase() === 'принт' ||
        attr.name?.toLowerCase() === 'print'
      );
      const sizeAttribute = variation.attributes?.find(attr =>
        attr.slug?.startsWith('pa_razmer') ||
        attr.slug?.startsWith('pa_size') ||
        attr.name?.toLowerCase() === 'размер' ||
        attr.name?.toLowerCase() === 'size'
      );

      // Only consider variations that match the selected color
      if (colorAttribute?.option === selectedColor && sizeAttribute?.option) {
        const size = sizeAttribute.option;
        if (variation.stock_status === 'instock') {
          stockMap[size] = true;
        } else if (stockMap[size] === undefined) {
          stockMap[size] = false;
        }
      }
    });
    return stockMap;
  }, [productVariations, selectedColor]);

  // Auto-select the first in-stock color when stock data updates
  useEffect(() => {
    if (Object.keys(colorStockStatus).length === 0 || allColors.length === 0) return;

    // If current selected color is in stock, keep it
    if (selectedColor && colorStockStatus[selectedColor] === true) return;

    // Pick the first in-stock color
    const firstInStockColor = allColors.find((color: string) => colorStockStatus[color] === true);
    if (firstInStockColor) {
      setSelectedColor(firstInStockColor);
    }
  }, [colorStockStatus, allColors]);

  // Auto-select the first in-stock size when color changes or stock data updates
  useEffect(() => {
    if (!selectedColor || Object.keys(sizeStockStatus).length === 0) return;

    // If current selected size is not in stock for this color, pick the first one that is
    if (selectedSize && sizeStockStatus[selectedSize] === true) return; // Current selection is valid

    const allSizesFromProduct = product?.attributes?.find((attr: ProductAttribute) =>
      attr.name.toLowerCase() === 'размер' ||
      attr.name.toLowerCase() === 'size' ||
      attr.slug === 'pa_size'
    )?.options || [];

    const firstInStockSize = allSizesFromProduct.find((size: string) => sizeStockStatus[size] === true);
    setSelectedSize(firstInStockSize || null);
  }, [selectedColor, sizeStockStatus]);

  // Determine the main image based on selected color and variations
  const mainImage = useMemo(() => {
    if (selectedColor && colorImageMap[selectedColor]) {
      return colorImageMap[selectedColor];
    }
    return product?.images?.[0]?.src || '/placeholder.png'; // Fallback to default product image
  }, [selectedColor, colorImageMap, product]);

  // Media items for the gallery
  const mediaItems: MediaItem[] = useMemo(() => {
    const addedUrls = new Set<string>();

    // Collect all image URLs (variation main + gallery)
    const imageItems: MediaItem[] = [];
    // Collect all video URLs from description
    const videoItems: MediaItem[] = [];

    if (currentVariation) {
      // 1. Variation main image
      if (currentVariation.image?.src) {
        const imageUrl = currentVariation.image.src;
        if (!addedUrls.has(imageUrl)) {
          imageItems.push({ type: 'image', url: imageUrl });
          addedUrls.add(imageUrl);
        }
      }

      // 2. Variation-specific gallery
      if (currentVariation.variation_gallery?.urls?.length > 0) {
        currentVariation.variation_gallery.urls.forEach((url: string) => {
          if (url && !addedUrls.has(url)) {
            imageItems.push({ type: 'image', url });
            addedUrls.add(url);
          }
        });
      }

      // 3. Extract ALL videos from variation description
      // WP shortcode has same URL twice: once with ?_=N (src attr) and once clean (href/text)
      // Normalize by stripping query params to avoid duplicates
      if (currentVariation.description && typeof currentVariation.description === 'string') {
        const urlMatches = [...currentVariation.description.matchAll(/(https?:\/\/[^\s,"'<>]+\.(?:mp4|webm)(?:[^\s,"'<>]*)?)/gi)];
        urlMatches.forEach(m => {
          const clean = m[1].split('?')[0]; // strip ?_=N query params
          if (clean && !addedUrls.has(clean)) {
            videoItems.push({ type: 'video', url: clean, thumbnail: currentVariation.image?.src });
            addedUrls.add(clean);
          }
        });
        // Fallback: <source src="..."> or <video src="..."> tags
        if (videoItems.length === 0) {
          const tagMatches = [...currentVariation.description.matchAll(/<(?:source|video)[^>]+src=["'](.*?)["']/gi)];
          tagMatches.forEach(m => {
            const clean = m[1].split('?')[0];
            if (clean && !addedUrls.has(clean)) {
              videoItems.push({ type: 'video', url: clean, thumbnail: currentVariation.image?.src });
              addedUrls.add(clean);
            }
          });
        }
      }
    } else if (mainImage && mainImage !== '/placeholder.png') {
      if (!addedUrls.has(mainImage)) {
        imageItems.push({ type: 'image', url: mainImage });
        addedUrls.add(mainImage);
      }
    }

    // Build final list: if no videos → just images
    // If videos → interleave: image, video, image, video, image...
    let items: MediaItem[] = [];
    if (videoItems.length === 0) {
      items = imageItems;
    } else {
      let imgIdx = 0; let vidIdx = 0;
      while (imgIdx < imageItems.length || vidIdx < videoItems.length) {
        if (imgIdx < imageItems.length) items.push(imageItems[imgIdx++]);
        if (vidIdx < videoItems.length) items.push(videoItems[vidIdx++]);
      }
    }

    // Last resort: parent product images
    if (items.length === 0 && product?.images) {
      product.images.forEach(img => {
        if (img.src && !addedUrls.has(img.src)) {
          items.push({ type: 'image', url: img.src });
          addedUrls.add(img.src);
        }
      });
    }

    return items.length > 0 ? items : [{ type: 'image', url: '/placeholder.png' }];
  }, [product, currentVariation, mainImage]);

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

  // Swipe/drag state for gallery
  const swipeStartXRef = useRef(0);
  const swipeCurrentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [swipeDragging, setSwipeDragging] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 15;

  const finishDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = swipeCurrentXRef.current - swipeStartXRef.current;
    setSwipeDragging(false);
    setSwipeOffset(0);
    if (Math.abs(diff) > SWIPE_THRESHOLD && mediaItems.length > 1) {
      if (diff < 0 && currentMediaIndex < mediaItems.length - 1) nextMedia();
      else if (diff > 0 && currentMediaIndex > 0) prevMedia();
    }
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  };

  const onWindowMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    swipeCurrentXRef.current = e.clientX;
    setSwipeOffset(e.clientX - swipeStartXRef.current);
  };

  const onWindowMouseUp = () => finishDrag();

  // Touch handlers
  const onGalleryTouchStart = (e: React.TouchEvent) => {
    swipeStartXRef.current = e.touches[0].clientX;
    swipeCurrentXRef.current = e.touches[0].clientX;
    setSwipeDragging(true);
    setSwipeOffset(0);
  };
  const onGalleryTouchMove = (e: React.TouchEvent) => {
    swipeCurrentXRef.current = e.touches[0].clientX;
    setSwipeOffset(e.touches[0].clientX - swipeStartXRef.current);
  };
  const onGalleryTouchEnd = () => {
    const diff = swipeCurrentXRef.current - swipeStartXRef.current;
    setSwipeDragging(false);
    setSwipeOffset(0);
    if (Math.abs(diff) > SWIPE_THRESHOLD && mediaItems.length > 1) {
      if (diff < 0 && currentMediaIndex < mediaItems.length - 1) nextMedia();
      else if (diff > 0 && currentMediaIndex > 0) prevMedia();
    }
  };

  // Mouse drag handlers — attach to window so fast movement never loses tracking
  const onGalleryMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    swipeStartXRef.current = e.clientX;
    swipeCurrentXRef.current = e.clientX;
    isDraggingRef.current = true;
    setSwipeDragging(true);
    setSwipeOffset(0);
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };
  // These are kept for the div but the real work happens via window listeners
  const onGalleryMouseMove = () => {};
  const onGalleryMouseUp = () => {};


  const handleAddToCart = async () => {
    if (!product) return;

    // Determine ID and Parent ID for cart item
    let itemIdToAdd: string;
    let itemParentId: string | undefined = undefined;
    let itemPrice = getActualPrice(product); // Use discounted price from parent product
    let itemThumbnail = product.images?.[0]?.src;

    if (currentVariation) {
      itemIdToAdd = String(currentVariation.id);
      itemParentId = String(product.id); // Parent product's ID
      // Keep using parent product's discounted price since variations inherit discounts
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
      // Include discount information for checkout validation
      // Use parent product's discount info since variations inherit it
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      price_html: product.price_html,
      // Add variation attributes for WooCommerce
      variation_attributes: currentVariation ? [
        ...(selectedColor ? [{ name: 'Принт', value: selectedColor }] : []),
        ...(selectedSize ? [{ name: 'Размер', value: selectedSize }] : [])
      ] : undefined,
      // Add human-readable variation details
      size: selectedSize || undefined,
      color: selectedColor || undefined
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

  // Color mapping - using shared utility from colorMap.ts

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
          <div className="flex-1 relative overflow-hidden">
            {/* Swipeable sliding track — touch + mouse drag */}
            <div
              className="w-full select-none cursor-grab active:cursor-grabbing"
              onTouchStart={onGalleryTouchStart}
              onTouchMove={onGalleryTouchMove}
              onTouchEnd={onGalleryTouchEnd}
              onMouseDown={onGalleryMouseDown}
              onMouseMove={onGalleryMouseMove}
              onMouseUp={onGalleryMouseUp}
              onMouseLeave={onGalleryMouseUp}
              style={{ touchAction: mediaItems.length > 1 ? 'pan-y' : 'auto' }}
            >
              <div
                className="flex"
                style={{
                  width: `${mediaItems.length * 100}%`,
                  transform: `translateX(calc(-${currentMediaIndex * (100 / mediaItems.length)}% + ${swipeOffset}px))`,
                  transition: swipeDragging ? 'none' : 'transform 0.3s ease-out',
                }}
              >
                {mediaItems.map((item: MediaItem, idx: number) => (
                  <div
                    key={idx}
                    className="aspect-[3/4] flex-shrink-0 bg-gray-100"
                    style={{ width: `${100 / mediaItems.length}%` }}
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ display: 'block' }}
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt="Product"
                        className="w-full h-full object-cover"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        style={{ display: 'block' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Dot indicators (mobile) */}
            {mediaItems.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                {mediaItems.map((_: MediaItem, idx: number) => (
                  <span
                    key={idx}
                    className="block rounded-full transition-all duration-300"
                    style={{
                      width: idx === currentMediaIndex ? 8 : 6,
                      height: idx === currentMediaIndex ? 8 : 6,
                      backgroundColor: idx === currentMediaIndex ? '#000' : 'rgba(0,0,0,0.3)',
                    }}
                  />
                ))}
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

          <div className="font-sans mt-2 text-lg">
            <DiscountPrice
              price={displayPrice || product?.price || ''}
              regularPrice={product?.regular_price}
              salePrice={product?.sale_price}
              priceHtml={product?.price_html}
            />
          </div>

          {/* Color selector */}
          {allColors && allColors.length > 0 && (
            <div className="mt-8">
              <p className="font-sans mb-2">{t('common.selectColor')}</p>
              <div className="flex items-center space-x-2 mt-4">
                {(allColors || []).map((color) => {
                  const isInStock = colorStockStatus[color] === true; // Only show if explicitly in stock

                  // Hide out-of-stock colors entirely
                  if (!isInStock) return null;

                  // Render as clickable for in-stock colors
                  return (
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
                  );
                })}
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
              {allSizes.map((size: string) => {
                // Check if this size is in stock for the selected color
                const isSizeInStock = !selectedColor || sizeStockStatus[size] === true;

                return (
                  <button
                    key={size}
                    className={`px-4 py-2 border rounded-full text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none ${isSizeInStock ? (
                      selectedSize === size
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-black hover:text-black focus:ring-2 focus:ring-offset-1 focus:ring-black'
                    ) : 'bg-white text-gray-300 border-gray-200 line-through cursor-not-allowed'}`}
                    onClick={() => isSizeInStock && setSelectedSize(size)}
                    disabled={!isSizeInStock}
                    title={isSizeInStock ? size : `${size} \u2014 \u043d\u0435\u0442 \u0432 \u043d\u0430\u043b\u0438\u0447\u0438\u0438`}
                  >
                    {size}
                  </button>
                );
              })}
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
                        <div dangerouslySetInnerHTML={{ __html: product.short_description }} />
                      ) : product.description ? (
                        <div dangerouslySetInnerHTML={{ __html: product.description }} />
                      ) : (
                        t('product.noDescription')
                      )
                    ) : section.contentKey === 'delivery' ? (
                      <div>
                        <p><strong>{t('delivery.moscowTitle')}</strong></p>
                        <p><strong>{t('delivery.cdekTitle')}</strong></p>
                        <p>{t('delivery.cdekDescription')}</p>
                        <p><strong>{t('delivery.courierTitle')}</strong></p>
                        <p>{t('delivery.withinMKAD')}</p>
                        <p>{t('delivery.outsideMKAD')}</p>
                        <br />
                        <p><strong>СДЭК РФ</strong></p>
                        <p>Доставка СДЭК по всей России.</p>
                        <p>Стоимость доставки рассчитывается согласно тарифам компании СДЭК. Срок доставки (без учета времени на формирование заказа) зависит от адреса получателя</p>
                        <br />
                        <p>{t('delivery.international')}</p>
                        <br />
                        <p>{t('delivery.byPhone')}</p>
                        <p>{t('delivery.byEmail')}</p>
                      </div>
                    ) : section.contentKey === 'returns' ? (
                      <div>
                        <p>{t('returns.conditions')}</p>
                        <br />
                        <p>{t('returns.toArrange')}</p>
                        <br />
                        <p>{t('returns.byPhone')}</p>
                        <p>{t('returns.byEmail')}</p>
                        <br />
                        <p>{t('returns.law')}</p>
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
      <div ref={relatedProductsRef} className="w-full md:max-w-7xl md:mx-auto md:px-[30px] mb-8">
        <RelatedProductsSlider products={relatedProducts} loading={loadingRelated} title="Вам также может понравиться" />
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal
        isOpen={isSizeChartModalOpen}
        onClose={() => setIsSizeChartModalOpen(false)}
      />
    </div>
  );
};