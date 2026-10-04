import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Ship, MapPin } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import ActionMenu from '../../component/common/ActionMenu';
import DeleteModal from '../../component/modal/delete';

export default function Manifest() {
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

  // Fetch manifest data from backend API
  const fetchManifest = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch('/api/manifest', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const resData = await res.json();
        setDataList(resData.datas || resData.data || []);
      } else {
        setDataList([]);
      }
    } catch (err) {
      console.error('Fetch Manifest Error:', err);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const handleOpenDetail = useCallback((item) => {
    if (item?.id_manifest) {
      navigate(`/manifest/detail/${item.id_manifest}`);
    }
  }, [navigate]);

  const handleOpenAdd = () => {
    navigate('/manifest/tambah');
  };

  const handleOpenEdit = useCallback((item) => {
    if (item?.id_manifest) {
      navigate(`/manifest/edit/${item.id_manifest}`);
    } else {
      navigate('/manifest/tambah');
    }
  }, [navigate]);

  const handleOpenVerifikasi = useCallback((item) => {
    if (item?.id_manifest) {
      navigate(`/manifest/verifikasi/${item.id_manifest}`, { state: { from: '/manifest' } });
    }
  }, [navigate]);

  const handleOpenDelete = useCallback((item) => {
    if (item?.id_manifest) {
      setDeleteModal({
        isOpen: true,
        item,
        isLoading: false,
      });
    }
  }, []);

  const handleConfirmDelete = async () => {
    const item = deleteModal.item;
    if (!item?.id_manifest) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/manifest/delete/${item.id_manifest}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setToast({ message: `Manifest #${item.id_manifest} berhasil dihapus!`, type: 'success' });
        setDeleteModal({ isOpen: false, item: null, isLoading: false });
        fetchManifest();
      } else {
        const resData = await res.json().catch(() => ({}));
        setToast({ message: resData.msg || resData.message || 'Gagal menghapus manifest', type: 'error' });
        setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error('Delete Manifest error:', err);
      setToast({ message: 'Terjadi kesalahan saat menghapus data manifest', type: 'error' });
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Presisi Kolom sesuai Gambar UI:
  // NO. SPB | NO. REGISTER | NO. PPK | KAPAL | NAHKODA | TUJUAN | WAKTU BRGKT | AGEN | AKSI
  const columns = useMemo(
    () => [
      {
        key: 'no_spb',
        label: 'NO. SPB',
        sortable: true,
        render: (val, row) => {
          const displaySpb = val || row.spb?.no_spb || '-';
          return (
            <span
              onClick={() => handleOpenDetail(row)}
              className="text-[#6366F1] font-semibold hover:underline cursor-pointer"
            >
              {displaySpb}
            </span>
          );
        },
      },
      {
        key: 'no_urut',
        label: 'NO. REGISTER',
        sortable: true,
        render: (val) => <span className="font-bold text-slate-800">{val || '-'}</span>,
      },
      {
        key: 'ppk',
        label: 'NO. PPK',
        sortable: true,
        render: (val) => <span className="text-slate-600 font-medium">{val || '-'}</span>,
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
        key: 'nama_agen',
        label: 'AGEN',
        sortable: true,
        render: (val, row) => {
          const agenNama = val || row.agen?.nama_agen || '-';
          return <span className="text-slate-600 font-medium uppercase">{agenNama}</span>;
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
          />
        ),
      },
    ],
    [handleOpenDetail, handleOpenEdit, handleOpenDelete]
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
            Data Manifest
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola data manifest clearance dan keberangkatan kapal
          </p>
        </div>
      </div>

      {/* Data Table Component */}
      <DataTable
        columns={columns}
        data={dataList}
        isLoading={isLoading}
        searchPlaceholder="Cari No SPB, Register, Kapal, Agen..."
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Manifest</span>
          </button>
        }
        emptyMessage="Belum ada data manifest pelayaran"
      />

      {/* Modal Hapus Manifest */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Manifest"
        itemName={deleteModal.item ? `Manifest #${deleteModal.item.id_manifest} - ${deleteModal.item.nama_kapal || deleteModal.item.kapal?.nama_kapal || 'Kapal'}` : ''}
        message="Apakah Anda yakin ingin menghapus data manifest ini? Seluruh data penumpang terkait manifest ini akan ikut terhapus secara permanen."
        isLoading={deleteModal.isLoading}
      />
    </div>
  );
}
