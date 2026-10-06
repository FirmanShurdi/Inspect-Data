import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Unlock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Flash from '../../component/notif/flash';
import axiosInstance from '../../api/axiosInstance';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, flash, clearFlash, showFlash } = useAuth();

  // Handle incoming session expiration or warning flash messages on login page
  useEffect(() => {
    if (flash && flash.type !== 'success') {
      setToast(flash);
      if (clearFlash) clearFlash();
    } else if (location.state?.message) {
      setToast({
        message: location.state.message,
        type: location.state.type || 'warning',
      });
    }
  }, [flash, location]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setToast({ message: 'Username dan password wajib diisi', type: 'warning' });
      return;
    }

    setIsLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.msg || `HTTP Error ${res.status}`);
      }

      const { token, user } = resData;

      if (login) {
        login(token, user);
      } else {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
      }

      const userName = user?.nama_lengkap || user?.nama || user?.username || 'User';
      const welcomeMsg = `Selamat Datang ${userName}!`;
      if (showFlash) {
        showFlash(welcomeMsg, 'success');
      }

      // Navigate immediately to Dashboard so the welcome toast displays exclusively on Dashboard
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login Error:', error);
      const rawErrorStr = error.response?.data?.msg || error.message || String(error);
      setToast({
        message: `Error: ${rawErrorStr}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full bg-slate-50 flex justify-center items-center font-sans overflow-hidden antialiased select-none p-3 sm:p-8 sm:h-auto sm:min-h-screen sm:overflow-auto">
      {/* Professional Toast Notification Component */}
      <Flash toast={toast} onClose={() => setToast(null)} />

      <div className="w-full max-w-[420px] px-4 sm:px-5 box-border relative sm:translate-y-[2px] sm:scale-105 md:scale-115 lg:scale-125 transition-transform duration-300 origin-center my-auto">

        <div className="flex flex-col items-center w-full">
          {/* 2. Stacked 3D Card Area */}
          <div className="mt-2 h-[510px] w-full relative">

            {/* A. Background Gradient Panel */}
            <div className="absolute top-[15px] -left-5 w-[72%] h-[435px] bg-[linear-gradient(180deg,#38BDF8_0%,#0284C7_50%,#0369A1_100%)] rounded-r-[24px] md:rounded-[24px] shadow-[-2px_10px_16px_rgba(2,132,199,0.22)] z-10" />

            {/* B. White Pointer Triangle */}
            <div className="absolute top-[18px] left-[65px] z-20 leading-none">
              <svg width="26" height="18" viewBox="0 0 26 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 0L26 18H0L13 0Z" fill="white"/>
              </svg>
            </div>

            {/* C. Foreground Main White Form Card */}
            <div className="absolute top-[35px] left-[25px] right-[10px] bg-white rounded-[24px] shadow-[0_10px_24px_rgba(0,0,0,0.08)] overflow-hidden z-30">

              <form id="loginForm" onSubmit={handleLogin} className="pt-5 px-6 pb-[45px] flex flex-col items-stretch">

                {/* Integrated Header: Logo Kemenhub (Top) & Selamat Datang (Below) */}
                <div className="flex flex-col items-center mb-2">
                  {/* Official Kemenhub Logo inside a Circular Badge */}
                  <div className="w-[60px] h-[60px] rounded-full bg-white p-1 shadow-[0_4px_14px_rgba(2,132,199,0.16)] border border-slate-100 flex items-center justify-center mb-1.5 transition-transform hover:scale-105">
                    <img
                      src="/kementrianperhubungan.png"
                      alt="Logo Kementerian Perhubungan"
                      className="w-full h-full object-contain filter drop-shadow-sm"
                    />
                  </div>

                  <h1
                    className="text-[22px] sm:text-[24px] font-black tracking-tight bg-gradient-to-r from-[#0369A1] via-[#0284C7] to-[#38BDF8] bg-clip-text text-transparent select-none text-center"
                    style={{
                      filter: 'drop-shadow(0px 1.5px 0px #ffffff) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.95))',
                    }}
                  >
                    Selamat Datang
                  </h1>
                </div>

                {/* Sign In Header - Light Blue Theme */}
                <div className="flex items-center gap-2 mb-[11px] mt-1">
                  <div className="w-1.5 h-4 bg-[linear-gradient(180deg,#0284C7_0%,#0EA5E9_100%)] rounded-full shadow-[0_2px_6px_rgba(2,132,199,0.3)]" />
                  <span className="text-[12px] font-extrabold text-[#0284C7] tracking-wider uppercase">
                    Sign in
                  </span>
                </div>

                {/* Username Input */}
                <div className="relative mb-5 flex items-center pt-2">
                  <input
                    type="text"
                    id="username"
                    placeholder=" "
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }}
                    className="peer w-full border-b border-[#E2E8F0] py-2 pr-12 pl-0 text-sm text-gray-800 outline-none focus:border-b-[1.5px] focus:border-[#0284C7] transition-all bg-transparent"
                  />
                  <label
                    htmlFor="username"
                    className="absolute left-0 top-3 text-sm text-[#A0AEC0] pointer-events-none transition-all duration-200 ease-out peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-[#0284C7] peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-[#0284C7] peer-autofill:-translate-y-5 peer-autofill:text-xs peer-autofill:font-semibold peer-autofill:text-[#0284C7]"
                  >
                    Username
                  </label>

                  <div className="absolute right-0 flex items-center gap-1.5">
                    {username && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => setUsername('')}
                        className="text-[#A0AEC0] hover:text-rose-500 transition-colors p-0.5 rounded-full hover:bg-gray-100 flex items-center justify-center outline-none"
                        title="Clear username"
                        tabIndex="-1"
                      >
                        <X size={15} />
                      </button>
                    )}
                    <User className="text-[#A0AEC0] pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative mb-4 flex items-center pt-2">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    id="password"
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }}
                    className="peer w-full border-b border-[#E2E8F0] py-2 pr-14 pl-0 text-sm text-gray-800 outline-none focus:border-b-[1.5px] focus:border-[#0284C7] transition-all bg-transparent"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-0 top-3 text-sm text-[#A0AEC0] pointer-events-none transition-all duration-200 ease-out peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-[#0284C7] peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-[#0284C7] peer-autofill:-translate-y-5 peer-autofill:text-xs peer-autofill:font-semibold peer-autofill:text-[#0284C7]"
                  >
                    Password
                  </label>

                  <div className="absolute right-0 flex items-center gap-1.5">
                    {password && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => setPassword('')}
                        className="text-[#A0AEC0] hover:text-rose-500 transition-colors p-0.5 rounded-full hover:bg-gray-100 flex items-center justify-center outline-none"
                        title="Clear password"
                        tabIndex="-1"
                      >
                        <X size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="bg-none border-none p-0 flex items-center justify-center cursor-pointer outline-none"
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => e.preventDefault()}
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      tabIndex="-1"
                    >
                      {isPasswordVisible ? (
                        <Unlock className="text-[#A0AEC0] hover:text-[#0284C7] transition-colors" size={18} />
                      ) : (
                        <Lock className="text-[#A0AEC0] hover:text-[#0284C7] transition-colors" size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end mt-2 mb-[41px]">
                  <a
                    href="#forgot"
                    className="text-xs text-[#718096] hover:text-[#0284C7] transition-colors no-underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>
              </form>

              {/* Card Bottom Wave Gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-[78px] pointer-events-none overflow-hidden">
                <svg
                  viewBox="0 0 350 78"
                  preserveAspectRatio="none"
                  className="w-full h-full block"
                >
                  <defs>
                    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="50%" stopColor="#0284C7" />
                      <stop offset="100%" stopColor="#0369A1" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,31.2 C122.5,3.9 227.5,66.3 350,19.5 L350,78 L0,78 Z"
                    fill="url(#waveGradient)"
                  />
                </svg>
              </div>
            </div>

            {/* D. Login Button */}
            <div className="absolute top-[420px] left-[25px] right-[10px] flex justify-center z-40">
              <button
                type="submit"
                form="loginForm"
                className="h-[44px] w-[140px] border-none rounded-[26px] bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] shadow-[0_5px_14px_rgba(2,132,199,0.45)] text-white text-[15px] font-bold tracking-[0.3px] cursor-pointer flex items-center justify-center outline-none active:scale-95 transition-all disabled:opacity-85"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-[18px] h-[18px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
