import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, User, LogOut } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';

export default function AppHeader() {
  const navigate = useNavigate();
  const { toggleMobileSidebar } = useSidebar();
  const { user, logout, showFlash } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    setShowProfileMenu(false);
    if (showFlash) {
      showFlash('Berhasil keluar dari akun', 'info');
    }
    logout();
  };

  const [headerImgError, setHeaderImgError] = useState(false);

  useEffect(() => {
    setHeaderImgError(false);
  }, [user?.foto]);

  const photoSrc = user?.foto
    ? (user.foto.startsWith('/') || user.foto.startsWith('http') ? user.foto : `/${user.foto}`)
    : null;

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 fixed top-0 left-0 right-0 z-40 lg:sticky lg:top-0 w-full px-4 md:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-[#0284C7] hover:bg-[#E0F2FE] transition-colors outline-none cursor-pointer"
        >
          <Menu size={22} />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:flex items-center">
          <Search size={18} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari Kapal, No. Clearance, Manifest..."
            className="w-64 md:w-80 pl-9 pr-4 py-1.5 text-xs rounded-full bg-slate-100/80 border border-slate-200/60 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right: Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-[#0284C7]/20 overflow-hidden relative border border-white/60 select-none">
              {photoSrc && !headerImgError ? (
                <img
                  key={photoSrc}
                  src={photoSrc}
                  alt={user?.nama_lengkap || user?.username || 'U'}
                  className="w-full h-full object-cover"
                  onError={() => setHeaderImgError(true)}
                />
              ) : (
                <span>{(user?.nama_lengkap || user?.username || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="hidden md:flex flex-col text-left pr-1">
              <span className="text-xs font-extrabold text-slate-800 leading-tight truncate max-w-[140px]">
                {user?.nama_lengkap || user?.username || 'Petugas KSOP'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium capitalize">
                {user?.role || user?.jabatan || 'Syahbandar Utama'}
              </span>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white flex items-center justify-center overflow-hidden shrink-0 font-bold text-sm border border-slate-200">
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt="Profil"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span className={`w-full h-full items-center justify-center ${photoSrc ? 'hidden' : 'flex'}`}>
                    {(user?.nama_lengkap || user?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.nama_lengkap || user?.username || 'Petugas KSOP'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user?.email || (user?.username ? `@${user.username}` : 'ksop.officer@dephub.go.id')}
                  </p>
                </div>
              </div>
              {/* Menu items */}
              <button
                type="button"
                data-nav-path="/profil"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/profil');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-[#0284C7] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <User size={16} className="text-slate-400" />
                <span>Profil Saya</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
