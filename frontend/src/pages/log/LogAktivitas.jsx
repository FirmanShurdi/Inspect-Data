import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatLogTimestamp(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${h}.${m}`;
}

const AKSI_CONFIG = [
  { keys: ['UPDATE', 'EDIT', 'UBAH'], style: 'bg-blue-100 text-blue-600', label: 'UPDATE' },
  { keys: ['DELETE', 'HAPUS'], style: 'bg-rose-100 text-rose-600', label: 'DELETE' },
  { keys: ['CREATE', 'TAMBAH', 'SIMPAN'], style: 'bg-emerald-100 text-emerald-600', label: 'CREATE' },
  { keys: ['LOGIN', 'MASUK', 'LOGOUT'], style: 'bg-sky-100 text-[#0284C7]', label: 'LOGIN' },
  { keys: ['VERIFIKASI', 'APPROVE', 'SELESAI'], style: 'bg-purple-100 text-purple-600', label: 'VERIFIKASI' },
];

function getAksiPill(aksiRaw) {
  const aksi = String(aksiRaw || '').toUpperCase();
  const cfg = AKSI_CONFIG.find((c) => c.keys.some((k) => aksi.includes(k)));
  const style = cfg ? cfg.style : 'bg-slate-100 text-slate-600';
  const label = cfg ? cfg.label : aksi || 'AKTIVITAS';

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider ${style}`}>
      {label}
    </span>
  );
}

/**
 * LogAktivitas Page Component
 * Direct live connection to /api/log-aktivitas with unified responsive native filters.
 */
export default function LogAktivitas() {
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filter States
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAksi, setSelectedAksi] = useState('');
  const [selectedEntitas, setSelectedEntitas] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch('/api/log-aktivitas', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setDataList(resData.datas || resData.data || []);
      } else {
        setDataList([]);
        setToast({ message: resData.msg || 'Gagal mengambil data log dari server.', type: 'error' });
      }
    } catch {
      setDataList([]);
      setToast({ message: 'Gagal terhubung ke server log aktivitas.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogData();
  }, [fetchLogData]);

  // Dynamic Options derived from dataList
  const userOptions = useMemo(() => {
    const set = new Set();
    dataList.forEach((item) => {
      const name = item.nama_user || item.username;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [dataList]);

  const entitasOptions = useMemo(() => {
    const set = new Set();
    dataList.forEach((item) => {
      if (item.entitas) set.add(item.entitas);
    });
    return Array.from(set);
  }, [dataList]);

  // Filtered dataset for DataTable
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      if (selectedUser && (item.nama_user || item.username) !== selectedUser) {
        return false;
      }
      if (selectedAksi && !String(item.aksi || '').toUpperCase().includes(selectedAksi.toUpperCase())) {
        return false;
      }
      if (selectedEntitas && String(item.entitas || '').toLowerCase() !== selectedEntitas.toLowerCase()) {
        return false;
      }
      if (startDate) {
        const itemTime = new Date(item.createdAt).setHours(0, 0, 0, 0);
        const startTime = new Date(startDate).setHours(0, 0, 0, 0);
        if (itemTime < startTime) return false;
      }
      if (endDate) {
        const itemTime = new Date(item.createdAt).setHours(23, 59, 59, 999);
        const endTime = new Date(endDate).setHours(23, 59, 59, 999);
        if (itemTime > endTime) return false;
      }
      return true;
    });
  }, [dataList, selectedUser, selectedAksi, selectedEntitas, startDate, endDate]);

  const columns = useMemo(
    () => [
      { key: 'createdAt', label: 'WAKTU', sortable: true, render: formatLogTimestamp },
      {
        key: 'nama_user',
        label: 'PENGGUNA',
        sortable: true,
        render: (_, row) => (
          <div>
            <div className="font-bold text-slate-900">{row.nama_user || row.username || 'user'}</div>
            {row.role && <div className="text-slate-500 font-normal">{row.role}</div>}
          </div>
        ),
      },
      {
        key: 'aksi',
        label: 'AKSI',
        sortable: true,
        className: 'w-28 text-center',
        render: getAksiPill,
      },
      { key: 'entitas', label: 'JENIS DATA', sortable: true, render: (val) => val || '-' },
      { key: 'keterangan', label: 'DATA YANG DIUBAH', render: (val) => val || '-' },
    ],
    []
  );

  const selectStyle =
    "w-full bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0284C7] shadow-2xs transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-9";

  const dateInputStyle =
    "w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0284C7] shadow-2xs transition-colors cursor-pointer";

  // Filter Bar Header Component rendered seamlessly inside DataTable Card Container
  const filterElement = (
    <div className="space-y-3">
      {/* Row 1: Full-width User Filter */}
      <div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className={selectStyle}
        >
          <option value="">Semua Pengguna</option>
          {userOptions.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Grid for Aksi, Jenis Data, and Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        {/* Filter 2: Semua Aksi */}
        <div>
          <select
            value={selectedAksi}
            onChange={(e) => setSelectedAksi(e.target.value)}
            className={selectStyle}
          >
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="VERIFIKASI">VERIFIKASI</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>

        {/* Filter 3: Semua Jenis Data */}
        <div>
          <select
            value={selectedEntitas}
            onChange={(e) => setSelectedEntitas(e.target.value)}
            className={selectStyle}
          >
            <option value="">Semua Jenis Data</option>
            {entitasOptions.map((entitas) => (
              <option key={entitas} value={entitas}>
                {entitas}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 4: Date Range (Start Date - End Date) */}
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={dateInputStyle}
          />
          <span className="text-slate-400 font-bold select-none">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={dateInputStyle}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* Main DataTable with Filters unified in single container card */}
      <DataTable
        filters={filterElement}
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        searchPlaceholder="Cari pengguna atau data..."
        emptyMessage="Belum ada riwayat aktivitas tercatat"
      />
    </div>
  );
}
