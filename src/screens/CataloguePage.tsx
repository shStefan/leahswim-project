import { useState, useEffect, useMemo } from 'react';
import { Heart, ShoppingBag, Menu, X, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import { Link, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { useLikes } from '../context/LikesContext';
import { useCart } from '../context/CartContext';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import SelectedFiltersDisplay from '../components/SelectedFiltersDisplay';

import { DiscountPrice } from '../components/DiscountPrice';
import { DynamicText } from '../components/DynamicText';
import { useTranslation } from '../context/TranslationContext';
import { apiEndpoints } from '../utils/apiConfig';
import { getColorHex, sortSizes, slugifyColor } from '../utils/colorMap';
import { isProductHidden } from '../utils/hiddenProducts';
import { getActualPrice } from '../utils/priceHelpers';
import { convertAndFormatPrice } from '../utils/priceUtils';
import { savePageNumber, getPageNumber, clearPageNumber } from '../components/ScrollToTop';
import ProductImageCarousel from '../components/ProductImageCarousel';

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
  parent: number; // 0 for top-level categories, parent_id otherwise
  children?: Category[]; // For storing sub-categories
  count?: number; // Optional: number of products in this category
}

interface ProductVariation {
  id: number;
  attributes: Array<{ name: string; slug: string; option: string }>;
  image?: { src: string }; // Variation specific image
  price?: string; // Variation specific price, if different
  sku?: string;
  stock_status?: string; // 'instock', 'outofstock', 'onbackorder'
  // Add other variation-specific fields if needed
}

interface Product {
  id: number;
  name: string;
  slug?: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  price_html?: string; // HTML formatted price with discount display
  images: Array<{ src: string }>; // Main product images
  attributes?: Array<{
    name: string;
    slug: string;
    options: string[];
  }>;
  categories?: Array<{ id: number; name: string }>;
  status: string;
  type?: string; // To identify 'variable' products
  variations?: number[]; // WooCommerce often returns variation IDs here
  // Potentially, after fetching details:
  // detailedVariations?: ProductVariation[]; 
}

// This will be the type for the items we actually render as cards
interface DisplayableProduct {
  parentId: number; // ID of the parent product
  variationId?: number; // ID of the specific variation, if applicable
  name: string;
  price: string;
  regular_price?: string; // Original price before discount
  sale_price?: string; // Discounted price
  price_html?: string; // HTML formatted price with discount display
  imageSrc: string; // The image to display (variation image or fallback)
  attributes?: Array<{ name: string; slug: string; options: string[] }>; // Parent attributes for swatches
  variationAttributes?: Array<{ name: string; slug: string; option: string }>; // Specific attributes of this variation
  slug?: string; // Parent product slug for linking
  allColorOptions: string[]; // All available colors for the parent product (for swatches)
  selectedColorOption: string; // The color of THIS specific variation card
  colorStockStatus?: { [color: string]: boolean }; // Track which colors have stock available
  allSizeOptions?: string[]; // All available sizes for the parent product
  sizeStockStatus?: { [size: string]: boolean }; // Track which sizes have stock for this color
  status: string;
  categories?: Array<{ id: number; name: string }>;
  originalImages?: Array<{ src: string }>;
}


export const CataloguePage = (): JSX.Element => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const [displayableProducts, setDisplayableProducts] = useState<DisplayableProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState<Category[]>([]);
  const [allAvailableSizes, setAllAvailableSizes] = useState<string[]>([]);
  const [allAvailableColors, setAllAvailableColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Pagination state - try to restore from saved state
  const savedPage = getPageNumber(location.pathname);
  const [currentPage, setCurrentPage] = useState(savedPage || 1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const PRODUCTS_PER_PAGE = 12;
  const [mobileFilterDropdown, setMobileFilterDropdown] = useState<string | null>(null);
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<{ [key: string]: boolean }>({});
  const [expandedDesktopParentCategory, setExpandedDesktopParentCategory] = useState<number | null>(null);
  const [isLikesMenuOpen, setIsLikesMenuOpen] = useState(false);
  const { likedProducts, likedProductsCache, toggleLike } = useLikes();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug: categorySlugFromPath } = useParams<{ categorySlug?: string }>();
  const [sortOrder, setSortOrder] = useState<string>('');

  // WooCommerce API credentials
  const WC_CONSUMER_KEY = 'ck_084aa13e23a1accc48bc43802ffe9757f01005b4';
  const WC_CONSUMER_SECRET = 'cs_5001dac555fade564eeb29c4d95fb49ea973d6f5';
  const WC_API_URL = 'https://leahcation.ru/wp/wp-json/wc/v3';

  // Color mapping - using shared utility from colorMap.ts

  // Use the complete filter options fetched separately
  const allSizes = allAvailableSizes;
  const allColors = allAvailableColors;

  // Filter products based on selected filters
  const filteredProducts = displayableProducts.filter(product => {
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
        attr.slug?.startsWith('pa_print')
      );
      if (!colorAttr || !colorAttr.options?.includes(selectedColor)) return false;
    }
    // Size filter
    if (selectedSize) {
      const sizeAttr = product.attributes?.find((attr: any) =>
        attr.name.toLowerCase() === 'размер' ||
        attr.name.toLowerCase() === 'size' ||
        attr.slug?.startsWith('pa_size') ||
        attr.slug?.startsWith('pa_razmer')
      );
      if (!sizeAttr || !sizeAttr.options?.includes(selectedSize)) return false;
    }
    return true;
  });

  // Further sort the filtered products based on sortOrder
  const sortedAndFilteredProducts = useMemo(() => {
    let productsToSort = [...filteredProducts]; // Create a copy to sort
    if (sortOrder === 'price_asc') {
      productsToSort.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOrder === 'price_desc') {
      productsToSort.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }
    // If sortOrder is '' (Все) or any other value, no price sorting is applied here (original filter order is kept)
    return productsToSort;
  }, [filteredProducts, sortOrder]);

  // Effect to initialize filters from URL search params on mount
  // This will now primarily handle non-category filters from query params
  // Category is handled by categorySlugFromPath
  useEffect(() => {
    const initialSize = searchParams.get('size') || '';
    const initialColor = searchParams.get('color') || '';
    const initialSortOrder = searchParams.get('sort') || '';

    setSelectedSize(initialSize);
    setSelectedColor(initialColor);
    setSortOrder(initialSortOrder);

    // If there's a category slug from the path, it will be handled by the next useEffect
    // If not, and there was one in query (old behavior), it will be ignored for now to prioritize path.
    // Or, we could decide to fallback to searchParams if categorySlugFromPath is undefined.
    // For now, path takes precedence.

  }, [searchParams]);

  // Effect to convert category slug (from path) to ID once categories are loaded
  useEffect(() => {
    if (categorySlugFromPath && categories.length > 0) {
      const categoryObj = categories.find(cat => cat.slug === categorySlugFromPath);
      if (categoryObj) {
        setSelectedCategory(String(categoryObj.id));
      } else {
        setSelectedCategory('');
        console.warn(`Category slug "${categorySlugFromPath}" from URL path not found in loaded categories.`);
        // Optionally, redirect to a 404 page or a general catalogue if slug is invalid
      }
    } else if (!categorySlugFromPath) {
      // If no category slug in the path, ensure selectedCategory (ID) is cleared
      setSelectedCategory('');
    }
  }, [categorySlugFromPath, categories]);

  // Effect to update URL search params when filters change
  // Note: This currently only updates query parameters. If category changes, ideally the path should update.
  // This requires more complex navigation logic (e.g., using useNavigate).
  // For now, changing category via UI dropdown will set selectedCategory (ID) and filter client-side or re-fetch (if fetch depends on selectedCategory ID).
  // The path itself won't change from UI filter selections in this version.
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedSize) newParams.set('size', selectedSize);
    if (selectedColor) newParams.set('color', selectedColor);
    if (selectedCategory) {
      // Find the category slug for the selected ID to put in the URL if desired
      // For now, we are just using ID in state and params
      // const categoryObject = categories.find(c => String(c.id) === selectedCategory);
      // if (categoryObject) newParams.set('category', categoryObject.slug);
      newParams.set('category', selectedCategory); // Keep it simple with ID
    }
    if (sortOrder) newParams.set('sort', sortOrder);

    // Update URL only if params have changed
    if (newParams.toString() !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedSize, selectedColor, selectedCategory, sortOrder, setSearchParams, searchParams, categories]);

  // Go to specific page function for pagination
  const goToPage = (pageNumber: number) => {
    if (pageNumber !== currentPage && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      savePageNumber(location.pathname, pageNumber);
      // Scroll to top of products section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Save current page whenever it changes
  useEffect(() => {
    savePageNumber(location.pathname, currentPage);
  }, [currentPage, location.pathname]);

  // Removed bfcache reload - it was preventing scroll restoration

  const handleClearSize = () => {
    setSelectedSize('');
    setCurrentPage(1);
    clearPageNumber(location.pathname);
  };

  const handleClearColor = () => {
    setSelectedColor('');
    setCurrentPage(1);
    clearPageNumber(location.pathname);
  };

  const handleClearCategory = () => {
    setSelectedCategory('');
    setCurrentPage(1);
    clearPageNumber(location.pathname);
  };

  const handleClearAllCatalogueFilters = () => {
    setSelectedSize('');
    setSelectedColor('');
    setSelectedCategory('');
    setSortOrder('');
    setCurrentPage(1);
    clearPageNumber(location.pathname);
  };

  // Helper function to build hierarchy (can be outside component or memoized if needed)
  const buildCategoryHierarchy = (flatCategories: Category[]): Category[] => {
    const categoryMap: { [id: number]: Category } = {};
    const hierarchy: Category[] = [];

    // First, map all categories by their ID and initialize children arrays
    flatCategories.forEach(category => {
      categoryMap[category.id] = { ...category, children: [] };
    });

    // Then, build the hierarchy
    flatCategories.forEach(category => {
      const currentCategoryMapped = categoryMap[category.id];
      if (category.parent === 0) { // Top-level category
        hierarchy.push(currentCategoryMapped);
      } else { // Sub-category
        const parentCategoryMapped = categoryMap[category.parent];
        if (parentCategoryMapped) {
          if (!parentCategoryMapped.children) { // Should be initialized, but defensive check
            parentCategoryMapped.children = [];
          }
          parentCategoryMapped.children.push(currentCategoryMapped);
        } else {
          console.warn(`Parent category with ID ${category.parent} not found for category ${category.name}. Adding as top-level for now.`);
          hierarchy.push(currentCategoryMapped); // Fallback: add as top-level if parent is missing
        }
      }
    });
    return hierarchy;
  };

  // Fetch categories on mount
  useEffect(() => {
    (() => {
      const { url, options } = apiEndpoints.categories('per_page=100');
      return fetch(url, options);
    })()
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch categories: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Category[]) => {
        if (Array.isArray(data)) {
          setCategories(data); // Keep the flat list as it might be used by URL param logic for slugs
          const processedHierarchy = buildCategoryHierarchy(data);
          setHierarchicalCategories(processedHierarchy);
          console.log('Processed Hierarchical Categories:', processedHierarchy);
        } else {
          console.error('Categories data is not an array:', data);
          setCategories([]);
          setHierarchicalCategories([]);
        }
      })
      .catch(err => {
        console.error('Error fetching categories:', err);
        setCategories([]);
        setHierarchicalCategories([]);
      });
  }, []); // WC_API_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET are constants, no need to list as deps if defined outside component scope or stable.

  // Fetch all filter options (sizes and colors) 
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        console.log(`🎨 Fetching ALL filter options for catalogue`);

        // First, get the total count of products
        let countParams = `per_page=1&status=publish&_fields=id`;
        if (selectedCategory && categories.length > 0) {
          const categoryExists = categories.some(cat => String(cat.id) === selectedCategory);
          if (categoryExists) {
            countParams += `&category=${selectedCategory}`;
          }
        }

        const { url: countUrl, options: countOptions } = apiEndpoints.products(countParams);
        const countResponse = await fetch(countUrl, countOptions);

        if (!countResponse.ok) {
          console.warn('Failed to fetch product count for filters');
          return;
        }

        const totalItems = parseInt(countResponse.headers.get('X-WP-Total') || '100');
        console.log(`📊 Total products in catalogue: ${totalItems}`);

        // Now fetch ALL products to get complete filter options
        let filterParams = `per_page=${Math.min(totalItems, 500)}&status=publish&_fields=attributes`;

        if (selectedCategory && categories.length > 0) {
          const categoryExists = categories.some(cat => String(cat.id) === selectedCategory);
          if (categoryExists) {
            filterParams += `&category=${selectedCategory}`;
          }
        }

        const { url, options } = apiEndpoints.products(filterParams);
        const response = await fetch(url, options);

        if (!response.ok) {
          console.warn('Failed to fetch filter options');
          return;
        }

        const products: Product[] = await response.json();
        console.log(`✅ Fetched ${products.length} products for filter options`);

        // Extract all unique sizes and colors
        const sizesSet = new Set<string>();
        const colorsSet = new Set<string>();

        products.forEach(product => {
          const sizeAttr = product.attributes?.find(attr =>
            attr.slug?.startsWith('pa_size') ||
            attr.slug?.startsWith('pa_razmer') ||
            attr.name.toLowerCase() === 'размер' ||
            attr.name.toLowerCase() === 'size'
          );
          const colorAttr = product.attributes?.find(attr =>
            attr.slug?.startsWith('pa_print') ||
            attr.name.toLowerCase() === 'принт' ||
            attr.name.toLowerCase() === 'print'
          );

          sizeAttr?.options?.forEach(size => sizesSet.add(size));
          colorAttr?.options?.forEach(color => colorsSet.add(color));
        });

        const sizes = Array.from(sizesSet).filter(Boolean);
        const colors = Array.from(colorsSet).filter(Boolean);

        setAllAvailableSizes(sizes);
        setAllAvailableColors(colors);

        console.log(`✅ Filter options loaded: ${sizes.length} sizes, ${colors.length} colors`);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    // Only fetch filter options when category changes, NOT on page changes
    if (categories.length > 0 || !categorySlugFromPath) {
      fetchFilterOptions();
    }
  }, [selectedCategory, categories, categorySlugFromPath]); // Removed currentPage and API constants

  // Fetch products and their variations
  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchProductsAndVariations = async () => {
      try {
        let params = `per_page=${PRODUCTS_PER_PAGE}&page=${currentPage}&status=publish`;

        // selectedCategory should now be an ID if categorySlugFromPath was valid and categories loaded.
        if (selectedCategory && categories.length > 0) {
          const categoryExists = categories.some(cat => String(cat.id) === selectedCategory);
          if (categoryExists) {
            params += `&category=${selectedCategory}`;
            console.log(`Fetching products for category ID: ${selectedCategory} (from path or selection)`);
          } else {
            // This case should ideally not be hit if selectedCategory is set carefully after slug resolution.
            console.warn(`Selected category ID "${selectedCategory}" does not exist. Fetching all products.`);
          }
        } else if (categorySlugFromPath && categories.length === 0) {
          // Still waiting for categories to load to resolve the slug from path.
          console.log('Category slug from path present, but categories not yet loaded. Product fetch will wait.');
          return; // Wait for categories to load, this effect will re-run.
        }
        // If no selectedCategory ID (e.g. no slug in path, or slug was invalid), fetch all products.

        console.log('Final products API params:', params);

        // 1. Fetch base products
        const { url, options } = apiEndpoints.products(params);
        const productsResponse = await fetch(url, options);

        if (!productsResponse.ok) {
          const errorText = await productsResponse.text();
          throw new Error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}. ${errorText}`);
        }
        const baseProducts: Product[] = await productsResponse.json();

        // Get total pages from response headers
        const totalPagesHeader = productsResponse.headers.get('X-WP-TotalPages');
        const totalItemsHeader = productsResponse.headers.get('X-WP-Total');

        console.log('📊 Catalogue pagination headers:', {
          totalPagesHeader,
          totalItemsHeader,
          currentPage
        });

        if (totalPagesHeader) {
          const pages = parseInt(totalPagesHeader);
          setTotalPages(pages);
          console.log(`✅ Total pages from header: ${pages}`);
        } else if (totalItemsHeader) {
          // Calculate total pages from total items if header is available
          const totalItems = parseInt(totalItemsHeader);
          const calculatedPages = Math.ceil(totalItems / PRODUCTS_PER_PAGE);
          setTotalPages(calculatedPages);
          console.log(`✅ Calculated total pages: ${calculatedPages} (${totalItems} items / ${PRODUCTS_PER_PAGE} per page)`);
        } else if (baseProducts.length === PRODUCTS_PER_PAGE) {
          // If we got a full page, there's likely more pages
          setTotalPages(Math.max(2, currentPage + 1));
          console.log(`⚠️ No pagination headers found, but got full page. Setting totalPages to ${Math.max(2, currentPage + 1)}`);
        }

        if (!Array.isArray(baseProducts)) {
          console.error('Fetched base products data is not an array:', baseProducts);
          throw new Error('Received invalid base product data from server.');
        }

        console.log('Fetched WooCommerce base products:', baseProducts);

        // Debug: Check first product for discount fields
        if (baseProducts.length > 0) {
          const firstProduct = baseProducts[0];
          console.log('🔍 API Response Debug - First Product:', {
            id: firstProduct.id,
            name: firstProduct.name,
            price: firstProduct.price,
            regular_price: firstProduct.regular_price,
            sale_price: firstProduct.sale_price,
            price_html: firstProduct.price_html,
            hasDiscountFields: {
              regular_price: 'regular_price' in firstProduct,
              sale_price: 'sale_price' in firstProduct,
              price_html: 'price_html' in firstProduct
            }
          });
        }

        const processedDisplayableProducts: DisplayableProduct[] = [];

        // 2. Identify variable products and fetch their detailed variations
        const variationPromises = baseProducts.map(async (product) => {
          // Skip hidden products
          if (isProductHidden(product.id)) return;

          // Ensure product.images is an array, default to empty if not
          const productImages = Array.isArray(product.images) ? product.images : [];

          // Extract all color options for the parent product
          const parentColorAttribute = product.attributes?.find(
            (attr) => attr.name.toLowerCase() === 'принт' || attr.name.toLowerCase() === 'print' || attr.slug?.startsWith('pa_print')
          );
          const allParentColors = parentColorAttribute?.options || [];

          if (product.type === 'variable' && product.variations && product.variations.length > 0) {
            try {
              const { url: variationsUrl, options: variationsOptions } = apiEndpoints.variations(product.id.toString(), 'per_page=100');
              const variationsResponse = await fetch(variationsUrl, variationsOptions);
              if (!variationsResponse.ok) {
                console.warn(`Failed to fetch variations for product ${product.id}: ${variationsResponse.status}. Skipping this product's variations.`);
                const displayableProduct = {
                  parentId: product.id,
                  name: product.name,
                  price: product.price,
                  regular_price: product.regular_price,
                  sale_price: product.sale_price,
                  price_html: product.price_html,
                  imageSrc: productImages[0]?.src || '/placeholder.png',
                  attributes: product.attributes,
                  slug: product.slug,
                  allColorOptions: allParentColors,
                  selectedColorOption: allParentColors[0] || '',
                  status: product.status,
                  categories: product.categories,
                  originalImages: productImages,
                };



                processedDisplayableProducts.push(displayableProduct);
                // return null; // No longer in a map, so just continue to next product or finish
              } else {
                const detailedVariations: ProductVariation[] = await variationsResponse.json();
                console.log(`Fetched variations for product ${product.id}:`, detailedVariations);

                if (Array.isArray(detailedVariations) && detailedVariations.length > 0) {
                  const variationsByColor: { [color: string]: ProductVariation[] } = {};

                  detailedVariations.forEach(variation => {
                    const varAttributes = Array.isArray(variation.attributes) ? variation.attributes : [];
                    const colorAttribute = varAttributes.find(
                      (attr: { name: string; slug: string; option: string }) =>
                        attr.slug?.startsWith('pa_print') || attr.name.toLowerCase() === 'принт' || attr.name.toLowerCase() === 'print'
                    );
                    if (colorAttribute && colorAttribute.option) {
                      if (!variationsByColor[colorAttribute.option]) {
                        variationsByColor[colorAttribute.option] = [];
                      }
                      variationsByColor[colorAttribute.option].push(variation);
                    } else {
                      console.warn(`Variation ${variation.id} for product ${product.id} has no identifiable color attribute. Will not be displayed as a separate color card.`, variation);
                    }
                  });

                  // Build colorStockStatus map: a color is in stock if at least one variation has stock_status === 'instock'
                  const colorStockStatus: { [color: string]: boolean } = {};
                  Object.entries(variationsByColor).forEach(([color, variations]) => {
                    colorStockStatus[color] = variations.some(v => v.stock_status === 'instock');
                  });

                  // Get all available sizes from parent product attributes
                  const sizeAttribute = product.attributes?.find(
                    (attr: { name: string; slug: string }) =>
                      attr.slug?.startsWith('pa_razmer') ||
                      attr.slug?.startsWith('pa_size') ||
                      attr.name?.toLowerCase() === 'размер' ||
                      attr.name?.toLowerCase() === 'size'
                  );
                  const allParentSizes: string[] = sizeAttribute?.options || [];
                  console.log(`📏 Product ${product.id} size data:`, { sizeAttribute, allParentSizes, allAttributes: product.attributes });

                  if (Object.keys(variationsByColor).length > 0) {
                    Object.entries(variationsByColor).forEach(([color, variationsInGroup]) => {
                      // Skip colors where ALL variations are out of stock
                      const hasAnyInStock = variationsInGroup.some(v => v.stock_status === 'instock');
                      if (!hasAnyInStock) return;

                      const representativeVariation = variationsInGroup[0]; // Use the first variation for this color

                      // Build sizeStockStatus for this specific color
                      const sizeStockStatus: { [size: string]: boolean } = {};
                      variationsInGroup.forEach(variation => {
                        const sizeAttr = variation.attributes?.find(
                          (attr: { name: string; slug: string; option: string }) =>
                            attr.slug?.startsWith('pa_razmer') ||
                            attr.slug?.startsWith('pa_size') ||
                            attr.name?.toLowerCase() === 'размер' ||
                            attr.name?.toLowerCase() === 'size'
                        );
                        if (sizeAttr?.option) {
                          if (variation.stock_status === 'instock') {
                            sizeStockStatus[sizeAttr.option] = true;
                          } else if (sizeStockStatus[sizeAttr.option] === undefined) {
                            sizeStockStatus[sizeAttr.option] = false;
                          }
                        }
                      });

                      processedDisplayableProducts.push({
                        parentId: product.id,
                        variationId: representativeVariation.id,
                        name: product.name,
                        price: representativeVariation.price || product.price,
                        // Use parent product's discount data for all variations
                        regular_price: product.regular_price, // Always use parent's pricing
                        sale_price: product.sale_price,       // Always use parent's pricing
                        price_html: product.price_html,       // Always use parent's discount HTML
                        imageSrc: representativeVariation.image?.src || productImages[0]?.src || '/placeholder.png',
                        attributes: product.attributes,
                        variationAttributes: representativeVariation.attributes,
                        slug: product.slug,
                        allColorOptions: allParentColors,
                        selectedColorOption: color,
                        colorStockStatus, // Add stock status for all colors
                        allSizeOptions: allParentSizes, // Add all available sizes
                        sizeStockStatus, // Add size stock status for this color
                        status: product.status,
                        categories: product.categories,
                        originalImages: (() => {
                          // Build enriched gallery: parent images + all variation images for this color
                          const gallerySet = new Set<string>();
                          productImages.forEach(img => { if (img.src) gallerySet.add(img.src); });
                          variationsInGroup.forEach(v => { if (v.image?.src) gallerySet.add(v.image.src); });
                          return Array.from(gallerySet).map(src => ({ src }));
                        })(),
                      });
                    });
                  } else {
                    console.warn(`Product ${product.id} is variable, but no color-specific variations were processed. Adding parent product as a single card.`);
                    processedDisplayableProducts.push({
                      parentId: product.id,
                      name: product.name,
                      price: product.price,
                      regular_price: product.regular_price,
                      sale_price: product.sale_price,
                      price_html: product.price_html,
                      imageSrc: productImages[0]?.src || '/placeholder.png',
                      attributes: product.attributes,
                      slug: product.slug,
                      allColorOptions: allParentColors,
                      selectedColorOption: allParentColors[0] || '',
                      status: product.status,
                      categories: product.categories,
                      originalImages: productImages,
                    });
                  }
                } else {
                  console.warn(`Product ${product.id} is variable, but detailedVariations array is empty or invalid. Adding parent product as a single card.`);
                  processedDisplayableProducts.push({
                    parentId: product.id,
                    name: product.name,
                    price: product.price,
                    regular_price: product.regular_price,
                    sale_price: product.sale_price,
                    price_html: product.price_html,
                    imageSrc: productImages[0]?.src || '/placeholder.png',
                    attributes: product.attributes,
                    slug: product.slug,
                    allColorOptions: allParentColors,
                    selectedColorOption: allParentColors[0] || '',
                    status: product.status,
                    categories: product.categories,
                    originalImages: productImages,
                  });
                }
              }
            } catch (varError) {
              console.error(`Error fetching or processing variations for product ${product.id}:`, varError);
              processedDisplayableProducts.push({
                parentId: product.id,
                name: product.name,
                price: product.price,
                regular_price: product.regular_price,
                sale_price: product.sale_price,
                price_html: product.price_html,
                imageSrc: productImages[0]?.src || '/placeholder.png',
                attributes: product.attributes,
                slug: product.slug,
                allColorOptions: allParentColors,
                selectedColorOption: allParentColors[0] || '',
                status: product.status,
                categories: product.categories,
                originalImages: productImages,
              });
            }
          } else {
            // It's a simple product or a variable product without variations array (or variations disabled)
            // Add the product itself as a displayable product
            processedDisplayableProducts.push({
              parentId: product.id,
              name: product.name,
              price: product.price,
              regular_price: product.regular_price,
              sale_price: product.sale_price,
              price_html: product.price_html,
              imageSrc: productImages[0]?.src || '/placeholder.png',
              attributes: product.attributes,
              slug: product.slug,
              allColorOptions: allParentColors,
              selectedColorOption: allParentColors[0] || '', // Or handle products with no color attribute
              status: product.status,
              categories: product.categories,
              originalImages: productImages,
            });
          }
          return null; // map function expects a return
        });

        await Promise.allSettled(variationPromises);

        // Filter out duplicates that might arise if a parent product was added AND its variations were also added successfully.
        // This is a basic de-duplication based on imageSrc and name, might need refinement based on how variations are structured.
        // A better approach is to ensure the logic above doesn't add the parent if variations are successfully processed.
        // The current logic for pushing parent product on variation fetch failure is one source.
        // The core idea: one card per *color* variation. If simple product, one card.

        // Refined approach to avoid duplicates:
        // The `processedDisplayableProducts` array is built by iterating through base products.
        // If a product is variable and variations are fetched, its variations are added.
        // If it's simple, or if fetching variations fails, the base product itself is added.
        // This should inherently prevent adding both a parent and its variations from the same loop iteration.

        console.log('Processed Displayable Products before setting state:', processedDisplayableProducts);

        // Ensure products are valid before setting
        const validDisplayableProducts = processedDisplayableProducts.filter(p => p && p.name && p.price && p.status === 'publish');

        setDisplayableProducts(validDisplayableProducts);

      } catch (err: any) {
        console.error('Error in fetchProductsAndVariations (main catch block):', err);
        setError(err.message || 'Failed to load products and variations');
        setDisplayableProducts([]); // Clear products on error
      } finally {
        setLoading(false);
      }
    };

    // This helps ensure that if a category is in the URL, we use its ID for fetching.
    // It also ensures that if no category is in the path, we fetch all products (or based on other filters).
    if ((categorySlugFromPath && categories.length > 0 && selectedCategory) || !categorySlugFromPath) {
      fetchProductsAndVariations();
    } else if (categorySlugFromPath && categories.length === 0) {
      console.log("Product fetch is waiting for categories to load to resolve URL path category slug.");
      // setLoading might be true already, or manage a specific "loading categories" state.
    } else if (categorySlugFromPath && categories.length > 0 && !selectedCategory) {
      console.log("Category slug from path was invalid or not found. Fetching all products or handling as error.");
      // Potentially fetch all or show an error specific to invalid category slug.
      // For now, allows fallback to fetching all if selectedCategory didn't get set.
      fetchProductsAndVariations(); // Or handle error: setError("Invalid category specified in URL"); setLoading(false);
    }

  }, [selectedCategory, categories, categorySlugFromPath, currentPage, WC_API_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET]); // Updated dependencies

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
    { name: "One-piece", image: "/onepiece.png" },
  ];



  // Add to cart handler
  const handleAddToCart = async (product: DisplayableProduct) => {
    // The product object itself is passed now
    if (!product) return;

    const itemDetails = {
      id: String(product.variationId || product.parentId), // Use variationId if available, else parentId
      parentId: product.variationId ? String(product.parentId) : undefined, // Pass parentId only if it's a variation
      title: product.name,
      unit_price: getActualPrice(product), // Use discounted price if available
      thumbnail: product.imageSrc || '/placeholder.png',
      // Include discount information for checkout validation
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      price_html: product.price_html
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
  function FilterDropdown({
    label,
    options,
    categoryItems,
    selected,
    onSelect,
    id,
    alignRight = false,
    expandedParentId,
    onToggleParentExpand
  }: {
    label: string,
    options?: string[],
    categoryItems?: Category[],
    selected: string,
    onSelect: (val: string) => void,
    id: string,
    alignRight?: boolean,
    expandedParentId?: number | null,
    onToggleParentExpand?: (categoryId: number) => void
  }) {
    const safeOptions = Array.isArray(options) ? options : [];

    const renderCategoryItems = (items: Category[], level = 0) => {
      // Filter out categories with 0 products
      const filteredItems = items.filter(category => {
        const hasProducts = (category.count || 0) > 0;
        const hasChildrenWithProducts = category.children?.some(child => (child.count || 0) > 0);
        return hasProducts || hasChildrenWithProducts;
      });

      return filteredItems.map((category) => (
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
            <span>
              <DynamicText text={category.name} />
            </span>
            {level === 0 && category.children && category.children.length > 0 && (
              <ChevronDown
                className={`ml-2 w-4 h-4 transform transition-transform duration-200 flex-shrink-0 ${expandedParentId === category.id ? 'rotate-180' : ''}`}
              />
            )}
          </div>
          {level === 0 && category.children && category.children.length > 0 && expandedParentId === category.id && (
            <div className="pl-2 border-l border-gray-200">
              {renderCategoryItems(category.children, level + 1)}
            </div>
          )}
          {level > 0 && category.children && category.children.length > 0 && (
            <div className="ml-2 border-l border-gray-200">
              {renderCategoryItems(category.children, level + 1)}
            </div>
          )}
        </div>
      ));
    };

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
              ` bg-white/90 border border-gray-100 rounded-2xl shadow-2xl z-30 backdrop-blur ${id === 'color' ? 'w-[160px]' : id === 'style' ? 'min-w-[200px]' : 'min-w-[50px]'}` // Adjusted width for style
            }
            style={{ maxHeight: '400px', overflowY: 'auto' }} // Added maxHeight and scroll for long lists
            onMouseDown={e => e.stopPropagation()}
          >
            <div // "Все" option container
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-center border-b border-gray-200"
              onClick={() => { onSelect(''); setOpenDropdown(null); }}
              style={{ fontWeight: !selected ? 'bold' : 'normal' }}
            >
              {t('common.all')}
            </div>

            {id === 'color' ? (
              <div className="flex flex-wrap gap-1 p-2 justify-start"> {/* Swatches container */}
                {safeOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    title={opt}
                    className="w-6 h-6 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-black hover:border-black transition-colors"
                    style={{ backgroundColor: getColorHex(opt) }}
                    onClick={() => { onSelect(opt); setOpenDropdown(null); }}
                  />
                ))}
              </div>
            ) : id === 'style' && categoryItems ? (
              renderCategoryItems(categoryItems)
            ) : (
              safeOptions.map((opt) => (
                <div
                  key={opt}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm flex items-center"
                  onClick={() => { onSelect(opt); setOpenDropdown(null); }}
                  style={{ fontWeight: selected === opt ? 'bold' : 'normal' }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // Recursive function to render category items for mobile filter drawer
  const renderMobileCategoryItems = (items: Category[], level = 0): JSX.Element[] => {
    // Filter out categories with 0 products
    const filteredItems = items.filter(category => {
      const hasProducts = (category.count || 0) > 0;
      const hasChildrenWithProducts = category.children?.some(child => (child.count || 0) > 0);
      return hasProducts || hasChildrenWithProducts;
    });

    return filteredItems.map((category) => (
      <div key={category.id} className="flex flex-col w-full">
        <div
          className={`flex items-center justify-between w-full py-2 text-left text-xs ${level > 0 ? 'pl-4' : ''} ${selectedCategory === String(category.id) ? 'font-bold text-black' : 'text-gray-700'}`}
          onClick={() => {
            if (category.children && category.children.length > 0) {
              setExpandedMobileCategories(prev => ({ ...prev, [category.id]: !prev[category.id] }));
            }
            // Allow selecting a parent category even if it has children
            setSelectedCategory(selectedCategory === String(category.id) ? '' : String(category.id));
            // Do not close the main drawer or style dropdown here, allow further interaction
            // setIsFilterDrawerOpen(false); 
            // setMobileFilterDropdown(null);
          }}
        >
          <span className="flex-1 truncate">
            <DynamicText text={category.name} />
          </span>
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

  const skeletonDelays = ['delay-0', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500'];

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <div className="w-full">
          {/* Header REMOVED - Now uses global header from App.tsx */}

          <div className="w-full mt-0 pb-20">
            {/* Category selection */}
            <div className="w-full flex justify-center mb-0 pt-20 md:pt-[80px] pb-[40px]">
              <div className="flex flex-row items-center justify-center space-x-8">
                {categoriesData.map((category, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-[60px] md:h-[120px] object-contain"
                    />
                    <DynamicText
                      text={category.name}
                      tag="p"
                      className="font-sans mt-3 font-normal text-[#000000d9] text-xs md:text-sm tracking-[0] leading-[18px] text-center"
                    />
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
                  label={t('common.size').toUpperCase()}
                  options={allSizes}
                  selected={selectedSize}
                  onSelect={val => { console.log('Selected size:', val); setSelectedSize(val); setCurrentPage(1); }}
                  id="size"
                  alignRight
                />
                <FilterDropdown
                  label={t('common.color').toUpperCase()}
                  options={allColors}
                  selected={selectedColor}
                  onSelect={val => { console.log('Selected color:', val); setSelectedColor(val); setCurrentPage(1); }}
                  id="color"
                  alignRight
                />
                <FilterDropdown
                  label={t('nav.category', 'Категория')}
                  categoryItems={hierarchicalCategories}
                  selected={selectedCategory}
                  onSelect={val => {
                    setSelectedCategory(val);
                  }}
                  id="style"
                  alignRight
                  expandedParentId={expandedDesktopParentCategory}
                  onToggleParentExpand={(categoryId) => {
                    setExpandedDesktopParentCategory(prevId => prevId === categoryId ? null : categoryId);
                  }}
                />
              </div>

              {/* Sort button on the right */}
              <div className="flex items-center">
                <FilterDropdown
                  label={t('common.sort')}
                  options={[t('common.priceAscending'), t('common.priceDescending')]}
                  selected={sortOrder === 'price_asc' ? t('common.priceAscending') : sortOrder === 'price_desc' ? t('common.priceDescending') : ''}
                  onSelect={(val) => {
                    if (val === t('common.priceAscending')) { setSortOrder('price_asc'); setCurrentPage(1); }
                    else if (val === t('common.priceDescending')) { setSortOrder('price_desc'); setCurrentPage(1); }
                    else { setSortOrder(''); setCurrentPage(1); } // Corresponds to "Все"
                  }}
                  id="sort"
                  alignRight={false}
                />
              </div>
            </div>

            {/* Selected Filters Display Area */}
            {(selectedSize || selectedColor || selectedCategory) && (
              <div className="mb-4 md:mb-6">
                <SelectedFiltersDisplay
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  selectedCategory={selectedCategory}
                  categories={categories} // Pass all categories for name lookups
                  onClearSize={handleClearSize}
                  onClearColor={handleClearColor}
                  onClearCategory={handleClearCategory}
                  onClearAll={handleClearAllCatalogueFilters}
                // subCategories and onClearSubCategory are not used here
                />
              </div>
            )}

            {/* Mobile Filter/Sort Bar */}
            <div className="flex md:hidden flex-row items-center justify-between mb-0 py-2" style={{ minHeight: 48 }}>
              <button
                className="flex items-center pl-6 py-2 text-xs font-bold uppercase tracking-wider bg-transparent"
                onClick={() => setIsFilterDrawerOpen(true)}
              >
                {t('common.filters')}
                <FilterIcon className="ml-2 w-4 h-4" />
              </button>
              <div className="flex items-center pr-6">
                <FilterDropdown
                  label={t('common.sort')}
                  options={[t('common.priceAscending'), t('common.priceDescending')]}
                  selected={sortOrder === 'price_asc' ? t('common.priceAscending') : sortOrder === 'price_desc' ? t('common.priceDescending') : ''}
                  onSelect={(val) => {
                    if (val === t('common.priceAscending')) { setSortOrder('price_asc'); setCurrentPage(1); }
                    else if (val === t('common.priceDescending')) { setSortOrder('price_desc'); setCurrentPage(1); }
                    else { setSortOrder(''); setCurrentPage(1); } // Corresponds to "Все"
                  }}
                  id="sort-mobile"
                  alignRight={false}
                />
              </div>
            </div>
            {/* Divider below filter bar (added) */}
            <div className="w-full h-px bg-gray-100 mb-1" />

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
                        {t('common.size')}{selectedSize ? ` (${selectedSize})` : ''}
                        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${mobileFilterDropdown === 'size' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileFilterDropdown === 'size' && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">
                          {allSizes.map(size => (
                            <button
                              key={size}
                              className={`border px-2 py-1 rounded text-xs ${selectedSize === size ? 'bg-black text-white' : 'bg-white text-black'}`}
                              onClick={() => { setSelectedSize(selectedSize === size ? '' : size); setCurrentPage(1); }}
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
                        {t('common.color')}
                        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${mobileFilterDropdown === 'color' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileFilterDropdown === 'color' && (
                        <div className="flex flex-wrap gap-2 mt-1 px-1 pb-1">
                          {allColors.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black ${selectedColor === color ? 'border-black ring-2 ring-black ring-offset-1' : 'border-gray-300'}`}
                              style={{ backgroundColor: getColorHex(color) }}
                              onClick={() => { setSelectedColor(selectedColor === color ? '' : color); setCurrentPage(1); }}
                              title={color}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Style Dropdown */}
                    <div>
                      <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b border-gray-100" onClick={() => setMobileFilterDropdown(mobileFilterDropdown === 'style' ? null : 'style')}>
                        {t('nav.category')}{hierarchicalCategories.find((cat: Category) => cat.id === parseInt(selectedCategory))?.name ? ` (${hierarchicalCategories.find((cat: Category) => cat.id === parseInt(selectedCategory))?.name})` : ''}
                        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${mobileFilterDropdown === 'style' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileFilterDropdown === 'style' && (
                        <div className="flex flex-col items-start gap-0 mt-1 px-1 pb-1">
                          <button // "Все" option for mobile categories
                            className={`w-full py-2 text-left text-xs ${!selectedCategory ? 'font-bold text-black' : 'text-gray-700'}`}
                            onClick={() => {
                              setSelectedCategory('');
                              // setIsFilterDrawerOpen(false); // Decide if selecting "Все" should close the drawer
                              // setMobileFilterDropdown(null);
                            }}
                          >
                            {t('common.allCategories')}
                          </button>
                          {renderMobileCategoryItems(hierarchicalCategories)}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show Results Button */}
                  <button
                    className="mt-6 w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded"
                    onClick={() => setIsFilterDrawerOpen(false)}
                  >
                    Show Results
                  </button>
                  <button
                    className="mt-2 w-full text-center text-black underline text-xs"
                    onClick={() => { setSelectedSize(''); setSelectedColor(''); setSelectedCategory(''); setCurrentPage(1); }}
                  >
                    {t('common.clearAll')}
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
                  {sortedAndFilteredProducts.map((product, idx) => {
                    const isLastCol = ((idx + 1) % 3 === 0);
                    const isLastRow = idx >= sortedAndFilteredProducts.length - (sortedAndFilteredProducts.length % 3 || 3);
                    const uniqueKey = product.variationId ? `var-${product.variationId}` : `prod-${product.parentId}`;
                    // Construct the link to the product page, ensuring the selected color of this card is passed as a query param
                    const productLink = `/product/${product.parentId}?print=${slugifyColor(product.selectedColorOption)}`;

                    return (
                      <div
                        key={uniqueKey} // Updated key
                        className={
                          (isLastCol ? '' : 'border-r border-gray-100') +
                          (isLastRow ? '' : ' border-b border-gray-100')
                        }
                      >
                        <div className="relative">
                          {/* Product Media (Swipeable Image Carousel) */}
                          <ProductImageCarousel
                            product={product}
                            productLink={productLink}
                          />
                          {/* Product Info */}
                          <div className="mt-2 pl-2 pr-2 pb-2 md:pl-3 md:pr-3 md:pb-3">
                            <Link
                              to={productLink} // Updated link
                              state={{ parentProductId: product.parentId, selectedColor: product.selectedColorOption, productData: product }} // Updated state
                              className="block"
                            >
                              <div className="flex items-center justify-between w-full">
                                <DynamicText
                                  text={product.name}
                                  tag="h3"
                                  className="font-sans text-xs md:text-sm font-normal text-black"
                                />
                                {/* Heart Icon for Likes */}
                                <button
                                  className="ml-2 p-1 text-gray-500 hover:text-red-600 flex-shrink-0"
                                  aria-label="Like"
                                  onClick={e => {
                                    e.preventDefault();
                                    const productDetailsToCache = {
                                      id: product.variationId || product.parentId,
                                      parentId: product.parentId,
                                      name: product.name,
                                      price: product.price,
                                      images: [{ src: product.imageSrc }]
                                    };
                                    toggleLike(product.variationId || product.parentId, productDetailsToCache);
                                  }}
                                >
                                  <Heart
                                    size={20}
                                    fill={likedProducts.includes(product.variationId || product.parentId) ? 'black' : 'none'}
                                    stroke={likedProducts.includes(product.variationId || product.parentId) ? 'black' : 'currentColor'}
                                  />
                                </button>
                              </div>
                              <DiscountPrice
                                price={product.price}
                                regularPrice={product.regular_price}
                                salePrice={product.sale_price}
                                priceHtml={product.price_html}
                              />
                              {/* Debug: Check if we have price_html data */}
                              {process.env.NODE_ENV === 'development' && (
                                <div style={{ fontSize: '10px', color: 'red', marginTop: '2px' }}>
                                  price_html: {product.price_html ? '✅ YES' : '❌ NO'}
                                </div>
                              )}
                            </Link>
                            {/* Color Swatches */}
                            <div className="mt-2 flex items-center space-x-1">
                              {(product.allColorOptions || []).map((color, idx) => {
                                const isInStock = product.colorStockStatus?.[color] === true;
                                if (!isInStock) return null; // Hide out-of-stock colors entirely

                                return (
                                  <Link
                                    key={idx}
                                    to={`/product/${product.parentId}?print=${slugifyColor(String(color))}`}
                                    className="inline-block"
                                    title={String(color)}
                                  >
                                    <span
                                      className={`block w-4 h-4 rounded-full border transition-colors ${product.selectedColorOption === color
                                        ? 'ring-1 ring-offset-1 ring-black border-gray-300'
                                        : 'border-gray-300 hover:border-black'
                                        }`}
                                      style={{ backgroundColor: getColorHex(String(color)) }}
                                    />
                                  </Link>
                                );
                              })}
                            </div>
                          </div>

                          {/* Size swatches */}
                          {product.allSizeOptions && product.allSizeOptions.length > 0 && (
                            <div className="mt-1">
                              <div className="flex flex-wrap gap-1">
                                {sortSizes(product.allSizeOptions).map((size: string, idx: number) => {
                                  const isSizeInStock = product.sizeStockStatus?.[size] === true;

                                  return isSizeInStock ? (
                                    <Link
                                      key={idx}
                                      to={`/product/${product.parentId}?print=${slugifyColor(product.selectedColorOption)}&size=${encodeURIComponent(size)}`}
                                      className="px-1.5 py-0.5 text-[10px] border rounded border-gray-300 bg-white text-gray-700 hover:border-black transition-colors"
                                      title={size}
                                    >
                                      {size}
                                    </Link>
                                  ) : (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 text-[10px] border rounded border-gray-200 bg-white text-gray-300 line-through cursor-not-allowed"
                                      title={`${size} \u2014 out of stock`}
                                    >
                                      {size}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Product count and Pagination */}
            <div className="w-full flex flex-col items-center py-6">
              <p className="font-sans font-normal text-black text-sm text-center">
                {t('common.showingProducts').replace('{count}', sortedAndFilteredProducts.length.toString())}
              </p>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1;

                    // Show ellipsis
                    if (!showPage) {
                      if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="px-2">...</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        disabled={loading}
                        className={`min-w-[32px] px-3 py-1 text-sm border rounded transition-colors ${currentPage === pageNum
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:bg-gray-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              )}
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
              likedProducts.map((id) => {
                const cachedProduct = likedProductsCache[id];
                if (!cachedProduct) return null;
                return (
                  <div key={id}>
                    <div className="flex items-center gap-4 py-2">
                      <img
                        src={cachedProduct.images?.[0]?.src || '/placeholder.png'}
                        alt={cachedProduct.name}
                        className="w-12 h-12 object-cover rounded-lg border"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-black">{cachedProduct.name}</span>
                          <button
                            className="ml-2 p-1 text-black hover:text-black"
                            aria-label="Unlike"
                            onClick={() => toggleLike(id)}
                          >
                            <Heart className="w-5 h-5" style={{ fill: 'black', stroke: 'black' }} />
                          </button>
                        </div>
                        <span className="text-xs text-gray-600">{cachedProduct.price ? convertAndFormatPrice(cachedProduct.price) : 'Price not available'}</span>
                      </div>
                    </div>
                    {id !== likedProducts[likedProducts.length - 1] && <div className="w-full h-px bg-gray-200 my-1" />}
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