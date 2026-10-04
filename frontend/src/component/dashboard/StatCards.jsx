import React, { useState, useEffect } from 'react';
import { Ship, FileText, QrCode } from 'lucide-react';

/**
 * MetricStatCards Component (StatCards)
 * Renders 3 live metrics: Total Kapal, Data Manifest, Inspeksi Data
 * Styled following the MetricCards layout with direct backend API connections.
 */
export default function StatCards() {
  const [statsData, setStatsData] = useState({
    totalKapal: 0,
    kapalNow: 0,
    totalManifest: 0,
    manifestNow: 0,
    totalInspeksi: 0,
    inspeksiNow: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [kapalRes, manifestRes, logRes] = await Promise.all([
          fetch('/api/kapal/all', { headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/manifest/all', { headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/log-aktivitas', { headers }).then((r) => r.json()).catch(() => ({})),
        ]);

        if (!isMounted) return;

        const kapalList = kapalRes.datas || kapalRes.data || [];
        const manifestList = manifestRes.datas || manifestRes.data || [];
        const logList = logRes.datas || logRes.data || [];

        const todayStr = new Date().toISOString().split('T')[0];

        const totalK = kapalList.length;
        const kNow = kapalList.filter((item) => {
          if (!item.createdAt) return false;
          return new Date(item.createdAt).toISOString().split('T')[0] === todayStr;
        }).length;

        const totalM = manifestList.length;
        const mNow = manifestList.filter((item) => {
          if (!item.createdAt) return false;
          return new Date(item.createdAt).toISOString().split('T')[0] === todayStr;
        }).length;

        const totalI = logList.length;
        const iNow = logList.filter((item) => {
          if (!item.createdAt) return false;
          return new Date(item.createdAt).toISOString().split('T')[0] === todayStr;
        }).length;

        setStatsData({
          totalKapal: totalK,
          kapalNow: kNow,
          totalManifest: totalM,
          manifestNow: mNow,
          totalInspeksi: totalI,
          inspeksiNow: iNow,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const cardList = [
    {
      label: 'Jumlah Kapal Terdaftar',
      value: isLoading ? '...' : statsData.totalKapal,
      today: statsData.kapalNow,
      icon: <Ship className="w-6 h-6 text-[#0284C7]" />,
    },
    {
      label: 'Data Manifest Hari Ini',
      value: isLoading ? '...' : statsData.manifestNow,
      today: statsData.totalManifest,
      isTotalBadge: true,
      icon: <FileText className="w-6 h-6 text-[#0284C7]" />,
    },
    {
      label: 'Inspeksi & Audit Data',
      value: isLoading ? '...' : statsData.totalInspeksi,
      today: statsData.inspeksiNow,
      icon: <QrCode className="w-6 h-6 text-[#0284C7]" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
      {cardList.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100/80">
            {stat.icon}
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">{stat.label}</span>
              <h4 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                {stat.value}
              </h4>
            </div>
            <div className="flex items-center text-xs sm:text-sm font-semibold text-emerald-600">
              {stat.isTotalBadge ? (
                <span className="text-slate-500 font-medium">Total: {stat.today}</span>
              ) : (
                <>
                  <span>+{stat.today}</span>
                  <span className="ml-1 text-slate-400 font-normal">Baru</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { StatCards as MetricCards };
