import React from 'react';
import { DynamicText } from './DynamicText';
import { useTranslation } from '../context/TranslationContext';
import { getColorHex } from '../utils/colorMap';

interface Category {
  id: number;
  name: string;
  slug: string;
  children?: Category[];
}

// Color mapping function - using shared utility from colorMap.ts

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
  const { t } = useTranslation();
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
          aria-label={`${t('common.clearSize')} ${selectedSize}`}
        >
          <span className="mr-1">×</span>
          <span>{selectedSize}</span>
        </button>
      )}
      {selectedColor && (
        <button
          onClick={onClearColor}
          className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          aria-label={`Clear color`}
        >
          <span className="mr-1">×</span>
          <span 
            className="w-3 h-3 rounded-full border border-gray-300 inline-block" 
            style={{ backgroundColor: getColorHex(selectedColor) }}
          ></span>
        </button>
      )}
      {/* Display Main Category if one is specifically selected (relevant for general catalogue, or to show context) */}
      {/* {mainCategoryDetails && (
         <button
            onClick={onClearCategory}
            className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            aria-label={`${t('common.clearMainCategory')} ${mainCategoryDetails.name}`}
          >
            <span className="mr-1">×</span>
                          <DynamicText text={mainCategoryDetails.name} />
        </button>
      )} */}
      {/* Display Selected Sub-Category if one is active */}
      {selectedSubCategoryId && selectedSubCategoryName && onClearSubCategory && (
        <button
          onClick={onClearSubCategory}
          className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          aria-label={`${t('common.clearSubCategory')} ${selectedSubCategoryName}`}
        >
          <span className="mr-1">×</span>
                        <DynamicText text={selectedSubCategoryName} />
        </button>
      )}
      <button
        className="text-xs text-gray-400 hover:text-black ml-1 underline"
        onClick={onClearAll}
      >
                  {t('common.clearAll')}
      </button>
    </div>
  );
};

export default SelectedFiltersDisplay; 