import React from 'react';

const contactInfo = [
  {
    label: 'Телефон',
    value: '+7 (926) 879-28-78',
    href: 'tel:+79268792878',
  },
  {
    label: 'Мы находимся',
    value: 'Москва, Большая Бронная, 9/1',
    href: 'https://yandex.ru/maps/?text=Москва, Большая Бронная, 9/1', // Example map link
  },
  {
    label: 'Для оптовых заказов продукции LÉAH',
    value: 'sales@leahcation.com',
    href: 'mailto:sales@leahcation.com',
  },
  {
    label: 'Email',
    value: 'info@leahcation.ru',
    href: 'mailto:info@leahcation.ru',
  },
];

const ContactPage = () => {
  return (
    <main className="bg-white min-h-screen py-12 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <img 
          src="https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/IMG_6549-1-scaled.webp" 
          alt="Contact Us Banner"
          className="w-full object-cover aspect-[9/12] md:aspect-[16/9] mb-12 md:mb-16"
        />
        <div className="space-y-10">
          {contactInfo.map((item, index) => (
            <div key={index} className="border-b border-gray-300 pb-8 last:border-b-0 last:pb-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <p className="text-xl font-sans text-black mb-2 md:mb-0 md:w-2/5">
                  {item.label}
                </p>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-sans text-black hover:text-gray-700 transition-colors md:w-3/5 md:text-right"
                >
                  {item.value}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default ContactPage; 