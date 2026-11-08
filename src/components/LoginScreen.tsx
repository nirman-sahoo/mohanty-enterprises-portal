import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Headphones, 
  Mail, 
  Handshake, 
  ShieldCheck, 
  Truck 
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const finalUser = username.trim() || 'Ayushman Mohanty';
      onLogin(finalUser);
    }, 350);
  };

  const handleQuickDemo = () => {
    setUsername('ayushman.mohanty');
    setPassword('terminal@2026');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#07162C] flex items-center justify-center overflow-x-hidden select-none">
      {/* 
        Desktop / Tablet: Responsive 16:9 Aspect Ratio Frame
        Uses the exact image uploaded into images/login page.jpeg
        The interactive Login Box is placed with sub-pixel precision directly above the login part in the image.
      */}
      <div className="relative w-full max-w-[1600px] min-h-screen md:min-h-0 md:aspect-[16/9] flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Exact Background Image from /images/login-page.jpeg */}
        <img 
          src="/images/login-page.jpeg" 
          alt="Mohanty Enterprises Terminal"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />

        {/* Mobile Header Branding (visible on small portrait viewports) */}
        <div className="md:hidden relative z-10 p-4 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 text-white flex items-center gap-3">
          <img 
            src="/assets/aistudio/mohanty_emblem_transparent.png" 
            alt="Mohanty Enterprises Logo" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">MOHANTY ENTERPRISES</h1>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              Cement • Steel • Construction Materials
            </p>
          </div>
        </div>

        {/* 
          Interactive Login Box:
          On md+ (desktop/laptop/tablet):
          Positioned EXACTLY over the login card part in the 1600x900 image:
          - left: 64.81%
          - top: 11.11%
          - width: 33.25%
          - height: 73.89%
          On mobile (< md):
          Centered with standard responsive padding.
        */}
        <div className="relative md:absolute md:left-[64.81%] md:top-[11.11%] md:w-[33.25%] md:h-[73.89%] z-20 flex items-center justify-center p-4 md:p-0 my-auto">
          <div className="w-full max-w-md md:max-w-none md:h-full bg-white rounded-[26px] md:rounded-[32px] border-[2.5px] border-[#F5A623] shadow-2xl p-5 sm:p-7 md:p-6 lg:p-7 xl:p-8 flex flex-col justify-between transition-all">
            {/* Top Emblem & Brand */}
            <div className="text-center">
              {/* Gold Medallion Emblem */}
              <div className="flex justify-center mb-1.5 md:mb-2">
                <img 
                  src="/assets/aistudio/mohanty_emblem_transparent.png" 
                  alt="Mohanty Enterprises Emblem" 
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-22 xl:h-22 object-contain drop-shadow"
                />
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl md:text-lg lg:text-xl xl:text-2xl font-black text-[#0B1D3A] tracking-wide font-sans">
                MOHANTY ENTERPRISES
              </h2>

              {/* Subtitle with Golden Horizontal Accents */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] font-bold text-slate-700 tracking-wider uppercase mt-1 mb-3 md:mb-4 lg:mb-5">
                <span className="h-[1.5px] w-5 sm:w-8 md:w-5 lg:w-8 bg-[#F5A623]"></span>
                <span className="truncate">CEMENT • STEEL • CONSTRUCTION MATERIALS</span>
                <span className="h-[1.5px] w-5 sm:w-8 md:w-5 lg:w-8 bg-[#F5A623]"></span>
              </div>
            </div>

            {/* Interactive Form with Username, Password and Sign In */}
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-3.5">
              {/* Username Input Box */}
              <div className="relative flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#F5A623] focus-within:ring-2 focus-within:ring-[#F5A623]/25 transition-all">
                <div className="pl-3.5 pr-2 text-slate-900">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full py-2.5 sm:py-3 md:py-2.5 lg:py-3 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
                />
              </div>

              {/* Password Input Box with Visibility Toggle */}
              <div className="relative flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#F5A623] focus-within:ring-2 focus-within:ring-[#F5A623]/25 transition-all">
                <div className="pl-3.5 pr-2 text-slate-900">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full py-2.5 sm:py-3 md:py-2.5 lg:py-3 pr-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3.5 pl-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>

              {/* Golden Yellow Solid Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1.5 md:mt-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 font-bold py-3 sm:py-3.5 md:py-3 lg:py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-slate-950" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-wide">
                      Authenticating...
                    </span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
                    <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-wide">
                      Sign In
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 mt-1">
              <span>Wholesale Terminal Access</span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer underline"
              >
                Fill Demo Credentials
              </button>
            </div>

            {/* Customer Support & Contact Info */}
            <div className="mt-2 md:mt-3 pt-2">
              {/* Divider with Headphones Icon & "Customer Support" */}
              <div className="relative flex items-center justify-center my-2 md:my-2.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-2.5 text-slate-800 text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                  <Headphones className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-800 stroke-[2.2]" />
                  <span>Customer Support</span>
                </div>
              </div>

              {/* Support Email */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-900">
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-800 stroke-[2.2] shrink-0" />
                <a 
                  href="mailto:mohantyenterprises.ayushman@gmail.com" 
                  className="hover:text-amber-600 transition-colors truncate"
                >
                  mohantyenterprises.ayushman@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Responsive Badges Bar (visible on small portrait viewports) */}
        <div className="md:hidden relative z-10 bg-[#07162C] border-t border-amber-500/30 px-3 py-2.5 flex flex-wrap items-center justify-around gap-2 text-[10px] text-white">
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <Handshake className="w-3 h-3" />
            <span className="text-white text-[9px]">Trusted Partner</span>
          </div>
          <span className="text-amber-500">|</span>
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span className="text-white text-[9px]">Quality Products</span>
          </div>
          <span className="text-amber-500">|</span>
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <Truck className="w-3 h-3" />
            <span className="text-white text-[9px]">On-Time Delivery</span>
          </div>
          <span className="text-amber-500">|</span>
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <Headphones className="w-3 h-3" />
            <span className="text-white text-[9px]">Dedicated Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};
