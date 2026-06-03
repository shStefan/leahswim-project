// API configuration — keys are NEVER in the browser bundle.
// EN (Vercel): all WC calls go through /api/wc?path=...&<params>
// The serverless function adds the Authorization header server-side.

const isDevelopment = import.meta.env.DEV;

// Daily cache buster - changes every 24 hours to force fresh API data
const getDailyCacheBuster = (): string => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

// In development Vite proxy handles /wp-json → leahcation.ru with auth headers.
// In production all calls go through the Vercel /api/wc serverless proxy.
const wcUrl = (path: string, params: string): { url: string; options: RequestInit } => {
  const cb = getDailyCacheBuster();
  const fullParams = params ? `${params}&cb=${cb}` : `cb=${cb}`;

  if (isDevelopment) {
    return {
      url: `/wp-json/wc/v3/${path}?${fullParams}`,
      options: { headers: { 'Accept': 'application/json' } },
    };
  }

  return {
    url: `/api/wc?path=${encodeURIComponent(path)}&${fullParams}`,
    options: { headers: { 'Accept': 'application/json' } },
  };
};

export const apiEndpoints = {
  products: (params: string = '') => wcUrl('products', params),

  categories: (params: string = '') => wcUrl('products/categories', params),

  variations: (productId: string, params: string = '') =>
    wcUrl(`products/${productId}/variations`, params),

  orders: () => {
    if (isDevelopment) {
      return {
        url: '/wp-json/wc/v3/orders',
        options: { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } },
      };
    }
    return {
      url: '/api/wc?path=orders',
      options: { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } },
    };
  },

  attributes: (params: string = '') => wcUrl('products/attributes', params),

  attributeTerms: (attributeId: string, params: string = '') =>
    wcUrl(`products/attributes/${attributeId}/terms`, params),

  filterAggregation: (categoryId: string | number) => {
    const cb = getDailyCacheBuster();
    const baseUrl = isDevelopment
      ? '/wp-json/leah/v1/filters'
      : 'https://leahcation.ru/wp/wp-json/leah/v1/filters';
    return {
      url: `${baseUrl}?category=${categoryId}&cb=${cb}`,
      options: { headers: { 'Accept': 'application/json' } },
    };
  },
};

export const getProxiedMediaUrl = (originalUrl: string): string => originalUrl;
