import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white py-12 px-[30px] mt-20">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Customer Care */}
        <div>
          <h3 className="[font-family:'Bebas_Neue',Helvetica] mb-4">Customer Care</h3>
          <div className="flex flex-col space-y-2 [font-family:'Archivo_Narrow',Helvetica] text-sm">
            <Link to="/contact" className="hover:underline">Contact Us</Link>
            <Link to="/shipping" className="hover:underline">Shipping</Link>
            <Link to="/faq" className="hover:underline">FAQ</Link>
            <Link to="/size-guide" className="hover:underline">Size Guide</Link>
            <Link to="/returns" className="hover:underline">Returns</Link>
          </div>
        </div>

        {/* Brand */}
        <div>
          <h3 className="[font-family:'Bebas_Neue',Helvetica] mb-4">Brand</h3>
          <div className="flex flex-col space-y-2 [font-family:'Archivo_Narrow',Helvetica] text-sm">
            <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>

        {/* Account */}
        <div>
          <h3 className="[font-family:'Bebas_Neue',Helvetica] mb-4">Account</h3>
          <div className="flex flex-col space-y-2 [font-family:'Archivo_Narrow',Helvetica] text-sm">
            <Link to="/signin" className="hover:underline">Sign In</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </div>
        </div>

        {/* Social */}
        <div>
          <h3 className="[font-family:'Bebas_Neue',Helvetica] mb-4">Social</h3>
          <div className="flex space-x-6">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-600">
              <Facebook size={20} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-600">
              <Instagram size={20} />
            </a>
          </div>
        </div>

        {/* Newsletter */}
        <div className="col-span-2 md:col-span-1">
          <h3 className="[font-family:'Bebas_Neue',Helvetica] mb-4">Sign up to our newsletter</h3>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 px-3 py-2 [font-family:'Archivo_Narrow',Helvetica]"
            />
            <div className="flex">
              <select className="border border-gray-300 px-2 py-2 [font-family:'Archivo_Narrow',Helvetica]">
                <option value="us">🇺🇸 +1</option>
              </select>
              <input
                type="tel"
                placeholder="Phone Number"
                className="flex-1 border border-gray-300 px-3 py-2 ml-2 [font-family:'Archivo_Narrow',Helvetica]"
              />
            </div>
            <button className="w-full bg-black text-white py-2 [font-family:'Bebas_Neue',Helvetica] hover:bg-gray-900">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}; 