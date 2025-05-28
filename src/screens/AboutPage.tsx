import React from 'react';

const aboutSections = [
  {
    title: 'Welcome on board',
    paragraphs: [
      'Бренд LÉAH оптимистично появился к пляжному сезону 2020 года, когда в мире начинали бушевать страсти. Идея его основания принадлежит Лейле Давыдовой, которая уже более 10 лет увлеченно занимается коллекционированием аксессуаров для пляжа и изучением vacation эстетики на юге Франции, где мягкий климат, яхтенная тема и красота береговой линии с давних пор ассоциировались с красивым пляжным стилем.',
      'Работая над созданием шляпок в стиле утонченных французских канотье, она захотела расширить линейку и создать полноценную женственную марку для красивого отдыха.'
    ],
    image: 'https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/first-1-scaled.webp',
    imageLeft: true,
  },
  {
    title: 'Time to get a perfect sun tan',
    paragraphs: [
      'Эстетика пляжных коллекций LÉAH — сочетание изысканной женственности, минимализма кроя, ярких цветов и насыщенных принтов, раскрывающееся в красивых образах, которые можно лицезреть на лучших пляжах по всему миру.',
      'Изначально бренд LÉAH планировал выпускать только изделия- трансформеры, что стало отправной точкой для разработки первых коллекций. Каждое изделие, выпущенное под маркой LÉAH, можно было носить несколькими способами. Идея заключалась в том, чтобы, собираясь в отпуск и желая собрать как можно больше привлекательных образов, оставалась возможность максимально сэкономить место в багаже.'
    ],
    image: 'https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/second-scaled.webp',
    imageLeft: false,
  },
  {
    title: 'Total looks',
    paragraphs: [
      'Так, с 2020 года бренд выпускает двусторонние купальники и большое количество двусторонней одежды. С самого начала марка разрабатывала все свои коллекции полноценными total looks, чтобы клиент мог приобрести образ top to bottom. Более того, к каждому купальнику в коллекциях LÉAH можно подобрать одежду, которая будет идеально сочетаться по цветам или разнообразным принтам, которым каждый сезон уделяется отдельное внимание: для каждой линейки марка выпускает 4 новых принта, встречающихся в одежде, купальниках и аксессуарах бренда.'
    ],
    image: 'https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/third-scaled.webp',
    imageLeft: true,
  },
];

const AboutPage = () => {
  return (
    <main className="w-full bg-white min-h-screen pt-10 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        {aboutSections.map((section, idx) => (
          <section
            key={section.title}
            className={`flex flex-col md:flex-row ${section.imageLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center mb-16 md:mb-24 gap-8 md:gap-16`}
          >
            <div className="md:w-1/2 w-full">
              <img
                src={section.image}
                alt={section.title}
                className="w-full object-cover aspect-[9/12]"
                loading="lazy"
              />
            </div>
            <div className="md:w-1/2 w-full flex flex-col items-start text-left">
              <h2 className="font-sans text-2xl md:text-2xl font-bold mb-4 tracking-tight text-black">{section.title}</h2>
              {section.paragraphs.map((para, i) => (
                <p key={i} className="font-sans text-lg md:text-lg text-gray-700 leading-relaxed max-w-xl mb-4 last:mb-0">{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default AboutPage; 