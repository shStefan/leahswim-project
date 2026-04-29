import { X } from 'lucide-react';

interface CookiesPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CookiesPolicyModal: React.FC<CookiesPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
        aria-labelledby="cookies-modal-title"
      >
        <div className="bg-white/90 border border-gray-200 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl mx-auto transition-all duration-300 ease-in-out transform scale-100 opacity-100 max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="cookies-modal-title" className="text-lg font-semibold text-black">Cookies Policy</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close Cookies Policy"
            >
              <X size={22} />
            </button>
          </div>
          <div className="p-6 text-sm text-black space-y-5 leading-relaxed overflow-y-auto flex-1">
            
            <section>
              <h3 className="font-semibold text-base mb-2">1. Introduction</h3>
              <p>This Cookies Policy explains how LÉAH uses cookies and similar technologies when you visit our website.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. What Are Cookies</h3>
              <p>Cookies are small text files stored on your device when you visit a website. They help improve functionality, performance, and user experience.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Types of Cookies We Use</h3>
              <p>We use the following types of cookies:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                <li><strong>Essential cookies:</strong> required for website functionality</li>
                <li><strong>Analytics cookies:</strong> help us understand how visitors use our website</li>
                <li><strong>Functional cookies:</strong> remember your preferences</li>
                <li><strong>Marketing cookies:</strong> used to deliver relevant advertisements (only with your consent)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. How We Use Cookies</h3>
              <p>We use cookies to:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                <li>Ensure proper website operation</li>
                <li>Analyze traffic and performance</li>
                <li>Improve user experience</li>
                <li>Provide personalized content and marketing</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Managing Cookies</h3>
              <p>You can manage or disable cookies through your browser settings. Please note that disabling cookies may affect website functionality.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Third-Party Cookies</h3>
              <p>We may use third-party services (e.g. analytics providers) that place cookies on your device.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Consent</h3>
              <p>When you first visit our website, you will be asked to consent to the use of non-essential cookies. You may withdraw your consent at any time.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Updates</h3>
              <p>We may update this Cookies Policy from time to time. The latest version will always be available on our website.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Contact</h3>
              <p>For any questions regarding this Cookies Policy, please contact:</p>
              <ul className="list-none space-y-1 mt-2">
                <li><strong>LÉAH</strong></li>
                <li>1 rue des Genets, 98000 Monaco</li>
                <li>Email: <a href="mailto:info@leahcation.com" className="text-indigo-600 hover:text-indigo-800 underline">info@leahcation.com</a></li>
              </ul>
            </section>

          </div>
          <div className="p-4 border-t border-gray-200 text-right flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookiesPolicyModal;
