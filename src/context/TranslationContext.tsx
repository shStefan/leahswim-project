import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types for our translation system
export type Language = 'ru' | 'en';

export interface TranslationCache {
  [key: string]: {
    [lang in Language]?: string;
  };
}

export interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string, targetLang?: Language) => Promise<string>;
  isTranslating: boolean;
  availableLanguages: Language[];
  isReady: boolean; // New: indicates when English context is fully loaded
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation service for dynamic content
class TranslationService {
  private cache: TranslationCache = {};
  private readonly CACHE_KEY = 'triangl_translations';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.timestamp && Date.now() - data.timestamp < this.CACHE_EXPIRY) {
          this.cache = data.cache || {};
        }
      }
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
    }
  }

  private saveCache(): void {
    try {
      const data = {
        cache: this.cache,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  private getCacheKey(text: string): string {
    return text.toLowerCase().trim();
  }

  // Static product name mappings
  private staticProductNames: Record<string, string> = {
    'туника st. tropez': 'St. Tropez Tunic',
    'блуза': 'Blouse',
    'бра двустороннее': 'Reversible Bra',
    'плавки двусторонние': 'Reversible Bottoms',
    'платье из вискозы': 'Viscose Dress',
    'туника двусторонняя': 'Reversible Tunic',
    'туника с капюшоном из муслина': 'Muslin Hooded Tunic',
    'шорты миди из хлопка': 'Cotton Midi Shorts',
    'рубашка с коротким рукавом из хлопка': 'Cotton Short-Sleeve Shirt',
    'купальник слитный vita классика': 'Vita Classic One-Piece Swimsuit',
    'бикини бра двустороннее': 'Reversible Bikini Bra',
    'бра бандо двустороннее': 'Reversible Bandeau Bra',
    'бра бандо двустороннее plus size': 'Reversible Bandeau Bra Plus Size',
    'бра ким двустороннее plus size': 'Reversible Kim Bra Plus Size',
    'парео': 'Pareo',
    'плавки martina двусторонние plus size': 'Reversible Martina Bottoms Plus Size',
    'плавки классика двусторонние plus size': 'Reversible Classic Bottoms Plus Size',
    'плавки с завышенной талией двусторонние': 'Reversible High-Waist Bottoms',
    'плавки с заниженной талией двусторонние': 'Reversible Low-Waist Bottoms',
    'топ на молнии однотонный': 'Solid Zip-Front Top',
    'плавки бикини двусторонние': 'Reversible Bikini Bottoms',
    'брюки из хлопка': 'Cotton Pants',
    'рубашка с длинным рукавом из хлопка': 'Cotton Long-Sleeve Shirt',
    'бра бикини': 'Bikini Bra',
    'бра ким двустороннее': 'Reversible Kim Bra',
    'шляпа fedora': 'Fedora Hat',
    'шляпа daffodil': 'Daffodil Hat',
    'бра zemfira двустороннее': 'Reversible Zemfira Bra',
    'шляпа bobby': 'Bobby Hat',
    'шляпа jockey': 'Jockey Hat',
    'козырек funky': 'Funky Visor',
    'шляпа cowgirl': 'Cowgirl Hat',
    'купальник renata': 'Renata Swimsuit',
    'плавки классика двусторонние': 'Reversible Classic Bottoms',
    'купальник romper двусторонний': 'Reversible Romper Swimsuit',
    'спортивный купальник с коротким рукавом': 'Short-Sleeve Sport Swimsuit',
    'купальник слитный двусторонний': 'Reversible One-Piece Swimsuit',
    'туника nomad': 'Nomad Tunic',
    'платье sicilia': 'Sicilia Dress',
    'шорты corfu из хлопка': 'Corfu Cotton Shorts',
    'туника трансформер': 'Convertible Tunic',
    'шорты двусторонние': 'Reversible Shorts',
    'рубашка двусторонняя': 'Reversible Shirt',
    'туника mykonos': 'Mykonos Tunic',
    'брюки бананы льняные': 'Linen Banana Pants',
    'облегающая льняная рубашка с длинным рукавом': 'Fitted Linen Long-Sleeve Shirt',
    'брюки': 'Pants',
    'шорты миди': 'Midi Shorts',
    'рубашка с длинным рукавом': 'Long-Sleeve Shirt',
    'рубашка с коротким рукавом': 'Short-Sleeve Shirt',
    'кимоно': 'Kimono',
    'слитный купальник miranda двусторонний plus size': 'Reversible Miranda One-Piece Plus Size',
    'слитный купальник mariella двусторонний plus size': 'Reversible Mariella One-Piece Plus Size',
    'плавки с завышенной талией двусторонние plus size': 'Reversible High-Waist Bottoms Plus Size',
    'туника двусторонняя aureglia': 'Aureglia Reversible Tunic',
    'платье-рубашка': 'Shirt Dress',
    'портупея rihanna': 'Rihanna Harness',
    'портупея beyonce': 'Beyonce Harness',
    'пояс kylie': 'Kylie Belt',
    'шляпа orion': 'Orion Hat',
    'шляпа phoenix': 'Phoenix Hat',
    'шляпа cassiopea': 'Cassiopea Hat',
    'рюкзак': 'Backpack',
    'бра классика': 'Classic Bra',
    'корзина из ротанга': 'Rattan Basket',
    'плавки бикини': 'Bikini Bottoms',
    'плавки классика': 'Classic Bottoms',
    'плавки с завышенной талией': 'High-Waist Bottoms',
    'плавки с заниженной талией': 'Low-Waist Bottoms',
    'платье миди tamara': 'Tamara Midi Dress',
    'платье мини tamara': 'Tamara Mini Dress',
    'свитшот paisley grey melange': 'Paisley Grey Melange Sweatshirt',
    'свитшот двусторонний из флиса paisley orange': 'Reversible Paisley Orange Fleece Sweatshirt',
    'сумка-мешок': 'Bucket Bag',
    'шорты corfu': 'Corfu Shorts',
    'шляпа anemone': 'Anemone Hat',
    'шляпа dahlia': 'Dahlia Hat',
    'шляпа rose': 'Rose Hat',
    'бра майка': 'Tank Bra',
    'бра "ким"': 'Kim Bra',
    'брюки двусторонние из флиса paisley orange': 'Reversible Paisley Orange Fleece Pants',
    'свитшот paisley black': 'Paisley Black Sweatshirt',
    'бра классика': 'Classic Bra',
    'брюки paisley grey melange': 'Paisley Grey Melange Pants',
    'худи paisley grey melange': 'Paisley Grey Melange Hoodie',
    'твилли (двустороннее)': 'Reversible Twilly',
    'шорты мини corfu': 'Corfu Mini Shorts',
    'худи paisley black': 'Paisley Black Hoodie',
    'шорты': 'Shorts',
    'брюки paisley black': 'Paisley Black Pants',
    'слитный классика vita': 'Vita Classic One-Piece',
    'слитный amanda vita': 'Amanda Vita One-Piece',
    'платье': 'Dress',
    'топ на молнии голограмма': 'Hologram Zip-Front Top',
    'ветровка': 'Windbreaker',
    'леггинсы с принтом': 'Printed Leggings',
    'леггинсы однотонные': 'Solid Leggings',
    'леггинсы голограмма': 'Hologram Leggings',
    'велосипедки с принтом': 'Printed Biker Shorts',
    'топ двусторонний': 'Reversible Top',
    'топ на молнии с принтом': 'Printed Zip-Front Top',
    'бра бикини': 'Bikini Bra',
    'шляпа whisper': 'Whisper Hat',
    'слитный купальник eva': 'Eva One-Piece Swimsuit',
    'спортивный купальник с длинным рукавом': 'Long-Sleeve Sport Swimsuit',
    'бра бандо': 'Bandeau Bra',
    'слитный купальник классика': 'Classic One-Piece Swimsuit',
    'топ santorini': 'Santorini Top',
    'платок': 'Scarf',
    'шерстяная рубашка с длинным рукавом': 'Wool Long-Sleeve Shirt',
    'шерстяные брюки': 'Wool Pants',
    'бра классика двустороннее': 'Reversible Classic Bra',
    'купальник слитный двусторонний классика': 'Reversible Classic One-Piece',
    'бикини бра двустороннее': 'Reversible Bikini Bra',
    'шорты мини': 'Mini Shorts',
    'сеты': 'Sets',
    'раздельные': 'Separates',
    'слитые': 'One-Piece',
  };

  async translateText(text: string, targetLang: Language = 'en'): Promise<string> {
    if (!text || text.trim() === '') return text;
    
    const cacheKey = this.getCacheKey(text);
    
    // Check static product name mappings first
    if (targetLang === 'en' && this.staticProductNames[cacheKey]) {
      return this.staticProductNames[cacheKey];
    }
    
    // Check cache
    if (this.cache[cacheKey]?.[targetLang]) {
      return this.cache[cacheKey][targetLang]!;
    }

    try {
      // Use LibreTranslate API (free, open source)
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'ru',
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translatedText || text;

      // Cache the translation
      if (!this.cache[cacheKey]) {
        this.cache[cacheKey] = {};
      }
      this.cache[cacheKey][targetLang] = translatedText;
      this.saveCache();

      return translatedText;
    } catch (error) {
      console.warn('Translation failed, using fallback:', error);
      
      // Fallback to Google Translate (client-side, free)
      try {
        const fallbackResponse = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        );
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackTranslation = fallbackData[0]?.[0]?.[0] || text;
          
          // Cache the fallback translation
          if (!this.cache[cacheKey]) {
            this.cache[cacheKey] = {};
          }
          this.cache[cacheKey][targetLang] = fallbackTranslation;
          this.saveCache();
          
          return fallbackTranslation;
        }
      } catch (fallbackError) {
        console.warn('Fallback translation also failed:', fallbackError);
      }
      
      return text; // Return original text if all translation methods fail
    }
  }
}

