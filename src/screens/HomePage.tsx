import { Button } from '../components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // Uncommented Link

// Define data for sections to enable mapping
const sections = [
  {
    id: 1,
    title: "Купальники",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/Screenshot-2025-05-28-at-5.08.13%E2%80%AFPM.webp",
    path: "https://leahcation.ru/category/%25d0%25ba%25d1%2583%25d0%25bf%25d0%25b0%25d0%25bb%25d1%258c%25d0%25bd%25d0%25b8%25d0%25ba%25d0%25b8-2",
  },
  {
    id: 2,
    title: "Одежда",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/second-scaled.webp",
    path: "/category/%25d0%25be%25d0%25b4%25d0%25b5%25d0%25b6%25d0%25b4%25d0%25b0-2",
  },
  {
    id: 3,
    title: "Аксессуары",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/third-scaled.webp",
    path: "/category/%25d0%25b0%25d0%25ba%25d1%2581%25d0%25b5%25d1%2581%25d1%2581%25d1%2583%25d0%25b0%25d1%2580%25d1%258b",
  },
  {
    id: 4,
    title: "Спорт",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/Sport.webp",
    path: "https://leahcation.ru/category/%25d1%2581%25d0%25bf%25d0%25be%25d1%2580%25d1%2582",
  },
  {
    id: 5,
    title: "Plus size",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/Plus-size.jpeg",
    path: "https://leahcation.ru/category/plus-size1",
  },
  {
    id: 6,
    title: "Дети",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/Kids.webp",
    path: "https://leahcation.ru/category/%25d0%25b4%25d0%25b5%25d1%2582%25d1%2581%25d0%25ba%25d0%25b0%25d1%258f-%25d0%25be%25d0%25b4%25d0%25b5%25d0%25b6%25d0%25b4%25d0%25b0",
  },
];

const DESKTOP_PARALLAX_FACTOR = 0.15;
const MOBILE_PARALLAX_FACTOR = 0.01;  // Further reduced for mobile, almost static
const IMAGE_SCALE_FACTOR = 1.8; // Image height will be 180% of section height
const SMOOTHING_FACTOR = 0.1; // Adjust for more or less smoothing (0.0 to 1.0)

export const HomePage = (): JSX.Element => {
  const [imageStyles, setImageStyles] = useState<{ [key: number]: { transform: string; height: string } }>({});
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Ensure refs array is ready
    sectionRefs.current = sectionRefs.current.slice(0, sections.length);

    const handleScrollOrResize = () => {
      requestAnimationFrame(() => {
        const newStylesUpdate: { [key: number]: { transform: string; height: string } } = {};
        const isMobile = window.innerWidth <= 768; 
        const currentParallaxFactor = isMobile ? MOBILE_PARALLAX_FACTOR : DESKTOP_PARALLAX_FACTOR;

        sectionRefs.current.forEach((ref, index) => {
          if (ref) {
            const sectionData = sections[index];
            const elementHeight = ref.offsetHeight;
            const rect = ref.getBoundingClientRect();
            const initialCenteringOffset = -elementHeight * (IMAGE_SCALE_FACTOR - 1) / 2;

            let targetTranslateY = initialCenteringOffset;

            if (elementHeight > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
              const scrollY = window.scrollY;
              const elementTop = ref.offsetTop;
              const viewportHeight = window.innerHeight;
              const scrollRelativeToElementCenter = scrollY + viewportHeight / 2 - (elementTop + elementHeight / 2);
              const parallaxEffectOffset = -scrollRelativeToElementCenter * currentParallaxFactor;
              const maxParallaxMovement = elementHeight * (IMAGE_SCALE_FACTOR - 1) / 2;
              const clampedParallaxDelta = Math.max(-maxParallaxMovement, Math.min(maxParallaxMovement, parallaxEffectOffset));
              targetTranslateY = initialCenteringOffset + clampedParallaxDelta;
            }

            if (elementHeight === 0) {
              targetTranslateY = 0;
            }

            // Get current translateY from state (imageStyles from previous frame)
            const currentStyleString = imageStyles[sectionData.id]?.transform;
            let previousTranslateY = initialCenteringOffset; 

            if (currentStyleString) {
              const match = currentStyleString.match(/translateY\(([-0-9.]+)px\)/);
              if (match && match[1]) {
                previousTranslateY = parseFloat(match[1]);
              }
            } else if (elementHeight === 0) {
              // If no style yet AND element height is 0, start previous Y at 0 for smoothing.
              previousTranslateY = 0;
            }
            
            const smoothedTranslateY = previousTranslateY + (targetTranslateY - previousTranslateY) * SMOOTHING_FACTOR;

            newStylesUpdate[sectionData.id] = {
              transform: `translateY(${smoothedTranslateY}px)`,
              height: `${IMAGE_SCALE_FACTOR * 100}%`,
            };
          }
        });
        setImageStyles(prevStyles => ({ ...prevStyles, ...newStylesUpdate }));
      });
    };

    handleScrollOrResize(); // Initial calculation

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []); // Empty dependency array, runs once on mount

  return (
    <main className="w-full">
      {/* Main content sections */}
      <div className="w-full">
        {sections.map((section, index) => {
          // Calculate initial centering offset for fallback if style is not ready
          // This is tricky because ref might not be available here or height might be 0.
          // The `imageStyles[section.id]` should ideally be populated by useEffect quickly.
          // A simple fallback for transform might be `translateY(0px)` if style is not present.
          const currentStyle = imageStyles[section.id] || {
            transform: 'translateY(0px)', // Fallback if styles not computed yet
            height: `${IMAGE_SCALE_FACTOR * 100}%`
          };

          return (
            <section
              key={section.id}
              ref={el => sectionRefs.current[index] = el}
              className="w-full h-[80vh] bg-black relative overflow-hidden"
            >
              <img 
                src={section.backgroundImage} 
                alt={section.title} 
                className="absolute top-0 left-0 w-full object-cover will-change-[transform]"
                style={currentStyle} 
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

              {/* Content - layered on top */}
              <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20">
                <h2 className="font-sans font-normal text-white text-2xl text-center tracking-[0] leading-[31.2px] whitespace-nowrap mb-[15px]">
                  {section.title}
                </h2>
                <Link to={section.path}> {/* Added Link wrapper */}
                  <Button
                    // variant="outline" // Removed variant for a solid button
                    className="w-[169px] h-[38px] bg-black text-white hover:bg-gray-800 transition-colors rounded-md"
                  >
                    <span className="font-sans font-normal text-sm text-center tracking-[0.42px] leading-[14px] whitespace-nowrap">
                      Перейти
                    </span>
                  </Button>
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}; 