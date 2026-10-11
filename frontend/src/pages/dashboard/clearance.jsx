import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, FileSpreadsheet } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import ActionMenu from '../../component/common/ActionMenu';
import DeleteModal from '../../component/modal/delete';
import { exportClearanceToExcel } from '../../utils/clearanceExcelExporter';

export default function Clearance() {
  const navigate = useNavigate();
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    item: null,
    isLoading: false,
  });

  // Fetch clearance data from backend API
  const fetchClearance = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch('/api/clearance', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const resData = await res.json();
        setDataList(resData.datas || resData.data || []);
      } else {
        setDataList([]);
      }
    } catch (err) {
      console.error('Fetch Clearance Error:', err);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClearance();
  }, [fetchClearance]);

  const handleOpenDetail = useCallback((item) => {
    const id = item?.id_clearance || item?.id_manifest;
    if (id) {
      navigate(`/clearance/detail/${id}`);
    }
  }, [navigate]);

  const handleOpenAdd = () => {
    navigate('/clearance/tambah');
  };

  const handleOpenEdit = useCallback((item) => {
    const id = item?.id_clearance || item?.id_manifest;
    if (id) {
      navigate(`/clearance/edit/${id}`);
    } else {
      navigate('/clearance/tambah');
    }
  }, [navigate]);

  const handleOpenVerifikasi = useCallback((item) => {
    const id = item?.id_clearance || item?.id_manifest;
    if (id) {
      navigate(`/clearance/verifikasi/${id}`, { state: { from: '/clearance' } });
    }
  }, [navigate]);

  const handleExportExcel = useCallback(async (item) => {
    const id = item?.id_clearance || item?.id_manifest;
    if (!id) return;
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/clearance/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const resData = await res.json();
        const detail = resData.data || resData.datas || resData;
        const exportRes = await exportClearanceToExcel(detail);
        setToast({
          message: `Berhasil mencetak Manifest Excel: ${exportRes.fileName} (${exportRes.totalKeseluruhan} Penumpang)`,
          type: 'success',
        });
      } else {
        setToast({ message: 'Gagal mengambil detail clearance untuk diexport', type: 'error' });
      }
    } catch (e) {
      console.error('Export Excel Error:', e);
      setToast({ message: 'Gagal mengekspor data ke Excel: ' + e.message, type: 'error' });
    }
  }, []);

  const handleOpenDelete = useCallback((item) => {
    const id = item?.id_clearance || item?.id_manifest;
    if (id) {
      setDeleteModal({
        isOpen: true,
        item,
        isLoading: false,
      });
    }
  }, []);

  const handleConfirmDelete = async () => {
    const item = deleteModal.item;
    const id = item?.id_clearance || item?.id_manifest;
    if (!id) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/clearance/delete/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setToast({ message: `Clearance #${id} berhasil dihapus!`, type: 'success' });
        setDeleteModal({ isOpen: false, item: null, isLoading: false });
        fetchClearance();
      } else {
        const resData = await res.json().catch(() => ({}));
        setToast({ message: resData.msg || resData.message || 'Gagal menghapus clearance', type: 'error' });
        setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error('Delete Clearance error:', err);
      setToast({ message: 'Terjadi kesalahan saat menghapus data clearance', type: 'error' });
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'no_urut',
        label: 'NO. REGISTER',
        sortable: true,
        render: (val, row) => (
          <span
            onClick={() => handleOpenDetail(row)}
            className="font-bold text-slate-800 hover:text-[#0284C7] hover:underline cursor-pointer"
          >
            {val || '-'}
          </span>
        ),
      },
      {
        key: 'nama_kapal',
        label: 'KAPAL',
        sortable: true,
        render: (val, row) => {
          const namaKapal = val || row.kapal?.nama_kapal || '-';
          return (
            <span className="font-bold text-slate-800 uppercase">
              {namaKapal}
            </span>
          );
        },
      },
      {
        key: 'nama_nahkoda',
        label: 'NAHKODA',
        sortable: true,
        render: (val, row) => {
          const nahkoda = val || row.nahkoda?.nama_nahkoda || '-';
          return <span className="text-slate-600 font-medium uppercase">{nahkoda}</span>;
        },
      },
      {
        key: 'cooldown_jam',
        label: 'COOLDOWN KTP',
        sortable: true,
        render: (val, row) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
            {row.cooldown_jam ?? val ?? 20} Jam
          </span>
        ),
      },
      {
        key: 'tujuan_akhir',
        label: 'TUJUAN',
        sortable: true,
        render: (val, row) => {
          const pelabuhan = val || row.pelabuhan_tujuan?.nama_pelabuhan || '-';
          return <span className="text-slate-600 font-medium uppercase">{pelabuhan}</span>;
        },
      },
      {
        key: 'waktu_berangkat',
        label: 'WAKTU BRGKT',
        sortable: true,
        render: (_, row) => {
          const tglRaw = row.tanggal_berangkat || '';
          const pkl = row.pukul_kapal_berangkat || row.pukul_clearance || '';
          
          let formattedDate = tglRaw;
          if (tglRaw.includes('-')) {
            const parts = tglRaw.split('T')[0].split('-');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }

          return (
            <div className="flex flex-col text-left leading-tight">
              <span className="font-bold text-slate-800 text-xs">{pkl || '--:--'}</span>
              <span className="text-[11px] text-slate-500 mt-0.5">{formattedDate || '-'}</span>
            </div>
          );
        },
      },
      {
        key: 'status_inspeksi',
        label: 'STATUS INSPEKSI',
        sortable: true,
        render: (_, row) => {
          const list = Array.isArray(row.penumpang_list)
            ? row.penumpang_list
            : Array.isArray(row.penumpang)
            ? row.penumpang
            : [];
          
          const total = row.total_penumpang !== undefined ? row.total_penumpang : list.length;
          const pending = row.count_pending !== undefined 
            ? row.count_pending 
            : list.filter(p => (p.status_verifikasi || 'pending') === 'pending').length;
          
          const status = row.status_inspeksi !== undefined && row.status_inspeksi !== '-'
            ? row.status_inspeksi
            : (total > 0 ? (pending > 0 ? 'pending' : 'selesai') : '-');

          if (total === 0 || status === '-') {
            return <span className="text-slate-400 font-medium text-xs">-</span>;
          }

          if (status === 'pending' || pending > 0) {
            return (
              <div
                onClick={() => handleOpenVerifikasi(row)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-bold shadow-2xs hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Klik untuk memverifikasi data penumpang"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Pending ({pending})</span>
              </div>
            );
          }

          return (
            <div
              onClick={() => handleOpenVerifikasi(row)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold shadow-2xs hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Klik untuk melihat data penumpang terverifikasi"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Selesai ({total})</span>
            </div>
          );
        },
      },
      {
        key: 'aksi',
        label: 'AKSI',
        className: 'text-center w-16',
        render: (_, row) => (
          <ActionMenu
            row={row}
            onView={handleOpenDetail}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            actions={[
              {
                label: 'Cetak Excel (.xlsx)',
                icon: FileSpreadsheet,
                onClick: () => handleExportExcel(row),
                variant: 'emerald',
              },
            ]}
          />
        ),
      },
    ],
    [handleOpenDetail, handleOpenEdit, handleOpenDelete, handleExportExcel]
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <FileText size={26} className="text-[#0284C7]" />
            Data Clearance Pelayaran
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola data clearance dan keberangkatan kapal
          </p>
        </div>
      </div>

      {/* Data Table Component */}
      <DataTable
        columns={columns}
        data={dataList}
        isLoading={isLoading}
        searchPlaceholder="Cari No. Register, Kapal, Agen..."
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Clearance</span>
          </button>
        }
        emptyMessage="Belum ada data clearance pelayaran"
      />

      {/* Modal Hapus Clearance */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Clearance"
        itemName={deleteModal.item ? `Clearance #${deleteModal.item.id_clearance || deleteModal.item.id_manifest} - ${deleteModal.item.nama_kapal || deleteModal.item.kapal?.nama_kapal || 'Kapal'}` : ''}
        message="Apakah Anda yakin ingin menghapus data clearance ini? Seluruh data penumpang terkait clearance ini akan ikut terhapus secara permanen."
        isLoading={deleteModal.isLoading}
      />
    </div>
  );
}
