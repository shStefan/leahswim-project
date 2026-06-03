import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Heart, ShoppingBag, Menu, X, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useLikes } from '../context/LikesContext';
import { useCart } from '../context/CartContext';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import SelectedFiltersDisplay from '../components/SelectedFiltersDisplay';

import { DiscountPrice } from '../components/DiscountPrice';
import { DynamicText } from '../components/DynamicText';
import { useTranslation } from '../context/TranslationContext';
import { apiEndpoints } from '../utils/apiConfig';
import { getActualPrice } from '../utils/priceHelpers';
import { savePageNumber, getPageNumber, clearPageNumber } from '../components/ScrollToTop';
import ProductImageCarousel from '../components/ProductImageCarousel';
import { getColorHex, sortSizes, slugifyColor } from '../utils/colorMap';
import { isProductHidden } from '../utils/hiddenProducts';

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
  stock_status?: string;
}

interface Product {
  id: number;
  name: string;
  slug?: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  price_html?: string; // HTML formatted price with discount display
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
  regular_price?: string; // Original price before discount
  sale_price?: string; // Discounted price
  price_html?: string; // HTML formatted price with discount display
  imageSrc: string;
  attributes?: Array<{ name: string; slug: string; options: string[] }>;
  variationAttributes?: Array<{ name: string; slug: string; option: string }>;
  slug?: string;
  allColorOptions: string[];
  selectedColorOption: string;
  availableSizesForThisColor?: string[]; // ALL sizes for this color (in-stock + OOS)
  sizeStockStatus?: { [size: string]: boolean }; // Track which sizes are in stock for this color
  colorStockStatus?: { [color: string]: boolean }; // Track which colors have stock
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
  const { t } = useTranslation();
  const location = useLocation();

  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [subCategoriesForFilter, setSubCategoriesForFilter] = useState<Category[]>([]);
  const [subCategoryProductCounts, setSubCategoryProductCounts] = useState<{ [categoryId: string]: number }>({});
  const [allProductsForCategory, setAllProductsForCategory] = useState<DisplayableProduct[]>([]); // Store ALL products for the main category
  const [displayableProducts, setDisplayableProducts] = useState<DisplayableProduct[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allAvailableSizes, setAllAvailableSizes] = useState<string[]>([]);
  const [allAvailableColors, setAllAvailableColors] = useState<string[]>([]);
  // Store mapping of color names to slugs for API filtering
  const [colorNameToSlug, setColorNameToSlug] = useState<{ [name: string]: string }>({});
  const [sizeNameToSlug, setSizeNameToSlug] = useState<{ [name: string]: string }>({});

