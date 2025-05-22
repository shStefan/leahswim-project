export interface Product {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  handle: string;
  categories?: Array<{
    id: string;
    name: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    prices: Array<{
      amount: number;
      currency_code: string;
    }>;
    calculated_price?: {
      calculated_amount: number;
    };
  }>;
  options: Array<{
    id: string;
    title: string;
    values: Array<{
      id: string;
      value: string;
    }>;
  }>;
} 