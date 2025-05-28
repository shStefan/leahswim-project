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
            <h2 id="return-policy-modal-title" className="text-lg font-semibold text-black">Политика возврата</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close return policy information"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-sm text-black space-y-3 leading-relaxed max-h-[70vh] overflow-y-auto">
            <p>Товар должен быть новым, товарный вид полностью сохранен, товар не был использован, отсутствуют признаки деформации и механические повреждения, отсутствуют пятна, затяжки, посторонние запахи; Все вшитые ярлыки, этикетки, пломбы на товаре сохранены и не повреждены, присутствует оригинальная упаковка, а также чеки, подтверждающие покупку. На товары из серебра, украшения и ювелирные изделия, возврат не предусмотрен.</p>
            <p>Для оформления возврата, пожалуйста, свяжитесь с нами:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>По телефону: <a href="tel:+79268792878" className="text-indigo-600 hover:text-indigo-800 underline">+7 926 879-28-78</a></li>
              <li>По почте: <a href="mailto:info@leahswim.com" className="text-indigo-600 hover:text-indigo-800 underline">info@leahswim.com</a></li>
            </ul>
            <p className="pt-3 border-t border-gray-200 mt-3">
              В соответствии с Законом о защите прав потребителей No2300-1 от 1992 г. (далее ЗоЗПП), купальники возврату или обмену не подлежат.
            </p>
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

export default ReturnPolicyModal; 