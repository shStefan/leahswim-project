import { X } from 'lucide-react';

interface DeliveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeliveryInfoModal: React.FC<DeliveryInfoModalProps> = ({ isOpen, onClose }) => {
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
        aria-labelledby="delivery-modal-title"
      >
        <div className="bg-white/90 border border-gray-200 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md mx-auto transition-all duration-300 ease-in-out transform scale-100 opacity-100">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 id="delivery-modal-title" className="text-lg font-semibold text-black">Delivery Information</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close delivery information"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-sm text-black space-y-3 leading-relaxed">
            <div>
              <p><strong>CDEK Moscow</strong></p>
              <p>Within Moscow and MKAD — €8</p>
              <p>Outside MKAD — €16</p>
            </div>
            
            <div className="pt-3">
              <p><strong>CDEK Russia</strong></p>
              <p>CDEK delivery throughout Russia.</p>
              <p>Delivery cost is calculated according to CDEK company tariffs. Delivery time (excluding order processing time) depends on the recipient's address</p>
            </div>
            
            <div className="pt-3">
              <p><strong>Pickup without fitting</strong></p>
              <p>Moscow, ul. Novaya Basmannaya, 19bld1</p>
            </div>
            
            <div className="pt-3">
              <p>For delivery information, please contact us:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>By phone: <a href="tel:+79268792878" className="text-indigo-600 hover:text-indigo-800 underline">+7 (926) 879-28-78</a></li>
                <li>By email: <a href="mailto:info@leahcation.com" className="text-indigo-600 hover:text-indigo-800 underline">info@leahcation.com</a></li>
              </ul>
            </div>
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

export default DeliveryInfoModal; 