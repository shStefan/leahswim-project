import type { VercelRequest, VercelResponse } from '@vercel/node';

// WooCommerce API credentials for Elementor website (English version)
const WC_CONSUMER_KEY = 'ck_ff9c4383fa5c871c9b39e47b6d5a421a92136364';
const WC_CONSUMER_SECRET = 'cs_5a31a98c30e4b1617a5873ff2ea42699922f2545';
const WC_API_URL = 'https://zdqksnii.elementor.cloud/wp-json/wc/v3';

// Helper function to handle base64 encoding in Node.js
const base64Encode = (str: string): string => {
  return Buffer.from(str).toString('base64');
};

interface WooCommerceProduct {
  id: number;
  name: string;
  permalink: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    src: string;
    alt: string;
  }>;
  short_description: string;
  description: string;
  attributes: Array<{
    id: number;
    name: string;
    slug: string;
    options: string[];
  }>;
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

// Utility function to fetch products from WooCommerce
async function fetchWooCommerceProducts(): Promise<WooCommerceProduct[]> {
  try {
    const wooApiUrl = `${WC_API_URL}/products?per_page=100&status=publish`;
    const headers = {
      'Authorization': 'Basic ' + base64Encode(WC_CONSUMER_KEY + ':' + WC_CONSUMER_SECRET),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    console.log(`Fetching from: ${wooApiUrl} (server side)`);

    const response = await fetch(wooApiUrl, { headers });

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

class YmlFeedGenerator {
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDate(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    return `${date} ${time}`;
  }

  private convertWooProductToYmlOffer(product: WooCommerceProduct): YmlOffer | null {
    // Skip products that are not published or have no price
    if (product.status !== 'publish') {
      return null;
    }

    const price = parseFloat(product.sale_price || product.regular_price || product.price);
    if (!price || price <= 0) {
      return null;
    }

    // Generate frontend URL with proper domain (English version)
    let frontendUrl = `https://leahcation.com/product/${product.id}`;
    const urlParams = new URLSearchParams();

    // Extract color/print and size from attributes
    if (product.attributes && product.attributes.length > 0) {
      product.attributes.forEach(attribute => {
        // Check for color/print attributes
        if (attribute.slug === 'pa_cvet' || attribute.slug === 'pa_color' || attribute.slug === 'pa_print' || 
            attribute.name.toLowerCase().includes('цвет') || attribute.name.toLowerCase().includes('принт')) {
          if (attribute.options && attribute.options.length > 0) {
            urlParams.set('print', attribute.options[0]);
          }
        }
        // Check for size attributes
        if (attribute.slug === 'pa_size' || attribute.slug === 'pa_razmer' || 
            attribute.name.toLowerCase().includes('размер') || attribute.name.toLowerCase().includes('size')) {
          if (attribute.options && attribute.options.length > 0) {
            urlParams.set('size', attribute.options[0]);
          }
        }
      });
    }

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

  async generateYmlFeedContent(): Promise<string> {
    const products = await fetchWooCommerceProducts();
    const offers = products
      .map(product => this.convertWooProductToYmlOffer(product))
      .filter((offer): offer is YmlOffer => offer !== null);

    // Generate categories from products
    const categoriesMap = new Map<number, string>();
    products.forEach(product => {
      product.categories.forEach(category => {
        categoriesMap.set(category.id, category.name);
      });
    });

    const categoriesXml = Array.from(categoriesMap.entries())
      .map(([id, name]) => `    <category id="${id}">${this.escapeXml(name)}</category>`)
      .join('\n');

    const offersXml = offers
      .map(offer => `    <offer id="${offer.id}" available="${offer.available}">
      <url>${this.escapeXml(offer.url)}</url>
      <price>${offer.price}</price>
      <currencyId>${offer.currencyId}</currencyId>
      <categoryId>${offer.categoryId}</categoryId>
      ${offer.picture ? `<picture>${this.escapeXml(offer.picture)}</picture>` : ''}
      <name>${this.escapeXml(offer.name)}</name>
      <description>${this.escapeXml(offer.description)}</description>
    </offer>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${this.formatDate()}">
  <shop>
    <name>Leahcation</name>
    <company>Leahcation</company>
               <url>https://leahcation.com</url>
    <currencies>
      <currency id="EUR" rate="1"/>
    </currencies>
    <categories>
${categoriesXml || '      <category id="1">Товары</category>'}
    </categories>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🔥 Vercel API route triggered!', req.method, req.url);
  
  if (req.method !== 'GET') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Creating YML generator...');
    const generator = new YmlFeedGenerator();
    
    console.log('⚡ Generating YML content...');
    const ymlContent = await generator.generateYmlFeedContent();
    
    console.log('✅ YML content generated successfully:', ymlContent.length, 'characters');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('Content-Disposition', 'inline; filename="yandex-feed.yml"');
    
    return res.status(200).send(ymlContent);
  } catch (error) {
    console.error('❌ Error generating Yandex feed:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      error: 'Failed to generate feed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack') : undefined
    });
  }
}