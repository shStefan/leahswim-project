// English version - EUR pricing utilities

const RUB_TO_EUR_RATE = 92;

/**
 * Convert RUB price to EUR and format without decimals
 */
export const convertToEUR = (rubPrice: number | string): number => {
  const numericPrice = typeof rubPrice === 'string' 
    ? parseFloat(rubPrice.replace(/[^0-9.]/g, '')) 
    : rubPrice;
  
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return 0;
  }
  
  return Math.round(numericPrice / RUB_TO_EUR_RATE);
};

/**
 * Format EUR price for display (no decimals)
 */
export const formatEURPrice = (eurPrice: number): string => {
  return `€${Math.round(eurPrice)}`;
};

/**
 * Convert RUB price string to EUR display format
 */
export const convertAndFormatPrice = (rubPrice: number | string): string => {
  const eurPrice = convertToEUR(rubPrice);
  return formatEURPrice(eurPrice);
};

/**
 * Parse currency string to EUR number (for cart calculations)
 */
export const parseCurrencyEUR = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // If it's already in EUR format, parse it
  if (currencyString.includes('€')) {
    const numericString = currencyString.replace(/[^0-9.]/g, '');
    const value = parseFloat(numericString);
    return isNaN(value) ? 0 : value;
  }
  
  // If it's in RUB format, convert it
  const numericString = currencyString.replace(/[^0-9.]/g, '');
  const rubValue = parseFloat(numericString);
  if (isNaN(rubValue)) return 0;
  
  return convertToEUR(rubValue);
};