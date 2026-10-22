import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  Ship,
  FileText,
  Database,
  History,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ShieldCheck
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';

const MASTER_SUB_ITEMS = [
  { name: 'Kapal', path: '/master/kapal' },
  { name: 'Nahkoda', path: '/master/nahkoda' },
  { name: 'Daerah', path: '/master/daerah' },
  { name: 'Pelabuhan', path: '/master/pelabuhan' },
];

export default function AppSidebar() {
  const { isExpanded, setIsExpanded, isMobileOpen, setIsMobileOpen } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  const userRole = (user?.role || 'user').toLowerCase();
  const isSuperuser = userRole === 'superuser';
  const isKoordinator = userRole === 'koordinator';
  const isUserOnly = !isSuperuser && !isKoordinator;

  const canAccessUsers = isSuperuser;
  const canAccessMasterAndLog = isSuperuser || isKoordinator;

  const isMasterActive = location.pathname.startsWith('/master');
  const [isMasterOpen, setIsMasterOpen] = useState(() => isMasterActive);

  useEffect(() => {
    if (isMasterActive) setIsMasterOpen(true);
  }, [isMasterActive]);

  const handleMasterClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setIsMasterOpen(true);
    } else {
      setIsMasterOpen((prev) => !prev);
    }
  };

  // Nav Items disesuaikan dengan Role:
  // - Petugas (user): Dashboard, Scan KTP, Clearance
  // - Koordinator: Dashboard, Scan KTP, Clearance, Data Master, Log Aktivitas
  // - Admin (superuser): Semua menu termasuk Kelola User
  const navItemsTop = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, hideOnMobile: !isUserOnly },
    { name: 'Scan KTP', path: '/inspeksi', icon: QrCode, badge: 'Live', hideOnMobile: !isUserOnly },
    { name: 'Clearance', path: '/clearance', icon: FileText, hideOnMobile: !isUserOnly },
  ];

  if (canAccessUsers) {
    navItemsTop.push({ name: 'Kelola User', path: '/users', icon: Users, hideOnMobile: false });
  }

  const renderNavLink = ({ name, path, icon: Icon, badge, hideOnMobile }) => (
    <NavLink
      key={path}
      to={path}
      onClick={() => setIsMobileOpen(false)}
      title={!isExpanded ? name : undefined}
      className={({ isActive }) =>
        `${hideOnMobile ? 'hidden lg:flex' : 'flex'} items-center font-medium text-sm transition-all group relative ${
          isExpanded ? 'w-full gap-3 px-3 py-2.5 rounded-xl justify-start' : 'w-11 h-11 p-0 rounded-xl justify-center shrink-0'
        } ${isActive
          ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white shadow-md shadow-[#0284C7]/25 font-semibold'
          : 'text-slate-600 hover:bg-[#E0F2FE]/70 hover:text-[#0284C7]'
        }`
      }
    >
      <Icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
      {isExpanded && <span className="truncate flex-1">{name}</span>}
      {isExpanded && badge && (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#E91E63] text-white shadow-sm">
          {badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen bg-white border-r border-slate-200/80 shadow-[2px_0_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'w-[260px]' : 'w-[80px]'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      {/* 1. Header & Brand Logo */}
      <div className={`h-16 border-b border-slate-100 flex items-center ${isExpanded ? 'px-4 justify-between' : 'px-0 justify-center'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] p-0.5 shadow-md shadow-[#0284C7]/20 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center p-1">
              <img src="/kementrianperhubungan.png" alt="Logo Kemenhub" className="w-full h-full object-contain" />
            </div>
          </div>
          {isExpanded && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-slate-800 text-sm tracking-tight truncate">SI INSPEKSI</span>
              <span className="text-[11px] font-semibold text-[#0284C7] tracking-wider uppercase truncate">Sistem Inspeksi Kapal</span>
            </div>
          )}
        </div>

        {/* Close Button on Mobile Drawer */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer outline-none"
          title="Tutup Menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Floating Collapse Button for Desktop */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="hidden lg:flex absolute top-1/2 -right-3.5 -translate-y-1/2 z-50 w-7 h-7 rounded-full bg-white border border-slate-200 hover:border-[#0284C7] text-slate-500 hover:text-[#0284C7] shadow-md items-center justify-center transition-transform hover:scale-110 cursor-pointer outline-none"
        title={isExpanded ? 'Kecilkan Sidebar' : 'Buka Sidebar'}
      >
        {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* 2. Navigation Items */}
      <div className={`flex-1 py-4 overflow-y-auto space-y-1.5 ${isExpanded ? 'px-3' : 'px-2 flex flex-col items-center'}`}>
        {/* Label Header Khusus di Drawer Mobile */}
        <div className="lg:hidden px-3 pt-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {canAccessMasterAndLog ? 'Menu Manajemen & Sistem' : 'Menu Utama'}
        </div>

        {/* Main Nav Items */}
        {navItemsTop.map(renderNavLink)}

        {/* Data Master Dropdown (Hanya untuk Koordinator & Superuser) */}
        {canAccessMasterAndLog && (
          <div className={`w-full ${!isExpanded ? 'flex justify-center' : ''}`}>
            <button
              type="button"
              onClick={handleMasterClick}
              title={!isExpanded ? 'Data Master' : undefined}
              className={`flex items-center font-medium text-sm transition-all group relative cursor-pointer outline-none ${isExpanded ? 'w-full gap-3 px-3 py-2.5 rounded-xl justify-between' : 'w-11 h-11 p-0 rounded-xl justify-center shrink-0'
                } ${isMasterActive
                  ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-[#E0F2FE]/70 hover:text-[#0284C7]'
                }`}
            >
              <Database size={20} className={`shrink-0 transition-transform group-hover:scale-110 ${isMasterActive ? 'text-[#0284C7]' : ''}`} />
              {isExpanded && <span className="truncate flex-1 text-left">Data Master</span>}
              {isExpanded && (
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-200 text-slate-400 ${isMasterOpen ? 'rotate-180 text-[#0284C7]' : ''}`}
                />
              )}
            </button>

            {/* Sub-items Accordion */}
            {isExpanded && isMasterOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-100 space-y-1">
                {MASTER_SUB_ITEMS.map((sub) => (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${isActive ? 'bg-[#0284C7] text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-sky-50 hover:text-[#0284C7]'
                      }`
                    }
                  >
                    <span className="truncate">{sub.name}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Log Aktivitas Item (Hanya untuk Koordinator & Superuser) */}
        {canAccessMasterAndLog && renderNavLink({ name: 'Log Aktivitas', path: '/log-aktivitas', icon: History })}
      </div>

      {/* 3. Footer: Active Role Badge */}
      <div className={`p-3 border-t border-slate-100 bg-slate-50/60 ${isExpanded ? '' : 'flex justify-center'}`}>
        {isExpanded ? (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isSuperuser ? 'bg-amber-100 text-amber-600' : isKoordinator ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-[#0284C7]'
            }`}>
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Akses Role</p>
              <p className="text-xs font-bold text-slate-700 truncate capitalize">
                {isSuperuser ? 'Admin (Semua Akses)' : isKoordinator ? 'Koordinator' : 'Petugas Lapangan'}
              </p>
            </div>
          </div>
        ) : (
          <div
            title={`Role: ${isSuperuser ? 'Admin' : isKoordinator ? 'Koordinator' : 'Petugas'}`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isSuperuser ? 'bg-amber-100 text-amber-600' : isKoordinator ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-[#0284C7]'
            }`}
          >
            <ShieldCheck size={18} />
          </div>
        )}
      </div>
    </aside>
  );
}
