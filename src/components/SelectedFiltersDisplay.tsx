import React from 'react';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface SelectedFiltersDisplayProps {
  selectedSize: string;
  selectedColor: string;
  selectedCategory: string;
  categories: Category[];
  onClearSize: () => void;
  onClearColor: () => void;
  onClearCategory: () => void;
  onClearAll: () => void;
}

const SelectedFiltersDisplay: React.FC<SelectedFiltersDisplayProps> = ({
  selectedSize,
  selectedColor,
  selectedCategory,
  categories,
  onClearSize,
  onClearColor,
  onClearCategory,
  onClearAll,
}) => {
  if (!selectedSize && !selectedColor && !selectedCategory) return null;
  return (
    <div className="flex flex-row flex-wrap items-center gap-1 mb-2">
      {selectedSize && (
        <div className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white">
          <span className="mr-1">×</span>{selectedSize}
          <button className="ml-1 text-gray-400 hover:text-black" onClick={onClearSize} aria-label="Clear size" />
        </div>
      )}
      {selectedColor && (
        <div className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white">
          <span className="mr-1">×</span>{selectedColor}
          <button className="ml-1 text-gray-400 hover:text-black" onClick={onClearColor} aria-label="Clear color" />
        </div>
      )}
      {selectedCategory && (
        <div className="flex items-center text-xs border border-gray-200 rounded px-2 py-1 bg-white">
          <span className="mr-1">×</span>{categories.find((cat) => cat.id === parseInt(selectedCategory))?.name}
          <button className="ml-1 text-gray-400 hover:text-black" onClick={onClearCategory} aria-label="Clear style" />
        </div>
      )}
      <button
        className="text-xs text-gray-400 hover:text-black ml-1 underline"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  );
};

export default SelectedFiltersDisplay; 