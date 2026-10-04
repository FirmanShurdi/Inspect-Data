import React from 'react';
import StatCards from '../../component/dashboard/StatCards';
import { Anchor, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner (Light Blue KSOP Gradient Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0369A1] p-6 text-white shadow-lg shadow-[#0284C7]/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold mb-2">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Sistem Inspeksi Digital KSOP</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Selamat Datang di Portal Syahbandar
            </h1>
            <p className="text-xs md:text-sm text-sky-100 mt-1 max-w-xl">
              Pantau aktivitas keberangkatan kapal, clearance muatan, dan audit fisik lapangan secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-3">
              <Anchor size={24} className="text-sky-200" />
              <div className="text-left">
                <p className="text-[10px] text-sky-200 uppercase font-semibold">Dermaga Utama</p>
                <p className="text-xs font-bold text-white">Pelabuhan KSOP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-36 -top-12 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* 2. Metric Stat Cards */}
      <StatCards />
    </div>
  );
}
