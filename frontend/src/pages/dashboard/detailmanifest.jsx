import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Printer } from 'lucide-react';
import Flash from '../../component/notif/flash';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1] || parts[1];
      const year = parts[0];
      return `${day} ${month} ${year}`;
    }
    return clean;
  } catch (e) {
    return dateStr;
  }
};

const TABS = [
  { key: 'barang_datang', label: 'Barang Datang' },
  { key: 'barang_berangkat', label: 'Barang Berangkat' },
  { key: 'kendaraan_datang', label: 'Kendaraan Datang' },
  { key: 'kendaraan_berangkat', label: 'Kendaraan Berangkat' },
  { key: 'penumpang', label: 'Penumpang' },
];

export default function DetailManifest() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('penumpang');

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manifest/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const resData = await res.json();
        setData(resData.data || resData.datas || resData);
      } else {
        setToast({ message: 'Gagal mengambil detail manifest', type: 'error' });
      }
    } catch (err) {
      console.error('Fetch Detail Error:', err);
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDelete = async () => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Manifest #${id}?`)) return;
    try {
      const res = await fetch(`/api/manifest/delete/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setToast({ message: 'Manifest berhasil dihapus', type: 'success' });
        setTimeout(() => navigate('/manifest'), 1000);
      } else {
        setToast({ message: 'Gagal menghapus manifest', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Gagal menghapus manifest', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-[14px] font-medium">
        Memuat detail manifest...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-slate-500 text-[14px]">Data Manifest tidak ditemukan.</p>
        <button
          onClick={() => navigate('/manifest')}
          className="px-4 py-2 bg-[#0284C7] text-white text-[13px] font-semibold rounded-xl cursor-pointer"
        >
          Kembali ke Manifest
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* TOP BAR / BACK LINK */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/manifest')}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 font-normal transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft size={15} />
            <span>Kembali ke Daftar Clearance</span>
          </button>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Detail Manifest Pelayaran
          </h1>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/manifest/edit/${id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 size={15} />
            <span>Edit Data</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Hapus</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Printer size={15} />
            <span>Cetak SPB</span>
          </button>
        </div>
      </div>

      {/* CARD 1: INFORMASI UMUM & KAPAL */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <h2 className="text-[18px] font-bold text-slate-900">Informasi Umum & Kapal</h2>

        {/* ROW 1: CLEARANCE INFO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[14px]">
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">Nomor Register</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.no_urut || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">No SPB Asal</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.no_spb_asal || data.spb?.no_spb_asal || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">Tanggal Clearance</p>
            <p className="font-bold text-slate-800 text-[14px]">{formatDate(data.tanggal_clearance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px]">
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">Pukul Clearance</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.pukul_agen_clearance || '-'}</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* ROW 2: KAPAL INFO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[14px]">
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">Nama Kapal</p>
            <p className="font-bold text-slate-800 text-[14px] uppercase">{data.nama_kapal || data.kapal?.nama_kapal || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">Nahkoda</p>
            <p className="font-bold text-slate-800 text-[14px] uppercase">{data.nama_nahkoda || data.nahkoda?.nama_nahkoda || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[14px]">Jumlah Crew</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.jumlah_crew ?? '-'}</p>
          </div>
        </div>
      </div>

      {/* CARD 2: INFORMASI PERJALANAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <h2 className="text-[18px] font-bold text-slate-900">Informasi Perjalanan</h2>

        {/* KEDATANGAN */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-semibold text-slate-600">Kedatangan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px]">
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Datang Dari</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_asal?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Sandar Di</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_sandar?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Tanggal Datang</p>
              <p className="font-bold text-slate-800 text-[14px]">{formatDate(data.tanggal_datang)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Kedudukan Kapal</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.id_kedudukan_kapal || '-'}</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* KEBERANGKATAN */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-semibold text-slate-600">Keberangkatan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px]">
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Tolak Dari</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_tolak?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Tujuan Akhir</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_tujuan?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Tanggal Berangkat</p>
              <p className="font-bold text-slate-800 text-[14px]">{formatDate(data.tanggal_berangkat)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Pukul Berangkat</p>
              <p className="font-bold text-slate-800 text-[14px]">{data.pukul_kapal_berangkat || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px] pt-2">
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Pelabuhan Singgah</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_singgah?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[14px]">Status Muatan Berangkat</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.status_muatan_berangkat || 'SESUAI MANIFEST'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: TABEL PENUMPANG */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        {/* TABS HEADER */}
        <div className="flex items-center gap-6 px-6 border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 text-[14px] font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                activeTab === tab.key
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT: PENUMPANG ONLY TABLE */}
        <div className="p-4 sm:p-6 space-y-4">
          <table className="w-full text-[14px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-bold text-[13px] uppercase border-b border-slate-100">
                <th className="py-2.5 px-4 font-bold">KETERANGAN</th>
                <th className="py-2.5 px-4 text-right font-bold">JUMLAH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-800">Penumpang Naik</td>
                <td className="py-3.5 px-4 text-right text-slate-600">{data.penumpang_naik || 0} Orang</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-800">Penumpang Turun</td>
                <td className="py-3.5 px-4 text-right text-slate-600">{data.penumpang_turun || 0} Orang</td>
              </tr>
            </tbody>
          </table>

          {(!data.penumpang_naik && !data.penumpang_turun) && (
            <p className="text-center text-[13px] text-slate-400 pt-3 pb-1">
              Tidak ada data penumpang.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
