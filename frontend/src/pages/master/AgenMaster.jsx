import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Building2, Plus } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import FormAction from '../../component/modal/formaction';
import DeleteModal from '../../component/modal/delete';
import ActionMenu from '../../component/common/ActionMenu';

export default function AgenMaster() {
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // { type: 'form' | 'delete', item: null }
  const [formData, setFormData] = useState({ nama_agen: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isFetchingRef = React.useRef(false);

  const fetchAgenData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch('/api/agen', { headers: getAuthHeader() });
      if (res.ok) {
        const resData = await res.json();
        setDataList(resData.datas || resData.data || []);
      }
    } catch (err) {
      console.error('Fetch Agen Error:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAgenData();
  }, [fetchAgenData]);

  const handleOpenAdd = () => {
    setFormData({ nama_agen: '' });
    setActiveModal({ type: 'form', item: null });
  };

  const handleOpenEdit = useCallback((item) => {
    setFormData({ nama_agen: item.nama_agen || '' });
    setActiveModal({ type: 'form', item });
  }, []);

  const handleOpenDelete = useCallback((item) => {
    setActiveModal({ type: 'delete', item });
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_agen.trim()) return setToast({ message: 'Nama agen wajib diisi!', type: 'error' });

    setIsSubmitting(true);
    const isEdit = Boolean(activeModal?.item);
    const endpoint = isEdit ? `/api/agen/update/${activeModal.item.id_agen}` : '/api/agen/store';

    try {
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ message: isEdit ? 'Data agen berhasil diperbarui!' : 'Data agen baru berhasil ditambahkan!', type: 'success' });
        setActiveModal(null);
        fetchAgenData();
      } else {
        setToast({ message: resData.msg || 'Gagal menyimpan data.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghubungkan ke server.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeModal?.item?.id_agen) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/agen/delete/${activeModal.item.id_agen}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        setToast({ message: 'Data agen berhasil dihapus!', type: 'success' });
        setActiveModal(null);
        fetchAgenData();
      } else {
        setToast({ message: resData.msg || 'Gagal menghapus data.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghubungkan ke server.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        label: 'NO',
        className: 'w-16 text-center',
        render: (_, __, idx) => <span className="font-semibold text-slate-500">{idx + 1}</span>,
      },
      {
        key: 'nama_agen',
        label: 'NAMA AGEN',
        sortable: true,
        render: (val) => (
          <div className="flex items-center justify-end md:justify-start gap-2.5 text-right w-full">
            <div className="hidden md:flex w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] items-center justify-center shrink-0 border border-sky-100">
              <Building2 size={16} />
            </div>
            <span className="font-bold text-slate-800 break-words text-right">{val || '-'}</span>
          </div>
        ),
      },
      {
        key: 'aksi',
        label: 'AKSI',
        className: 'text-center w-20',
        render: (_, row) => <ActionMenu row={row} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />,
      },
    ],
    [handleOpenEdit, handleOpenDelete]
  );

  const formFields = useMemo(
    () => [{ name: 'nama_agen', label: 'Nama Agen Pelayaran', required: true, placeholder: 'Ketik nama PT / Agen pelayaran...' }],
    []
  );

  return (
    <div className="space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      <DeleteModal
        isOpen={activeModal?.type === 'delete'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Agen"
        message="Apakah Anda yakin ingin menghapus data agen ini?"
        itemName={activeModal?.item?.nama_agen}
        isLoading={isSubmitting}
      />

      <FormAction
        isOpen={activeModal?.type === 'form'}
        onClose={() => setActiveModal(null)}
        title={activeModal?.item ? 'Edit Data Agen' : 'Tambah Agen Baru'}
        icon={Building2}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        fields={formFields}
        formData={formData}
        onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
        submitLabel={activeModal?.item ? 'Simpan' : 'Tambah'}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Building2 size={26} className="text-[#0284C7]" />
            Master Agen Pelayaran
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola daftar agen / perusahaan pelayaran yang terdaftar di pelabuhan
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={dataList}
        isLoading={isLoading}
        searchPlaceholder="Cari nama agen..."
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Agen</span>
          </button>
        }
        emptyMessage="Belum ada data agen pelayaran terdaftar"
      />
    </div>
  );
}

