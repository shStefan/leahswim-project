import { useState, useEffect, useMemo } from 'react';
import { Heart, ShoppingBag, Menu, X, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useLikes } from '../context/LikesContext';
import { useCart } from '../context/CartContext';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import SelectedFiltersDisplay from '../components/SelectedFiltersDisplay';

// Cache constants and helper functions
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

const getCachedData = <T,>(key: string): { data: T; timestamp: number } | null => {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached) as { data: T; timestamp: number };
    } catch (e) {
      console.error("Failed to parse cache data for key:", key, e);
      localStorage.removeItem(key); // Clear corrupted cache
      return null;
    }
  }
  return null;
};

const setCachedData = <T,>(key: string, data: T) => {
  const cacheEntry = { data, timestamp: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (e) {
    console.error("Failed to set cache data for key:", key, e);
    // Potentially handle quota exceeded errors
  }
};

// Interface definitions (can be shared in a types file later)
interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  children?: Category[];
  count?: number;
}

interface ProductVariation {
  id: number;
  attributes: Array<{ name: string; slug: string; option: string }>;
  image?: { src: string };
  price?: string;
  sku?: string;
  description?: string;
}

interface Product {
  id: number;
  name: string;
  slug?: string;
  price: string;
  images: Array<{ src: string }>;
  attributes?: Array<{ name: string; slug: string; options: string[] }>;
  categories?: Array<{ id: number; name: string }>;
  status: string;
  type?: string;
  variations?: number[];
  date_modified?: string;
  date_modified_gmt?: string;
}

interface DisplayableProduct {
  parentId: number;
  variationId?: number;
  name: string;
  price: string;
  imageSrc: string;
  attributes?: Array<{ name: string; slug: string; options: string[] }>;
  variationAttributes?: Array<{ name: string; slug: string; option: string }>;
  slug?: string;
  allColorOptions: string[];
  selectedColorOption: string;
  status: string;
  categories?: Array<{ id: number; name: string }>;
  originalImages?: Array<{ src: string }>;
  date_modified?: string;
  isVideo?: boolean;
}

