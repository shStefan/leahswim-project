import { useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, MessageSquare, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import DeliveryInfoModal from './DeliveryInfoModal';
import ReturnPolicyModal from './ReturnPolicyModal';
import SizeChartModal from './SizeChartModal';
import { useTranslation } from '../context/TranslationContext';

export const Footer = () => {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isSizeChartModalOpen, setIsSizeChartModalOpen] = useState(false);
  const { t, language } = useTranslation();

  const footerSections = [
    {
      title: t('footer.support'),
      links: [
        { name: t('footer.contact'), path: `${language === 'en' ? '/en' : ''}/contact` },
        { name: t('footer.delivery'), action: () => setIsDeliveryModalOpen(true) },
        { name: t('footer.sizeChart'), action: () => setIsSizeChartModalOpen(true) },
        { name: t('footer.returns'), action: () => setIsReturnModalOpen(true) },
      ],
    },
    {
      title: t('footer.information'),
      links: [
        { name: t('nav.home'), path: `${language === 'en' ? '/en' : ''}/` },
        { name: t('nav.about'), path: `${language === 'en' ? '/en' : ''}/about` },
        { name: t('nav.contact'), path: `${language === 'en' ? '/en' : ''}/contact` },
        { name: t('footer.delivery'), action: () => setIsDeliveryModalOpen(true) },
        { name: t('footer.payment'), path: `${language === 'en' ? '/en' : ''}/payment` },
      ],
    },
    {
      title: t('footer.brand'),
      links: [
        { name: t('nav.about'), path: `${language === 'en' ? '/en' : ''}/about` },
        { name: t('footer.catalog'), path: `${language === 'en' ? '/en' : ''}/catalogue` },
      ],
    },
    {
      title: t('footer.social'),
      links: [
        { name: 'WhatsApp', path: 'https://web.whatsapp.com/send?phone=79268792878&text=' },
        { name: 'Telegram', path: 'https://t.me/swimwithleah' },
      ],
    },
    {
      title: t('footer.contacts'),
      customContentType: 'contacts',
      links: []
    },
  ];

  return (
    <>
      <footer className="bg-[#FBFBFB] py-12 px-[30px] border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {footerSections.map((section) => (
            <div 
              key={section.title} 
              className={`mb-8 md:mb-0 
                ${section.customContentType === 'contacts' ? 'col-span-2 md:col-span-1' : 'w-1/2 md:w-auto'} 
                ${section.title === 'Social Media' && section.customContentType !== 'contacts' ? 'w-1/2 md:w-auto md:col-span-1' : ''}
              `}
            >
              <h5 className="font-bold uppercase text-xs tracking-wider mb-4 text-black">{section.title}</h5>
              {section.customContentType === 'contacts' ? (
                <div className="text-xs text-black space-y-2">
                  {language === 'en' ? (
                    // English version - only show email
                    <p><a href="mailto:info@leahcation.com" className="hover:text-gray-700 transition-colors">info@leahcation.com</a></p>
                  ) : (
                    // Russian version - show all contact information
                    <>
                      <p><a href="mailto:info@leahcation.ru" className="hover:text-gray-700 transition-colors">info@leahcation.ru</a></p>
                      <p><a href="tel:+79268792878" className="hover:text-gray-700 transition-colors">+7 (926) 879-28-78</a></p>
                      <p className="mt-1">ООО "Мигдаль"</p>
                      <p className="mt-1">
                        <a 
                          href="https://leahcation.ru/wp-content/uploads/2024/08/%D0%9F%D1%83%D0%B1%D0%BB%D0%B8%D1%87%D0%BD%D0%B0%D1%8F-%D0%BE%D1%84%D0%B5%D1%80%D1%82%D0%B0.pdf" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:text-gray-700 transition-colors underline"
                        >
                          {t('footer.offer')}
                        </a>
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      {link.path ? (
                        <Link to={link.path} className="text-xs text-black hover:text-gray-700 transition-colors">
                          {link.name}
                        </Link>
                      ) : link.action ? (
                        <button onClick={link.action} className="text-xs text-black hover:text-gray-700 transition-colors text-left">
                          {link.name}
                        </button>
                      ) : (
                        <span className="text-xs text-black">{link.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </footer>
      <DeliveryInfoModal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} />
      <ReturnPolicyModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} />
      <SizeChartModal isOpen={isSizeChartModalOpen} onClose={() => setIsSizeChartModalOpen(false)} />
    </>
  );
}; 