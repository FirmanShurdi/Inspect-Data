import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Printer, Users, CheckCircle2, Clock, UserCheck, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import Flash from '../../component/notif/flash';
import { exportClearanceToExcel } from '../../utils/clearanceExcelExporter';

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

export default function DetailClearance() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const res = await exportClearanceToExcel(data);
      setToast({
        message: `Berhasil mencetak Manifest Excel: ${res.fileName} (${res.totalKeseluruhan} Penumpang)`,
        type: 'success',
      });
    } catch (err) {
      console.error('Export Excel Error:', err);
      setToast({ message: 'Gagal mengekspor data ke Excel: ' + err.message, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clearance/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const resData = await res.json();
        setData(resData.data || resData.datas || resData);
      } else {
        setToast({ message: 'Gagal mengambil detail clearance', type: 'error' });
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
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Clearance #${id}?`)) return;
    try {
      const res = await fetch(`/api/clearance/delete/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setToast({ message: 'Clearance berhasil dihapus', type: 'success' });
        setTimeout(() => navigate('/clearance'), 1000);
      } else {
        setToast({ message: 'Gagal menghapus clearance', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Gagal menghapus clearance', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[350px] text-slate-500 text-[14px] font-medium">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Memuat detail clearance pelayaran...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-slate-500 text-[14px] font-medium">Data Clearance tidak ditemukan.</p>
        <button
          onClick={() => navigate('/clearance')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Kembali ke Clearance
        </button>
      </div>
    );
  }

  const penumpangList = data.penumpang_list || data.penumpangs || [];
  const verifiedCount = penumpangList.filter(p => p.status_verifikasi === 'selesai' || p.status_verifikasi === 'verified').length;
  const pendingCount = penumpangList.filter(p => p.status_verifikasi === 'pending' || !p.status_verifikasi).length;

  return (
    <div className="space-y-6 font-sans pb-12">
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* TOP BAR / BACK LINK */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/clearance')}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft size={15} />
            <span>Kembali ke Daftar Clearance</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
              Detail Clearance Pelayaran #{data.no_urut || data.id_clearance || data.id_manifest}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Cooldown: {data.cooldown_jam ?? 20} Jam
            </span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/clearance/edit/${id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
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
        </div>
      </div>

      {/* CARD 1: INFORMASI CLEARANCE & KAPAL */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <h2 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" size={20} />
          <span>Informasi Clearance & Kapal</span>
        </h2>

        {/* ROW 1: CLEARANCE INFO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px]">
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Nomor Register</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.no_urut || '-'}</p>
          </div>

          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Masa Tenggang KTP</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.cooldown_jam ?? 20} Jam</p>
          </div>

          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Tanggal Clearance</p>
            <p className="font-bold text-slate-800 text-[14px]">{formatDate(data.tanggal_clearance)}</p>
          </div>

          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Pukul Clearance</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.pukul_agen_clearance || '-'}</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* ROW 2: KAPAL INFO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[14px]">
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Nama Kapal</p>
            <p className="font-bold text-slate-900 text-[15px] uppercase">{data.nama_kapal || data.kapal?.nama_kapal || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Nama Nahkoda</p>
            <p className="font-bold text-slate-800 text-[14px] uppercase">{data.nama_nahkoda || data.nahkoda?.nama_nahkoda || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-normal mb-1 text-[13px]">Jumlah Crew</p>
            <p className="font-bold text-slate-800 text-[14px]">{data.jumlah_crew ? `${data.jumlah_crew} Orang` : '-'}</p>
          </div>
        </div>
      </div>

      {/* CARD 2: INFORMASI PERJALANAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <h2 className="text-[17px] font-bold text-slate-900">Informasi Perjalanan Kapal</h2>

        {/* KEDATANGAN */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Kedatangan Kapal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px]">
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Datang Dari</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_asal?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Sandar Di</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_sandar?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Tanggal Datang</p>
              <p className="font-bold text-slate-800 text-[14px]">{formatDate(data.tanggal_datang)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Kedudukan Kapal</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.id_kedudukan_kapal || '-'}</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* KEBERANGKATAN */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Keberangkatan Kapal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[14px]">
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Tolak Dari</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_tolak?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Tujuan Akhir</p>
              <p className="font-bold text-slate-800 text-[14px] uppercase">{data.pelabuhan_tujuan?.nama_pelabuhan || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Tanggal Berangkat</p>
              <p className="font-bold text-slate-800 text-[14px]">{formatDate(data.tanggal_berangkat)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-normal mb-1 text-[13px]">Pukul Berangkat</p>
              <p className="font-bold text-slate-800 text-[14px]">{data.pukul_kapal_berangkat || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: DAFTAR PENUMPANG */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs p-6 space-y-6">
        <h2 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
          <Users className="text-indigo-600" size={20} />
          <span>Daftar Penumpang Clearance</span>
        </h2>

        {/* STAT SUMMARY BADGES */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Total Penumpang Scanned</p>
              <p className="text-[18px] font-bold text-slate-900">{penumpangList.length} Orang</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={14} />
              <span>Verified: {verifiedCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock size={14} />
              <span>Pending: {pendingCount}</span>
            </span>
          </div>
        </div>

        {/* PASSENGER LIST TABLE */}
        {penumpangList.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-[13px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-bold text-[12px] uppercase border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-4 font-bold">NIK KTP</th>
                  <th className="py-3 px-4 font-bold">NAMA PENUMPANG</th>
                  <th className="py-3 px-4 font-bold">L/P</th>
                  <th className="py-3 px-4 font-bold">TEMPAT, TGL LAHIR</th>
                  <th className="py-3 px-4 font-bold">ALAMAT</th>
                  <th className="py-3 px-4 font-bold text-center">TIPE</th>
                  <th className="py-3 px-4 font-bold text-center">STATUS VERIFIKASI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {penumpangList.map((p, idx) => {
                  const isVerified = p.status_verifikasi === 'selesai' || p.status_verifikasi === 'verified';
                  const isRejected = p.status_verifikasi === 'rejected';

                  return (
                    <tr key={p.id_penumpang || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{p.nik || '-'}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 uppercase">{p.nama_penumpang || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-600 uppercase">{p.jenis_kelamin || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.tempat_lahir ? `${p.tempat_lahir}, ` : ''}{formatDate(p.tanggal_lahir)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">{p.alamat || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          p.tipe_penumpang === 'anak'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {p.tipe_penumpang === 'anak' ? 'Anak' : 'Dewasa'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isVerified ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>VERIFIED</span>
                            </>
                          ) : isRejected ? (
                            <span>REJECTED</span>
                          ) : (
                            <>
                              <Clock size={12} />
                              <span>PENDING</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="text-[14px] font-medium text-slate-500">Belum ada data penumpang terdaftar pada clearance kapal ini.</p>
            <p className="text-[12px] text-slate-400">Penumpang yang discan dari aplikasi petugas mobile akan muncul otomatis di sini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
