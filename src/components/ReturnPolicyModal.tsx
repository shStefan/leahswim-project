import { X } from 'lucide-react';

interface ReturnPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReturnPolicyModal: React.FC<ReturnPolicyModalProps> = ({ isOpen, onClose }) => {
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
        aria-labelledby="return-policy-modal-title"
      >
        <div className="bg-white/90 border border-gray-200 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg mx-auto transition-all duration-300 ease-in-out transform scale-100 opacity-100">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 id="return-policy-modal-title" className="text-lg font-semibold text-black">Return Policy</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close return policy information"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-sm text-black space-y-3 leading-relaxed max-h-[70vh] overflow-y-auto">
            <p>Items must be new, in perfect condition, unused, with no signs of deformation or mechanical damage, no stains, snags, or foreign odors. All sewn labels, tags, and seals on the item must be preserved and undamaged, original packaging must be present, as well as receipts confirming the purchase. Returns are not provided for silver items, decorations, and jewelry.</p>
            <p>To arrange a return, please contact us:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>By phone: <a href="tel:+79268792878" className="text-indigo-600 hover:text-indigo-800 underline">+7 926 879-28-78</a></li>
              <li>By email: <a href="mailto:info@leahcation.com" className="text-indigo-600 hover:text-indigo-800 underline">info@leahcation.com</a></li>
            </ul>
            <p className="pt-3 border-t border-gray-200 mt-3">
              In accordance with the Consumer Rights Protection Law No2300-1 of 1992, swimwear is not subject to return or exchange.
            </p>
          </div>
          <div className="p-4 border-t border-gray-200 text-right">
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

export default ReturnPolicyModal; 