  const [loading, setLoading] = useState(true);
  const [loadingAllProducts, setLoadingAllProducts] = useState(false); // Loading ALL products for filters
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false); // Track if first product load is done
  const [error, setError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('');

  // Pagination state - URL is source of truth for page number
  const currentPage = parseInt(searchParams.get('page') || '1', 10) || 1;
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const PRODUCTS_PER_PAGE = 12;

  // Load filter data from server-side endpoint (FAST - single API call)
  // This replaces the old approach of loading ALL 300+ products client-side
  useEffect(() => {
    const loadFiltersFromServer = async (category: Category) => {
      // Skip if already loaded for this category
      if (loadedCategoryIdRef.current === category.id && allAvailableSizes.length > 0) {
        console.log(`✅ Already have filters for category "${category.name}", skipping`);
        setLoadingAllProducts(false);
        return;
      }

      try {
        setLoadingAllProducts(true);
        console.log(`🚀 Fetching filters from server for category "${category.name}" (ID: ${category.id})`);

        const { url, options } = apiEndpoints.filterAggregation(category.id);
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`Failed to fetch filters: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Server filters received: ${data.sizes?.length || 0} sizes, ${data.colors?.length || 0} colors, ${data.subcategories?.length || 0} subcategories`);

        // Set sizes
        const sizes = (data.sizes || []).map((s: { name: string }) => s.name);
        setAllAvailableSizes(sizes);

        // Set colors
        const colors = (data.colors || []).map((c: { name: string }) => c.name);
        setAllAvailableColors(colors);

        // Set subcategory counts
        const counts: { [id: string]: number } = {};
        const processSubcategories = (subs: Array<{ id: number; count: number; children?: Array<{ id: number; count: number }> }>) => {
          subs.forEach(sub => {
            counts[String(sub.id)] = sub.count;
            if (sub.children) {
              processSubcategories(sub.children);
            }
          });
        };
        processSubcategories(data.subcategories || []);
        setSubCategoryProductCounts(counts);

        loadedCategoryIdRef.current = category.id;
        loadedCategorySlugRef.current = category.slug;

      } catch (err) {
        console.error('Error fetching filters from server:', err);
        // Fallback: filters will be empty but page still works
      } finally {
        setLoadingAllProducts(false);
        isCurrentlyLoadingRef.current = false;
      }
    };

    if (currentCategory) {
      loadFiltersFromServer(currentCategory);
    }
  }, [currentCategory]);

  // NEW: Fetch products for display when category is set
  // Products are fetched independently of filters
  useEffect(() => {
    if (!currentCategory) {
      return;
    }

    // Products are fetched by fetchProductsOptimized which sets displayableProducts directly
    console.log(`🛒 Fetching products for display: category "${currentCategory.name}", page ${currentPage}`);
    fetchProductsOptimized(currentCategory, currentPage, false, selectedSubCategoryId || undefined);
  }, [currentCategory, currentPage, selectedSubCategoryId, selectedColor, selectedSize, sortOrder]);

  // Calculate parent category counts when both products and subcategories are available
  useEffect(() => {
    if (allProductsForCategory.length === 0 || subCategoriesForFilter.length === 0) {
      return;
    }

    const categoryCounts: { [categoryId: string]: number } = {};

    // Count products per category
    allProductsForCategory.forEach(product => {
      if (product.categories && Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const catIdStr = String(cat.id);
          categoryCounts[catIdStr] = (categoryCounts[catIdStr] || 0) + 1;
        });
      }
    });

    // Calculate parent category counts
    const calculateParentCounts = (categories: Category[]): void => {
      categories.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          calculateParentCounts(cat.children);

          const parentCount = categoryCounts[String(cat.id)] || 0;
          const childrenSum = cat.children.reduce((sum, child) => {
            return sum + (categoryCounts[String(child.id)] || 0);
          }, 0);

          if (parentCount === 0 && childrenSum > 0) {
            categoryCounts[String(cat.id)] = childrenSum;
          }
        }
      });
    };

    calculateParentCounts(subCategoriesForFilter);
    setSubCategoryProductCounts(categoryCounts);
    console.log('📊 Updated subcategory counts with parent calculations:', categoryCounts);
  }, [allProductsForCategory, subCategoriesForFilter]);

  // Optimized fetching function - defined at component level
  // Note: This function uses selectedColor and sortOrder from component state via closure
  const fetchProductsOptimized = async (category: Category, page: number = 1, appendResults: boolean = false, subCategoryId?: string) => {
    // Always clear products when starting a new fetch (prevents flickering)
    if (page === 1 && !appendResults) {
      setDisplayableProducts([]);
    }

    if (page === 1) {
      setLoading(true);
      setError(null);
      setHasMoreProducts(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Use subcategory ID if provided, otherwise use main category ID
      const categoryIdToUse = subCategoryId || category.id.toString();

      // When filtering by color or size, fetch ALL products (not paginated) for client-side filtering
      // Otherwise, use pagination
      const isFiltering = selectedColor || selectedSize;
      const perPage = isFiltering ? 100 : PRODUCTS_PER_PAGE; // Fetch up to 100 products when filtering

      console.log(`🚀 Fetching products for category: ${category.name}${subCategoryId ? ` (subcategory: ${subCategoryId})` : ''}${isFiltering ? ' (filtering mode - fetching all)' : ` (Page ${page})`}`);

      // Build API URL for paginated products
      const paramsArray = [
        `category=${categoryIdToUse}`,
        `status=publish`,
        `per_page=${perPage}`,
        `page=${isFiltering ? 1 : page}`, // Always page 1 when filtering
        `_fields=id,name,type,price,regular_price,sale_price,price_html,status,slug,images,attributes,variations,categories,date_modified`
      ];

      // Note: WooCommerce REST API doesn't reliably support attribute_term filtering
      // So we'll do color and size filtering client-side after fetching products
      // Sorting is also done client-side for consistency

      const params = paramsArray.join('&');

      const { url, options } = apiEndpoints.products(params);
      const productsResponse = await fetch(url, options);

      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status} ${await productsResponse.text()}`);
      }

      const baseProducts: Product[] = await productsResponse.json();
      console.log(`✅ Fetched ${baseProducts.length} products for page ${page}`);

      // Get total pages from response headers
      const totalPagesHeader = productsResponse.headers.get('X-WP-TotalPages');
      const totalItemsHeader = productsResponse.headers.get('X-WP-Total');

      console.log('📊 Pagination headers:', {
        totalPagesHeader,
        totalItemsHeader,
        currentPage: page
      });

      // When filtering, don't show pagination (all results shown)
      if (isFiltering) {
        setTotalPages(1);
        setHasMoreProducts(false);
      } else {
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
          // Set at least 2 pages so pagination shows
          setTotalPages(Math.max(2, page + 1));
          console.log(`⚠️ No pagination headers found, but got full page. Setting totalPages to ${Math.max(2, page + 1)}`);
        }

        // Check if we have more products
        setHasMoreProducts(baseProducts.length === PRODUCTS_PER_PAGE);
      }

      if (!Array.isArray(baseProducts) || baseProducts.length === 0) {
        if (page === 1) setDisplayableProducts([]);
        return;
      }

      // Process products with variations efficiently
      const processedProducts = await Promise.all(
        baseProducts.map(async (product) => {
          const productImages = Array.isArray(product.images) ? product.images : [];

          // DEBUG: Log raw product data from API
          console.log('📡 Raw product from API:', product.id, {
            name: product.name,
            images: product.images,
            firstImageSrc: product.images?.[0]?.src
          });
          const parentColorAttribute = product.attributes?.find(
            (attr) => attr.name.toLowerCase() === 'принт' || attr.name.toLowerCase() === 'print' || attr.slug === 'pa_print'
          );
          const allParentColors = parentColorAttribute?.options || [];

          // For variable products, fetch variations
          // PERFORMANCE: Skip variation fetching for 'sale' category (300+ products = N+1 problem)
          const isSaleCategory = category.slug === 'sale' || categorySlug === 'sale';
          if (product.type === 'variable' && product.variations && product.variations.length > 0 && !isSaleCategory) {
            try {
              const { url: variationsUrl, options: variationsOptions } = apiEndpoints.variations(product.id.toString(), 'per_page=100');
              const variationsResponse = await fetch(variationsUrl, variationsOptions);

              if (variationsResponse.ok) {
                const variations: ProductVariation[] = await variationsResponse.json();

                if (Array.isArray(variations) && variations.length > 0) {
                  // Group by color
                  const variationsByColor: { [color: string]: ProductVariation[] } = {};
                  variations.forEach(variation => {
                    const colorAttr = variation.attributes.find(attr =>
                      attr.slug?.startsWith('pa_print') ||
                      attr.name.toLowerCase() === 'принт' ||
                      attr.name.toLowerCase() === 'print'
                    );

                    if (colorAttr && colorAttr.option) {
                      if (!variationsByColor[colorAttr.option]) {
                        variationsByColor[colorAttr.option] = [];
                      }
                      variationsByColor[colorAttr.option].push(variation);
                    }
                  });

                  // Build color stock status map
                  const colorStockMap: { [color: string]: boolean } = {};
                  Object.entries(variationsByColor).forEach(([color, colorVars]) => {
                    const hasStock = colorVars.some(v => v.stock_status === 'instock');
                    colorStockMap[color] = hasStock;
                  });

                  // Create one DisplayableProduct per color (only for in-stock colors)
                  if (Object.keys(variationsByColor).length > 0) {
                    return Object.entries(variationsByColor)
                      .filter(([color]) => colorStockMap[color]) // Skip fully OOS color groups
                      .map(([color, colorVariations]) => {
                        const bestVariation = colorVariations.find(v => v.stock_status === 'instock') || colorVariations[0];

                        // Extract ALL sizes for this color and track stock status
                        const sizesForThisColor = new Set<string>();
                        const sizeStockMap: { [size: string]: boolean } = {};
                        colorVariations.forEach(variation => {
                          const sizeAttr = variation.attributes.find(attr =>
                            attr.slug?.startsWith('pa_razmer') ||
                            attr.slug?.startsWith('pa_size') ||
                            attr.name?.toLowerCase() === 'размер' ||
                            attr.name?.toLowerCase() === 'size'
                          );
                          if (sizeAttr?.option) {
                            sizesForThisColor.add(sizeAttr.option);
                            if (variation.stock_status === 'instock') {
                              sizeStockMap[sizeAttr.option] = true;
                            } else if (sizeStockMap[sizeAttr.option] === undefined) {
                              sizeStockMap[sizeAttr.option] = false;
                            }
                          }
                        });

                        // Strip query params (?_=N) to avoid WP shortcode URL duplication
                        const videoUrls: string[] = [];
                        const seenVideoUrls = new Set<string>();
                        if (bestVariation.description && typeof bestVariation.description === 'string') {
                          const urlMatches = [...bestVariation.description.matchAll(/(https?:\/\/[^\s,"'<>]+\.(?:mp4|webm)(?:[^\s,"'<>]*)?)/gi)];
                          urlMatches.forEach(m => {
                            const clean = m[1].split('?')[0];
                            if (clean && !seenVideoUrls.has(clean)) { seenVideoUrls.add(clean); videoUrls.push(clean); }
                          });
                          if (videoUrls.length === 0) {
                            const tagMatches = [...bestVariation.description.matchAll(/<(?:source|video)[^>]+src=["'](.*?)["']/gi)];
                            tagMatches.forEach(m => {
                              const clean = m[1].split('?')[0];
                              if (clean && !seenVideoUrls.has(clean)) { seenVideoUrls.add(clean); videoUrls.push(clean); }
                            });
                          }
                        }

                        const finalImageSrc =
                          bestVariation.image?.src ||
                          productImages[0]?.src ||
                          '/placeholder.png';

                        // Build interleaved gallery: images from variation_gallery, videos from description
                        // Pattern: image, video, image, video, image...
                        const imageItems: Array<{ src: string; type: 'image' }> = [];
                        const seenImgSrcs = new Set<string>();
                        if (bestVariation.image?.src) {
                          imageItems.push({ src: bestVariation.image.src, type: 'image' });
                          seenImgSrcs.add(bestVariation.image.src);
                        }
                        const varGallery = bestVariation.variation_gallery;
                        if (varGallery && varGallery.urls && varGallery.urls.length > 0) {
                          varGallery.urls.forEach((url: string) => {
                            if (url && !seenImgSrcs.has(url)) {
                              imageItems.push({ src: url, type: 'image' });
                              seenImgSrcs.add(url);
                            }
                          });
                        }
                        if (imageItems.length < 2) {
                          productImages.forEach(img => {
                            if (img.src && !seenImgSrcs.has(img.src)) {
                              imageItems.push({ src: img.src, type: 'image' });
                              seenImgSrcs.add(img.src);
                            }
                          });
                        }
                        // Interleave: image, video, image, video...
                        const enrichedGallery: Array<{ src: string; type: 'image' | 'video' }> = [];
                        const maxLen = Math.max(imageItems.length, videoUrls.length * 2);
                        let imgIdx = 0; let vidIdx = 0;
                        for (let i = 0; i < maxLen && (imgIdx < imageItems.length || vidIdx < videoUrls.length); i++) {
                          if (imgIdx < imageItems.length) enrichedGallery.push(imageItems[imgIdx++]);
                          if (vidIdx < videoUrls.length) enrichedGallery.push({ src: videoUrls[vidIdx++], type: 'video' });
                        }

                        return {
                          parentId: product.id,
                          variationId: bestVariation.id,
                          name: product.name,
                          price: bestVariation.price || product.price,
                          // Always use parent product's discount data
                          regular_price: product.regular_price,
                          sale_price: product.sale_price,
                          price_html: product.price_html,
                          imageSrc: finalImageSrc,
                          isVideo: videoUrls.length > 0,
                          attributes: product.attributes,
                          variationAttributes: bestVariation.attributes,
                          slug: product.slug,
                          allColorOptions: Object.keys(variationsByColor).filter(c => colorStockMap[c]),
                          selectedColorOption: color,
                          availableSizesForThisColor: Array.from(sizesForThisColor),
                          sizeStockStatus: sizeStockMap,
                          colorStockStatus: colorStockMap,
                          status: product.status,
                          categories: product.categories,
                          originalImages: enrichedGallery,
                          date_modified: product.date_modified,
                        };
                      });
                  }
                }
              }
            } catch (varError) {
              console.warn(`Error fetching variations for product ${product.id}:`, varError);
            }
          }

          // Fallback: simple product or sale category
          let fallbackImageSrc = productImages[0]?.src;
          let extraVariationImages: Array<{ src: string }> = [];

          // For variable products with no parent images or in sale category, fetch a few variations to get images
          if (product.type === 'variable' && product.variations && product.variations.length > 0) {
            try {
              // Fetch up to 3 variations to get images for the carousel
              const { url: varUrl, options: varOpts } = apiEndpoints.variations(product.id.toString(), 'per_page=3&_fields=id,image');
              const varResponse = await fetch(varUrl, varOpts);
              if (varResponse.ok) {
                const vars = await varResponse.json();
                if (Array.isArray(vars)) {
                  vars.forEach((v: any) => {
                    if (v?.image?.src) {
                      if (!fallbackImageSrc) {
                        fallbackImageSrc = v.image.src;
                      }
                      extraVariationImages.push({ src: v.image.src });
                    }
                  });
                  if (fallbackImageSrc) {
                    console.log('✅ Got image(s) from variations for product', product.id, ':', extraVariationImages.length, 'images');
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to fetch variation images for', product.id);
            }
          }

          fallbackImageSrc = fallbackImageSrc || '/placeholder.png';

          // Build enriched gallery: parent images + variation images
          const gallerySet = new Set<string>();
          productImages.forEach(img => { if (img.src) gallerySet.add(img.src); });
          extraVariationImages.forEach(img => { if (img.src) gallerySet.add(img.src); });
          const enrichedFallbackGallery = Array.from(gallerySet).map(src => ({ src }));

          // DEBUG: Log fallback imageSrc
          console.log('🔍 Setting FALLBACK imageSrc for product', product.id, ':', {
            productImageSrc: productImages[0]?.src,
            fallbackImageSrc,
            galleryCount: enrichedFallbackGallery.length,
          });

          return [{
            parentId: product.id,
            name: product.name,
            price: product.price,
            regular_price: product.regular_price,
            sale_price: product.sale_price,
            price_html: product.price_html,
            imageSrc: fallbackImageSrc,
            attributes: product.attributes,
            slug: product.slug,
            allColorOptions: allParentColors,
            selectedColorOption: allParentColors[0] || '',
            status: product.status,
            categories: product.categories,
            originalImages: enrichedFallbackGallery,
            date_modified: product.date_modified,
          }];
        })
      );

      // Flatten results
      const flattenedProducts: DisplayableProduct[] = processedProducts
        .flat()
        .filter(Boolean)
        .filter(product => product.status === 'publish')
        .filter(product => !isProductHidden(product.parentId)); // EN-only: exclude hidden products

      console.log(`✅ Processed ${flattenedProducts.length} displayable products for page ${page}`);

      // Calculate accurate subcategory counts based on fetched products
      // This ensures the counts reflect products actually in BOTH main category AND subcategory
      if (page === 1) {
        const categoryCounts: { [categoryId: string]: number } = {};

        // First pass: count direct products per category
        flattenedProducts.forEach(product => {
          if (product.categories && Array.isArray(product.categories)) {
            product.categories.forEach(cat => {
              const catIdStr = String(cat.id);
              categoryCounts[catIdStr] = (categoryCounts[catIdStr] || 0) + 1;
            });
          }
        });

        // Second pass: calculate parent category counts as sum of their children
        // This handles hierarchical categories where parent might not have direct products
        const calculateParentCounts = (categories: Category[]): void => {
          categories.forEach(cat => {
            if (cat.children && cat.children.length > 0) {
              // Recursively process children first
              calculateParentCounts(cat.children);

              // Sum children counts to parent if parent has 0 direct products
              const parentCount = categoryCounts[String(cat.id)] || 0;
              const childrenSum = cat.children.reduce((sum, child) => {
                return sum + (categoryCounts[String(child.id)] || 0);
              }, 0);

              // Only add children sum if parent doesn't have products directly
              // (to avoid double counting when products are in both parent and child)
              if (parentCount === 0 && childrenSum > 0) {
                categoryCounts[String(cat.id)] = childrenSum;
              }
            }
          });
        };

        // Apply to subCategoriesForFilter if available
        if (subCategoriesForFilter.length > 0) {
          calculateParentCounts(subCategoriesForFilter);
        }

        console.log('📊 Calculated subcategory counts from products:', categoryCounts);
        setSubCategoryProductCounts(categoryCounts);
      }

      // Update state
      if (appendResults && page > 1) {
        setDisplayableProducts(prev => [...prev, ...flattenedProducts]);
      } else {
        setDisplayableProducts(flattenedProducts);
        const productsCacheKey = `wcCategoryProducts_${category.id}_v6`;
        if (page === 1) {
          setCachedData(productsCacheKey, flattenedProducts);
          setHasInitialLoadCompleted(true); // Mark initial load complete
        }
      }

    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
      if (page === 1) setDisplayableProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (!hasInitialLoadCompleted) {
        setHasInitialLoadCompleted(true); // Mark initial load complete even if error
      }
    }
  };

  // Load more products function - defined at component level
  const loadMoreProducts = () => {
    if (!loadingMore && hasMoreProducts && currentCategory) {
      const nextPage = currentPage + 1;
      // Update URL to reflect the new page
      const params = new URLSearchParams(searchParams);
      params.set('page', nextPage.toString());
      setSearchParams(params, { replace: true });
      fetchProductsOptimized(currentCategory, nextPage, true, selectedSubCategoryId || undefined);
    }
  };

  // Reset page to 1 by updating URL
  const resetPageToFirst = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (params.has('page')) {
      params.delete('page');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Go to specific page - update URL (currentPage is derived from URL)
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
      console.log(`📄 goToPage: navigating to page ${pageNumber}`);

      // Update URL - currentPage will automatically update since it's derived from searchParams
      const params = new URLSearchParams(searchParams);
      if (pageNumber === 1) {
        params.delete('page');
      } else {
        params.set('page', pageNumber.toString());
      }
      setSearchParams(params, { replace: true });

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileFilterDropdown, setMobileFilterDropdown] = useState<string | null>(null);
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<{ [key: string]: boolean }>({});
  const [expandedDesktopParentCategory, setExpandedDesktopParentCategory] = useState<number | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const { likedProducts, likedProductsCache, toggleLike } = useLikes();
  const { addToCart } = useCart();



  // Color mapping - using shared utility from colorMap.ts (imported at top of file)

  // Effect to initialize size, color, sort, and sub-category filters from URL search params
  useEffect(() => {
    setSelectedSize(searchParams.get('size') || '');
    setSelectedColor(searchParams.get('color') || '');
    setSortOrder(searchParams.get('sort') || '');
    setSelectedSubCategoryId(searchParams.get('style') || '');
  }, [searchParams]);

  // Effect to update URL search params when FILTERS change (not page - page handled by goToPage)
  useEffect(() => {
    if (!categorySlug) return;

    const params = new URLSearchParams(searchParams);

    // Only update filter params, preserve page
    if (selectedSize) params.set('size', selectedSize);
    else params.delete('size');

    if (selectedColor) params.set('color', selectedColor);
    else params.delete('color');

    if (sortOrder) params.set('sort', sortOrder);
    else params.delete('sort');

    if (selectedSubCategoryId) params.set('style', selectedSubCategoryId);
    else params.delete('style');

    // Don't touch page here - goToPage handles it

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedSize, selectedColor, sortOrder, selectedSubCategoryId, categorySlug]);

  // Close filter drawer when loading starts
  useEffect(() => {
    if (loadingAllProducts) {
      setIsFilterDrawerOpen(false);
    }
  }, [loadingAllProducts]);

  const handleClearSize = () => {
    setSelectedSize('');
    resetPageToFirst();
    clearPageNumber(location.pathname);
  };

  const handleClearColor = () => {
    setSelectedColor('');
    resetPageToFirst();
    clearPageNumber(location.pathname);
  };

  const handleClearSubCategory = () => {
    setSelectedSubCategoryId('');
    resetPageToFirst();
    clearPageNumber(location.pathname);
  };

  // Clears all filters for this page
  const handleClearAllSpecificPageFilters = () => {
    setSelectedSize('');
    setSelectedColor('');
    setSelectedSubCategoryId('');
    setSortOrder(''); // Also clear sort order
    resetPageToFirst();
    clearPageNumber(location.pathname);
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

  // Track previous category slug to detect if we're returning to the same category
  const previousCategorySlugRef = useRef<string | undefined>(undefined);
  const loadedCategoryIdRef = useRef<number | null>(null);
  const loadedCategorySlugRef = useRef<string | null>(null); // Track which category slug we have products for
  const isCurrentlyLoadingRef = useRef<boolean>(false);

  // Fetch all categories, identify current category, and its sub-categories
  useEffect(() => {
    // Check if we're returning to the same category (navigating back from product page)
    // isReturningToSameCategory: true when previousCategorySlugRef matches current (back from product)
    // isCategoryActuallyChanging: true when previousCategorySlugRef is set AND different (navigating between categories)
    const isReturningToSameCategory = previousCategorySlugRef.current !== undefined && previousCategorySlugRef.current === categorySlug;
    const isCategoryActuallyChanging = previousCategorySlugRef.current !== undefined && previousCategorySlugRef.current !== categorySlug;

    console.log(`🔄 Category slug: "${categorySlug}", previous: "${previousCategorySlugRef.current}", isReturningToSame: ${isReturningToSameCategory}, isCategoryChanging: ${isCategoryActuallyChanging}, hasProducts: ${allProductsForCategory.length}`);

    // Clear error, and only clear display products if category is actually changing
    setError(null);
    if (isCategoryActuallyChanging) {
      setDisplayableProducts([]);
    }

    // Check if we already have products loaded for this exact category slug
    // This prevents clearing products on React StrictMode double renders
    const hasProductsForThisSlug = loadedCategorySlugRef.current === categorySlug && allProductsForCategory.length > 0;

    // Only clear allProductsForCategory if category actually changed AND we're not currently loading
    // AND we don't already have products for this slug
    if (!isReturningToSameCategory && !isCurrentlyLoadingRef.current && !hasProductsForThisSlug) {
      console.log(`🗑️ Clearing products because category changed or first load (not currently loading, no products for this slug)`);
      setAllProductsForCategory([]); // Only clear if category actually changed
      setSubCategoryProductCounts({}); // Only reset if category changed
      setAllAvailableSizes([]);
      setAllAvailableColors([]);
      loadedCategoryIdRef.current = null; // Reset loaded category tracking
      loadedCategorySlugRef.current = null; // Reset slug tracking
      setLoadingAllProducts(true); // Start loading for new category
    } else if (isReturningToSameCategory || hasProductsForThisSlug) {
      console.log(`✅ Preserving ${allProductsForCategory.length} products because returning to same category or already have products for this slug`);
      // Don't clear products, and don't reload
      setLoadingAllProducts(false);
      isCurrentlyLoadingRef.current = false;
    } else if (isCurrentlyLoadingRef.current) {
      console.log(`⏳ Not clearing products - currently loading for category`);
      // Don't clear if we're in the middle of loading
    } else {
      console.log(`⚠️ Category changed, will load new products`);
      setLoadingAllProducts(true);
    }

    setCurrentCategory(null);
    setSubCategoriesForFilter([]);
    setColorNameToSlug({});
    setSizeNameToSlug({});
    setLoading(true);

    // Only reset filters and page when ACTUALLY changing categories (not first load, not returning from product page)
    if (isCategoryActuallyChanging) {
      // Reset all filters when category changes
      setSelectedSize('');
      setSelectedColor('');
      setSelectedSubCategoryId('');
      setSortOrder('');
      setTotalPages(1);
      setHasMoreProducts(true);
      // Reset page to 1 in URL when category changes
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('page');
      if (searchParams.get('page')) {
        setSearchParams(newSearchParams, { replace: true });
      }
    }

    const categoriesCacheKey = 'allWCCategories_v6'; // Bumped to invalidate stale cache
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

    (() => {
      const { url, options } = apiEndpoints.categories('per_page=100');
      return fetch(url, options);
    })()
      .then(res => res.ok ? res.json() : Promise.reject(`Failed to fetch categories: ${res.status}`))
      .then((data: Category[]) => {
        if (Array.isArray(data)) {
          setAllCategories(data);
          setCachedData(categoriesCacheKey, data); // Cache the raw category list
          const foundCategory = data.find(cat => cat.slug === categorySlug);

          if (foundCategory) {
            // Small delay to ensure UI updates smoothly
            setTimeout(() => {
              setCurrentCategory(foundCategory);
              setSubCategoriesForFilter(buildCategoryHierarchy(data, foundCategory.id));
            }, 0);
          } else {
            setError(`Category with slug "${categorySlug}" not found.`);
            setLoading(false);
          }
        } else {
          throw new Error('Categories data is not an array');
        }
      })
      .catch(err => {
        console.error('Error fetching categories:', err);
        setError(typeof err === 'string' ? err : err.message);
        setLoading(false);
      });
    // Don't set loading to false in finally - let product fetch handle it

    // Update previous category slug ref
    previousCategorySlugRef.current = categorySlug;
  }, [categorySlug]); // API constants removed — auth handled by proxy

  // Simple loading state management
  useEffect(() => {
    if (!currentCategory || loadingAllProducts) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [currentCategory, loadingAllProducts]);


  // Compute available colors based on current filters (subcategory and size)
  const availableColorsForCurrentFilters = useMemo(() => {
    if (loadingAllProducts || allProductsForCategory.length === 0) {
      return allAvailableColors;
    }

    // Filter products by subcategory and size (but NOT by color)
    const relevantProducts = allProductsForCategory.filter(product => {
      if (product.status !== 'publish') return false;

      // Apply subcategory filter
      if (selectedSubCategoryId) {
        if (!product.categories || !product.categories.some(cat => String(cat.id) === selectedSubCategoryId)) {
          return false;
        }
      }

      // Apply size filter - check both attributes and variationAttributes
      if (selectedSize) {
        let hasSize = false;

        // Check parent product attributes
        if (product.attributes && Array.isArray(product.attributes)) {
          const sizeAttr = product.attributes.find(attr =>
            attr.slug === 'pa_size' ||
            attr.name?.toLowerCase() === 'размер' ||
            attr.name?.toLowerCase() === 'size'
          );
          if (sizeAttr?.options?.includes(selectedSize)) {
            hasSize = true;
          }
        }

        // Also check variation attributes
        if (!hasSize && product.variationAttributes && Array.isArray(product.variationAttributes)) {
          const sizeVarAttr = product.variationAttributes.find((attr: any) =>
            attr.slug === 'pa_size' ||
            attr.name?.toLowerCase() === 'размер' ||
            attr.name?.toLowerCase() === 'size'
          );
          if (sizeVarAttr?.option === selectedSize) {
            hasSize = true;
          }
        }

        if (!hasSize) {
          return false;
        }
      }

      return true;
    });

    console.log(`🎨 Available colors filter: selectedSize="${selectedSize}", selectedSubCategoryId="${selectedSubCategoryId}", relevantProducts=${relevantProducts.length}`);

    // Extract colors from filtered products
    const colorsSet = new Set<string>();
    relevantProducts.forEach(product => {
      if (product.selectedColorOption) {
        colorsSet.add(product.selectedColorOption);
      }
    });

    const colors = Array.from(colorsSet).filter(Boolean).sort();
    console.log(`🎨 Available colors: ${colors.length} colors`, colors);

    return colors;
  }, [allProductsForCategory, loadingAllProducts, selectedSubCategoryId, selectedSize, allAvailableColors]);

  // Compute available sizes based on current filters (subcategory and color)
  const availableSizesForCurrentFilters = useMemo(() => {
    if (loadingAllProducts || allProductsForCategory.length === 0) {
      return allAvailableSizes;
    }

    // Filter products by subcategory and color (but NOT by size)
    const relevantProducts = allProductsForCategory.filter(product => {
      if (product.status !== 'publish') return false;

      // Apply subcategory filter
      if (selectedSubCategoryId) {
        if (!product.categories || !product.categories.some(cat => String(cat.id) === selectedSubCategoryId)) {
          return false;
        }
      }

      // Apply color filter
      if (selectedColor) {
        if (product.selectedColorOption !== selectedColor) {
          return false;
        }
      }

      return true;
    });

    console.log(`📏 Available sizes filter: selectedColor="${selectedColor}", selectedSubCategoryId="${selectedSubCategoryId}", relevantProducts=${relevantProducts.length}`);

    // Extract sizes from filtered products
    const sizesSet = new Set<string>();
    relevantProducts.forEach(product => {
      if (product.attributes && Array.isArray(product.attributes)) {
        product.attributes.forEach((attr: any) => {
          if (attr.slug === 'pa_size' || attr.name?.toLowerCase() === 'размер' || attr.name?.toLowerCase() === 'size') {
            if (attr.options && Array.isArray(attr.options)) {
              attr.options.forEach((size: string) => {
                if (size && typeof size === 'string') {
                  sizesSet.add(size.trim());
                }
              });
            }
          }
        });
      }
      if (product.variationAttributes && Array.isArray(product.variationAttributes)) {
        product.variationAttributes.forEach((attr: any) => {
          if (attr.slug === 'pa_size' || attr.name?.toLowerCase() === 'размер' || attr.name?.toLowerCase() === 'size') {
            if (attr.option && typeof attr.option === 'string') {
              sizesSet.add(attr.option.trim());
            }
          }
        });
      }
    });

    const sizes = Array.from(sizesSet).filter(Boolean).sort();
    console.log(`📏 Available sizes: ${sizes.length} sizes`, sizes);

    return sizes;
  }, [allProductsForCategory, loadingAllProducts, selectedSubCategoryId, selectedColor, allAvailableSizes]);

  // Use the dynamically computed filter options
  const allSizes = availableSizesForCurrentFilters;
  const allColorsForCategory = availableColorsForCurrentFilters;

  // Filter, sort, and paginate products from allProductsForCategory
  const sortedAndFilteredProducts = useMemo(() => {
    // Don't filter if products are still loading
    if (loadingAllProducts) {
      console.log('⏳ sortedAndFilteredProducts: Still loading all products');
      return [];
    }

    if (allProductsForCategory.length === 0) {
      console.log('⚠️ sortedAndFilteredProducts: allProductsForCategory is empty', {
        loadingAllProducts,
        currentCategory: currentCategory?.name,
        allProductsLength: allProductsForCategory.length
      });
      return [];
    }

    console.log(`🔄 sortedAndFilteredProducts: Processing ${allProductsForCategory.length} products`);

    // Filter products client-side from ALL loaded products
    let filtered = allProductsForCategory.filter(product => {
      if (product.status !== 'publish') return false;

      // Subcategory filter
      if (selectedSubCategoryId) {
        if (!product.categories || !product.categories.some(cat => String(cat.id) === selectedSubCategoryId)) {
          return false;
        }
      }

      // Color filter - client-side
      if (selectedColor) {
        if (product.selectedColorOption !== selectedColor) {
          return false;
        }
      }

      // Size filter - client-side
      if (selectedSize) {
        const sizeAttr = product.attributes?.find(attr =>
          attr.slug === 'pa_size' ||
          attr.name.toLowerCase() === 'размер' ||
          attr.name.toLowerCase() === 'size'
        );
        if (!sizeAttr || !sizeAttr.options?.includes(selectedSize)) {
          return false;
        }
      }

      return true;
    });

    // Sorting - done client-side
    if (sortOrder === 'price_asc') {
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOrder === 'price_desc') {
      filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    return filtered;
  }, [allProductsForCategory, loadingAllProducts, selectedSubCategoryId, selectedColor, selectedSize, sortOrder]);

  // Update displayableProducts and pagination based on filtered results - SIMPLE VERSION
  // NOTE: This effect only runs when allProductsForCategory is populated (old mode)
  // In the new server-side filter mode, products are fetched directly by fetchProductsOptimized
  useEffect(() => {
    if (loadingAllProducts || !currentCategory) {
      return;
    }

    // Skip this effect in server-side filter mode - products are fetched directly
    if (allProductsForCategory.length === 0) {
      console.log('ℹ️ Skipping sortedAndFilteredProducts effect - using direct product fetch');
      return;
    }

    const totalFiltered = sortedAndFilteredProducts.length;
    const calculatedTotalPages = Math.max(1, Math.ceil(totalFiltered / PRODUCTS_PER_PAGE));

    setTotalPages(calculatedTotalPages);

    // Use currentPage directly, clamp if needed
    const pageToUse = Math.min(currentPage, calculatedTotalPages);

    // Paginate
    const startIndex = (pageToUse - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const paginatedProducts = sortedAndFilteredProducts.slice(startIndex, endIndex);

    console.log(`📄 Page ${pageToUse}: Showing products ${startIndex}-${endIndex} of ${totalFiltered}`);

    setDisplayableProducts([...paginatedProducts]);
    setHasMoreProducts(endIndex < totalFiltered);
    setLoading(false);
  }, [sortedAndFilteredProducts, currentPage, loadingAllProducts, currentCategory]);

  const handleAddToCart = async (product: DisplayableProduct) => {
    if (!product) return;
    const itemDetails = {
      id: String(product.variationId || product.parentId),
      parentId: product.variationId ? String(product.parentId) : undefined,
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
    activeOptions,
    productCounts
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
    activeOptions?: string[],
    productCounts?: { [categoryId: string]: number }
  }) {
    const safeOptions = Array.isArray(options) ? options : [];

    const renderCategoryItemsLocal = (items: Category[], level = 0) => {
      // Filter out categories with 0 products (use accurate counts if available)
      const filteredItems = items.filter(category => {
        const actualCount = productCounts ? (productCounts[String(category.id)] || 0) : category.count;
        // Also check if category has children with products
        const hasChildrenWithProducts = category.children?.some(child => {
          const childCount = productCounts ? (productCounts[String(child.id)] || 0) : child.count;
          return (childCount || 0) > 0;
        });
        return (actualCount || 0) > 0 || hasChildrenWithProducts;
      });

      return filteredItems.map((category) => {
        return (
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
                {renderCategoryItemsLocal(category.children, level + 1)}
              </div>
            )}
          </div>
        );
      });
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
            >{t('common.all')}</div>
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
    // Filter out categories with 0 products (use accurate counts if available)
    const filteredItems = items.filter(category => {
      const actualCount = subCategoryProductCounts[String(category.id)] || 0;
      // Also check if category has children with products
      const hasChildrenWithProducts = category.children?.some(child => {
        const childCount = subCategoryProductCounts[String(child.id)] || 0;
        return childCount > 0;
      });
      return actualCount > 0 || hasChildrenWithProducts;
    });

    return filteredItems.map((category) => {
      return (
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
      );
    });
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

          {/* Filter Bar (Desktop) - All filters use server-side filtering now */}
          <div className="hidden md:flex flex-row items-center justify-between mb-0 pl-[5px] py-2 md:px-[45px]" style={{ minHeight: 48 }}>
            {loadingAllProducts ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <span className="text-sm font-bold uppercase tracking-wider">Фильтры</span>
              </div>
            ) : (
              <>
                <div className="flex flex-row items-center space-x-8">
                  <FilterDropdown
                    label={t('common.size').toUpperCase()}
                    options={allSizes}
                    selected={selectedSize}
                    onSelect={(val) => {
                      setSelectedSize(val);
                      resetPageToFirst();
                      clearPageNumber(location.pathname);
                    }}
                    id="size-csp"
                    alignRight
                  />
                  <FilterDropdown
                    label={t('common.color').toUpperCase()}
                    options={allColorsForCategory}
                    selected={selectedColor}
                    onSelect={(val) => {
                      setSelectedColor(val);
                      resetPageToFirst();
                      clearPageNumber(location.pathname);
                    }}
                    id="color-csp"
                    alignRight
                    activeOptions={allColorsForCategory}
                  />
                  <FilterDropdown
                    label={t('nav.category')}
                    categoryItems={subCategoriesForFilter}
                    selected={selectedSubCategoryId}
                    onSelect={(val) => {
                      setSelectedSubCategoryId(val);
                      resetPageToFirst();
                      clearPageNumber(location.pathname);
                    }}
                    id="style-csp"
                    alignRight
                    expandedParentId={expandedDesktopParentCategory}
                    onToggleParentExpand={(catId) => setExpandedDesktopParentCategory(prev => prev === catId ? null : catId)}
                    productCounts={subCategoryProductCounts}
                  />
                </div>
                <div className="flex items-center">
                  <FilterDropdown label={t('common.sort')} options={[t('common.priceAscending'), t('common.priceDescending')]}
                    selected={sortOrder === 'price_asc' ? t('common.priceAscending') : sortOrder === 'price_desc' ? t('common.priceDescending') : ''}
                    onSelect={(val) => {
                      setSortOrder(val === t('common.priceAscending') ? 'price_asc' : val === t('common.priceDescending') ? 'price_desc' : '');
                      resetPageToFirst(); // Reset to page 1 when sort changes
                      clearPageNumber(location.pathname);
                    }}
                    id="sort-csp"
                  />
                </div>
              </>
            )}
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
            {loadingAllProducts ? (
              <div className="flex items-center space-x-2 pl-6">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-wider">Фильтры</span>
              </div>
            ) : (
              <>
                <button
                  className="flex items-center pl-6 py-2 text-xs font-bold uppercase tracking-wider"
                  onClick={() => {
                    if (!loadingAllProducts) {
                      setIsFilterDrawerOpen(true);
                    }
                  }}
                  disabled={loadingAllProducts}
                >
                  {t('common.filters')} <FilterIcon className="ml-2 w-4 h-4" />
                </button>
                <div className="flex items-center pr-6">
                  <FilterDropdown label="Сортировать" options={['Цена: по возрастанию', 'Цена: по убыванию']}
                    selected={sortOrder === 'price_asc' ? 'Цена: по возрастанию' : sortOrder === 'price_desc' ? 'Цена: по убыванию' : ''}
                    onSelect={(val) => setSortOrder(val === 'Цена: по возрастанию' ? 'price_asc' : val === 'Цена: по убыванию' ? 'price_desc' : '')}
                    id="sort-mobile-csp"
                  />
                </div>
              </>
            )}
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
                  {mobileFilterDropdown === 'size' && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1 pb-1">
                      {allSizes.length > 0 ? (
                        allSizes.map(s => (
                          <button
                            key={s}
                            className={`border px-2 py-1 rounded text-xs ${selectedSize === s ? 'bg-black text-white' : ''}`}
                            onClick={() => { setSelectedSize(sz => sz === s ? '' : s); resetPageToFirst(); clearPageNumber(location.pathname); }}
                          >
                            {s}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 px-1">Нет доступных размеров</p>
                      )}
                    </div>
                  )}
                </div>
                {/* Color */}
                <div>
                  <button className="w-full flex justify-between items-center py-2 font-bold uppercase text-xs border-b" onClick={() => setMobileFilterDropdown(m => m === 'color' ? null : 'color')}>Цвет{selectedColor && ` (${selectedColor})`}<ChevronDown className={`transition-transform ${mobileFilterDropdown === 'color' ? 'rotate-180' : ''}`} /></button>
                  {mobileFilterDropdown === 'color' && (
                    <div className="flex flex-wrap gap-2 mt-1 px-1 pb-1">
                      {allColorsForCategory.length > 0 ? (
                        allColorsForCategory.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 focus:outline-none 
                              focus:ring-2 focus:ring-offset-1 focus:ring-black
                              ${selectedColor === color ? 'border-black ring-2 ring-black ring-offset-1' : 'border-gray-300'}
                            `}
                            style={{ backgroundColor: getColorHex(color) }}
                            onClick={() => { setSelectedColor(sc => sc === color ? '' : color); resetPageToFirst(); clearPageNumber(location.pathname); }}
                            title={color}
                            aria-label={`Select color ${color}`}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 px-1">Нет доступных цветов</p>
                      )}
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
                        {t('common.allSubcategories')} ({currentCategory?.name})
                      </button>
                      {renderMobileCategoryItems(subCategoriesForFilter)}
                    </div>
                  )}
                </div>
              </div>
              <button className="mt-6 w-full bg-black text-white py-3 font-bold uppercase tracking-wider text-xs rounded" onClick={() => setIsFilterDrawerOpen(false)}>{t('common.showResults').replace(' {count}', '').replace('{count}', '')}</button>
              <button className="mt-2 w-full text-center text-black underline text-xs" onClick={() => { setSelectedSize(''); setSelectedColor(''); setSelectedSubCategoryId(''); resetPageToFirst(); clearPageNumber(location.pathname); }}>{t('common.clearAll')}</button>
            </div>
          </div>

          {/* Product grid */}
          <div className="w-full">
            {/* Show skeleton until first product load completes */}
            {!hasInitialLoadCompleted ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                {[...Array(6)].map((_, idx) => <div key={idx} className={`${(idx + 1) % 3 === 0 ? '' : 'border-r'} ${idx >= 3 ? '' : 'border-b'} border-gray-100`}><ProductCardSkeleton delay={`${idx * 120}ms`} /></div>)}
              </div>
            ) : displayableProducts.length === 0 ? (
              <p className="text-center py-10">No products found in {currentCategory?.name || 'this category'} matching your filters.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                {displayableProducts.map((product, idx) => {
                  const isLastCol = ((idx + 1) % 3 === 0);
                  const isLastRow = idx >= displayableProducts.length - (displayableProducts.length % 3 || 3);
                  const productLink = `/product/${product.parentId}?print=${slugifyColor(product.selectedColorOption)}`;

                  // DEBUG: Log what imageSrc we have at render time
                  if (product.imageSrc && !product.imageSrc.startsWith('https://leahcation.ru/wp/') && product.imageSrc !== '/placeholder.png') {
                    console.log('🚨 CORRUPTED imageSrc at render time!', product.parentId, product.selectedColorOption, product.imageSrc);
                  }

                  return (
                    <div key={`product-${product.parentId}-${product.selectedColorOption || 'default'}`} className={`${isLastCol ? '' : 'border-r'} ${isLastRow ? '' : ' border-b'} border-gray-100`}>
                      <div className="relative">
                        <ProductImageCarousel
                          product={product}
                          productLink={productLink}
                          allowVideo={idx % 2 === 1}
                        />
                        <div className="mt-2 pl-2 pr-2 pb-2 md:pl-3 md:pr-3 md:pb-3">
                          <Link to={productLink} state={{ parentProductId: product.parentId, selectedColor: product.selectedColorOption, productData: product }} className="block">
                            <div className="flex items-center justify-between w-full">
                              <DynamicText
                                text={product.name}
                                tag="h3"
                                className="font-sans text-xs md:text-sm font-normal text-black"
                              />
                              <button className="ml-2 p-1 text-gray-500 hover:text-red-600" aria-label="Like" onClick={e => { e.preventDefault(); toggleLike(product.variationId || product.parentId, { id: product.variationId || product.parentId, parentId: product.parentId, name: product.name, price: product.price, images: [{ src: product.imageSrc }] }); }}>
                                <Heart size={20} fill={likedProducts.includes(product.variationId || product.parentId) ? 'black' : 'none'} stroke={likedProducts.includes(product.variationId || product.parentId) ? 'black' : 'currentColor'} />
                              </button>
                            </div>
                            <DiscountPrice
                              price={product.price}
                              regularPrice={product.regular_price}
                              salePrice={product.sale_price}
                              priceHtml={product.price_html}
                            />
                          </Link>
                          <div className="mt-2 flex items-center space-x-1">
                            {(product.allColorOptions || []).map(color => (
                              <Link key={color} to={`/product/${product.parentId}?print=${slugifyColor(String(color))}`} title={String(color)}>
                                <span className={`block w-4 h-4 rounded-full border hover:border-black ${product.selectedColorOption === color ? 'ring-1 ring-offset-1 ring-black' : 'border-gray-300'}`} style={{ backgroundColor: getColorHex(String(color)) }}></span>
                              </Link>
                            ))}
                          </div>

                          {/* Size swatches */}
                          {product.availableSizesForThisColor && product.availableSizesForThisColor.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {sortSizes(product.availableSizesForThisColor).map((size: string) => {
                                const isInStock = product.sizeStockStatus?.[size] !== false;
                                return isInStock ? (
                                  <Link
                                    key={size}
                                    to={`/product/${product.parentId}?print=${slugifyColor(product.selectedColorOption)}&size=${encodeURIComponent(size)}`}
                                    className="px-2 py-0.5 text-[10px] border rounded-full border-gray-300 bg-white text-gray-700 hover:border-black transition-colors"
                                    title={size}
                                  >
                                    {size}
                                  </Link>
                                ) : (
                                  <span
                                    key={size}
                                    className="px-2 py-0.5 text-[10px] border rounded-full border-gray-200 bg-white text-gray-300 line-through cursor-not-allowed"
                                    title={`${size} — нет в наличии`}
                                  >
                                    {size}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Hide product count and pagination during initial loading */}
          {displayableProducts.length > 0 && (
            <div className="w-full flex flex-col items-center py-6">
              <p className="font-sans font-normal text-black text-sm text-center">{t('common.showingProducts').replace('{count}', displayableProducts.length.toString())}</p>

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

              {/* Show pagination info */}
              {currentPage > 1 && (
                <p className="text-xs text-gray-500 mt-2">
                  {t('common.pageInfo').replace('{page}', currentPage.toString()).replace('{count}', displayableProducts.length.toString())}
                </p>
              )}

              {/* {currentCategory && <Link to="/catalogue" className="text-sm underline mt-2">View all products</Link>} */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 