import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from '../context/TranslationContext';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromoModal = ({ isOpen, onClose }: PromoModalProps) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  // Handle slide-up animation trigger
  useEffect(() => {
    if (isOpen) {
      setVisible(false);
      const timer = setTimeout(() => setVisible(true), 20); // small delay to allow mount
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(timer);
    }
    document.body.style.overflow = '';
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className={`bg-white w-full rounded-t-2xl p-6 shadow-xl relative text-center transform transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-left">{t('promo.title')}</h2>
        <ul className="text-base leading-relaxed text-gray-800 space-y-2 text-left list-disc list-inside">
          <li>{t('promo.discount1')}</li>
          <li>{t('promo.discount2')}</li>
          <li>{t('promo.discount3')}</li>
        </ul>
      </div>
    </div>
  );
}; 