// PayPal Integration for English Version
import { parseCurrencyEUR } from './priceUtils';

// PayPal Client ID
export const PAYPAL_CLIENT_ID = 'AU23b6phBDxjcgb7iaT7Lgztx8N02zV7cZjO3_HxIaN8PXsLNAfhW64n6dDHxOJLEDOgtYEJUjyTcIoq';

// PayPal script loader
export const loadPayPalScript = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Check if PayPal script is already loaded
    if (window.paypal) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&enable-funding=applepay`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) {
        resolve(true);
      } else {
        reject(new Error('PayPal SDK failed to load'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load PayPal script'));
    };
    document.body.appendChild(script);
  });
};

// Declare PayPal types for TypeScript
declare global {
  interface Window {
    paypal?: any;
  }
}

export interface PayPalOrderData {
  cart: any;
  form: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
  };
  deliveryCost: number;
  onApprove: (orderId: string, orderData: any) => Promise<void>;
  onError: (error: string) => void;
  onCancel: () => void;
}

export const initializePayPalButtons = async (
  containerId: string,
  orderData: PayPalOrderData
): Promise<void> => {
  try {
    // Load PayPal script if not already loaded
    await loadPayPalScript();

    if (!window.paypal) {
      throw new Error('PayPal SDK is not available');
    }

    const { cart, form, deliveryCost, onApprove, onError, onCancel } = orderData;

    // Parse the discounted cart total using parseCurrencyEUR (handles €-prefixed and RUB strings)
    const cartSubtotal = parseCurrencyEUR(cart.total);
    const totalAmount = cartSubtotal + deliveryCost;

    // Build product items with correctly parsed EUR prices
    const items = cart.items.map((item: any) => {
      const unitPriceEUR = parseCurrencyEUR(item.unit_price);
      return {
        name: item.title || 'Product',
        unit_amount: {
          currency_code: 'EUR',
          value: unitPriceEUR.toFixed(2),
        },
        quantity: String(item.quantity || 1),
      };
    });

    // Calculate the sum of all item amounts for the breakdown
    const itemTotal = items.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity, 10);
    }, 0);

    window.paypal
      .Buttons({
        style: {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'paypal',
        },
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  currency_code: 'EUR',
                  value: totalAmount.toFixed(2),
                  breakdown: {
                    item_total: {
                      currency_code: 'EUR',
                      value: itemTotal.toFixed(2),
                    },
                    shipping: {
                      currency_code: 'EUR',
                      value: deliveryCost.toFixed(2),
                    },
                    discount: {
                      currency_code: 'EUR',
                      value: Math.max(itemTotal + deliveryCost - totalAmount, 0).toFixed(2),
                    },
                  },
                },
                items: items,
                shipping: {
                  name: {
                    full_name: `${form.first_name} ${form.last_name}`,
                  },
                  address: {
                    address_line_1: form.address_1,
                    admin_area_2: form.city,
                    postal_code: form.postcode,
                    country_code: form.country,
                  },
                },
              },
            ],
            application_context: {
              shipping_preference: 'SET_PROVIDED_ADDRESS',
            },
          });
        },
        onApprove: async (data: any, actions: any) => {
          try {
            const order = await actions.order.capture();
            console.log('[PayPal] Payment approved:', order);

            if (order.status === 'COMPLETED' || order.status === 'APPROVED') {
              await onApprove(order.id, order);
            } else {
              onError('Payment was not completed');
            }
          } catch (error: any) {
            console.error('[PayPal] Error capturing order:', error);
            onError(error.message || 'Failed to capture payment');
          }
        },
        onError: (err: any) => {
          console.error('[PayPal] Error:', err);
          onError(err.message || 'PayPal payment error occurred');
        },
        onCancel: () => {
          console.log('[PayPal] Payment cancelled by user');
          onCancel();
        },
      })
      .render(`#${containerId}`);
  } catch (error: any) {
    console.error('[PayPal] Failed to initialize buttons:', error);
    throw error;
  }
};

