import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './screens/HomePage';
import { CataloguePage } from './screens/CataloguePage';
import { ProductPage } from './screens/ProductPage';
import { Footer } from './components/Footer';
import MedusaTest from './components/MedusaTest';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import { LikesProvider } from './context/LikesContext';
import CheckoutPage from './screens/CheckoutPage';

function App() {
  return (
    <CartProvider>
      <LikesProvider>
        <Router>
          <Header />
          <div className="min-h-screen bg-white flex flex-col">
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogue" element={<CataloguePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/medusa-test" element={<MedusaTest />} />
                <Route path="/checkout" element={<CheckoutPage />} />
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