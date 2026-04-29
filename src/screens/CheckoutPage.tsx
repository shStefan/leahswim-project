import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { DynamicText } from '../components/DynamicText';
import { useTranslation } from '../context/TranslationContext';
import GTCModal from '../components/GTCModal';
import CookiesPolicyModal from '../components/CookiesPolicyModal';
import { convertAndFormatPrice, parseCurrencyEUR } from '../utils/priceUtils';
import { apiEndpoints } from '../utils/apiConfig';
import { countries } from '../utils/countries';
import { handlePhoneInput, getCleanPhoneNumber } from '../utils/phoneMask';
import { initializePayPalButtons, PayPalOrderData } from '../utils/paypalIntegration';
import AddressAutocomplete from '../components/AddressAutocomplete';

// Helper to parse currency string to EUR number
const parseCurrency = (currencyString: string): number => {
  return parseCurrencyEUR(currencyString);
};

const CheckoutPage: React.FC = () => {
  const { cart, clearCart } = useCart(); // cart object contains cart.total and cart.items
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fixed delivery cost for English version: 30 EUR
  const FIXED_DELIVERY_COST = 30;

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_1: '',
    city: '',
    postcode: '',
    country: 'US', // Default to US for English version
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paypalInitialized, setPaypalInitialized] = useState(false);
  const paypalButtonsRef = useRef<boolean>(false);
  const [agreeNewsletter, setAgreeNewsletter] = useState(false);
  const [isGTCModalOpen, setIsGTCModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  // Reset PayPal buttons when form or cart changes so they re-initialize with fresh data
  useEffect(() => {
    if (paypalInitialized) {
      // Clear previous PayPal buttons
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
      }
      paypalButtonsRef.current = false;
      setPaypalInitialized(false);
    }
  }, [form.first_name, form.last_name, form.email, form.phone, form.address_1, form.city, form.postcode, form.country, cart?.total]);

  // Initialize PayPal buttons when form is valid and cart has items
  useEffect(() => {
    if (cart?.items && cart.items.length > 0 && !paypalButtonsRef.current) {
      const isFormValid = form.first_name && form.last_name && form.email && form.phone &&
        form.address_1 && form.city && form.postcode && form.country;

      if (!isFormValid) return;

      const timer = setTimeout(() => {
        const container = document.getElementById('paypal-button-container');
        if (container && !paypalInitialized) {
          initializePayPalPayment();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [form, cart, paypalInitialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneInput(e, (value) => {
      setForm({ ...form, phone: value });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !cart.items || cart.items.length === 0) {
      setError(t('checkout.emptyCartMessage'));
      return;
    }
    setError(null);
    // PayPal will handle the payment, we just need to initialize it
    if (!paypalInitialized) {
      await initializePayPalPayment();
    }
  };

  const initializePayPalPayment = async () => {
    if (paypalButtonsRef.current) return;

    paypalButtonsRef.current = true;
    setError(null);

    try {
      await initializePayPalButtons('paypal-button-container', {
        cart,
        form,
        deliveryCost: FIXED_DELIVERY_COST,
        onApprove: handlePayPalApproval,
        onError: (errorMsg: string) => {
          setError(errorMsg || 'Payment error occurred. Please try again.');
          setLoading(false);
          paypalButtonsRef.current = false;
        },
        onCancel: () => {
          setError('Payment was cancelled.');
          setLoading(false);
          paypalButtonsRef.current = false;
        }
      });
      setPaypalInitialized(true);
    } catch (error: any) {
      console.error('[CheckoutPage] Failed to initialize PayPal:', error);
      setError('Failed to initialize payment system. Please refresh the page and try again.');
      paypalButtonsRef.current = false;
    }
  };

  const handlePayPalApproval = async (orderId: string, paypalOrderData: any) => {
    setLoading(true);
    setError(null);

    try {
      const deliveryCost = FIXED_DELIVERY_COST;
      const totalAmount = parseCurrency(cart.total) + deliveryCost;

      // Extract PayPal transaction details
      const paypalTransactionId = paypalOrderData.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;
      const paypalPaymentData = paypalOrderData.purchase_units?.[0]?.payments?.captures?.[0];

      console.log('[CheckoutPage - PayPal] Payment approved. Order ID:', orderId);
      console.log('[CheckoutPage - PayPal] Order data:', JSON.stringify(paypalOrderData, null, 2));

      // Create order in WooCommerce
      const orderPayload: any = {
        payment_method: 'paypal',
        payment_method_title: 'PayPal',
        set_paid: true,
        status: 'processing',
        transaction_id: paypalTransactionId,
        billing: { ...form },
        shipping: { ...form },
        line_items: cart.items.map((item: any) => ({
          product_id: item.parentId ? parseInt(item.parentId, 10) : parseInt(item.id, 10),
          quantity: item.quantity,
          variation_id: item.parentId ? parseInt(item.id, 10) : undefined,
          name: item.title,
          price: parseCurrency(item.unit_price),
          total: (parseCurrency(item.unit_price) * item.quantity).toString()
        })),
        shipping_lines: [
          {
            method_id: 'fixed_delivery',
            method_title: 'Standard Delivery',
            total: String(deliveryCost)
          }
        ],
        meta_data: [
          {
            key: '_paypal_order_id',
            value: orderId
          },
          {
            key: '_paypal_transaction_id',
            value: paypalTransactionId
          },
          {
            key: '_payment_amount_gross',
            value: String(totalAmount)
          },
          {
            key: '_payment_currency',
            value: 'EUR'
          }
        ]
      };

      console.log('[CheckoutPage - PayPal] Creating WooCommerce order:', JSON.stringify(orderPayload, null, 2));

      const { url: ordersUrl, options: ordersOptions } = apiEndpoints.orders();
      const orderRes = await fetch(ordersUrl, {
        method: 'POST',
        headers: {
          ...ordersOptions.headers,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      console.log('[CheckoutPage - PayPal] WooCommerce order response:', JSON.stringify(orderData, null, 2));

      if (!orderRes.ok) {
        console.error('[CheckoutPage - PayPal] Failed to create WooCommerce order:', orderData);
        setError('Payment successful, but failed to create order. Please contact support with order ID: ' + orderId);
        setLoading(false);
        return;
      }

      const wcOrderId = orderData.id;
      const successMessage = `Order #${wcOrderId} created successfully! PayPal Transaction ID: ${paypalTransactionId}`;
      setSuccess(successMessage);
      await clearCart();
      console.log('[CheckoutPage - PayPal] Order created successfully. Order ID:', wcOrderId);
      setLoading(false);

    } catch (error: any) {
      console.error('[CheckoutPage - PayPal] Error creating order:', error);
      setError('Payment successful, but there was an error processing your order. Please contact support.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <p className="text-xl font-semibold text-green-600 mb-4">{success}</p>
          <p className="text-gray-700 mb-6">We will contact you to confirm your order details.</p>
          <Button onClick={() => navigate('/')} className="w-full">Return to Homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto">

        <div className="md:grid md:grid-cols-5 md:gap-x-8 lg:gap-x-12">
          {/* Left Card: Form */}
          <div className="md:col-span-3 bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-8 md:mb-0">
            <form id="checkout-form" className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">{t('form.firstName')} *</label>
                <input name="first_name" id="first_name" value={form.first_name} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">{t('form.lastName')} *</label>
                <input name="last_name" id="last_name" value={form.last_name} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')} *</label>
                <input name="email" id="email" value={form.email} onChange={handleChange} type="email" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">{t('form.phone')} *</label>
                <input name="phone" id="phone" value={form.phone} onChange={handlePhoneChange} type="tel" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" placeholder="+1 (XXX) XXX-XX-XX" />
              </div>
              <div>
                <label htmlFor="address_1" className="block text-sm font-medium text-gray-700 mb-1">{t('form.address')} *</label>
                <AddressAutocomplete
                  name="address_1"
                  id="address_1"
                  value={form.address_1}
                  onChange={(val) => setForm({ ...form, address_1: val })}
                  onSelect={(address, city, postcode) => {
                    setForm(prev => ({
                      ...prev,
                      address_1: address,
                      ...(city ? { city } : {}),
                      ...(postcode ? { postcode } : {}),
                    }));
                  }}
                  lang="en"
                  required
                  placeholder="Start typing your address..."
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">{t('form.city')} *</label>
                  <input name="city" id="city" value={form.city} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
                </div>
                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">{t('form.postcode')} *</label>
                  <input name="postcode" id="postcode" value={form.postcode} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
                </div>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">{t('form.country')} *</label>
                <select
                  name="country"
                  id="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5"
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>

          {/* Right Card: Order Summary & Payment */}
          <div className="md:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col h-fit sticky top-28">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">{t('checkout.title')}</h3>
            <div className="flex-grow overflow-y-auto space-y-3 mb-6 pr-2 max-h-80">
              {cart?.items && cart.items.length > 0 ? (
                (() => {
                  // Compute per-item discount map similar to header
                  const unitArr: { price: number; itemId: string }[] = [];
                  cart.items.forEach((itm: any) => {
                    const pNum = parseCurrency(itm.unit_price);
                    for (let i = 0; i < itm.quantity; i++) unitArr.push({ price: pNum, itemId: itm.id });
                  });
                  const desc = [...unitArr].sort((a, b) => b.price - a.price);
                  const asc = [...unitArr].sort((a, b) => a.price - b.price);
                  const used = new Set<number>();
                  const perUnitDisc: number[] = new Array(unitArr.length).fill(0);
                  // 10% on top two
                  if (unitArr.length >= 2) {
                    let c = 0; for (let i = 0; i < desc.length && c < 2; i++) { const idx = unitArr.indexOf(desc[i]); if (!used.has(idx)) { perUnitDisc[idx] = desc[i].price * 0.1; used.add(idx); c++; } }
                  }
                  // cheapest free
                  if (unitArr.length >= 3) {
                    for (let i = 0; i < asc.length; i++) { const idx = unitArr.indexOf(asc[i]); if (!used.has(idx)) { perUnitDisc[idx] = asc[i].price; used.add(idx); break; } }
                  }
                  // 15% off second cheapest (cheapest remaining after free item)
                  if (unitArr.length >= 4) {
                    for (let i = 0; i < asc.length; i++) {
                      const idx = unitArr.indexOf(asc[i]);
                      if (!used.has(idx)) {
                        perUnitDisc[idx] = asc[i].price * 0.15;
                        used.add(idx);
                        break;
                      }
                    }
                  }
                  const discMap: Record<string, number> = {};
                  unitArr.forEach((u, idx) => {
                    discMap[u.itemId] = (discMap[u.itemId] || 0) + perUnitDisc[idx];
                  });
                  return cart.items.map((item: any) => {
                    const orig = parseCurrency(item.unit_price) * item.quantity;
                    const disc = discMap[item.id] || 0;
                    const final = orig - disc;
                    return (
                      <div key={item.id} className="flex items-center py-3 border-b border-gray-200 last:border-b-0">
                        <img
                          src={item.thumbnail || '/placeholder.png'}
                          alt={item.title}
                          className="w-16 h-20 object-cover rounded-md border border-gray-200 mr-4"
                        />
                        <div className="flex-1 min-w-0">
                          <DynamicText
                            text={item.title}
                            tag="p"
                            className="text-sm font-medium text-gray-800 truncate"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">{t('common.quantity')}: {item.quantity}</p>
                        </div>
                        <div className="text-sm font-medium text-gray-800 ml-4 whitespace-nowrap flex flex-col items-end">
                          {disc > 0 ? (
                            <>
                              <span className="line-through text-gray-400 text-xs">€{Math.trunc(orig)}</span>
                              <span>€{Math.trunc(final)}</span>
                              <span className="text-xs text-green-600 ml-1">(-{Math.round(disc / orig * 100)}%)</span>
                            </>
                          ) : (
                            <span>€{Math.trunc(orig)}</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">{t('checkout.emptyCart')}</p>
              )}
            </div>

            {cart?.items && cart.items.length > 0 && (
              <div className="border-t border-gray-200 pt-6 space-y-3">
                {(() => {
                  const originalSub = cart.items.reduce((sum: number, item: any) => sum + parseCurrency(item.unit_price) * item.quantity, 0);
                  const discountedSub = parseCurrency(cart.total);
                  const discountValue = Math.max(originalSub - discountedSub, 0);
                  return (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{t('checkout.subtotal')}</span>
                        <span className="font-medium text-gray-800">{`€${Math.trunc(originalSub)}`}</span>
                      </div>
                      {discountValue > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{t('cart.discount')}</span>
                          <span className="font-medium text-green-600">-€{Math.trunc(discountValue)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('checkout.delivery')}</span>
                  <span className="font-medium text-gray-800">€{FIXED_DELIVERY_COST}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200 mt-3">
                  <span>{t('checkout.totalToPay')}</span>
                  <span>{`€${Math.trunc(parseCurrency(cart.total) + FIXED_DELIVERY_COST)}`}</span>
                </div>
                {error && (
                  <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
                {/* PayPal Button Container */}
                <div id="paypal-button-container" className="w-full mb-4"></div>
                {!paypalInitialized && (
                  <Button
                    form="checkout-form"
                    type="submit"
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center justify-center"
                    disabled={loading || !cart || !cart.items || cart.items.length === 0}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('checkout.processing')}
                      </>
                    ) : 'Continue to Payment'}
                  </Button>
                )}
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Payment by PayPal
                </p>
              </div>
            )}
            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeNewsletter}
                  onChange={(e) => setAgreeNewsletter(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-xs text-gray-600">I agree to receive newsletters and promotional emails from LÉAH</span>
              </label>
              <p className="text-xs text-gray-500 text-center">
                {t('checkout.agreeTerms')}{' '}
                <button type="button" onClick={() => setIsGTCModalOpen(true)} className="underline hover:text-gray-700">{t('checkout.termsOfService')}</button>
                {' '}{t('checkout.and')}{' '}
                <button type="button" onClick={() => setIsPrivacyModalOpen(true)} className="underline hover:text-gray-700">{t('checkout.privacyPolicy')}</button>.
              </p>
            </div>
          </div>
        </div>
      </div>
      <GTCModal isOpen={isGTCModalOpen} onClose={() => setIsGTCModalOpen(false)} />
      <CookiesPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
    </div>
  );
};

export default CheckoutPage; 