import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

const WC_CONSUMER_KEY = 'ck_c2758a311f98c4c5a4e44b85a5a66eae4a0581c3';
const WC_CONSUMER_SECRET = 'cs_7b0d34c68e68a5ae5cebf19a6d23338ab83de571';
const WC_API_URL = 'https://zdqksnii.elementor.cloud/wp-json/wc/v3';

const CheckoutPage: React.FC = () => {
  const { cart } = useCart();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_1: '',
    city: '',
    postcode: '',
    country: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      // Build WooCommerce order payload
      const payload = {
        payment_method: 'bacs',
        payment_method_title: 'Direct Bank Transfer',
        set_paid: false,
        billing: {
          first_name: form.first_name,
          last_name: form.last_name,
          address_1: form.address_1,
          address_2: '',
          city: form.city,
          state: '',
          postcode: form.postcode,
          country: form.country,
          email: form.email,
          phone: form.phone,
        },
        shipping: {
          first_name: form.first_name,
          last_name: form.last_name,
          address_1: form.address_1,
          address_2: '',
          city: form.city,
          state: '',
          postcode: form.postcode,
          country: form.country,
        },
        line_items: cart?.items?.map((item: any) => ({
          product_id: parseInt(item.id, 10),
          quantity: item.quantity,
        })) || [],
      };
      // Send order to WooCommerce
      const res = await fetch(`${WC_API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(WC_CONSUMER_KEY + ':' + WC_CONSUMER_SECRET),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`WooCommerce error: ${res.status} ${res.statusText} - ${errText}`);
      }
      const data = await res.json();
      setSuccess(`Order placed! Your order number is ${data.id}`);
      // Optionally: clear cart here
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-2 md:px-0">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8 bg-white rounded-lg shadow-lg p-6">
        {/* Left: Customer Info */}
        <div className="flex-1 md:w-1/2">
          <h2 className="text-xl font-bold mb-6">Checkout</h2>
          {success ? (
            <div className="p-4 bg-green-100 text-green-800 rounded mb-4">{success}</div>
          ) : null}
          {error ? (
            <div className="p-4 bg-red-100 text-red-800 rounded mb-4">{error}</div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} type="text" required className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} type="text" required className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input name="email" value={form.email} onChange={handleChange} type="email" required className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input name="phone" value={form.phone} onChange={handleChange} type="tel" required className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address *</label>
              <input name="address_1" value={form.address_1} onChange={handleChange} type="text" required className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">City *</label>
                <input name="city" value={form.city} onChange={handleChange} type="text" required className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Postcode *</label>
                <input name="postcode" value={form.postcode} onChange={handleChange} type="text" required className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country *</label>
              <input name="country" value={form.country} onChange={handleChange} type="text" required className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <Button className="w-full mt-4" type="submit" disabled={loading}>{loading ? 'Placing Order...' : 'Place Order'}</Button>
          </form>
        </div>
        {/* Right: Cart Summary */}
        <div className="md:w-1/2 bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold mb-4">Order Summary</h3>
          <div className="flex-1 overflow-y-auto">
            {cart?.items && cart.items.length > 0 ? (
              cart.items.map((item: any) => (
                <div key={item.id} className="flex py-4 border-b border-gray-100 last:border-b-0 items-start">
                  <img
                    src={item.thumbnail || '/placeholder.png'}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded border mr-4"
                  />
                  <div className="flex-1 flex flex-col items-start text-left">
                    <div className="font-semibold text-base mb-2">{item.title}</div>
                    <div className="text-sm text-gray-500 mb-1">Qty: {item.quantity}</div>
                    <div className="text-sm text-black font-bold">
                      {typeof item.unit_price === 'number' ? `₽${item.unit_price.toFixed(2)}` : ''}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 text-center mt-8">Your cart is empty.</div>
            )}
          </div>
          {/* Total */}
          <div className="pt-4 pb-2 mt-4 border-t border-gray-200">
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>
                ₽{cart?.items?.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0).toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
          <Link to="/catalogue" className="mt-2 text-xs underline text-center">Back to Catalogue</Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage; 