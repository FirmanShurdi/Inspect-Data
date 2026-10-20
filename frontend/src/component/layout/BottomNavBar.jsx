import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, FileText, QrCode } from 'lucide-react';

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Pantau apakah kamera fullscreen sedang aktif di halaman inspeksi
  useEffect(() => {
    const handleCameraState = (e) => {
      if (typeof e.detail?.isOpen === 'boolean') {
        setIsCameraActive(e.detail.isOpen);
      }
    };
    window.addEventListener('ksop-camera-state', handleCameraState);
    return () => window.removeEventListener('ksop-camera-state', handleCameraState);
  }, []);

  // Jika kamera aktif, sembunyikan navbar agar tidak menutupi tampilan viewfinder
  if (isCameraActive) return null;

  const currentPath = location.pathname;
  const isHomeActive = currentPath === '/' || currentPath === '/dashboard';
  const isScanActive = currentPath === '/inspeksi';
  const isClearanceActive = currentPath.startsWith('/clearance') || currentPath.startsWith('/manifest');

  const handleScanClick = (e) => {
    e.preventDefault();
    if (currentPath === '/inspeksi') {
      // Jika sudah di halaman inspeksi, buka kamera langsung
      window.dispatchEvent(new CustomEvent('ksop-trigger-open-camera'));
    } else {
      // Navigasi ke inspeksi dan otomatis aktifkan kamera
      navigate('/inspeksi', { state: { autoOpen: true } });
    }
  };

  return (
    <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[84%] max-w-[275px] select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <nav
        aria-label="Bottom Navigation Bar"
        className="relative bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full shadow-lg shadow-slate-900/10 px-4 py-1 flex items-center justify-between"
      >
        {/* 1. Tombol Pinggir Kiri: Beranda / Dashboard */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center gap-0.5 py-0.5 px-2 rounded-xl transition-all cursor-pointer outline-none group ${
            isHomeActive
              ? 'text-[#0284C7] font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
          title="Beranda / Dashboard"
        >
          <div className={`p-1 rounded-lg transition-all ${isHomeActive ? 'bg-sky-50 text-[#0284C7]' : 'group-hover:bg-slate-100'}`}>
            <Home size={18} strokeWidth={isHomeActive ? 2.5 : 2} />
          </div>
          <span className="text-[9px] tracking-tight">Beranda</span>
        </button>

        {/* 2. Tombol Tengah: Foto / Scan Kamera (Hero Floating Button) */}
        <div className="relative -mt-3.5">
          <button
            type="button"
            onClick={handleScanClick}
            className={`w-11 h-11 rounded-full border-2 border-white flex items-center justify-center transition-all cursor-pointer shadow-md outline-none active:scale-95 group ${
              isScanActive
                ? 'bg-gradient-to-tr from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] text-white shadow-[#0284C7]/40 ring-2 ring-[#0284C7]/30 scale-105'
                : 'bg-gradient-to-tr from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] text-white shadow-[#0284C7]/30 hover:scale-105'
            }`}
            title="Buka Kamera Scan KTP"
          >
            <Camera size={19} strokeWidth={2.2} className="group-hover:scale-110 transition-transform" />
          </button>
          <span className={`block text-center text-[9px] font-bold mt-0.5 tracking-tight ${isScanActive ? 'text-[#0284C7]' : 'text-slate-500'}`}>
            Scan
          </span>
        </div>

        {/* 3. Tombol Pinggir Kanan: Clearance Kapal */}
        <button
          type="button"
          onClick={() => navigate('/clearance')}
          className={`flex flex-col items-center justify-center gap-0.5 py-0.5 px-2 rounded-xl transition-all cursor-pointer outline-none group ${
            isClearanceActive
              ? 'text-[#0284C7] font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
          title="Daftar Clearance Kapal"
        >
          <div className={`p-1 rounded-lg transition-all ${isClearanceActive ? 'bg-sky-50 text-[#0284C7]' : 'group-hover:bg-slate-100'}`}>
            <FileText size={18} strokeWidth={isClearanceActive ? 2.5 : 2} />
          </div>
          <span className="text-[9px] tracking-tight">Clearance</span>
        </button>
      </nav>
    </div>
  );
}
