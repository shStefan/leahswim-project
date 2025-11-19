// API configuration utility to handle development vs production
const WC_CONSUMER_KEY = 'ck_084aa13e23a1accc48bc43802ffe9757f01005b4';
const WC_CONSUMER_SECRET = 'cs_5001dac555fade564eeb29c4d95fb49ea973d6f5';
const WC_API_URL = 'https://leahcation.ru/wp/wp-json/wc/v3';

const isDevelopment = import.meta.env.DEV;

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
    if (isDevelopment) {
      // Use Vite proxy in development - this will proxy to WooCommerce with auth
      return {
        url: `/wp-json/wc/v3/products${params ? `?${params}` : ''}`,
        options: { headers: getAuthHeaders() }
      };
    }
    // In production, call WooCommerce API directly
    return {
      url: `${WC_API_URL}/products${params ? `?${params}` : ''}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Categories endpoint  
  categories: (params: string = '') => {
    if (isDevelopment) {
      // Use Vite proxy in development
      return {
        url: `/wp-json/wc/v3/products/categories${params ? `?${params}` : ''}`,
        options: { headers: getAuthHeaders() }
      };
    }
    // In production, call WooCommerce API directly
    return {
      url: `${WC_API_URL}/products/categories${params ? `?${params}` : ''}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Variations endpoint
  variations: (productId: string, params: string = '') => {
    if (isDevelopment) {
      // Use Vite proxy in development
      return {
        url: `/wp-json/wc/v3/products/${productId}/variations${params ? `?${params}` : ''}`,
        options: { headers: getAuthHeaders() }
      };
    }
    // In production, call WooCommerce API directly
    return {
      url: `${WC_API_URL}/products/${productId}/variations${params ? `?${params}` : ''}`,
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
    if (isDevelopment) {
      // Use Vite proxy in development
      return {
        url: `/wp-json/wc/v3/products/attributes${params ? `?${params}` : ''}`,
        options: { headers: getAuthHeaders() }
      };
    }
    // In production, call WooCommerce API directly
    return {
      url: `${WC_API_URL}/products/attributes${params ? `?${params}` : ''}`,
      options: { headers: getAuthHeaders() }
    };
  },

  // Attribute terms endpoint
  attributeTerms: (attributeId: string, params: string = '') => {
    if (isDevelopment) {
      // Use Vite proxy in development
      return {
        url: `/wp-json/wc/v3/products/attributes/${attributeId}/terms${params ? `?${params}` : ''}`,
        options: { headers: getAuthHeaders() }
      };
    }
    // In production, call WooCommerce API directly
    return {
      url: `${WC_API_URL}/products/attributes/${attributeId}/terms${params ? `?${params}` : ''}`,
      options: { headers: getAuthHeaders() }
    };
  }
};

// Media proxy function - DISABLED (no longer needed)
// Images load directly without CORS issues
export const getProxiedMediaUrl = (originalUrl: string): string => {
  // Return original URL directly - no proxying needed
  return originalUrl;
};

