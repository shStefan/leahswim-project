// API configuration utility to handle development vs production
const WC_CONSUMER_KEY = 'ck_084aa13e23a1accc48bc43802ffe9757f01005b4';
const WC_CONSUMER_SECRET = 'cs_5001dac555fade564eeb29c4d95fb49ea973d6f5';
const WC_API_URL = 'https://leahcation.ru/wp/wp-json/wc/v3';

const isDevelopment = import.meta.env.DEV;

// Daily cache buster - changes every 24 hours to force fresh API data
const getDailyCacheBuster = (): string => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

// Helper function to create authorization header
const getAuthHeaders = () => ({
  'Authorization': 'Basic ' + btoa(WC_CONSUMER_KEY + ':' + WC_CONSUMER_SECRET),
  'Accept': 'application/json',
  'Content-Type': 'application/json',
});

// API endpoint functions
export const apiEndpoints = {
  // Products endpoint
  products: (params: string = '') => {
    const cb = getDailyCacheBuster();
    const allParams = params ? `${params}&cb=${cb}` : `cb=${cb}`;
    if (isDevelopment) {
      return {
        url: `/wp-json/wc/v3/products?${allParams}`,
        options: { headers: getAuthHeaders() }
      };
    }
    return {
      url: `${WC_API_URL}/products?${allParams}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Categories endpoint  
  categories: (params: string = '') => {
    const cb = getDailyCacheBuster();
    const allParams = params ? `${params}&cb=${cb}` : `cb=${cb}`;
    if (isDevelopment) {
      return {
        url: `/wp-json/wc/v3/products/categories?${allParams}`,
        options: { headers: getAuthHeaders() }
      };
    }
    return {
      url: `${WC_API_URL}/products/categories?${allParams}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Variations endpoint
  variations: (productId: string, params: string = '') => {
    const cb = getDailyCacheBuster();
    const allParams = params ? `${params}&cb=${cb}` : `cb=${cb}`;
    if (isDevelopment) {
      return {
        url: `/wp-json/wc/v3/products/${productId}/variations?${allParams}`,
        options: { headers: getAuthHeaders() }
      };
    }
    return {
      url: `${WC_API_URL}/products/${productId}/variations?${allParams}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Orders endpoint
  orders: () => {
    if (isDevelopment) {
      // Use Vite proxy in development
      return {
        url: '/wp-json/wc/v3/orders',
        options: {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      };
    }
    // In production, call WooCommerce API directly
    return {
      url: `${WC_API_URL}/orders`,
      options: {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      }
    };
  },

  // Attributes endpoint
  attributes: (params: string = '') => {
    const cb = getDailyCacheBuster();
    const allParams = params ? `${params}&cb=${cb}` : `cb=${cb}`;
    if (isDevelopment) {
      return {
        url: `/wp-json/wc/v3/products/attributes?${allParams}`,
        options: { headers: getAuthHeaders() }
      };
    }
    return {
      url: `${WC_API_URL}/products/attributes?${allParams}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Attribute terms endpoint
  attributeTerms: (attributeId: string, params: string = '') => {
    const cb = getDailyCacheBuster();
    const allParams = params ? `${params}&cb=${cb}` : `cb=${cb}`;
    if (isDevelopment) {
      return {
        url: `/wp-json/wc/v3/products/attributes/${attributeId}/terms?${allParams}`,
        options: { headers: getAuthHeaders() }
      };
    }
    return {
      url: `${WC_API_URL}/products/attributes/${attributeId}/terms?${allParams}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Filter aggregation endpoint (custom Leah API)
  filterAggregation: (categoryId: string | number) => {
    const cb = getDailyCacheBuster();
    const baseUrl = isDevelopment
      ? '/wp-json/leah/v1/filters'
      : 'https://leahcation.ru/wp/wp-json/leah/v1/filters';
    return {
      url: `${baseUrl}?category=${categoryId}&cb=${cb}`,
      options: { headers: { 'Accept': 'application/json' } }
    };
  }
};

// Media proxy function - DISABLED (no longer needed)
// Images load directly without CORS issues
export const getProxiedMediaUrl = (originalUrl: string): string => {
  // Return original URL directly - no proxying needed
  return originalUrl;
};






