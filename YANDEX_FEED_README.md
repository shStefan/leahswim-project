# Yandex YML Feed Generator

This system generates a Yandex-compatible YML feed from your WooCommerce products.

## Features

- ✅ Fetches products from WooCommerce API
- ✅ Generates Yandex YML format compliant with [requirements](https://yandex.com/support/direct/ru/feeds/requirements-yml.html)
- ✅ Filters only published and in-stock products
- ✅ Proper XML encoding and character escaping
- ✅ Categories and product hierarchies
- ✅ RUB currency support
- ✅ Image and description handling

## How to Use

### 1. Development Mode

Start your development server:
```bash
npm run dev
```

### 2. Access the Feed Generator

Visit: `http://localhost:5173/admin/yandex-feed`

This page provides:
- **Preview Feed**: View the generated YML in a new window
- **Download YML Feed**: Download the feed as a `.yml` file

### 3. Direct Feed URL

Your YML feed is automatically available at:
- Development: `http://localhost:5173/yandex-feed.yml`
- Production: `https://your-domain.com/yandex-feed.yml`

### 4. For Yandex Integration

1. Use the feed URL in your Yandex Merchant account
2. Feed updates automatically based on your WooCommerce inventory
3. Feed is cached for 1 hour to improve performance

## YML Feed Structure

The generated feed follows this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2024-01-15 12:00">
  <shop>
    <name>Leahcation</name>
    <company>Leahcation Company</company>
    <url>https://leahcation.ru</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
      <category id="1">Category Name</category>
    </categories>
    <offers>
      <offer id="123" available="true">
        <url>https://leahcation.ru/product/123</url>
        <price>1500</price>
        <currencyId>RUB</currencyId>
        <categoryId>1</categoryId>
        <picture>https://example.com/image.jpg</picture>
        <name>Product Name</name>
        <description>Product description</description>
      </offer>
    </offers>
  </shop>
</yml_catalog>
```

## Product Filtering

The system automatically filters products:
- ✅ Only `published` products
- ✅ Only `instock` products  
- ✅ Only products with valid prices > 0
- ❌ Excludes draft/private products
- ❌ Excludes out-of-stock products
- ❌ Excludes products without prices

## Configuration

To customize the feed, edit `src/utils/ymlFeedGenerator.ts`:

```typescript
const generator = new YmlFeedGenerator(
  'Your Shop Name',        // Shop name
  'https://your-site.com', // Shop URL
  'Your Company Name'      // Company name
);
```

## Production Deployment

For production deployment with Vercel:

1. The feed will be automatically available at `/yandex-feed.yml`
2. Ensure your WooCommerce API is accessible
3. Update CORS settings if needed
4. Test the feed URL after deployment

## Troubleshooting

### Feed not generating:
- Check WooCommerce API connectivity
- Verify proxy configuration in `vite.config.ts`
- Check browser console for errors

### Empty feed:
- Ensure products are published and in-stock
- Check product prices are set
- Verify categories are assigned

### CORS issues:
- Update your WooCommerce CORS settings
- Check proxy configuration in `vite.config.ts`

## Technical Details

- **Feed Format**: Yandex YML (XML-based)
- **Currency**: RUB (Russian Ruble)
- **Caching**: 1 hour server-side cache
- **Encoding**: UTF-8
- **Max Description**: 512 characters (HTML stripped)
- **Product Limit**: 100 per page (can be increased)

## File Structure

```
src/
├── utils/ymlFeedGenerator.ts     # Core YML generation logic
├── components/YandexFeedGenerator.tsx # React UI component
├── api/yandex-feed.ts           # API route handler
└── App.tsx                      # Route configuration

vite.config.ts                   # Server middleware setup
```