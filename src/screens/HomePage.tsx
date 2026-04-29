import { Button } from '../components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // Uncommented Link
import { DynamicText } from '../components/DynamicText';
import { useTranslation } from '../context/TranslationContext';

// Define data for sections to enable mapping
const sections = [
  {
    id: 7,
    title: "New Collection\nSpring-Summer 26",
    backgroundImage: "/homepageimages/newcoll.webp",
    path: "/category/ss26",
  },
  {
    id: 0,
    title: "Cruise Collection",
    backgroundImage: "/homepageimages/newcruisimg.webp",
    path: "/category/kupalniki-new",
  },
  {
    id: 3,
    title: "Accessories",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/third-scaled.webp",
    path: "/category/%25d0%25b0%25d0%25ba%25d1%2581%25d0%25b5%25d1%2581%25d1%2581%25d1%2583%25d0%25b0%25d1%2580%25d1%258b",
  },
  {
    id: 6,
    title: "Basic Collection",
    backgroundImage: "/homepageimages/basicimg.webp",
    path: "/category/%25d0%25b1%25d0%25b0%25d0%25b7%25d0%25be%25d0%25b2%25d0%25b0%25d1%258f-%25d0%25ba%25d0%25be%25d0%25bb%25d0%25bb%25d0%25b5%25d0%25ba%25d1%2586%25d0%25b8%25d1%258f",
    objectPosition: "center 15%",
    parallaxOffset: 150,
  },
  {
    id: 4,
    title: "Sport",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/05/Sport.webp",
    path: "/category/%25d1%2581%25d0%25bf%25d0%25be%25d1%2580%25d1%2582",
  },
  {
    id: 5,
    title: "Plus size",
    backgroundImage: "https://zdqksnii.elementor.cloud/wp-content/uploads/2025/07/nWHLeQ6Y.jpeg",
    path: "/category/plus-size1",
  },

];

const DESKTOP_PARALLAX_FACTOR = 0.15;
const MOBILE_PARALLAX_FACTOR = 0.01;  // Further reduced for mobile, almost static
const IMAGE_SCALE_FACTOR = 1.8; // Image height will be 180% of section height
const SMOOTHING_FACTOR = 0.1; // Adjust for more or less smoothing (0.0 to 1.0)

export const HomePage = (): JSX.Element => {
  const [imageStyles, setImageStyles] = useState<{ [key: number]: { transform: string; height: string } }>({});
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const { t, language } = useTranslation();

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
            const sectionOffset = sectionData.parallaxOffset || 0;
            const initialCenteringOffset = -elementHeight * (IMAGE_SCALE_FACTOR - 1) / 2 + sectionOffset;

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
                style={{...currentStyle, objectPosition: section.objectPosition || 'center'}} 
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

              {/* Content - layered on top */}
              <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20">
                <DynamicText 
                  text={section.title}
                  tag="h2"
                  className="font-sans font-normal text-white text-2xl text-center tracking-[0] leading-[31.2px] whitespace-pre-line mb-[15px]"
                />
                <Link to={`${language === 'en' ? '/en' : ''}${section.path}`}> {/* Added Link wrapper */}
                  <Button
                    // variant="outline" // Removed variant for a solid button
                    className="w-[169px] h-[38px] bg-black text-white hover:bg-gray-800 transition-colors rounded-md"
                  >
                    <span className="font-sans font-normal text-sm text-center tracking-[0.42px] leading-[14px] whitespace-nowrap">
                      {t('common.goTo', 'Go to')}
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