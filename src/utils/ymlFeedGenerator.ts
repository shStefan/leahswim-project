import { apiEndpoints } from './apiConfig';

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  stock_status: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    slug: string;
    options: string[];
  }>;
  variations?: number[];
}

interface YmlOffer {
  id: number;
  available: boolean;
  url: string;
  price: number;
  currencyId: string;
  categoryId: number;
  picture: string;
  name: string;
  description: string;
}

export class YmlFeedGenerator {
  private shopName: string;
  private shopUrl: string;
  private company: string;

  constructor(shopName: string, shopUrl: string, company: string) {
    this.shopName = shopName;
    this.shopUrl = shopUrl;
    this.company = company;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  private formatDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  private convertWooProductToYmlOffer(product: WooCommerceProduct): YmlOffer | null {
    // Skip products that are not published or out of stock
    if (product.status !== 'publish' || product.stock_status !== 'instock') {
      return null;
    }

    const price = parseFloat(product.price || product.regular_price || '0');
    if (price <= 0) {
      return null;
    }

    // Build frontend URL with relevant parameters
    let frontendUrl = `https://leahcation.com/product/${product.id}`;
    const urlParams = new URLSearchParams();
    
    // Add relevant parameters based on product attributes
    if (product.attributes && product.attributes.length > 0) {
      product.attributes.forEach(attribute => {
        // Check for color/print attributes (commonly used in your React app)
        if (attribute.slug === 'pa_cvet' || attribute.slug === 'pa_color' || attribute.slug === 'pa_print' || attribute.name.toLowerCase().includes('цвет') || attribute.name.toLowerCase().includes('принт')) {
          if (attribute.options && attribute.options.length > 0) {
            // Use the first available color/print option
            urlParams.set('print', attribute.options[0]);
          }
        }
        
        // Check for size attributes  
        if (attribute.slug === 'pa_size' || attribute.slug === 'pa_razmer' || attribute.name.toLowerCase().includes('размер') || attribute.name.toLowerCase().includes('size')) {
          if (attribute.options && attribute.options.length > 0) {
            // Use the first available size option
            urlParams.set('size', attribute.options[0]);
          }
        }
      });
    }
    
    // Append parameters to URL if any were found
    const paramString = urlParams.toString();
    if (paramString) {
      frontendUrl += '?' + paramString;
    }

    // Convert RUB to EUR (rate: 92 RUB = 1 EUR) and round to remove decimals
    const eurPrice = Math.round(price / 92);

    return {
      id: product.id,
      available: true,
      url: frontendUrl,
      price: eurPrice,
      currencyId: 'EUR',
      categoryId: product.categories.length > 0 ? product.categories[0].id : 1,
      picture: product.images.length > 0 ? product.images[0].src : '',
      name: product.name,
      description: product.short_description || product.description || ''
    };
  }

  private generateCategories(products: WooCommerceProduct[]): string {
    const categories = new Map<number, string>();
    
    products.forEach(product => {
      product.categories.forEach(category => {
        categories.set(category.id, category.name);
      });
    });

    let categoriesXml = '';
    categories.forEach((name, id) => {
      categoriesXml += `      <category id="${id}">${this.escapeXml(name)}</category>\n`;
    });

    return categoriesXml;
  }

  private generateOffers(products: WooCommerceProduct[]): string {
    let offersXml = '';
    
    products.forEach(product => {
      const offer = this.convertWooProductToYmlOffer(product);
      if (!offer) return;

      offersXml += `      <offer id="${offer.id}" available="${offer.available}">\n`;
      offersXml += `        <url>${this.escapeXml(offer.url)}</url>\n`;
      offersXml += `        <price>${offer.price}</price>\n`;
      offersXml += `        <currencyId>${offer.currencyId}</currencyId>\n`;
      offersXml += `        <categoryId>${offer.categoryId}</categoryId>\n`;
      
      if (offer.picture) {
        offersXml += `        <picture>${this.escapeXml(offer.picture)}</picture>\n`;
      }
      
      offersXml += `        <name>${this.escapeXml(offer.name)}</name>\n`;
      
      if (offer.description) {
        // Strip HTML tags and limit description length
        const cleanDescription = offer.description.replace(/<[^>]*>/g, '').substring(0, 512);
        offersXml += `        <description>${this.escapeXml(cleanDescription)}</description>\n`;
      }
      
      offersXml += `      </offer>\n`;
    });

    return offersXml;
  }

  public generateYmlFeed(products: WooCommerceProduct[]): string {
    const currentDate = this.formatDate();
    const categories = this.generateCategories(products);
    const offers = this.generateOffers(products);

    return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${currentDate}">
  <shop>
    <name>${this.escapeXml(this.shopName)}</name>
    <company>${this.escapeXml(this.company)}</company>
    <url>${this.escapeXml(this.shopUrl)}</url>
    <currencies>
      <currency id="EUR" rate="1"/>
    </currencies>
    <categories>
${categories}    </categories>
    <offers>
${offers}    </offers>
  </shop>
</yml_catalog>`;
  }
}

// Utility function to fetch products from WooCommerce
export async function fetchWooCommerceProducts(): Promise<WooCommerceProduct[]> {
  try {
    // Check if we're running in Node.js (server-side) or browser (client-side)
    const isServer = typeof window === 'undefined';
    
    // Use apiEndpoints which handles dev/prod logic automatically
    const { url, options } = apiEndpoints.products('per_page=100&status=publish');
    
    console.log(`Fetching from: ${url} (${isServer ? 'server' : 'client'} side)`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const products = await response.json();
    console.log(`Fetched ${products.length} products from WooCommerce`);
    return products;
  } catch (error) {
    console.error('Error fetching WooCommerce products:', error);
    return [];
  }
}

// Main function to generate YML feed
export async function generateYandexFeed(): Promise<string> {
  const products = await fetchWooCommerceProducts();
  const generator = new YmlFeedGenerator(
    'Leahcation', // Your shop name
    'https://leahcation.com', // Your shop URL (English version)
    'Leahcation' // Your company name
  );
  
  return generator.generateYmlFeed(products);
}