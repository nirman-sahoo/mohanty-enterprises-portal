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
    <div className="fixed inset-0 w-screen h-screen max-w-full max-h-screen overflow-hidden bg-[#07162C] flex items-center justify-center select-none z-50">
      {/* 
        16:9 Canvas strictly constrained to fit viewport width AND height simultaneously.
        No scrolling is possible because dimensions are clamped to viewport maximums.
      */}
      <div 
        className="relative shadow-2xl overflow-hidden flex flex-col justify-between"
        style={{
          width: 'min(100vw, calc(100vh * 16 / 9))',
          height: 'min(100vh, calc(100vw * 9 / 16))',
          aspectRatio: '16 / 9',
        }}
      >
        {/* Background Image: exactly /images/login-page.jpeg */}
        <img 
          src="/images/login-page.jpeg" 
          alt="Mohanty Enterprises Terminal"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />

        {/* 
          Interactive Login Box:
          Positioned with sub-pixel precision directly over the login card part in the 16:9 image:
          - left: 64.81%
          - top: 11.11%
          - width: 33.25%
          - height: 73.89%
          Border and corner radius match the card underneath.
        */}
        <div 
          className="absolute z-20 flex items-center justify-center"
          style={{
            left: '64.81%',
            top: '11.11%',
            width: '33.25%',
            height: '73.89%',
          }}
        >
          <div className="w-full h-full bg-white rounded-[18px] sm:rounded-[24px] md:rounded-[28px] lg:rounded-[32px] border-[2px] lg:border-[2.5px] border-[#F5A623] shadow-2xl p-[3.5%] sm:p-[4%] lg:p-[4.5%] flex flex-col justify-between overflow-hidden">
            {/* Top Brand Header inside Card */}
            <div className="text-center">
              {/* Gold Medallion Emblem */}
              <div className="flex justify-center mb-1 lg:mb-1.5">
                <img 
                  src="/assets/aistudio/mohanty_emblem_transparent.png" 
                  alt="Mohanty Enterprises Emblem" 
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 xl:w-20 xl:h-20 max-h-[15%] object-contain drop-shadow"
                />
              </div>

              {/* Company Title */}
              <h2 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-black text-[#0B1D3A] tracking-wide font-sans">
                MOHANTY ENTERPRISES
              </h2>

              {/* Subtitle with Golden Horizontal Accents */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 text-[8px] sm:text-[9px] md:text-[9.5px] lg:text-[10.5px] font-bold text-slate-700 tracking-wider uppercase mt-0.5 mb-1.5 sm:mb-2 lg:mb-3">
                <span className="h-[1.5px] w-4 sm:w-6 lg:w-8 bg-[#F5A623]"></span>
                <span className="truncate">CEMENT • STEEL • CONSTRUCTION MATERIALS</span>
                <span className="h-[1.5px] w-4 sm:w-6 lg:w-8 bg-[#F5A623]"></span>
              </div>
            </div>

            {/* Interactive Form with Username, Password and Sign In */}
            <form onSubmit={handleSubmit} className="space-y-1.5 sm:space-y-2 lg:space-y-2.5">
              {/* Username Input Box */}
              <div className="relative flex items-center rounded-lg sm:rounded-xl border border-slate-300 bg-white focus-within:border-[#F5A623] focus-within:ring-2 focus-within:ring-[#F5A623]/25 transition-all">
                <div className="pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 text-slate-900">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full py-1.5 sm:py-2 md:py-2.5 pr-2.5 text-[11px] sm:text-xs md:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
                />
              </div>

              {/* Password Input Box with Visibility Toggle */}
              <div className="relative flex items-center rounded-lg sm:rounded-xl border border-slate-300 bg-white focus-within:border-[#F5A623] focus-within:ring-2 focus-within:ring-[#F5A623]/25 transition-all">
                <div className="pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 text-slate-900">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 stroke-[2.2]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full py-1.5 sm:py-2 md:py-2.5 pr-2 text-[11px] sm:text-xs md:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-2.5 sm:pr-3 pl-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>

              {/* Golden Yellow Solid Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 font-bold py-2 sm:py-2.5 md:py-3 px-3 rounded-lg sm:rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <div className="flex items-center gap-1.5">
                    <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-[11px] sm:text-xs md:text-sm font-extrabold tracking-wide">
                      Authenticating...
                    </span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-slate-950 stroke-[2.5]" />
                    <span className="text-[11px] sm:text-xs md:text-sm lg:text-base font-extrabold tracking-wide">
                      Sign In
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 mt-0.5">
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
            <div className="pt-1 sm:pt-1.5 border-t border-slate-100">
              {/* Divider with Headphones Icon & "Customer Support" */}
              <div className="flex items-center justify-center gap-1 text-slate-800 text-[9px] sm:text-[10px] md:text-[11px] font-bold mb-0.5">
                <Headphones className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-800 stroke-[2.2]" />
                <span>Customer Support</span>
              </div>

              {/* Support Email */}
              <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-900">
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
      </div>
    </div>
  );
};
