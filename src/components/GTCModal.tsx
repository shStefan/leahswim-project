import { X } from 'lucide-react';

interface GTCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GTCModal: React.FC<GTCModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 ease-in-out" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gtc-modal-title"
      >
        <div className="bg-white/90 border border-gray-200 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl mx-auto transition-all duration-300 ease-in-out transform scale-100 opacity-100 max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="gtc-modal-title" className="text-lg font-semibold text-black">General Terms and Conditions (GTC)</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close GTC"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-sm text-black space-y-5 leading-relaxed overflow-y-auto flex-1">
            
            <section>
              <h3 className="font-semibold text-base mb-2">1. Company Information</h3>
              <p>This website is operated by: <strong>LÉAH</strong></p>
              <ul className="list-none space-y-1 mt-2">
                <li>Registered address: 1 rue des Genets, 98000 Monaco</li>
                <li>NIS: 7410222532</li>
                <li>RCI: 21P09803</li>
                <li>VAT number: FR39000182757</li>
                <li>Email: <a href="mailto:info@leahcation.com" className="text-indigo-600 hover:text-indigo-800 underline">info@leahcation.com</a></li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Scope</h3>
              <p>These General Terms and Conditions govern the use of this website and all purchases made through it. By accessing or using this website, you agree to be bound by these Terms.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Products</h3>
              <p>LÉAH offers clothing, swimwear, and related accessories.</p>
              <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                <li>Some items are reversible and may be worn in multiple ways</li>
                <li>Product images are for illustration purposes only; slight variations may occur</li>
                <li>All products are subject to availability</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Prices</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>All prices are indicated in EUR (€)</li>
                <li>Shipping costs are calculated at checkout</li>
              </ul>
              <p className="mt-2">LÉAH reserves the right to modify prices at any time.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Orders</h3>
              <p>Once an order is placed, a confirmation email will be sent.</p>
              <p className="mt-2">LÉAH reserves the right to cancel or refuse any order in case of:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                <li>Suspected fraud</li>
                <li>Incorrect pricing</li>
                <li>Product unavailability</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Payment</h3>
              <p>Payments are accepted via secure payment providers (e.g. PayPal, Apple Pay, credit/debit cards). Full payment is required before shipment.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Delivery (International Shipping)</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Orders are shipped from Monaco</li>
                <li>We deliver internationally</li>
                <li>Delivery times are indicative and may vary depending on destination</li>
              </ul>
              <p className="mt-2 font-semibold">Important:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                <li>Customs duties and import taxes are the responsibility of the customer</li>
                <li>LÉAH is not responsible for delays caused by customs or carriers</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Returns & Exchanges</h3>
              
              <h4 className="font-semibold mt-3 mb-1">8.1 Right of Withdrawal (EU Customers)</h4>
              <p>Customers within the EU have the right to withdraw within 14 days of receiving the goods.</p>
              
              <h4 className="font-semibold mt-3 mb-1">8.2 Conditions</h4>
              <p>Items must be:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                <li>Unused</li>
                <li>In original condition</li>
                <li>With all tags and hygiene protections intact</li>
              </ul>
              
              <h4 className="font-semibold mt-3 mb-1">8.3 Swimwear Policy</h4>
              <p>For hygiene reasons:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                <li>Swimwear must be tried on over underwear</li>
                <li>Returns may be refused if hygiene protection is removed</li>
              </ul>
              
              <h4 className="font-semibold mt-3 mb-1">8.4 Return Costs</h4>
              <p>Return shipping costs are borne by the customer unless the item is defective.</p>
              
              <h4 className="font-semibold mt-3 mb-1">8.5 Refunds</h4>
              <p>Refunds are processed after inspection of returned goods.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Intellectual Property</h3>
              <p>All content on this website (designs, prints, images, branding) is the exclusive property of LÉAH. Any reproduction or use without prior written consent is prohibited.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">10. Liability</h3>
              <p>LÉAH shall not be liable for:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                <li>Indirect or consequential damages</li>
                <li>Loss of profit or data</li>
                <li>Misuse of products or website</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">11. Privacy & Data Protection</h3>
              <p>Personal data is processed in accordance with applicable laws, including:</p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                <li>GDPR (EU Regulation 2016/679)</li>
              </ul>
              <p className="mt-2">For more information, please refer to our Privacy Policy.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">12. Governing Law & Jurisdiction</h3>
              <p>These Terms are governed by the laws of Monaco. In case of dispute, jurisdiction is assigned to the courts of Monaco, unless mandatory consumer protection rules provide otherwise.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">13. Changes</h3>
              <p>LÉAH reserves the right to update these Terms at any time. The version applicable is the one published on the website at the time of purchase.</p>
            </section>

          </div>
          <div className="p-4 border-t border-gray-200 text-right flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GTCModal;