const translationService = new TranslationService();

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // English-only version - always default to 'en'
    return 'en';
  });
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // No localStorage saving since language is determined by URL
  }, []);

  // English-only version - no URL-based language switching needed
  useEffect(() => {
    // Keep language fixed to 'en' in English-only version
    setLanguageState('en');
    // Set ready after a brief delay to ensure everything is initialized
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  const translateDynamic = useCallback(async (text: string, targetLang: Language = language): Promise<string> => {
    if (targetLang === 'ru') return text; // No translation needed for Russian
    
    setIsTranslating(true);
    try {
      const translated = await translationService.translateText(text, targetLang);
      return translated;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Static translations (will be expanded)
  const staticTranslations: Record<string, Record<Language, string>> = {
    // Navigation
    'nav.swimwear': { ru: 'Купальники', en: 'Swimwear' },
    'nav.clothing': { ru: 'Одежда', en: 'Clothing' },
    'nav.sport': { ru: 'Спорт', en: 'Sport' },
    'nav.plussize': { ru: 'Plus size', en: 'Plus size' },
    'nav.accessories': { ru: 'Аксессуары', en: 'Accessories' },
    'nav.basic': { ru: 'Базовая коллекция', en: 'Basic Collection' },
    'nav.kids': { ru: 'Детская одежда', en: 'Kids Clothing' },
    'nav.home': { ru: 'Главная', en: 'Home' },
    'nav.about': { ru: 'О нас', en: 'About Us' },
    'nav.contact': { ru: 'Контакты', en: 'Contact' },
    'nav.category': { ru: 'Категория', en: 'Category' },

    // Footer
    'footer.support': { ru: 'Поддержка клиентов', en: 'Customer Support' },
    'footer.contact': { ru: 'Связаться с нами', en: 'Contact Us' },
    'footer.delivery': { ru: 'Доставка', en: 'Delivery' },
    'footer.sizeChart': { ru: 'Размерная сетка', en: 'Size Chart' },
    'footer.returns': { ru: 'Возвраты', en: 'Returns' },
    'footer.information': { ru: 'Информация', en: 'Information' },
    'footer.payment': { ru: 'Оплата', en: 'Payment' },
    'footer.brand': { ru: 'Бренд', en: 'Brand' },
    'footer.catalog': { ru: 'Каталог', en: 'Catalog' },
    'footer.social': { ru: 'Социальные сети', en: 'Social Media' },
    'footer.contacts': { ru: 'Контакты', en: 'Contacts' },
    'footer.offer': { ru: 'Публичная оферта', en: 'Public Offer' },

    // Contact Page
    'contact.phone': { ru: 'Телефон', en: 'Phone' },
    'contact.location': { ru: 'Самовывоз', en: 'Pickup' },
    'contact.wholesale': { ru: 'Для оптовых заказов продукции LÉAH', en: 'For LÉAH wholesale orders' },
    'contact.email': { ru: 'Email', en: 'Email' },

    // Common
    'common.loading': { ru: 'Загрузка...', en: 'Loading...' },
    'common.error': { ru: 'Ошибка', en: 'Error' },
    'common.retry': { ru: 'Повторить', en: 'Retry' },
    'common.close': { ru: 'Закрыть', en: 'Close' },
    'common.save': { ru: 'Сохранить', en: 'Save' },
    'common.cancel': { ru: 'Отмена', en: 'Cancel' },
    'common.search': { ru: 'Поиск', en: 'Search' },
    'common.filter': { ru: 'Фильтр', en: 'Filter' },
    'common.price': { ru: 'Цена', en: 'Price' },
    'common.size': { ru: 'Размер', en: 'Size' },
    'common.color': { ru: 'Цвет', en: 'Color' },
    'common.addToCart': { ru: 'Добавить в корзину', en: 'Add to Cart' },
    'common.cart': { ru: 'Корзина', en: 'Cart' },
    'common.checkout': { ru: 'Оформить заказ', en: 'Checkout' },
    'common.goTo': { ru: 'Перейти', en: 'Go to' },
    'common.quantity': { ru: 'Кол-во', en: 'Quantity' },
    'common.sort': { ru: 'Сортировать', en: 'Sort' },
    'common.showingProducts': { ru: 'Показано {count} товаров', en: 'Showing {count} products' },
    'common.vpnMessage': { ru: 'Пожалуйста, не забудьте отключить VPN', en: 'Please remember to turn off VPN' },
    'common.selectSize': { ru: 'Выберите размер', en: 'Select size' },
    'common.selectColor': { ru: 'Выберите цвет', en: 'Select color' },
    'common.selectedSize': { ru: 'Выбранный размер', en: 'Selected size' },
    'common.selectedColor': { ru: 'Выбранный цвет', en: 'Selected color' },
    'common.priceAscending': { ru: 'Цена: по возрастанию', en: 'Price: Low to High' },
    'common.priceDescending': { ru: 'Цена: по убыванию', en: 'Price: High to Low' },
    'common.pleaseSelectOptions': { ru: 'Пожалуйста, выберите все опции товара (например, размер).', en: 'Please select all product options (e.g., size).' },
    'common.filters': { ru: 'Фильтры', en: 'Filters' },
    'common.all': { ru: 'Все', en: 'All' },
    'common.allCategories': { ru: 'Все категории', en: 'All Categories' },
    'common.clearAll': { ru: 'Очистить все', en: 'Clear All' },
    'common.allSubcategories': { ru: 'Все подкатегории', en: 'All Subcategories' },
    'common.showResults': { ru: 'Показать {count} результатов', en: 'Show {count} results' },
    'common.filtersFor': { ru: 'Фильтры для', en: 'Filters for' },
    'common.clearSize': { ru: 'Очистить размер', en: 'Clear size' },
    'common.clearColor': { ru: 'Очистить цвет', en: 'Clear color' },
    'common.clearMainCategory': { ru: 'Очистить основную категорию', en: 'Clear main category' },
    'common.clearSubCategory': { ru: 'Очистить подкатегорию', en: 'Clear subcategory' },
    
    // Category names for top section
    'category.sets': { ru: 'Сеты', en: 'Sets' },
    'category.separates': { ru: 'Раздельные', en: 'Separates' },
    'category.onepiece': { ru: 'Слитые', en: 'One-Piece' },

    // Cart translations
    'cart.title': { ru: 'КОРЗИНА', en: 'CART' },
    'cart.titleEn': { ru: 'КОРЗИНА', en: 'CART' },
    'cart.empty': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'cart.emptyEn': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'cart.checkout': { ru: 'ОФОРМИТЬ ЗАКАЗ', en: 'PLACE ORDER' },
    'cart.checkoutEn': { ru: 'ОФОРМИТЬ ЗАКАЗ', en: 'PLACE ORDER' },
    'cart.discount': { ru: 'Скидка', en: 'Discount' },
    'cart.discountEn': { ru: 'Скидка', en: 'Discount' },
    'cart.total': { ru: 'ИТОГО:', en: 'TOTAL:' },
    'cart.totalEn': { ru: 'ИТОГО:', en: 'TOTAL:' },
    'cart.remove': { ru: 'Удалить товар', en: 'Remove item' },
    'cart.removeEn': { ru: 'Удалить товар', en: 'Remove item' },
    
    // Favorites translations
    'favorites.title': { ru: 'ИЗБРАННОЕ', en: 'FAVORITES' },
    'favorites.titleEn': { ru: 'ИЗБРАННОЕ', en: 'FAVORITES' },
    'favorites.empty': { ru: 'Список избранного пуст.', en: 'Favorites list is empty.' },
    'favorites.emptyEn': { ru: 'Список избранного пуст.', en: 'Favorites list is empty.' },
    'favorites.unlike': { ru: 'Unlike', en: 'Unlike' },
    'favorites.unlikeEn': { ru: 'Unlike', en: 'Unlike' },
    
    // Product page translations
    'product.addToCart': { ru: 'В КОРЗИНУ', en: 'ADD TO CART' },
    'product.addToCartEn': { ru: 'В КОРЗИНУ', en: 'ADD TO CART' },
    'product.adding': { ru: 'ДОБАВЛЕНИЕ...', en: 'ADDING...' },
    'product.addingEn': { ru: 'ДОБАВЛЕНИЕ...', en: 'ADDING...' },
    'product.parameters': { ru: 'Параметры изделия', en: 'Product Parameters' },
    'product.parametersEn': { ru: 'Параметры изделия', en: 'Product Parameters' },
    'product.delivery': { ru: 'Доставка', en: 'Delivery' },
    'product.deliveryEn': { ru: 'Доставка', en: 'Delivery' },
    'product.returns': { ru: 'Возврат', en: 'Returns' },
    'product.returnsEn': { ru: 'Возврат', en: 'Returns' },
    'product.noDescription': { ru: 'Описание товара отсутствует.', en: 'Product description is missing.' },
    'product.noDescriptionEn': { ru: 'Описание товара отсутствует.', en: 'Product description is missing.' },
    'product.composition': { ru: 'Состав:', en: 'Composition:' },
    'product.compositionEn': { ru: 'Состав:', en: 'Composition:' },
    'product.countryOfOrigin': { ru: 'Страна производства:', en: 'Country of production:' },
    'product.countryOfOriginEn': { ru: 'Страна производства:', en: 'Country of production:' },
    'product.onModel': { ru: 'На модели:', en: 'On model:' },
    'product.onModelEn': { ru: 'На модели:', en: 'On model:' },
    'product.modelParameters': { ru: 'Параметры модели:', en: 'Model parameters:' },
    'product.modelParametersEn': { ru: 'Параметры модели:', en: 'Model parameters:' },
    'product.parametersForSize': { ru: 'Параметры изделия для размера', en: 'Product parameters for size' },
    'product.parametersForSizeEn': { ru: 'Параметры изделия для размера', en: 'Product parameters for size' },
    
    // Delivery details
    'delivery.withinMKAD': { ru: 'СДЭК Москва: По Москве и в пределах МКАД — 750 ₽', en: 'CDEK Moscow: Within Moscow and MKAD — €8' },
    'delivery.withinMKADEn': { ru: 'СДЭК Москва: По Москве и в пределах МКАД — 750 ₽', en: 'CDEK Moscow: Within Moscow and MKAD — €8' },
    'delivery.outsideMKAD20': { ru: 'За пределами МКАД — 1500 ₽', en: 'Outside MKAD — €16' },
    'delivery.outsideMKAD20En': { ru: 'За пределами МКАД — 1500 ₽', en: 'Outside MKAD — €16' },
    'delivery.outsideMKADOver20': { ru: 'СДЭК РФ: Доставка СДЭК по всей России. Стоимость доставки рассчитывается согласно тарифам компании СДЭК. Срок доставки (без учета времени на формирование заказа) зависит от адреса получателя', en: 'CDEK Russia: CDEK delivery throughout Russia. Delivery cost is calculated according to CDEK company tariffs. Delivery time (excluding order processing time) depends on the recipient\'s address' },
    'delivery.outsideMKADOver20En': { ru: 'СДЭК РФ: Доставка СДЭК по всей России. Стоимость доставки рассчитывается согласно тарифам компании СДЭК. Срок доставки (без учета времени на формирование заказа) зависит от адреса получателя', en: 'CDEK Russia: CDEK delivery throughout Russia. Delivery cost is calculated according to CDEK company tariffs. Delivery time (excluding order processing time) depends on the recipient\'s address' },
    'delivery.international': { ru: 'Самовывоз без примерки: г.Москва, ул. Новая Басманная, д.19стр1', en: 'Pickup without fitting: Moscow, ul. Novaya Basmannaya, 19bld1' },
    'delivery.internationalEn': { ru: 'Самовывоз без примерки: г.Москва, ул. Новая Басманная, д.19стр1', en: 'Pickup without fitting: Moscow, ul. Novaya Basmannaya, 19bld1' },
    'delivery.byPhone': { ru: 'По телефону: +7 (926) 879-28-78', en: 'By phone: +7 (926) 879-28-78' },
    'delivery.byPhoneEn': { ru: 'По телефону: +7 (926) 879-28-78', en: 'By phone: +7 (926) 879-28-78' },
    'delivery.byEmail': { ru: 'По почте: info@leahcation.ru', en: 'By email: info@leahcation.com' },
    'delivery.byEmailEn': { ru: 'По почте: info@leahcation.ru', en: 'By email: info@leahcation.com' },
    
    // Returns details
    'returns.conditions': { ru: 'Товар должен быть новым, товарный вид полностью сохранен, товар не был использован, отсутствуют признаки деформации и механические повреждения, отсутствуют пятна, затяжки, посторонние запахи; Все вшитые ярлыки, этикетки, пломбы на товаре сохранены и не повреждены, присутствует оригинальная упаковка, а также чеки, подтверждающие покупку. На товары из серебра, украшения и ювелирные изделия, возврат не предусмотрен.', en: 'The product must be new, the appearance fully preserved, the product was not used, there are no signs of deformation and mechanical damage, no stains, snags, foreign odors; All sewn-in labels, tags, seals on the product are preserved and undamaged, original packaging is present, as well as receipts confirming the purchase. Returns are not provided for silver items, jewelry and jewelry products.' },
    'returns.conditionsEn': { ru: 'Товар должен быть новым, товарный вид полностью сохранен, товар не был использован, отсутствуют признаки деформации и механические повреждения, отсутствуют пятна, затяжки, посторонние запахи; Все вшитые ярлыки, этикетки, пломбы на товаре сохранены и не повреждены, присутствует оригинальная упаковка, а также чеки, подтверждающие покупку. На товары из серебра, украшения и ювелирные изделия, возврат не предусмотрен.', en: 'The product must be new, the appearance fully preserved, the product was not used, there are no signs of deformation and mechanical damage, no stains, snags, foreign odors; All sewn-in labels, tags, seals on the product are preserved and undamaged, original packaging is present, as well as receipts confirming the purchase. Returns are not provided for silver items, jewelry and jewelry products.' },
    'returns.toArrange': { ru: 'Для оформления возврата, пожалуйста, свяжитесь с нами:', en: 'To arrange a return, please contact us:' },
    'returns.toArrangeEn': { ru: 'Для оформления возврата, пожалуйста, свяжитесь с нами:', en: 'To arrange a return, please contact us:' },
    'returns.byPhone': { ru: 'По телефону: +7 926 879-28-78', en: 'By phone: +7 926 879-28-78' },
    'returns.byPhoneEn': { ru: 'По телефону: +7 926 879-28-78', en: 'By phone: +7 926 879-28-78' },
    'returns.byEmail': { ru: 'По почте: info@leahswim.com', en: 'By email: info@leahswim.com' },
    'returns.byEmailEn': { ru: 'По почте: info@leahswim.com', en: 'By email: info@leahswim.com' },
    'returns.law': { ru: 'В соответствии с Законом о защите прав потребителей No2300-1 от 1992 г. (далее ЗоЗПП), купальники возврату или обмену не подлежат.', en: 'In accordance with the Consumer Protection Law No2300-1 of 1992 (hereinafter referred to as the Consumer Protection Law), swimwear is not subject to return or exchange.' },
    'returns.lawEn': { ru: 'В соответствии с Законом о защите прав потребителей No2300-1 от 1992 г. (далее ЗоЗПП), купальники возврату или обмену не подлежат.', en: 'In accordance with the Consumer Protection Law No2300-1 of 1992 (hereinafter referred to as the Consumer Protection Law), swimwear is not subject to return or exchange.' },
    
    // Checkout page translations
    'checkout.title': { ru: 'Ваш заказ', en: 'Your Order' },
    'checkout.titleEn': { ru: 'Ваш заказ', en: 'Your Order' },
    'checkout.emptyCart': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'checkout.emptyCartEn': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'checkout.quantity': { ru: 'Quantity:', en: 'Quantity:' },
    'checkout.quantityEn': { ru: 'Quantity:', en: 'Quantity:' },
    'checkout.subtotal': { ru: 'Промежуточный итог', en: 'Subtotal' },
    'checkout.subtotalEn': { ru: 'Промежуточный итог', en: 'Subtotal' },
    'checkout.delivery': { ru: 'Доставка', en: 'Delivery' },
    'checkout.deliveryEn': { ru: 'Доставка', en: 'Delivery' },
    'checkout.free': { ru: 'Бесплатно', en: 'Free' },
    'checkout.freeEn': { ru: 'Бесплатно', en: 'Free' },
    'checkout.totalToPay': { ru: 'Итого к оплате', en: 'Total to Pay' },
    'checkout.totalToPayEn': { ru: 'Итого к оплате', en: 'Total to Pay' },
    'checkout.confirmAndPay': { ru: 'Подтвердить и оплатить', en: 'Confirm and Pay' },
    'checkout.confirmAndPayEn': { ru: 'Подтвердить и оплатить', en: 'Confirm and Pay' },
    'checkout.processing': { ru: 'Обработка...', en: 'Processing...' },
    'checkout.processingEn': { ru: 'Обработка...', en: 'Processing...' },
    'checkout.paymentMethod': { ru: 'Оплата банковской картой через CloudPayments', en: 'Payment by bank card through CloudPayments' },
    'checkout.paymentMethodEn': { ru: 'Оплата банковской картой через CloudPayments', en: 'Payment by bank card through CloudPayments' },
    'checkout.agreeTerms': { ru: 'Нажимая «Подтвердить и оплатить», вы соглашаетесь с нашими', en: 'By clicking "Confirm and Pay", you agree to our' },
    'checkout.agreeTermsEn': { ru: 'Нажимая «Подтвердить и оплатить», вы соглашаетесь с нашими', en: 'By clicking "Confirm and Pay", you agree to our' },
    'checkout.termsOfService': { ru: 'Условиями обслуживания', en: 'Terms of Service' },
    'checkout.termsOfServiceEn': { ru: 'Условиями обслуживания', en: 'Terms of Service' },
    'checkout.and': { ru: 'и', en: 'and' },
    'checkout.andEn': { ru: 'и', en: 'and' },
    'checkout.privacyPolicy': { ru: 'Политикой конфиденциальности', en: 'Privacy Policy' },
    'checkout.privacyPolicyEn': { ru: 'Политикой конфиденциальности', en: 'Privacy Policy' },
    'checkout.emptyCartMessage': { ru: 'Ваша корзина пуста. Пожалуйста, добавьте товары перед оформлением заказа.', en: 'Your cart is empty. Please add items before checkout.' },
    'checkout.paymentDescription': { ru: 'Оплата заказа', en: 'Payment for order' },
    'checkout.paymentSuccess': { ru: 'Платеж прошел успешно', en: 'Payment successful' },
    'checkout.transactionId': { ru: 'ID транзакции', en: 'Transaction ID' },
    'checkout.transactionIdNotReceived': { ru: 'ID транзакции CloudPayments не был получен', en: 'CloudPayments transaction ID was not received' },
    'checkout.orderCreationFailed': { ru: ', но не удалось создать заказ в системе. Пожалуйста, срочно свяжитесь с поддержкой', en: ', but order creation failed. Please contact support immediately' },
    'checkout.reportTransactionId': { ru: ', сообщив ID транзакции.', en: ', reporting the transaction ID.' },
    'checkout.reportTrackingId': { ru: ', сообщив внутренний ID отслеживания', en: ', reporting the tracking ID' },
    'checkout.orderSuccess': { ru: 'Заказ №{id} успешно оплачен и создан!', en: 'Order #{id} successfully paid and created!' },
    'checkout.criticalError': { ru: ', но произошла критическая ошибка при создании заказа. Свяжитесь с поддержкой', en: ', but a critical error occurred during order creation. Contact support' },
    
    // Promo modal
    'promo.title': { ru: 'Летние скидки', en: 'Summer Discounts' },
    'promo.discount1': { ru: 'Скидка 10 % при покупке двух товаров', en: '10% discount when buying two items' },
    'promo.discount2': { ru: 'Третий товар — в подарок', en: 'Third item — free' },
    'promo.discount3': { ru: 'Скидка 15 % на четвёртый товар', en: '15% discount on the fourth item' },
    
    // Form fields
    'form.firstName': { ru: 'Имя', en: 'First Name' },
    'form.firstNameEn': { ru: 'Имя', en: 'First Name' },
    'form.lastName': { ru: 'Фамилия', en: 'Last Name' },
    'form.lastNameEn': { ru: 'Фамилия', en: 'Last Name' },
    'form.email': { ru: 'Email', en: 'Email' },
    'form.emailEn': { ru: 'Email', en: 'Email' },
    'form.phone': { ru: 'Телефон', en: 'Phone' },
    'form.phoneEn': { ru: 'Телефон', en: 'Phone' },
    'form.address': { ru: 'Адрес (Улица, дом, квартира)', en: 'Address (Street, house, apartment)' },
    'form.addressEn': { ru: 'Адрес (Улица, дом, квартира)', en: 'Address (Street, house, apartment)' },
    'form.city': { ru: 'Город', en: 'City' },
    'form.cityEn': { ru: 'Город', en: 'City' },
    'form.postcode': { ru: 'Почтовый индекс', en: 'Postal Code' },
    'form.postcodeEn': { ru: 'Почтовый индекс', en: 'Postal Code' },
    'form.country': { ru: 'Страна', en: 'Country' },
    'form.countryEn': { ru: 'Страна', en: 'Country' },
    'form.deliveryOption': { ru: 'Доставка', en: 'Delivery' },
    'form.deliveryOptionEn': { ru: 'Доставка', en: 'Delivery' },
    
    // Delivery options
    // Note: keep keys the same to avoid breaking usage, but remove "Бесплатно/Free" from the visible label
    'delivery.withinMKADFree': { ru: 'В пределах МКАД', en: 'Within MKAD' },
    'delivery.withinMKADFreeEn': { ru: 'В пределах МКАД', en: 'Within MKAD' },
    'delivery.outsideMKAD20km': { ru: 'За пределами МКАД (до 20км)', en: 'Outside MKAD (up to 20km)' },
    'delivery.outsideMKAD20kmEn': { ru: 'За пределами МКАД (до 20км)', en: 'Outside MKAD (up to 20km)' },
    'delivery.outsideMKADOver20km': { ru: 'За пределами МКАД (после 20 км)', en: 'Outside MKAD (over 20km)' },
    'delivery.outsideMKADOver20kmEn': { ru: 'За пределами МКАД (после 20 км)', en: 'Outside MKAD (over 20km)' },
    
    // Related products
    'related.title': { ru: 'Вам также может понравиться', en: 'You might also like' },
    'related.titleEn': { ru: 'Вам также может понравиться', en: 'You might also like' },
  };

  const t = useCallback((key: string, fallback?: string): string => {
    const translation = staticTranslations[key]?.[language];
    return translation || fallback || key;
  }, [language]);

  const value: TranslationContextType = {
    language,
    setLanguage,
    t,
    translateDynamic,
    isTranslating,
    availableLanguages: ['ru', 'en'],
    isReady
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Hook for dynamic content translation
export const useDynamicTranslation = () => {
  const { translateDynamic, isTranslating, language } = useTranslation();
  
  const [cache, setCache] = useState<Record<string, string>>({});
  
  const translate = useCallback(async (text: string): Promise<string> => {
    if (language === 'ru') return text;
    
    const cacheKey = `${text}_${language}`;
    if (cache[cacheKey]) return cache[cacheKey];
    
    const translated = await translateDynamic(text, language);
    setCache(prev => ({ ...prev, [cacheKey]: translated }));
    return translated;
  }, [translateDynamic, language, cache]);
  
  return { translate, isTranslating };
}; 