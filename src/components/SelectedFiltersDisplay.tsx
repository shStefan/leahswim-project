import React from 'react';

interface Category {
  id: number;
  name: string;
  slug: string;
  children?: Category[];
}

// Define getColorHex function here or import if it's moved to a utility file
// For now, duplicating it here for simplicity, assuming it's not in a shared util yet.
const getColorHex = (colorName: string) => {
  const colorMap: { [key: string]: string } = {
      'princess blue': '#4169E1',
      'fantasie sunset': '#FF7F50',
      'fantasie black and white': '#000000',
      'meow blue': '#1E90FF',
      'infinity': '#4B0082',
      'fantasy': '#F8F8FF',
      'anchor': '#2B2B2B',
      'swim': '#00BFFF',
      'biscay green': '#1B4D3E',
      'sakura': '#FFB7C5',
      'peacock blue': '#004D98',
      'bitter orange': '#FF6B00',
      'espresso': '#4B3621',
      'electric blue': '#0000FF',
      'deep green': '#006400',
      'cornflower': '#6495ED',
      'terracotta': '#E2725B',
      'olive': '#808000',
      'mint': '#98FF98',
      'coral': '#FF7F50',
      'burgundy': '#800020',
      'navy': '#000080',
      'beige': '#F5F5DC',
      'brown': '#A52A2A',
      'grey': '#808000',
      'gray': '#808000',
      'orange': '#FFA500',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'yellow': '#FFFF00',
      'green': '#008000',
      'blue': '#0000FF',
      'red': '#FF0000',
      'white': '#FFFFFF',
      'black': '#000000',
      'natural': '#F0E68C',
      'коралл': '#FF7F50',
      'фиолетовый': '#800080',
      'чёрный': '#000000',
      'коралл черный': '#4A4A4A',
      'avorio mocaccino': '#F5F5DC',
      'jelly bean': '#DA2C43',
      'lilac': '#C8A2C8',
      'sicilia': '#F28C28',
  };
  const lowerColorName = colorName.toLowerCase();
  if (colorMap[lowerColorName]) {
    return colorMap[lowerColorName];
  }
  const partialMatch = Object.entries(colorMap).find(([key]) =>
    lowerColorName.includes(key)
  );
  if (partialMatch) {
    return partialMatch[1];
  }
  return '#CCCCCC'; // Default color
};

interface SelectedFiltersDisplayProps {
  selectedSize: string;
  selectedColor: string;
  selectedCategory: string; // Main category ID (from path for CategorySpecificPage)
  categories: Category[]; // All categories, for looking up names
  selectedSubCategoryId?: string; // Optional: ID of the selected sub-category
  subCategories?: Category[]; // Optional: List of available sub-categories (children of main category)
  onClearSize: () => void;
  onClearColor: () => void;
  onClearCategory: () => void; // For clearing the main category (e.g., navigate to /catalogue)
  onClearSubCategory?: () => void; // Optional: For clearing the sub-category filter
  onClearAll: () => void;
}

const SelectedFiltersDisplay: React.FC<SelectedFiltersDisplayProps> = ({
  selectedSize,
  selectedColor,
  selectedCategory,
  categories, // This is the full list of all categories from the store
  selectedSubCategoryId,
  subCategories, // These are the direct children of the current main category
  onClearSize,
  onClearColor,
  onClearCategory,
  onClearSubCategory,
  onClearAll,
}) => {
  const mainCategoryDetails = categories.find((cat) => String(cat.id) === selectedCategory);
  
  // Determine the name of the selected sub-category.
  // It could be a child of the main category, or a grandchild if subCategories are hierarchical.
  let selectedSubCategoryName = '';
  if (selectedSubCategoryId && subCategories && subCategories.length > 0) {
    // Simple case: subCategories is a flat list of children of the mainCategoryDetails
    const foundSub = subCategories.find(sc => String(sc.id) === selectedSubCategoryId);
    if (foundSub) {
        selectedSubCategoryName = foundSub.name;
    } else {
        // Deeper search if subCategories can be hierarchical themselves
        const findInChildren = (cats: Category[]): Category | undefined => {
            for (const cat of cats) {
                if (String(cat.id) === selectedSubCategoryId) return cat;
                if (cat.children) {
                    const found = findInChildren(cat.children);
                    if (found) return found;
                }
            }
            return undefined;
        };
        selectedSubCategoryName = findInChildren(subCategories)?.name || '';
    }
  }

  if (!selectedSize && !selectedColor && !selectedCategory && !selectedSubCategoryId) return null;
  
  return (
    <div className="flex flex-row flex-wrap items-center gap-1 mb-2">
      {selectedSize && (
        <button
          onClick={onClearSize}
          className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          aria-label={`Очистить размер ${selectedSize}`}
        >
          <span className="mr-1">×</span>
          <span>{selectedSize}</span>
        </button>
      )}
      {selectedColor && (
        <button
          onClick={onClearColor}
          className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          aria-label={`Очистить цвет ${selectedColor}`}
          title={selectedColor}
        >
          <span className="mr-1">×</span>
          <span 
            className="w-3 h-3 rounded-full border border-gray-300 inline-block mr-1" // Slightly smaller swatch for better fit
            style={{ backgroundColor: getColorHex(selectedColor) }}
          ></span>
          <span className="truncate max-w-[100px]">{selectedColor}</span>
        </button>
      )}
      {/* Display Main Category if one is specifically selected (relevant for general catalogue, or to show context) */}
      {/* {mainCategoryDetails && (
         <button
            onClick={onClearCategory}
            className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            aria-label={`Очистить основную категорию ${mainCategoryDetails.name}`}
          >
            <span className="mr-1">×</span>
            <span>{mainCategoryDetails.name}</span>
        </button>
      )} */}
      {/* Display Selected Sub-Category if one is active */}
      {selectedSubCategoryId && selectedSubCategoryName && onClearSubCategory && (
        <button
          onClick={onClearSubCategory}
          className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          aria-label={`Очистить подкатегорию ${selectedSubCategoryName}`}
        >
          <span className="mr-1">×</span>
          <span>{selectedSubCategoryName}</span>
        </button>
      )}
      <button
        className="text-xs text-gray-400 hover:text-black ml-1 underline"
        onClick={onClearAll}
      >
        Очистить все
      </button>
    </div>
  );
};

export default SelectedFiltersDisplay; 