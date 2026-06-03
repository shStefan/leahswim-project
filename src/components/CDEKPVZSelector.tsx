import React, { useEffect, useRef, useState } from 'react';
import { getCDEKDeliveryPoints, searchCDEKCities, type CDEKDeliveryPoint } from '../utils/cdekApi';
import { loadYandexMaps } from '../utils/loadScript';


interface CDEKPVZSelectorProps {
  city: string;
  postalCode?: string;
  onSelectPVZ: (pvz: CDEKDeliveryPoint) => void;
  selectedPVZ: CDEKDeliveryPoint | null;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const CDEKPVZSelector: React.FC<CDEKPVZSelectorProps> = ({
  city,
  postalCode,
  onSelectPVZ,
  selectedPVZ,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [pvzList, setPvzList] = useState<CDEKDeliveryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load Yandex Maps lazily on first render of this component
  useEffect(() => {
    loadYandexMaps()
      .then(() => window.ymaps.ready(() => setMapReady(true)))
      .catch((err) => console.error('Yandex Maps failed to load:', err));
  }, []);

  // Fetch PVZ points
  useEffect(() => {
    if (!city || !mapReady) return;

    const fetchPVZ = async () => {
      setLoading(true);
      setError(null);

      try {
        // First, search for the city to get city_code
        const citySuggestions = await searchCDEKCities(city, 'RU');
        
        if (!citySuggestions || citySuggestions.length === 0) {
          setError('Город не найден');
          setLoading(false);
          return;
        }

        // Use the first matching city's code
        const cityCode = citySuggestions[0].code;

        // Now fetch delivery points using city_code
        const points = await getCDEKDeliveryPoints({
          city_code: cityCode,
          country_code: 'RU',
          type: 'PVZ',
          is_handout: true, // Only points that can give out packages
        });

        setPvzList(points);

        if (points.length === 0) {
          setError('ПВЗ не найдены для указанного города');
        }
      } catch (err: any) {
        console.error('Error fetching PVZ:', err);
        setError('Ошибка при загрузке пунктов выдачи');
      } finally {
        setLoading(false);
      }
    };

    fetchPVZ();
  }, [city, postalCode, mapReady]);

  // Initialize map and add markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || pvzList.length === 0) return;

    if (!window.ymaps) {
      console.error('Yandex Maps not loaded');
      return;
    }

    // Destroy previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
    }

    window.ymaps.ready(() => {
      // Calculate center from PVZ points
      const coordinates = pvzList
        .filter((pvz) => pvz.location.latitude && pvz.location.longitude)
        .map((pvz) => [pvz.location.latitude!, pvz.location.longitude!]);

      let center: [number, number] = [55.7558, 37.6173]; // Default: Moscow

      if (coordinates.length > 0) {
        const avgLat =
          coordinates.reduce((sum, coord) => sum + coord[0], 0) /
          coordinates.length;
        const avgLon =
          coordinates.reduce((sum, coord) => sum + coord[1], 0) /
          coordinates.length;
        center = [avgLat, avgLon];
      }

      // Create map
      const map = new window.ymaps.Map(mapRef.current, {
        center: center,
        zoom: 10,
        controls: ['zoomControl', 'fullscreenControl'],
      });

      mapInstanceRef.current = map;

      // Add markers for each PVZ
      pvzList.forEach((pvz) => {
        if (!pvz.location.latitude || !pvz.location.longitude) return;

        const isSelected = selectedPVZ?.code === pvz.code;

        const marker = new window.ymaps.Placemark(
          [pvz.location.latitude, pvz.location.longitude],
          {
            balloonContentHeader: pvz.name || 'ПВЗ',
            balloonContentBody: `
              <div style="padding: 5px;">
                <strong>${pvz.name || 'Пункт выдачи'}</strong><br/>
                ${pvz.location.address_full || pvz.location.address || ''}<br/>
                ${pvz.work_time ? `Время работы: ${pvz.work_time}` : ''}<br/>
                ${pvz.phones && pvz.phones.length > 0 ? `Телефон: ${pvz.phones[0].number}` : ''}
              </div>
            `,
            balloonContentFooter: `<button onclick="window.selectPVZ('${pvz.code}')" style="padding: 5px 10px; background: #4F46E5; color: white; border: none; border-radius: 4px; cursor: pointer;">Выбрать</button>`,
            hintContent: pvz.name || 'ПВЗ',
          },
          {
            preset: isSelected ? 'islands#blueIcon' : 'islands#grayIcon',
          }
        );

        marker.events.add('click', () => {
          onSelectPVZ(pvz);
        });

        map.geoObjects.add(marker);
      });

      // Fit map to show all markers
      if (coordinates.length > 0) {
        map.setBounds(
          map.geoObjects.getBounds(),
          {
            checkZoomRange: true,
            duration: 300,
          }
        );
      }
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [pvzList, mapReady, selectedPVZ, onSelectPVZ]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Выберите пункт выдачи заказов (ПВЗ)
        </h4>
        {loading && (
          <div className="text-sm text-gray-600">Загрузка пунктов выдачи...</div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '400px' }}
        className="border border-gray-300 rounded-md"
      />

      {/* PVZ List */}
      {pvzList.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
          {pvzList.map((pvz) => (
            <div
              key={pvz.code}
              onClick={() => onSelectPVZ(pvz)}
              className={`p-3 border rounded-md cursor-pointer transition ${
                selectedPVZ?.code === pvz.code
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{pvz.name || 'ПВЗ'}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pvz.location.address_full || pvz.location.address || ''}
                  </p>
                  {pvz.work_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      Время работы: {pvz.work_time}
                    </p>
                  )}
                  {pvz.phones && pvz.phones.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Телефон: {pvz.phones[0].number}
                    </p>
                  )}
                </div>
                {selectedPVZ?.code === pvz.code && (
                  <div className="ml-2 text-indigo-600">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPVZ && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
          <p className="text-sm font-medium text-indigo-900">
            Выбранный ПВЗ: {selectedPVZ.name}
          </p>
          <p className="text-xs text-indigo-700 mt-1">
            {selectedPVZ.location.address_full || selectedPVZ.location.address}
          </p>
        </div>
      )}
    </div>
  );
};

export default CDEKPVZSelector;

