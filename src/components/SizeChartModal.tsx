import { X } from 'lucide-react';

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SizeChartModal: React.FC<SizeChartModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sizeData = [
    { measurement: 'Размер', xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL' },
    { measurement: 'Бюст/см', xs: '82-86', s: '87-91', m: '92-97', l: '98-109', xl: '110-117', xxl: '118-122' },
    { measurement: 'Талия/см', xs: '55-59', s: '60-66', m: '67-76', l: '77-88', xl: '90-98', xxl: '98-104' },
    { measurement: 'Бедра/см', xs: '84-88', s: '89-93', m: '94-100', l: '101-109', xl: '110-117', xxl: '118-122' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 ease-in-out" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-chart-modal-title"
      >
        <div className="bg-white/90 border border-gray-200 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl mx-auto transition-all duration-300 ease-in-out transform scale-100 opacity-100">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 id="size-chart-modal-title" className="text-lg font-semibold text-black">Размерная таблица для купальников LÉAH</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close size chart"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-black max-h-[70vh] overflow-y-auto">
            <table className="w-full border-collapse text-sm text-center">
              <thead>
                <tr>
                  {Object.keys(sizeData[0]).map((key, index) => (
                    <th key={key} className={`p-2 border border-gray-300 font-medium ${index === 0 ? 'text-left' : ''} bg-gray-50`}>
                      {sizeData[0][key as keyof typeof sizeData[0]]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((cell, cellIndex) => (
                      <td key={cellIndex} className={`p-2 border border-gray-300 ${cellIndex === 0 ? 'text-left font-medium' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-200 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SizeChartModal; 