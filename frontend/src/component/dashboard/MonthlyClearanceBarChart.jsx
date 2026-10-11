import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function MonthlyClearanceBarChart({
  clearanceData = [],
  selectedYear = new Date().getFullYear(),
  onSelectYear = () => {},
  selectedMonth = null,
  onSelectMonth = () => {},
  availableYears = [new Date().getFullYear()],
}) {
  // Hitung jumlah clearance per bulan untuk tahun terpilih
  const monthlyCounts = Array(12).fill(0);
  const monthlyPassengerCounts = Array(12).fill(0);

  clearanceData.forEach((item) => {
    const dateStr = item.tanggal_clearance || item.tanggal_berangkat || item.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;

    if (d.getFullYear() === selectedYear) {
      const monthIdx = d.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyCounts[monthIdx] += 1;
        monthlyPassengerCounts[monthIdx] += (item.total_penumpang || item.penumpang_list?.length || 0);
      }
    }
  });

  const chartData = {
    labels: MONTH_SHORT,
    datasets: [
      {
        label: 'Jumlah Clearance Kapal',
        data: monthlyCounts,
        backgroundColor: monthlyCounts.map((_, i) =>
          selectedMonth === i + 1 ? '#0369A1' : '#0284C7'
        ),
        hoverBackgroundColor: '#0369A1',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 36,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          title: (tooltipItems) => {
            const idx = tooltipItems[0]?.dataIndex;
            return `Bulan ${MONTH_NAMES[idx]} ${selectedYear}`;
          },
          label: (context) => {
            const count = context.raw || 0;
            const pax = monthlyPassengerCounts[context.dataIndex] || 0;
            return [` Clearance Kapal: ${count} kali`, ` Total Penumpang: ${pax} orang`];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: '600' },
          color: '#64748B',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: { size: 11 },
          color: '#94A3B8',
        },
        grid: {
          color: '#F1F5F9',
        },
      },
    },
    onHover: (event, chartElement) => {
      if (event?.native?.target) {
        event.native.target.style.cursor = chartElement?.length ? 'pointer' : 'default';
      }
    },
    onClick: (_, elements) => {
      if (elements && elements.length > 0) {
        const clickedIndex = elements[0].index;
        const clickedMonth = clickedIndex + 1;
        if (selectedMonth === clickedMonth) {
          onSelectMonth(null);
        } else {
          onSelectMonth(clickedMonth);
        }
      }
    },
  };

  const totalInYear = monthlyCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-50 text-[#0284C7]">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Grafik Clearance per Bulan
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {selectedMonth && selectedMonth > 0
              ? `Filter Aktif: Bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
              : `Klik batang grafik atau bulan untuk filter per bulan (Tahun ${selectedYear})`}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          {selectedMonth && selectedMonth > 0 && (
            <button
              onClick={() => onSelectMonth(null)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
            >
              Semua Bulan ({selectedYear})
            </button>
          )}

          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(parseInt(e.target.value, 10))}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-[#0284C7] cursor-pointer"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="h-64 sm:h-72 w-full mt-2">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