export const CategorySpecificPage = (): JSX.Element => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [subCategoriesForFilter, setSubCategoriesForFilter] = useState<Category[]>([]);
  const [displayableProducts, setDisplayableProducts] = useState<DisplayableProduct[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileFilterDropdown, setMobileFilterDropdown] = useState<string | null>(null);
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<{ [key: string]: boolean }>({});
  const [expandedDesktopParentCategory, setExpandedDesktopParentCategory] = useState<number | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  
  const { likedProducts, likedProductsCache, toggleLike } = useLikes();
  const { addToCart } = useCart();

  const WC_CONSUMER_KEY = 'ck_c2758a311f98c4c5a4e44b85a5a66eae4a0581c3';
  const WC_CONSUMER_SECRET = 'cs_7b0d34c68e68a5ae5cebf19a6d23338ab83de571';
  const WC_API_URL = 'https://zdqksnii.elementor.cloud/wp-json/wc/v3';

  const getColorHex = (colorName: string) => {
    const colorMap: { [key: string]: string } = {
      'princess blue': '#4169E1', 'fantasie sunset': '#FF7F50', 'fantasie black and white': '#000000',
      'meow blue': '#1E90FF', 'infinity': '#639BB9', 'fantasy': '#B12D31', 'anchor': '#F7A98C',
      'swim': '#98DCC2', 'biscay green': '#1B4D3E', 'sakura': '#FFB7C5', 'peacock blue': '#004D98',
      'bitter orange': '#FF6B00', 'espresso': '#4B3621', 'electric blue': '#0000FF', 'deep green': '#006400',
      'cornflower': '#6495ED', 'terracotta': '#E2725B', 'olive': '#808000', 'mint': '#98FF98',
      'coral': '#FF7F50', 'burgundy': '#800020', 'navy': '#000080', 'beige': '#F5F5DC',
      'brown': '#A52A2A', 'grey': '#808080', 'gray': '#808080', 'orange': '#FFA500',
      'purple': '#800080', 'pink': '#F6A7E5', 'yellow': '#FFFF00', 'green': '#25CD96',
      'blue': '#42B1EA', 'red': '#FF0000', 'white': '#FFFFFF', 'black': '#000000',
      'natural': '#F0E68C', 'коралл': '#C9313E', 'фиолетовый': '#800080', 'чёрный': '#000000',
      'коралл черный': '#4A4A4A', 'avorio mocaccino': '#27CE5E', 'jelly bean': '#05936C',
      'lilac': '#C8A2C8', 'sicilia': '#E3DA73',
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
    if (colorMap[lowerColorName]) return colorMap[lowerColorName];
    const partialMatch = Object.entries(colorMap).find(([key]) => lowerColorName.includes(key));
    if (partialMatch) return partialMatch[1];
    return '#CCCCCC';
  };
  
  // Effect to initialize size, color, sort, and sub-category filters from URL search params
  useEffect(() => {
    setSelectedSize(searchParams.get('size') || '');
    setSelectedColor(searchParams.get('color') || '');
    setSortOrder(searchParams.get('sort') || '');
    setSelectedSubCategoryId(searchParams.get('style') || '');
  }, [searchParams]);

  // Effect to update URL search params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSize) params.set('size', selectedSize);
    if (selectedColor) params.set('color', selectedColor);
    if (sortOrder) params.set('sort', sortOrder);
    if (selectedSubCategoryId) params.set('style', selectedSubCategoryId);
    
    // Only update if params actually changed and categorySlug is present
    if (categorySlug && params.toString() !== searchParams.toString()) {
        setSearchParams(params, { replace: true });
    }
  }, [selectedSize, selectedColor, sortOrder, selectedSubCategoryId, setSearchParams, searchParams, categorySlug]);
  
  const handleClearSize = () => {
    setSelectedSize('');
  };

  const handleClearColor = () => {
    setSelectedColor('');
  };

  const handleClearSubCategory = () => {
    setSelectedSubCategoryId('');
  };

  // Clears all filters for this page
  const handleClearAllSpecificPageFilters = () => {
    setSelectedSize('');
    setSelectedColor('');
    setSelectedSubCategoryId('');
    setSortOrder(''); // Also clear sort order
    // The useEffect for searchParams will update the URL
  };

  // This handler is for the main category context. 
  // In CategorySpecificPage, clearing the "main category" means going back to the general catalogue.
  const handleClearMainCategory = () => {
    navigate('/catalogue'); 
  };

  // Helper function to build hierarchy (can be reused or adapted)
  const buildCategoryHierarchy = (flatCategories: Category[], parentId = 0): Category[] => {
    return flatCategories
      .filter(category => category.parent === parentId)
      .map(category => ({
        ...category,
        children: buildCategoryHierarchy(flatCategories, category.id)
      }));
  };

  // Fetch all categories, identify current category, and its sub-categories
  useEffect(() => {
    setError(null);
    // Initial state for these are usually handled by their useState declarations
    // setCurrentCategory(null); 
    // setSubCategoriesForFilter([]);

    const categoriesCacheKey = 'allWCCategories_v3'; // Incremented version for potential structure changes
    const cached = getCachedData<Category[]>(categoriesCacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
      console.log('Loading categories from cache');
      setAllCategories(cached.data);
      const foundCategory = cached.data.find(cat => cat.slug === categorySlug);
      
      if (foundCategory) {
        setCurrentCategory(foundCategory);
        setSubCategoriesForFilter(buildCategoryHierarchy(cached.data, foundCategory.id));
      } else {
        setError(`Category with slug "${categorySlug}" not found in cached categories.`);
      }
      setLoading(false); // Data loaded (or error set) from cache
      return;
    }

    console.log('Fetching categories from API');
    setLoading(true); 

    fetch(`${WC_API_URL}/products/categories?per_page=100&consumer_key=${WC_CONSUMER_KEY}&consumer_secret=${WC_CONSUMER_SECRET}`)
      .then(res => res.ok ? res.json() : Promise.reject(`Failed to fetch categories: ${res.status}`))
      .then((data: Category[]) => {
        if (Array.isArray(data)) {
          setAllCategories(data);
          setCachedData(categoriesCacheKey, data); // Cache the raw category list
          const foundCategory = data.find(cat => cat.slug === categorySlug);
          
          if (foundCategory) {
            setCurrentCategory(foundCategory);
            setSubCategoriesForFilter(buildCategoryHierarchy(data, foundCategory.id));
          } else {
            setError(`Category with slug "${categorySlug}" not found.`);
          }
        } else {
          throw new Error('Categories data is not an array');
        }
      })
      .catch(err => {
        console.error('Error fetching categories:', err);
        setError(typeof err === 'string' ? err : err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [categorySlug, WC_API_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET]); // Added API constants to deps, though they are unlikely to change

  // Fetch products for the current category ID
  useEffect(() => {
    if (!currentCategory) {
      // If currentCategory is not yet set (e.g., initial load or slug change),
      // ensure loading state reflects this if not already handled by category fetch.
      if (categorySlug && !error && !currentCategory) setLoading(true);
      return;
    }

    const productsCacheKey = `wcCategoryProducts_${currentCategory.id}_v3`; // Incremented version
    const cachedProducts = getCachedData<DisplayableProduct[]>(productsCacheKey);

    if (cachedProducts && (Date.now() - cachedProducts.timestamp < CACHE_DURATION_MS)) {
      console.log(`Loading products for category ${currentCategory.name} (ID: ${currentCategory.id}) from cache`);
      setDisplayableProducts(cachedProducts.data);
      setLoading(false);
      setError(null); // Clear any previous error if loading from cache
      return;
    }
    
    console.log(`Fetching products for category: ${currentCategory.name} (ID: ${currentCategory.id}) from API`);
    // setLoading(true) and setError(null) will be handled inside fetchProductsAndVariations

    const fetchProductsAndVariations = async () => {
      setLoading(true);
      setError(null);
      try {
        let productsApiUrl = '';
        const optimizedCategoryIds = [153, 23, 21, 19, 16]; // New: array of IDs

        if (currentCategory && optimizedCategoryIds.includes(currentCategory.id)) {
          console.log(`Using optimized endpoint for category: ${currentCategory.name} (ID: ${currentCategory.id})`);
          productsApiUrl = `${WC_API_URL}/products?category=${currentCategory.id}&status=publish&per_page=100&_fields=id,name,type,price,status,slug,images,attributes,variations,categories,date_modified&consumer_key=${WC_CONSUMER_KEY}&consumer_secret=${WC_CONSUMER_SECRET}`;
        } else if (currentCategory) {
          console.log(`Using standard endpoint for category: ${currentCategory.name} (ID: ${currentCategory.id})`);
          productsApiUrl = `${WC_API_URL}/products?category=${currentCategory.id}&per_page=100&consumer_key=${WC_CONSUMER_KEY}&consumer_secret=${WC_CONSUMER_SECRET}&status=publish`;
        } else {
          // Should not happen if currentCategory is checked before calling, but as a fallback:
          setError("Category not loaded, cannot fetch products.");
          setLoading(false);
          return;
        }
        
        // console.log(`Fetching products for category: ${currentCategory.name} (ID: ${currentCategory.id}) from ${productsApiUrl}`); // Already logged above
        
        const productsResponse = await fetch(productsApiUrl);
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products for category ${currentCategory.name}: ${productsResponse.status}`);
        }
        const baseProducts: Product[] = await productsResponse.json();

        if (!Array.isArray(baseProducts)) {
          throw new Error('Received invalid base product data from server.');
        }
        
        console.log(`Fetched ${baseProducts.length} base products for category ${currentCategory.name}:`, baseProducts);
        const processedDisplayableProducts: DisplayableProduct[] = [];

        const variationPromises = baseProducts.map(async (product) => {
          const productImages = Array.isArray(product.images) ? product.images : [];
          const parentColorAttribute = product.attributes?.find(
            (attr) => attr.name.toLowerCase() === 'принт' || attr.name.toLowerCase() === 'print' || attr.slug === 'pa_print'
          );
          const allParentColors = parentColorAttribute?.options || [];

          if (product.type === 'variable' && product.variations && product.variations.length > 0) {
            try {
              const variationsResponse = await fetch(`${WC_API_URL}/products/${product.id}/variations?consumer_key=${WC_CONSUMER_KEY}&consumer_secret=${WC_CONSUMER_SECRET}&per_page=100`);
              if (!variationsResponse.ok) {
                 console.warn(`Failed to fetch variations for product ${product.id}. Using parent product.`);
                 const imgSrc = productImages[0]?.src || '/placeholder.png';
                 const isVideoFile = imgSrc.endsWith('.mp4') || imgSrc.endsWith('.webm');
                 processedDisplayableProducts.push({
                    parentId: product.id, name: product.name, price: product.price,
                    imageSrc: imgSrc, isVideo: isVideoFile,
                    attributes: product.attributes,
                    slug: product.slug, allColorOptions: allParentColors, selectedColorOption: allParentColors[0] || '',
                    status: product.status, categories: product.categories, originalImages: productImages,
                    date_modified: product.date_modified,
                  });
              } else {
                const detailedVariations: ProductVariation[] = await variationsResponse.json();
                if (Array.isArray(detailedVariations) && detailedVariations.length > 0) {
                  const variationsByColor: { [color: string]: ProductVariation[] } = {};
                  detailedVariations.forEach(variation => {
                    const colorAttr = variation.attributes.find(attr => attr.slug === 'pa_print' || attr.name.toLowerCase() === 'принт' || attr.name.toLowerCase() === 'print');
                    if (colorAttr && colorAttr.option) {
                      if (!variationsByColor[colorAttr.option]) variationsByColor[colorAttr.option] = [];
                      variationsByColor[colorAttr.option].push(variation);
                    }
                  });

                  if (Object.keys(variationsByColor).length > 0) {
                    Object.entries(variationsByColor).forEach(([color, group]) => {
                      const repVar = group[0];
                      
                      let potentialVideoSrcFromDesc: string | undefined = undefined;
                      if (repVar.description) {
                        const descMatch = repVar.description.match(/(https?:\/\/[^\s]+\.(?:mp4|webm))/i);
                        if (descMatch && descMatch[0]) {
                          potentialVideoSrcFromDesc = descMatch[0];
                        }
                      }

                      const varImgSrc = repVar.image?.src; // Actual image for the variation
                      const isVideoFile = !!potentialVideoSrcFromDesc;
                      
                      let finalImgSrc: string;
                      if (isVideoFile) {
                        finalImgSrc = potentialVideoSrcFromDesc!; // We know it's defined if isVideoFile is true
                      } else {
                        finalImgSrc = varImgSrc || productImages[0]?.src || '/placeholder.png';
                      }

                      processedDisplayableProducts.push({
                        parentId: product.id, variationId: repVar.id, name: product.name,
                        price: repVar.price || product.price,
                        imageSrc: finalImgSrc, // Use the refined variable
                        isVideo: isVideoFile,
                        attributes: product.attributes, variationAttributes: repVar.attributes,
                        slug: product.slug, allColorOptions: allParentColors, selectedColorOption: color,
                        status: product.status, categories: product.categories, originalImages: productImages,
                        date_modified: product.date_modified,
                      });
                    });
                  } else { // No variations grouped by color, use parent or first variation
                     const imgSrc = productImages[0]?.src || '/placeholder.png';
                     const isVideoFile = imgSrc.endsWith('.mp4') || imgSrc.endsWith('.webm'); // Less likely here, but for consistency
                     processedDisplayableProducts.push({
                        parentId: product.id, name: product.name, price: product.price,
                        imageSrc: imgSrc, isVideo: isVideoFile,
                        attributes: product.attributes,
                        slug: product.slug, allColorOptions: allParentColors, selectedColorOption: allParentColors[0] || '',
                        status: product.status, categories: product.categories, originalImages: productImages,
                        date_modified: product.date_modified,
                      });
                  }
                } else { // No detailed variations, use parent
                    const imgSrc = productImages[0]?.src || '/placeholder.png';
                    const isVideoFile = imgSrc.endsWith('.mp4') || imgSrc.endsWith('.webm');
                    processedDisplayableProducts.push({
                        parentId: product.id, name: product.name, price: product.price,
                        imageSrc: imgSrc, isVideo: isVideoFile,
                        attributes: product.attributes,
                        slug: product.slug, allColorOptions: allParentColors, selectedColorOption: allParentColors[0] || '',
                        status: product.status, categories: product.categories, originalImages: productImages,
                        date_modified: product.date_modified,
                      });
                }
              }
            } catch (varError) {
              console.error(`Error with variations for product ${product.id}:`, varError);
               const imgSrc = productImages[0]?.src || '/placeholder.png';
               const isVideoFile = imgSrc.endsWith('.mp4') || imgSrc.endsWith('.webm');
               processedDisplayableProducts.push({
                  parentId: product.id, name: product.name, price: product.price,
                  imageSrc: imgSrc, isVideo: isVideoFile,
                  attributes: product.attributes,
                  slug: product.slug, allColorOptions: allParentColors, selectedColorOption: allParentColors[0] || '',
                  status: product.status, categories: product.categories, originalImages: productImages,
                  date_modified: product.date_modified,
                });
            }
          } else { // Simple product or no variations
            const imgSrc = productImages[0]?.src || '/placeholder.png';
            const isVideoFile = imgSrc.endsWith('.mp4') || imgSrc.endsWith('.webm');
            processedDisplayableProducts.push({
              parentId: product.id, name: product.name, price: product.price,
              imageSrc: imgSrc, isVideo: isVideoFile,
              attributes: product.attributes,
              slug: product.slug, allColorOptions: allParentColors, selectedColorOption: allParentColors[0] || '',
              status: product.status, categories: product.categories, originalImages: productImages,
              date_modified: product.date_modified,
            });
          }
        });
        await Promise.allSettled(variationPromises);
        const validDisplayableProducts = processedDisplayableProducts.filter(p => p && p.name && p.price && p.status === 'publish');
        
        // Sort for optimized categories by date_modified (newest first)
        if (currentCategory && optimizedCategoryIds.includes(currentCategory.id)) {
          validDisplayableProducts.sort((a, b) => {
            if (a.date_modified && b.date_modified) {
              return new Date(b.date_modified).getTime() - new Date(a.date_modified).getTime();
            }
            return 0;
          });
          console.log(`Sorted products for ${currentCategory.name} by date_modified.`);
        }

        setDisplayableProducts(validDisplayableProducts);
        setCachedData(productsCacheKey, validDisplayableProducts); // Cache the processed products
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProductsAndVariations();
  }, [currentCategory, WC_API_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET]);


  const allSizes = Array.from(new Set(displayableProducts?.flatMap(p => p.attributes?.find(attr => attr.slug === 'pa_size')?.options || []).filter(Boolean) || []));
  const allColorsForCategory = Array.from(new Set(displayableProducts?.flatMap(p => p.attributes?.find(attr => attr.slug === 'pa_print')?.options || []).filter(Boolean) || []));

  const currentlyAvailableColors = useMemo(() => {
    const productsFilteredByOther = displayableProducts.filter(product => {
      if (product.status !== 'publish') return false;
      if (selectedSubCategoryId) {
        if (!product.categories || !product.categories.some(cat => String(cat.id) === selectedSubCategoryId)) {
          return false;
        }
      }
      if (selectedSize) {
        const sizeAttr = product.attributes?.find(attr => attr.slug === 'pa_size');
        if (!sizeAttr || !sizeAttr.options?.includes(selectedSize)) return false;
      }
      return true;
    });
    return Array.from(new Set(productsFilteredByOther.map(p => p.selectedColorOption).filter(Boolean)));
  }, [displayableProducts, selectedSize, selectedSubCategoryId]);

  const filteredProducts = useMemo(() => {
    return displayableProducts.filter(product => {
      if (product.status !== 'publish') return false;

      if (selectedSubCategoryId) {
        if (!product.categories || !product.categories.some(cat => String(cat.id) === selectedSubCategoryId)) {
          return false;
        }
      }

      if (selectedColor) {
        if (product.selectedColorOption !== selectedColor) {
          return false;
        }
      }
      
      if (selectedSize) {
        const sizeAttr = product.attributes?.find(attr => attr.slug === 'pa_size');
        if (!sizeAttr || !sizeAttr.options?.includes(selectedSize)) return false;
      }
      return true;
    });
  }, [displayableProducts, selectedColor, selectedSize, selectedSubCategoryId]);

  const sortedAndFilteredProducts = useMemo(() => {
    let productsToSort = [...filteredProducts];
    if (sortOrder === 'price_asc') {
      productsToSort.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOrder === 'price_desc') {
      productsToSort.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }
    return productsToSort;
  }, [filteredProducts, sortOrder]);
  
  const handleAddToCart = async (product: DisplayableProduct) => {
    if (!product) return;
    const itemDetails = {
      id: String(product.variationId || product.parentId),
      parentId: product.variationId ? String(product.parentId) : undefined,
      title: product.name, unit_price: product.price, thumbnail: product.imageSrc || '/placeholder.png'
    };
    try {
      await addToCart(itemDetails, 1);
    } catch (error) {
      console.error('Error adding to cart from category page:', error);
    }
  };

  function FilterDropdown({ 
    label, 
    options, 
    categoryItems,
    selected, 
    onSelect, 
    id, 
    alignRight = false,
    expandedParentId,
    onToggleParentExpand,
    activeOptions
  }: { 
    label: string, 
    options?: string[], 
    categoryItems?: Category[],
    selected: string, 
    onSelect: (val: string) => void, 
    id: string, 
    alignRight?: boolean,
    expandedParentId?: number | null,
    onToggleParentExpand?: (categoryId: number) => void,
    activeOptions?: string[]
  }) {
    const safeOptions = Array.isArray(options) ? options : [];

    const renderCategoryItemsLocal = (items: Category[], level = 0) => {
      return items.map((category) => (
        <div key={category.id} className="flex flex-col">
          <div
            className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-center justify-between"
            onClick={() => {
              onSelect(String(category.id));
              if (level === 0 && category.children && category.children.length > 0 && onToggleParentExpand) {
                onToggleParentExpand(category.id);
              } else {
                setOpenDropdown(null);
              }
            }}
            style={{
              fontWeight: selected === String(category.id) ? 'bold' : 'normal',
              paddingLeft: `${1 + level * 0.75}rem`,
            }}
          >
            <span>{category.name} {category.count !== undefined ? `(${category.count})` : ''}</span>
            {level === 0 && category.children && category.children.length > 0 && (
              <ChevronDown 
                className={`ml-2 w-4 h-4 transform transition-transform duration-200 flex-shrink-0 ${expandedParentId === category.id ? 'rotate-180' : ''}`}
              />
            )}
          </div>
          {level === 0 && category.children && category.children.length > 0 && expandedParentId === category.id && (
            <div className="pl-2 border-l border-gray-200">
              {renderCategoryItemsLocal(category.children, level + 1)} 
            </div>
          )}
        </div>
      ));
    };

    return (
      <div className="relative">
        <button
          className="flex items-center font-bold text-xs tracking-wider uppercase focus:outline-none"
          onClick={() => setOpenDropdown(openDropdown === id ? null : id)} type="button"
        >
          {label} <ChevronDown className="ml-1 w-4 h-4" />
        </button>
        {openDropdown === id && (
          <div
            className={`${alignRight ? "absolute left-full top-0 ml-2" : "absolute right-0 mt-2"} bg-white/90 border border-gray-100 rounded-2xl shadow-2xl z-30 backdrop-blur ${id === 'color' ? 'w-[160px]' : 'min-w-[50px]'}`}
            style={{ maxHeight: '400px', overflowY: 'auto' }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-center border-b border-gray-200"
              onClick={() => { onSelect(''); setOpenDropdown(null); }} style={{ fontWeight: !selected ? 'bold' : 'normal' }}
            >Все</div>
            {id === 'color-csp' ? (
              <div className="flex flex-wrap gap-1 p-2 justify-start">
                {safeOptions.map(opt => {
                  const isAvailable = activeOptions ? activeOptions.includes(opt) : true;
                  if (!isAvailable) return null; // Don't render if not available

                  return (
                    <button
                      key={opt}
                      type="button"
                      title={opt}
                      className={`w-6 h-6 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-black hover:border-black transition-all
                        ${selected === opt ? 'ring-2 ring-black ring-offset-1 border-black' : ''}
                      `}
                      style={{ backgroundColor: getColorHex(opt) }}
                      onClick={() => { onSelect(opt); setOpenDropdown(null); }}
                    />
                  );
                })}
              </div>
            ) : id === 'style-csp' && categoryItems ? (
              renderCategoryItemsLocal(categoryItems)
            ) : (
              safeOptions.map(opt => (
                <div key={opt} className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-center"
                  onClick={() => { onSelect(opt); setOpenDropdown(null); }} style={{ fontWeight: selected === opt ? 'bold' : 'normal' }}
                >{opt}</div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Recursive function to render category items for mobile filter drawer
  const renderMobileCategoryItems = (items: Category[], level = 0): JSX.Element[] => {
    return items.map((category) => (
      <div key={category.id} className="flex flex-col w-full">
        <div 
          className={`flex items-center justify-between w-full py-2 text-left text-xs ${level > 0 ? 'pl-4' : ''} ${selectedSubCategoryId === String(category.id) ? 'font-bold text-black' : 'text-gray-700'}`}
          onClick={() => {
            if (category.children && category.children.length > 0) {
              setExpandedMobileCategories(prev => ({ ...prev, [category.id]: !prev[category.id] }));
            }
            setSelectedSubCategoryId(selectedSubCategoryId === String(category.id) ? '' : String(category.id));
          }}
        >
          <span className="flex-1 truncate">{category.name} {category.count !== undefined ? `(${category.count})` : ''}</span>
          {category.children && category.children.length > 0 && (
            <ChevronDown 
              className={`ml-2 w-4 h-4 transform transition-transform duration-200 flex-shrink-0 ${expandedMobileCategories[category.id] ? 'rotate-180' : ''}`}
            />
          )}
        </div>
        {category.children && category.children.length > 0 && expandedMobileCategories[category.id] && (
          <div className="pl-3 border-l border-gray-200">
            {renderMobileCategoryItems(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (error) {
    return <div className="pt-20 md:pt-[80px] text-center text-red-500">Error: {error} <Link to="/catalogue" className="underline">Go to main catalogue</Link></div>;
  }

  // Show skeleton or "Category not found" if there's no currentCategory and not actively loading (or if an error occurred finding it handled by the 'error' block above)
  // The main product loading will show its own skeleton within the grid.
  if (!currentCategory && !loading && !error) {
     return <div className="pt-20 md:pt-[80px] text-center">Category not found. <Link to="/catalogue" className="underline">Return to catalogue</Link></div>;
  }


  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <div className="w-full mt-0 pb-20">
          <div className="w-full flex justify-center mb-0 pt-20 md:pt-[80px] pb-[20px]">
            {/* <h1 className="text-2xl md:text-3xl font-bold">{currentCategory?.name || 'Category'}</h1> */}
          </div>
          <div className="w-full h-px bg-gray-100 mb-1" />

          {/* Filter Bar (Desktop) - Simplified: No category filter needed */}
          <div className="hidden md:flex flex-row items-center justify-between mb-0 pl-[5px] py-2 md:px-[45px]" style={{ minHeight: 48 }}>
            <div className="flex flex-row items-center space-x-8">
              <FilterDropdown label="РАЗМЕР" options={allSizes} selected={selectedSize} onSelect={setSelectedSize} id="size-csp" alignRight />
              <FilterDropdown 
                label="ЦВЕТ" 
                options={allColorsForCategory}
                selected={selectedColor} 
                onSelect={setSelectedColor} 
                id="color-csp" 
                alignRight
                activeOptions={currentlyAvailableColors}
              />
              <FilterDropdown 
                label="Категория"
                categoryItems={subCategoriesForFilter}
                selected={selectedSubCategoryId} 
                onSelect={setSelectedSubCategoryId}
                id="style-csp"
                alignRight 
                expandedParentId={expandedDesktopParentCategory}
                onToggleParentExpand={(catId) => setExpandedDesktopParentCategory(prev => prev === catId ? null : catId)}
              />
            </div>
            <div className="flex items-center">
              <FilterDropdown label="Сортировать" options={['Цена: по возрастанию', 'Цена: по убыванию']}
                selected={sortOrder === 'price_asc' ? 'Цена: по возрастанию' : sortOrder === 'price_desc' ? 'Цена: по убыванию' : ''}
                onSelect={(val) => setSortOrder(val === 'Цена: по возрастанию' ? 'price_asc' : val === 'Цена: по убыванию' ? 'price_desc' : '')}
                id="sort-csp"
              />
            </div>
          </div>
          {(selectedSize || selectedColor || selectedSubCategoryId) && (
            <div className="hidden md:block md:px-[45px]">
              <SelectedFiltersDisplay
                selectedSize={selectedSize} 
                selectedColor={selectedColor} 
                selectedCategory={currentCategory?.id?.toString() || ''}
                categories={allCategories}
                selectedSubCategoryId={selectedSubCategoryId}
                subCategories={subCategoriesForFilter}
                onClearSize={handleClearSize} 
                onClearColor={handleClearColor} 
                onClearCategory={handleClearMainCategory}
                onClearSubCategory={handleClearSubCategory}
                onClearAll={handleClearAllSpecificPageFilters}
              />
            </div>
          )}

          {/* Mobile Filter/Sort Bar - Simplified */}
          <div className="flex md:hidden flex-row items-center justify-between mb-0 py-2" style={{ minHeight: 48 }}>
            <button className="flex items-center pl-6 py-2 text-xs font-bold uppercase tracking-wider" onClick={() => setIsFilterDrawerOpen(true)}>
              Фильтры <FilterIcon className="ml-2 w-4 h-4" />
            </button>
            <div className="flex items-center pr-6">
               <FilterDropdown label="Сортировать" options={['Цена: по возрастанию', 'Цена: по убыванию']}
                selected={sortOrder === 'price_asc' ? 'Цена: по возрастанию' : sortOrder === 'price_desc' ? 'Цена: по убыванию' : ''}
                onSelect={(val) => setSortOrder(val === 'Цена: по возрастанию' ? 'price_asc' : val === 'Цена: по убыванию' ? 'price_desc' : '')}
                id="sort-mobile-csp"
              />
            </div>
          </div>
          <div className="w-full h-px bg-gray-100 mb-1" />

          {/* Mobile Filter Drawer - Simplified */}
          <div className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 md:hidden z-40 ${isFilterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFilterDrawerOpen(false)} />
          <div className={`fixed inset-y-0 left-0 w-[80vw] max-w-[400px] bg-white transform transition-transform duration-300 ease-in-out z-50 ${isFilterDrawerOpen ? 'translate-x-0' : '-translate-x-full'} ${isFilterDrawerOpen ? '' : 'pointer-events-none'}`}>
            <div className="flex justify-end p-2"><button onClick={() => setIsFilterDrawerOpen(false)}><X size={20} /></button></div>
            <div className="px-4 pb-4 flex flex-col h-full">
              <span className="text-base font-bold uppercase mb-2">Фильтры для {currentCategory?.name}</span>
              <div className="w-full h-px bg-gray-200 mb-2" />
              <SelectedFiltersDisplay 
                selectedSize={selectedSize} 
                selectedColor={selectedColor} 
                selectedCategory={currentCategory?.id?.toString() || ''}
                categories={allCategories}
                selectedSubCategoryId={selectedSubCategoryId}
                subCategories={subCategoriesForFilter}
                onClearSize={handleClearSize} 
                onClearColor={handleClearColor} 
                onClearCategory={handleClearMainCategory} 
                onClearSubCategory={handleClearSubCategory}
                onClearAll={handleClearAllSpecificPageFilters} 
              />
              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {/* Size */}
                <div>
                  <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b" onClick={() => setMobileFilterDropdown(m => m === 'size' ? null : 'size')}>Размер{selectedSize && ` (${selectedSize})`}<ChevronDown className={`transition-transform ${mobileFilterDropdown === 'size' ? 'rotate-180' : ''}`} /></button>
                  {mobileFilterDropdown === 'size' && <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">{allSizes.map(s => <button key={s} className={`border px-2 py-1 rounded text-xs ${selectedSize === s ? 'bg-black text-white' : ''}`} onClick={() => setSelectedSize(sz => sz === s ? '' : s)}>{s}</button>)}</div>}
                </div>
                {/* Color */}
                <div>
                  <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b" onClick={() => setMobileFilterDropdown(m => m === 'color' ? null : 'color')}>Цвет{selectedColor && ` (${selectedColor})`}<ChevronDown className={`transition-transform ${mobileFilterDropdown === 'color' ? 'rotate-180' : ''}`} /></button>
                  {mobileFilterDropdown === 'color' && (
                    <div className="flex flex-wrap gap-2 mt-1 px-1 pb-1">
                      {allColorsForCategory.map(color => {
                        const isAvailable = currentlyAvailableColors.includes(color);
                        if (!isAvailable) return null; // Don't render if not available

                        return (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 focus:outline-none 
                              focus:ring-2 focus:ring-offset-1 focus:ring-black
                              ${selectedColor === color ? 'border-black ring-2 ring-black ring-offset-1' : 'border-gray-300'}
                            `}
                            style={{ backgroundColor: getColorHex(color) }}
                            onClick={() => setSelectedColor(sc => sc === color ? '' : color)}
                            title={color}
                            aria-label={`Select color ${color}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Style Dropdown for Sub-categories */}
                <div>
                  <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b" 
                    onClick={() => setMobileFilterDropdown(m => m === 'style' ? null : 'style')}>
                    Категория {selectedSubCategoryId && subCategoriesForFilter.flatMap(sc => sc.children ? [sc, ...sc.children] : [sc]).find(sc => String(sc.id) === selectedSubCategoryId)?.name ? ` (${subCategoriesForFilter.flatMap(sc => sc.children ? [sc, ...sc.children] : [sc]).find(sc => String(sc.id) === selectedSubCategoryId)?.name})` : ''}
                    <ChevronDown className={`transition-transform ${mobileFilterDropdown === 'style' ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileFilterDropdown === 'style' && (
                    <div className="flex flex-col items-start gap-0 mt-1 px-1 pb-1">
                       <button 
                        className={`w-full py-2 text-left text-xs ${!selectedSubCategoryId ? 'font-bold text-black' : 'text-gray-700'}`}
                        onClick={() => {
                          setSelectedSubCategoryId('');
                        }}>
                        Все подкатегории ({currentCategory?.name})
                        </button>
                      {renderMobileCategoryItems(subCategoriesForFilter)}
                    </div>
                  )}
                </div>
              </div>
              <button className="mt-6 w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded" onClick={() => setIsFilterDrawerOpen(false)}>Показать {sortedAndFilteredProducts.length} результатов</button>
              <button className="mt-2 w-full text-center text-black underline text-xs" onClick={() => {setSelectedSize(''); setSelectedColor(''); setSelectedSubCategoryId('');}}>Очистить все</button>
            </div>
          </div>

          {/* Product grid */}
          <div className="w-full">
            {loading || (!currentCategory && !error) ? ( // Show skeletons if loading OR if currentCategory is still being determined (and no error)
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                {[...Array(6)].map((_, idx) => <div key={idx} className={`${(idx+1)%3===0?'':'border-r'} ${idx>=3?'':'border-b'} border-gray-100`}><ProductCardSkeleton delay={`${idx*120}ms`} /></div>)}
              </div>
            ) : sortedAndFilteredProducts.length === 0 ? (
              <p className="text-center py-10">No products found in {currentCategory?.name || 'this category'} matching your filters.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                {sortedAndFilteredProducts.map((product, idx) => {
                  const isLastCol = ((idx + 1) % 3 === 0);
                  const isLastRow = idx >= sortedAndFilteredProducts.length - (sortedAndFilteredProducts.length % 3 || 3);
                  const productLink = `/product/${product.parentId}?print=${encodeURIComponent(product.selectedColorOption)}`;
                  return (
                    <div key={product.variationId || product.parentId} className={`${isLastCol ? '' : 'border-r'} ${isLastRow ? '' : ' border-b'} border-gray-100`}>
                      <div className="relative">
                        <Link to={productLink} state={{ parentProductId: product.parentId, selectedColor: product.selectedColorOption, productData: product }} className="block">
                          <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                            {product.isVideo ? (
                              <video
                                src={product.imageSrc || '/placeholder.mp4'} // Fallback to a placeholder video if src is missing
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Video Error for SRC:', (e.target as HTMLVideoElement)?.src, e);
                                }}
                              />
                            ) : (
                              <img src={product.imageSrc || '/placeholder.png'} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                            )}
                          </div>
                        </Link>
                        <div className="mt-2 pl-2 pr-2 pb-2 md:pl-3 md:pr-3 md:pb-3">
                          <Link to={productLink} state={{ parentProductId: product.parentId, selectedColor: product.selectedColorOption, productData: product }} className="block">
                            <div className="flex items-center justify-between w-full">
                              <h3 className="font-sans text-xs md:text-sm font-normal text-black">{product.name}</h3>
                              <button className="ml-2 p-1 text-gray-500 hover:text-red-600" aria-label="Like" onClick={e => { e.preventDefault(); toggleLike(product.variationId || product.parentId, { id: product.variationId || product.parentId, parentId: product.parentId, name: product.name, price: product.price, images: [{ src: product.imageSrc }] }); }}>
                                <Heart size={20} fill={likedProducts.includes(product.variationId || product.parentId) ? 'black' : 'none'} stroke={likedProducts.includes(product.variationId || product.parentId) ? 'black' : 'currentColor'} />
                              </button>
                            </div>
                            <p className="font-sans text-xs text-black">{product.price} RUB</p>
                          </Link>
                          <div className="mt-2 flex items-center space-x-1">
                            {(product.allColorOptions || []).map(color => (
                              <Link key={color} to={`/product/${product.parentId}?print=${encodeURIComponent(String(color))}`} title={String(color)}>
                                <span className={`block w-4 h-4 rounded-full border hover:border-black ${product.selectedColorOption === color ? 'ring-1 ring-offset-1 ring-black' : 'border-gray-300'}`} style={{ backgroundColor: getColorHex(String(color)) }}></span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="w-full flex flex-col items-center py-6">
            <p className="font-sans font-normal text-black text-sm text-center">Показано {sortedAndFilteredProducts.length} товаров</p>
            {/* {currentCategory && <Link to="/catalogue" className="text-sm underline mt-2">View all products</Link>} */}
          </div>
        </div>
      </div>
    </div>
  );
}; 