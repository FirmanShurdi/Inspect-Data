import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { ShieldCheck, CheckCircle2, Clock, Users } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function InspectionStatusDoughnutChart({
  clearanceData = [],
  selectedMonth = null,
  selectedYear = new Date().getFullYear(),
}) {
  // Filter berdasarkan tahun dan (opsional) bulan
  const filteredData = clearanceData.filter((item) => {
    const dateStr = item.tanggal_clearance || item.tanggal_berangkat || item.createdAt;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    if (d.getFullYear() !== selectedYear) return false;
    if (selectedMonth !== null && d.getMonth() + 1 !== selectedMonth) return false;
    return true;
  });

  let totalSelesai = 0;
  let totalPending = 0;
  let totalPaxVerified = 0;
  let totalPaxPending = 0;

  filteredData.forEach((item) => {
    const verified = item.count_selesai || 0;
    const pending = item.count_pending || 0;
    const totalPax = item.total_penumpang || (verified + pending);

    if (item.status_inspeksi === 'selesai' || (totalPax > 0 && pending === 0)) {
      totalSelesai += 1;
    } else {
      totalPending += 1;
    }

    totalPaxVerified += verified;
    totalPaxPending += pending;
  });

  const totalManifests = totalSelesai + totalPending;
  const totalPax = totalPaxVerified + totalPaxPending;
  const percentComplete = totalManifests > 0 ? Math.round((totalSelesai / totalManifests) * 100) : 0;

  const data = {
    labels: ['Inspeksi Selesai', 'Pending / Belum Lengkap'],
    datasets: [
      {
        data: totalManifests > 0 ? [totalSelesai, totalPending] : [1, 0],
        backgroundColor: totalManifests > 0 ? ['#10B981', '#F59E0B'] : ['#E2E8F0', '#F1F5F9'],
        hoverBackgroundColor: totalManifests > 0 ? ['#059669', '#D97706'] : ['#CBD5E1', '#E2E8F0'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#475569',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (context) => {
            if (totalManifests === 0) return ' Belum ada data manifest';
            const val = context.raw || 0;
            const pct = Math.round((val / totalManifests) * 100);
            return ` ${context.label}: ${val} berkas (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Status Verifikasi & Audit
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {totalManifests} Manifest
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Kepatuhan inspeksi penumpang & data pelayaran
        </p>
      </div>

      {/* Doughnut Chart with Center Metric */}
      <div className="relative h-56 sm:h-60 w-full flex items-center justify-center my-2">
        <Doughnut data={data} options={options} />
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-slate-800 tracking-tight">
            {percentComplete}%
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Selesai
          </span>
        </div>
      </div>

      {/* Bottom Summary Indicators */}
      <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-emerald-900 block truncate">
              {totalSelesai} Manifest
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              {totalPaxVerified} Penumpang Scan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100/80">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-amber-900 block truncate">
              {totalPending} Pending
            </span>
            <span className="text-[10px] text-amber-600 font-medium">
              {totalPaxPending} Belum Scan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
