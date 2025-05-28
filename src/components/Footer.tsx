import { useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, MessageSquare, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import DeliveryInfoModal from './DeliveryInfoModal';
import ReturnPolicyModal from './ReturnPolicyModal';
import SizeChartModal from './SizeChartModal';

export const Footer = () => {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isSizeChartModalOpen, setIsSizeChartModalOpen] = useState(false);

  const footerSections = [
    {
      title: 'Поддержка клиентов',
      links: [
        { name: 'Связаться с нами', path: '/contact' },
        { name: 'Доставка', action: () => setIsDeliveryModalOpen(true) },
        { name: 'Размерная сетка', action: () => setIsSizeChartModalOpen(true) },
        { name: 'Возвраты', action: () => setIsReturnModalOpen(true) },
      ],
    },
    {
      title: 'Информация',
      links: [
        { name: 'Главная', path: '/' },
        { name: 'О нас', path: '/about' },
        { name: 'Контакты', path: '/contact' },
        { name: 'Доставка', action: () => setIsDeliveryModalOpen(true) },
        { name: 'Оплата', path: '/payment' },
      ],
    },
    {
      title: 'Бренд',
      links: [
        { name: 'О нас', path: '/about' },
        { name: 'Каталог', path: '/catalogue' },
      ],
    },
    {
      title: 'Социальные сети',
      links: [
        { name: 'WhatsApp', path: 'https://web.whatsapp.com/send?phone=79268792878&text=' },
        { name: 'Telegram', path: 'https://t.me/swimwithleah' },
      ],
    },
    {
      title: 'Контакты',
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
                ${section.title === 'Социальные сети' && section.customContentType !== 'contacts' ? 'w-1/2 md:w-auto md:col-span-1' : ''}
              `}
            >
              <h5 className="font-bold uppercase text-xs tracking-wider mb-4 text-black">{section.title}</h5>
              {section.customContentType === 'contacts' ? (
                <div className="text-xs text-black space-y-2">
                  <p><a href="mailto:info@leahcation.ru" className="hover:text-gray-700 transition-colors">info@leahcation.ru</a></p>
                  <p>Москва, Большая Бронная, 9/1</p>
                  <p><a href="tel:+79268792878" className="hover:text-gray-700 transition-colors">+7 (926) 879-28-78</a></p>
                  <p className="mt-1">ООО "Мигдаль"</p>
                  <p className="mt-1">
                    <a 
                      href="https://leahcation.ru/wp-content/uploads/2024/08/%D0%9F%D1%83%D0%B1%D0%BB%D0%B8%D1%87%D0%BD%D0%B0%D1%8F-%D0%BE%D1%84%D0%B5%D1%80%D1%82%D0%B0.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:text-gray-700 transition-colors underline"
                    >
                      Публичная оферта
                    </a>
                  </p>
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