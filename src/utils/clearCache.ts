/**
 * Clear all localStorage cache for the application
 * This should be called when deploying new versions to ensure users get fresh data
 */
export const clearAllCache = () => {
  try {
    // Clear all cache entries
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Remove all WooCommerce cache entries
        if (key.startsWith('wcCategoryProducts_') || 
            key.startsWith('allWCCategories_') ||
            key.includes('Cache')) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove the keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`✅ Cleared ${keysToRemove.length} cache entries`);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Get cache version from localStorage
 */
export const getCacheVersion = (): string | null => {
  return localStorage.getItem('app_cache_version');
};

/**
 * Set cache version in localStorage
 */
export const setCacheVersion = (version: string) => {
  localStorage.setItem('app_cache_version', version);
};

/**
 * Check and clear cache if version has changed
 */
export const checkAndClearCache = (currentVersion: string) => {
  const storedVersion = getCacheVersion();
  
  if (storedVersion !== currentVersion) {
    console.log(`🔄 Cache version changed from ${storedVersion} to ${currentVersion}`);
    clearAllCache();
    setCacheVersion(currentVersion);
  }
};


