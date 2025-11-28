import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has accepted cookies
    const checkCookieConsent = () => {
      const consentData = localStorage.getItem('cookieConsent');
      
      if (!consentData) {
        // First visit - show banner
        setIsVisible(true);
        return;
      }

      try {
        const { accepted, timestamp } = JSON.parse(consentData);
        
        if (!accepted) {
          setIsVisible(true);
          return;
        }

        // Check if 3 days (72 hours = 259200000 ms) have passed
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        const timeSinceAcceptance = Date.now() - timestamp;
        
        if (timeSinceAcceptance >= threeDaysInMs) {
          // 3 days have passed - show banner again
          setIsVisible(true);
        }
      } catch (error) {
        // Invalid data - show banner
        console.error('Error parsing cookie consent data:', error);
        setIsVisible(true);
      }
    };

    // Small delay to avoid flash on page load
    const timer = setTimeout(() => {
      checkCookieConsent();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    const consentData = {
      accepted: true,
      timestamp: Date.now()
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(consentData));
    setIsVisible(false);
  };

  const handleDecline = () => {
    setIsVisible(false);
    // Optionally store decline (to not show again for a period)
    // For now, we just hide it and it will show again after 3 days
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-gray-200 shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-gray-700">
          <p className="mb-1">
            We use cookies to enhance your browsing experience and analyze our traffic. 
            By clicking "I agree to terms and conditions", you consent to our use of cookies.
          </p>
          <p className="text-xs text-gray-500">
            This banner will reappear every 3 days for your review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-800 transition-colors"
          >
            I agree to terms and conditions
          </button>
          <button
            onClick={handleDecline}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

