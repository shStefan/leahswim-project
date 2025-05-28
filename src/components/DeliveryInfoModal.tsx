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
            <h2 id="delivery-modal-title" className="text-lg font-semibold text-black">Информация о доставке</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close delivery information"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-sm text-black space-y-3 leading-relaxed">
            <p><strong>Доставка в пределах МКАД</strong> – 500 руб</p>
            <p><strong>Доставка не более 20 км от МКАД</strong> – 1000 руб</p>
            <p><strong>Доставка более 20 км от МКАД</strong> – 1500₽</p>
            <p className="pt-2">
              Стоимость международной доставки рассчитывается индивидуально при оформлении заказа. 
              Для расчета стоимости международной доставки, пожалуйста, свяжитесь с нами:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>По телефону: <a href="tel:+79857000131" className="text-indigo-600 hover:text-indigo-800 underline">+7 985 700 01 31</a></li>
              <li>По почте: <a href="mailto:info@leahcation.ru" className="text-indigo-600 hover:text-indigo-800 underline">info@leahcation.ru</a></li>
            </ul>
          </div>
          <div className="p-4 border-t border-gray-200 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeliveryInfoModal; 