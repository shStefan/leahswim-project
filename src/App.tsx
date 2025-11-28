import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './screens/HomePage';
import { CataloguePage } from './screens/CataloguePage';
import { ProductPage } from './screens/ProductPage';
import { CategorySpecificPage } from './screens/CategorySpecificPage';
import { Footer } from './components/Footer';
import MedusaTest from './components/MedusaTest';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import { LikesProvider } from './context/LikesContext';
import CheckoutPage from './screens/CheckoutPage';
import AboutPage from './screens/AboutPage';
import ContactPage from './screens/ContactPage';
import ScrollToTop from './components/ScrollToTop';
import { TranslationProvider } from './context/TranslationContext';
import { YandexFeedGenerator } from './components/YandexFeedGenerator';
import CookieConsent from './components/CookieConsent';

function App() {
  // Disabled PromoModal for English version
  // const [showPromo, setShowPromo] = useState(true);

  return (
    <TranslationProvider>
      <CartProvider>
        <LikesProvider>
          <Router>
            <ScrollToTop />
            {/* PromoModal disabled for English version */}
            <Header />
            <div className="min-h-screen bg-white flex flex-col">
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/en" element={<HomePage />} />
                  <Route path="/catalogue" element={<CataloguePage />} />
                  <Route path="/en/catalogue" element={<CataloguePage />} />
                  <Route path="/category/:categorySlug" element={<CategorySpecificPage />} />
                  <Route path="/en/category/:categorySlug" element={<CategorySpecificPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/en/product/:id" element={<ProductPage />} />
                  <Route path="/medusa-test" element={<MedusaTest />} />
                  <Route path="/en/medusa-test" element={<MedusaTest />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/en/checkout" element={<CheckoutPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/en/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/en/contact" element={<ContactPage />} />
                  <Route path="/admin/yandex-feed" element={<YandexFeedGenerator />} />
                </Routes>
              </div>
              <Footer />
            </div>
            <CookieConsent />
          </Router>
        </LikesProvider>
      </CartProvider>
    </TranslationProvider>
  );
}

export default App; 