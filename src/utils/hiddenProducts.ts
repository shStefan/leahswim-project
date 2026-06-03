/**
 * Products that should be hidden from catalogue, category pages, and search results.
 * These products exist in WooCommerce but should not appear on the English storefront.
 * Add product parent IDs here to exclude them.
 */
export const HIDDEN_PRODUCT_IDS: Set<number> = new Set([
  113850,
  113832,
  113834,
  113824,
  113844,
  113848,
  113841,
  113843,
  113849, // Шляпа Томми (hat) — hidden on EN only
]);

/**
 * Check if a product should be hidden from the storefront.
 */
export const isProductHidden = (productId: number): boolean => {
  return HIDDEN_PRODUCT_IDS.has(productId);
};
