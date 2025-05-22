import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

// Define data for sections to enable mapping
const sections = [
  {
    id: 1,
    title: "NEW ARRIVALS",
    backgroundImage: "/src/dskjnknjdas.png",
  },
  {
    id: 2,
    title: "BEST SELLERS",
    backgroundImage: "/src/dskjnknjdas.png",
  },
  {
    id: 3,
    title: "SWIMWEAR",
    backgroundImage: "/src/dskjnknjdas.png",
  },
  {
    id: 4,
    title: "CLOTHING",
    backgroundImage: "/src/dskjnknjdas.png",
  },
  {
    id: 5,
    title: "FOR HIM",
    backgroundImage: "/src/dskjnknjdas.png",
  },
];

export const HomePage = (): JSX.Element => {
  return (
    <main className="w-full">
      {/* Main content sections */}
      <div className="w-full">
        {sections.map((section) => (
          <section
            key={section.id}
            className="w-full h-[1160px] bg-black"
            style={{
              backgroundImage: `url(${section.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "50% 50%",
            }}
          >
            <div className="flex flex-col items-center justify-end h-full pb-20">
              <h2 className="[font-family:'Bebas_Neue',Helvetica] font-normal text-white text-2xl text-center tracking-[0] leading-[31.2px] whitespace-nowrap mb-[15px]">
                {section.title}
              </h2>
              <Button
                variant="outline"
                className="w-[169px] h-[38px] border border-solid border-white rounded-none bg-transparent hover:bg-white hover:text-black transition-colors"
              >
                <span className="[font-family:'Bebas_Neue',Helvetica] font-normal text-white text-sm text-center tracking-[0.42px] leading-[14px] whitespace-nowrap group-hover:text-black">
                  SHOP NOW
                </span>
              </Button>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}; 