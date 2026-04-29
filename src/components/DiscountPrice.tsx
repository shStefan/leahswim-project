import React from 'react';
import { convertAndFormatPrice } from '../utils/priceUtils';

interface DiscountPriceProps {
  price: string;
  regularPrice?: string;
  salePrice?: string;
  priceHtml?: string;
  className?: string;
}

export const DiscountPrice: React.FC<DiscountPriceProps> = ({
  price,
  className = ''
}) => {
  // EN version: Always show regular price in EUR, no discounts
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    let cleanStr = priceStr.replace(',', '.');
    cleanStr = cleanStr.replace(/[^0-9.]/g, '');
    return parseFloat(cleanStr) || 0;
  };

  const numericPrice = parsePrice(price);

  return (
    <div className={className}>
      <span className="font-sans text-xs text-black">
        {numericPrice > 0 ? convertAndFormatPrice(numericPrice) : 'Price not available'}
      </span>
    </div>
  );
};