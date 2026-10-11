import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatCards from '../../component/dashboard/StatCards';
import MonthlyClearanceBarChart from '../../component/dashboard/MonthlyClearanceBarChart';
import InspectionStatusDoughnutChart from '../../component/dashboard/InspectionStatusDoughnutChart';
import { Anchor, ShieldCheck, ArrowRight, Ship, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [clearanceList, setClearanceList] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchClearances = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/clearance/all', { headers });
        const json = await res.json();
        if (isMounted && (json.datas || json.data)) {
          setClearanceList(json.datas || json.data || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard clearances:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchClearances();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set();
    clearanceList.forEach((c) => {
      const d = new Date(c.tanggal_clearance || c.tanggal_berangkat || c.createdAt);
      if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [clearanceList]);

  return (
    <div className="space-y-6 w-full font-sans pb-10">
      {/* 1. Welcome Banner (Light Blue KSOP Gradient Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0369A1] p-6 md:p-8 text-white shadow-lg shadow-[#0284C7]/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold mb-2">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>SI INSPEKSI • Sistem Digital KSOP</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Selamat Datang di Portal Syahbandar
            </h1>
            <p className="text-xs md:text-sm text-sky-100 mt-1 max-w-xl">
              Pantau aktivitas keberangkatan kapal, clearance muatan, dan audit fisik lapangan secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-3">
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

      {/* 3. Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <MonthlyClearanceBarChart
            clearanceData={clearanceList}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            availableYears={availableYears}
          />
        </div>

        <div className="lg:col-span-4">
          <InspectionStatusDoughnutChart
            clearanceData={clearanceList}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>
      </div>
    </div>
  );
}
