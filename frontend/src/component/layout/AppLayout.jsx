import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import Flash from '../notif/flash';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import Backdrop from './Backdrop';
import ScanPopup from '../ui/ScanPopup';

const LayoutContent = () => {
  const { isExpanded } = useSidebar();
  const { flash, clearFlash } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 relative">
      <Flash toast={flash} onClose={clearFlash} />
      <AppSidebar />
      <Backdrop />

      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out pt-16 lg:pt-0 ${
          isExpanded ? 'lg:ml-[260px]' : 'lg:ml-[80px]'
        }`}
      >
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-screen-2xl w-full mx-auto pb-28">
          <Outlet />
        </main>
      </div>

      {/* Floating Scan Camera Button on Bottom Right */}
      <ScanPopup />
    </div>
  );
};

export default function AppLayout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
}
