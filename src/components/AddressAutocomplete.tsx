import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AddressSuggestion {
  display: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  postcode?: string;
  country?: string;
  state?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, city: string, postcode: string) => void;
  countryCode?: string; // e.g. 'ru' to limit to Russia
  lang?: string; // 'ru' or 'en'
  className?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  countryCode,
  lang = 'ru',
  className = '',
  placeholder,
  id,
  name,
  required,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      // Photon API only supports: default, de, en, fr
      // For Russian, use 'default' which returns native OSM names (Russian for Russian locations)
      const photonLang = lang === 'en' ? 'en' : 'default';
      const limit = countryCode ? 15 : 6;
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=${photonLang}`;

      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Fetch failed');
      
      const data = await response.json();
      
      const parsed: AddressSuggestion[] = (data.features || [])
        .filter((f: any) => {
          // If country restriction, filter results
          if (countryCode) {
            const cc = f.properties?.countrycode?.toLowerCase();
            return cc === countryCode.toLowerCase();
          }
          return true;
        })
        .map((f: any) => {
          const p = f.properties || {};
          
          // Build display string
          const parts: string[] = [];
          if (p.street) parts.push(p.street);
          if (p.housenumber) parts.push(p.housenumber);
          if (!p.street && p.name) parts.push(p.name);
          if (p.city || p.locality) parts.push(p.city || p.locality);
          if (p.state) parts.push(p.state);
          if (p.country) parts.push(p.country);

          return {
            display: parts.join(', ') || p.name || query,
            street: p.street || p.name || '',
            houseNumber: p.housenumber || '',
            city: p.city || p.locality || p.county || '',
            postcode: p.postcode || '',
            country: p.country || '',
            state: p.state || '',
          };
        })
        .filter((s: AddressSuggestion) => s.display.length > 0);

      setSuggestions(parsed);
      setIsOpen(parsed.length > 0);
      setHighlightedIndex(-1);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Address autocomplete fetch error:', err);
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [countryCode, lang]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    // Build address string
    let addressStr = suggestion.street || '';
    if (suggestion.houseNumber) {
      addressStr += (addressStr ? ', ' : '') + suggestion.houseNumber;
    }

    onChange(addressStr || suggestion.display);
    onSelect(
      addressStr || suggestion.display,
      suggestion.city || '',
      suggestion.postcode || ''
    );
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{ top: '100%' }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                index === highlightedIndex
                  ? 'bg-indigo-50 text-indigo-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSelect(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="leading-tight">{suggestion.display}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
