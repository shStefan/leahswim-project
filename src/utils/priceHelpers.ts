// Utility function to get the actual price to charge (discounted if available)
export const getActualPrice = (product: any): string => {
    // Helper function to parse price strings and remove non-numeric characters
    const parsePrice = (priceStr: string): number => {
        if (!priceStr) return 0;
        // Handle Russian formatting: "13 000,00" -> "13000.00"
        let cleanStr = priceStr.replace(',', '.');
        cleanStr = cleanStr.replace(/[^0-9.]/g, '');
        return parseFloat(cleanStr) || 0;
    };

    // Helper function to parse WooCommerce price HTML
    const parseWooCommercePriceHtml = (html: string): { discountedPrice: number } | null => {
        if (!html) return null;

        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const insElement = tempDiv.querySelector('ins');

            if (insElement) {
                const discountedText = insElement.textContent || '';
                const discountedPrice = parsePrice(discountedText);

                if (discountedPrice > 0) {
                    return { discountedPrice };
                }
            }
        } catch (error) {
            console.warn('Failed to parse WooCommerce price HTML:', error);
        }

        return null;
    };

    // First try to get discounted price from price_html
    if (product.price_html) {
        const htmlParsed = parseWooCommercePriceHtml(product.price_html);
        if (htmlParsed) {
            return String(Math.round(htmlParsed.discountedPrice));
        }
    }

    // Fallback to sale_price if available
    if (product.sale_price && parsePrice(product.sale_price) > 0) {
        return product.sale_price;
    }

    // Finally use regular price or current price
    return product.price;
};
