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

function App() {
  return (
    <CartProvider>
      <LikesProvider>
        <Router>
          <ScrollToTop />
          <Header />
          <div className="min-h-screen bg-white flex flex-col">
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogue" element={<CataloguePage />} />
                <Route path="/category/:categorySlug" element={<CategorySpecificPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/medusa-test" element={<MedusaTest />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </Router>
      </LikesProvider>
    </CartProvider>
  );
}

export default App; 