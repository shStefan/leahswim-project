import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

// Declare CloudPayments global object for TypeScript
declare var cp: any;

const WC_CONSUMER_KEY = 'ck_c2758a311f98c4c5a4e44b85a5a66eae4a0581c3';
const WC_CONSUMER_SECRET = 'cs_7b0d34c68e68a5ae5cebf19a6d23338ab83de571';
const WC_API_URL = 'https://zdqksnii.elementor.cloud/wp-json/wc/v3';

// CloudPayments Public ID
const CP_PUBLIC_ID = 'pk_708bf734b3864ec6432f7d4e24382';

// Helper to parse currency string to number
const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  const numericString = String(currencyString).replace(/[^0-9.]/g, '');
  const value = parseFloat(numericString);
  return isNaN(value) ? 0 : value;
};

const deliveryOptions = [
  { id: 'mkad_within', label: "В пределах МКАД", cost: 10 },
  { id: 'mkad_outside_20', label: "За пределами МКАД (до 20км)", cost: 1000 },
  { id: 'mkad_outside_over_20', label: "За пределами МКАД (после 20 км)", cost: 1500 },
];

const CheckoutPage: React.FC = () => {
  const { cart, clearCart } = useCart(); // cart object contains cart.total and cart.items
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_1: '',
    city: '',
    postcode: '',
    country: 'RU',
  });
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState<string>(deliveryOptions[0].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !cart.items || cart.items.length === 0) {
        setError('Ваша корзина пуста. Пожалуйста, добавьте товары перед оформлением заказа.');
        return;
    }
    setLoading(true);
    setSuccess(null);
    setError(null);

    const currentDeliveryOption = deliveryOptions.find(opt => opt.id === selectedDeliveryOptionId) || deliveryOptions[0];
    const deliveryCost = currentDeliveryOption.cost;

    // Generate a unique client-side ID to use as invoiceId for CloudPayments
    const clientGeneratedInvoiceId = `LeahSwim-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[CheckoutPage - handleSubmit] Generated clientInvoiceId for CloudPayments: ${clientGeneratedInvoiceId}`);

    try {
      const widget = new cp.CloudPayments();
      const totalAmountForPayment = parseCurrency(cart.total) + deliveryCost;

      console.log(`[CheckoutPage - handleSubmit] Initializing CloudPayments. Amount: ${totalAmountForPayment}, ClientInvoiceId: ${clientGeneratedInvoiceId}`);

      widget.pay('charge',
        { //options
          publicId: CP_PUBLIC_ID,
          description: `Оплата заказа ${clientGeneratedInvoiceId} в example.com`, // Use client generated ID
          amount: totalAmountForPayment,
          currency: 'RUB',
          accountId: form.email,
          invoiceId: clientGeneratedInvoiceId, // Use client generated ID
          email: form.email,
          skin: "mini",
          data: {
            // You can pass additional data to CP if needed
            client_invoice_id: clientGeneratedInvoiceId,
            client_name: `${form.first_name} ${form.last_name}`
          },
          payer: {
            firstName: form.first_name,
            lastName: form.last_name,
            middleName: '',
            address: form.address_1,
            street: form.address_1.split(' ')[0] || 'N/A',
            city: form.city,
            country: form.country,
            phone: form.phone.replace(/\D/g, ''),
            postcode: form.postcode
          }
        },
        {
          onSuccess: async function (cpOptions: any) { 
            // This callback might not be reliably firing based on recent tests.
            // The primary logic for WC order creation is now in onComplete.
            console.warn("[CheckoutPage - onSuccess] CloudPayments onSuccess CALLED UNEXPECTEDLY. This logic should ideally be in onComplete. CP Options:", JSON.stringify(cpOptions, null, 2));
            // If it does fire, we could potentially still try to process, but it might lead to double processing if onComplete also runs.
            // For now, just log a warning. If this becomes a frequent occurrence, we may need to add a flag to prevent double order creation.
            // Consider if any cleanup or specific action is needed if this path is ever taken.
          },
          onFail: function (reason: string, cpOptions: any) { 
            console.log(`[CheckoutPage - onFail] CloudPayments Fail. Reason: ${reason}, CP Options: ${JSON.stringify(cpOptions, null, 2)}, ClientInvoiceId used: ${clientGeneratedInvoiceId}`);
            setError(`Ошибка оплаты: ${reason}. Пожалуйста, попробуйте снова или свяжитесь с поддержкой.`);
            setLoading(false);
          },
          onComplete: async function (paymentResult: any, cpOptions: any) { // Added async, Renamed options to cpOptions
            console.log(`[CheckoutPage - onComplete] CloudPayments Complete. ClientInvoiceId used: ${clientGeneratedInvoiceId}.`);
            console.log('[CheckoutPage - onComplete] paymentResult:', JSON.stringify(paymentResult, null, 2));
            console.log('[CheckoutPage - onComplete] cpOptions:', JSON.stringify(cpOptions, null, 2));

            if (paymentResult && paymentResult.success === true) {
              console.log("[CheckoutPage - onComplete] Payment was successful according to paymentResult. Proceeding to create WC order.");
              setLoading(true); 

              // Attempt to find transactionId in various possible locations
              let extractedTransactionId = null;
              if (paymentResult.id) { // Recommended by CP docs for some scenarios
                extractedTransactionId = String(paymentResult.id);
                console.log(`[CheckoutPage - onComplete] Found transactionId in paymentResult.id: ${extractedTransactionId}`);
              } else if (paymentResult.transactionId) { // Direct property
                extractedTransactionId = String(paymentResult.transactionId);
                console.log(`[CheckoutPage - onComplete] Found transactionId in paymentResult.transactionId (direct property): ${extractedTransactionId}`);
              } else if (paymentResult.transaction && paymentResult.transaction.transactionId) {
                extractedTransactionId = String(paymentResult.transaction.transactionId);
                console.log(`[CheckoutPage - onComplete] Found transactionId in paymentResult.transaction.transactionId: ${extractedTransactionId}`);
              }
              // The cpOptions checks are unlikely to yield the *payment's* transaction ID,
              // as cpOptions in onComplete usually refers to the initial input options.
              // else if (cpOptions && cpOptions.transactionId) {
              //   extractedTransactionId = String(cpOptions.transactionId);
              //   console.log(`[CheckoutPage - onComplete] Found transactionId in cpOptions.transactionId (likely input invoiceId): ${extractedTransactionId}`);
              // }

              console.log(`[CheckoutPage - onComplete] Final extracted CloudPayments transactionId: ${extractedTransactionId}`);

              if (!extractedTransactionId) {
                console.warn("[CheckoutPage - onComplete] CloudPayments transactionId is MISSING from paymentResult. Order will be created without it, relying on clientGeneratedInvoiceId for tracking. This is not an error shown to the user, but a backend notification.");
                // Previous: setError('Платеж прошел, но не удалось получить ID транзакции от CloudPayments. Свяжитесь с поддержкой.');
                // Previous: setLoading(false);
                // Previous: return; 
                // Now we proceed without setting an error or stopping.
              }

              try {
                // Create order in WooCommerce NOW that payment is successful
                const orderPayload: any = { // Added 'any' type for flexibility with conditional properties
                  payment_method: 'cloudpayments',
                  payment_method_title: 'CloudPayments',
                  set_paid: true,
                  status: 'processing',
                  billing: { ...form },
                  shipping: { ...form },
                  line_items: cart.items.map((item: any) => ({
                    product_id: item.parentId ? parseInt(item.parentId, 10) : parseInt(item.id, 10),
                    quantity: item.quantity,
                    variation_id: item.parentId ? parseInt(item.id, 10) : undefined,
                  })),
                  shipping_lines: [
                    {
                      method_id: currentDeliveryOption.id,
                      method_title: currentDeliveryOption.label,
                      total: String(deliveryCost)
                    }
                  ],
                  meta_data: [
                    {
                      key: '_cloudpayments_client_invoice_id',
                      value: clientGeneratedInvoiceId
                    },
                    // Only include _cloudpayments_transaction_id if found
                    ...(extractedTransactionId ? [{ key: '_cloudpayments_transaction_id', value: extractedTransactionId }] : []),
                    {
                      key: '_payment_amount_gross',
                      // Ensure cpOptions and cpOptions.amount are available; provide fallback or handle error if not
                      value: String(cpOptions?.amount || totalAmountForPayment) 
                    },
                    {
                      key: '_payment_currency',
                      // Ensure cpOptions and cpOptions.currency are available
                      value: cpOptions?.currency || 'RUB'
                    }
                  ]
                };
                
                // Only include transaction_id at the top level if we found it
                if (extractedTransactionId) {
                  orderPayload.transaction_id = extractedTransactionId;
                }

                console.log(`[CheckoutPage - onComplete] Attempting to create WC order with payload:`, JSON.stringify(orderPayload, null, 2));
                
                const orderRes = await fetch(`${WC_API_URL}/orders`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa(WC_CONSUMER_KEY + ':' + WC_CONSUMER_SECRET),
                  },
                  body: JSON.stringify(orderPayload),
                });

                const orderData = await orderRes.json(); 
                console.log(`[CheckoutPage - onComplete] WC order creation response status: ${orderRes.status}. Response data: ${JSON.stringify(orderData, null, 2)}`);

                if (!orderRes.ok) {
                  console.error('[CheckoutPage - onComplete] Ошибка создания заказа WooCommerce после успешной оплаты:', orderData);
                  let errorMessage = `Платеж прошел успешно`;
                  if (extractedTransactionId) {
                      errorMessage += ` (ID транзакции: ${extractedTransactionId})`;
                  } else {
                      errorMessage += ` (ID транзакции CloudPayments не был получен)`;
                  }
                  errorMessage += `, но не удалось создать заказ в системе. Пожалуйста, срочно свяжитесь с поддержкой`;
                  if (extractedTransactionId) {
                      errorMessage += `, сообщив ID транзакции.`;
                  } else {
                      errorMessage += `, сообщив внутренний ID отслеживания: ${clientGeneratedInvoiceId}.`;
                  }
                  setError(errorMessage);
                  return; 
                }
                
                const wcOrderId = orderData.id;
                console.log(`[CheckoutPage - onComplete] WC order ${wcOrderId} created successfully.`);
                
                let successMessage = `Заказ №${wcOrderId} успешно оплачен и создан!`;
                if (extractedTransactionId) {
                    successMessage += ` ID транзакции: ${extractedTransactionId}.`;
                } else {
                    successMessage += ` (ID транзакции CloudPayments не был получен; используется внутренний ID отслеживания: ${clientGeneratedInvoiceId}).`;
                }
                setSuccess(successMessage);

                await clearCart();
                console.log(`[CheckoutPage - onComplete] Cart cleared for WC order ${wcOrderId}.`);

              } catch (wcCreateError: any) {
                console.error(`[CheckoutPage - onComplete] Critical error during WC order creation after payment:`, wcCreateError);
                let errorMessage = `Платеж прошел успешно`;
                if (extractedTransactionId) {
                    errorMessage += ` (ID транзакции: ${extractedTransactionId})`;
                } else {
                    errorMessage += ` (ID транзакции CloudPayments не был получен)`;
                }
                errorMessage += `, но произошла критическая ошибка при создании заказа. Свяжитесь с поддержкой`;
                if (extractedTransactionId) {
                    errorMessage += `, сообщив ID транзакции.`;
                } else {
                    errorMessage += `, сообщив внутренний ID отслеживания: ${clientGeneratedInvoiceId}.`;
                }
                setError(errorMessage);
              } finally {
                setLoading(false);
                console.log(`[CheckoutPage - onComplete] Processing finished for ClientInvoiceId: ${clientGeneratedInvoiceId}.`);
              }
            } else if (paymentResult && paymentResult.success === false) {
              console.log("[CheckoutPage - onComplete] Payment failed according to paymentResult. Error message:", paymentResult.message);
              // Error display is likely handled by onFail, but good to log here.
              // setLoading(false); // Ensure loading is stopped if onFail didn't or if onComplete is the only one called on failure.
            } else {
              console.warn("[CheckoutPage - onComplete] Called but paymentResult is inconclusive or missing.", paymentResult);
              // setLoading(false); // Consider stopping loading if state is uncertain.
            }
          }
        }
      );
    } catch (err: any) {
      console.error('[CheckoutPage - handleSubmit] Error initializing CloudPayments or other pre-payment error:', err);
      setError(err.message || 'Не удалось инициализировать систему оплаты. Пожалуйста, попробуйте позже.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <p className="text-xl font-semibold text-green-600 mb-4">{success}</p>
          <p className="text-gray-700 mb-6">Мы свяжемся с вами для подтверждения деталей заказа.</p>
          <Button onClick={() => navigate('/')} className="w-full">Вернуться на главную</Button>
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
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                <input name="first_name" id="first_name" value={form.first_name} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
                <input name="last_name" id="last_name" value={form.last_name} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input name="email" id="email" value={form.email} onChange={handleChange} type="email" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
                <input name="phone" id="phone" value={form.phone} onChange={handleChange} type="tel" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" placeholder="+7 (XXX) XXX-XX-XX"/>
              </div>
              <div>
                <label htmlFor="address_1" className="block text-sm font-medium text-gray-700 mb-1">Адрес (Улица, дом, квартира) *</label>
                <input name="address_1" id="address_1" value={form.address_1} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Город *</label>
                  <input name="city" id="city" value={form.city} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
                </div>
                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">Почтовый индекс *</label>
                  <input name="postcode" id="postcode" value={form.postcode} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
                </div>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Страна *</label>
                <input name="country" id="country" value={form.country} onChange={handleChange} type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5" />
              </div>
              <div>
                <label htmlFor="delivery_option" className="block text-sm font-medium text-gray-700 mb-1">Доставка *</label>
                <select
                  name="delivery_option"
                  id="delivery_option"
                  value={selectedDeliveryOptionId}
                  onChange={(e) => setSelectedDeliveryOptionId(e.target.value)}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5"
                >
                  {deliveryOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label} - {option.cost}₽
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>

          {/* Right Card: Order Summary & Payment */}
          <div className="md:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col h-fit sticky top-28">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Ваш заказ</h3>
            <div className="flex-grow overflow-y-auto space-y-3 mb-6 pr-2 max-h-80">
              {cart?.items && cart.items.length > 0 ? (
                cart.items.map((item: any) => (
                  <div key={item.id} className="flex items-center py-3 border-b border-gray-200 last:border-b-0">
                    <img
                      src={item.thumbnail || '/placeholder.png'}
                      alt={item.title}
                      className="w-16 h-20 object-cover rounded-md border border-gray-200 mr-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Кол-во: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-800 ml-4 whitespace-nowrap">
                      {`₽${Math.trunc(parseCurrency(item.unit_price) * item.quantity)}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Ваша корзина пуста.</p>
              )}
            </div>
            
            {cart?.items && cart.items.length > 0 && (
              <div className="border-t border-gray-200 pt-6 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Промежуточный итог</span>
                  <span className="font-medium text-gray-800">{`₽${Math.trunc(parseCurrency(cart.total))}`}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Доставка</span>
                  <span className="font-medium text-gray-800">{`₽${(deliveryOptions.find(opt => opt.id === selectedDeliveryOptionId) || deliveryOptions[0]).cost}`}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200 mt-3">
                  <span>Итого к оплате</span>
                  <span>{`₽${Math.trunc(parseCurrency(cart.total) + (deliveryOptions.find(opt => opt.id === selectedDeliveryOptionId) || deliveryOptions[0]).cost)}`}</span>
                </div>
                {error && (
                  <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
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
                      Обработка...
                    </>
                  ) : 'Подтвердить и оплатить'}
                </Button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Оплата банковской картой через CloudPayments
                </p>
              </div>
            )}
            <p className="mt-6 text-xs text-gray-500 text-center">
              Нажимая «Подтвердить и оплатить», вы соглашаетесь с нашими <a href="/terms" className="underline hover:text-gray-700">Условиями обслуживания</a> и <a href="/privacy" className="underline hover:text-gray-700">Политикой конфиденциальности</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage; 