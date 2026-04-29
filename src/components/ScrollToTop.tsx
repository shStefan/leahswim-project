import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Store scroll positions and page numbers for catalog pages
const scrollPositions: { [key: string]: number } = {};
const pageNumbers: { [key: string]: number } = {};

// Export functions to save/restore page numbers
export const savePageNumber = (pathname: string, pageNumber: number) => {
  pageNumbers[pathname] = pageNumber;
};

export const getPageNumber = (pathname: string): number | undefined => {
  return pageNumbers[pathname];
};

export const clearPageNumber = (pathname: string) => {
  delete pageNumbers[pathname];
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const previousPathname = useRef<string>(pathname);
  const isRestoringScroll = useRef(false);

  // Save scroll position continuously for catalog pages
  useEffect(() => {
    const isCatalogPage = (path: string) => {
      return path.includes('/catalogue') || path.includes('/category/');
    };

    if (isCatalogPage(pathname)) {
      const handleScroll = () => {
        if (!isRestoringScroll.current) {
          scrollPositions[pathname] = window.scrollY;
        }
      };

      // Throttle scroll events
      let scrollTimeout: NodeJS.Timeout;
      const throttledScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 100);
      };

      window.addEventListener('scroll', throttledScroll, { passive: true });
      return () => {
        clearTimeout(scrollTimeout);
        window.removeEventListener('scroll', throttledScroll);
      };
    }
  }, [pathname]);

  // Handle navigation and scroll restoration
  useEffect(() => {
    const isCatalogPage = (path: string) => {
      return path.includes('/catalogue') || path.includes('/category/');
    };

    const isProductPage = (path: string) => {
      return path.includes('/product/');
    };

    const previousPath = previousPathname.current;

    // Only restore scroll position when:
    // 1. Current page is a catalog page
    // 2. Previous page was a product page (coming back from viewing a product)
    // 3. We have a saved scroll position for this exact pathname
    const shouldRestoreScroll = 
      isCatalogPage(pathname) && 
      isProductPage(previousPath) && 
      scrollPositions[pathname] !== undefined;

    if (shouldRestoreScroll) {
      isRestoringScroll.current = true;
      const savedPosition = scrollPositions[pathname];
      
      // Simple approach: wait a bit for content, then scroll
      setTimeout(() => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' });
        console.log(`📍 Restored scroll position ${savedPosition} for ${pathname}`);
        
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      }, 300);
    } else {
      // For all other cases, scroll to top
      window.scrollTo(0, 0);
      isRestoringScroll.current = false;
      
      // Clear saved scroll position when navigating to a new category
      if (isCatalogPage(pathname) && isCatalogPage(previousPath) && previousPath !== pathname) {
        console.log(`🔄 Navigating to new category - clearing scroll position`);
        delete scrollPositions[pathname];
      }
    }

    previousPathname.current = pathname;
  }, [pathname]);

  return null; // This component does not render anything
};

export default ScrollToTop; 