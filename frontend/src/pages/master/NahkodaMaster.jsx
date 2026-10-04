import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserCheck, Plus, User } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import FormAction from '../../component/modal/formaction';
import DeleteModal from '../../component/modal/delete';
import ActionMenu from '../../component/common/ActionMenu';

export default function NahkodaMaster() {
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // { type: 'form' | 'delete', item: null }
  const [formData, setFormData] = useState({ nama_nahkoda: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isFetchingRef = React.useRef(false);

  const fetchNahkodaData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch('/api/nahkoda', { headers: getAuthHeader() });
      if (res.ok) {
        const resData = await res.json();
        setDataList(resData.datas || resData.data || []);
      }
    } catch (err) {
      console.error('Fetch Nahkoda Error:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchNahkodaData();
  }, [fetchNahkodaData]);

  const handleOpenAdd = () => {
    setFormData({ nama_nahkoda: '' });
    setActiveModal({ type: 'form', item: null });
  };

  const handleOpenEdit = useCallback((item) => {
    setFormData({ nama_nahkoda: item.nama_nahkoda || '' });
    setActiveModal({ type: 'form', item });
  }, []);

  const handleOpenDelete = useCallback((item) => {
    setActiveModal({ type: 'delete', item });
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_nahkoda.trim()) return setToast({ message: 'Nama nahkoda wajib diisi!', type: 'error' });

    setIsSubmitting(true);
    const isEdit = Boolean(activeModal?.item);
    const endpoint = isEdit ? `/api/nahkoda/update/${activeModal.item.id_nahkoda}` : '/api/nahkoda/store';

    try {
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ message: isEdit ? 'Data nahkoda berhasil diperbarui!' : 'Data nahkoda baru berhasil ditambahkan!', type: 'success' });
        setActiveModal(null);
        fetchNahkodaData();
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
    if (!activeModal?.item?.id_nahkoda) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/nahkoda/delete/${activeModal.item.id_nahkoda}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        setToast({ message: 'Data nahkoda berhasil dihapus!', type: 'success' });
        setActiveModal(null);
        fetchNahkodaData();
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
        key: 'nama_nahkoda',
        label: 'NAMA NAHKODA',
        sortable: true,
        render: (val) => (
          <div className="flex items-center justify-end md:justify-start gap-2.5 text-right w-full">
            <div className="hidden md:flex w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] items-center justify-center shrink-0 border border-sky-100">
              <User size={16} />
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
    () => [{ name: 'nama_nahkoda', label: 'Nama Lengkap Nahkoda', required: true, placeholder: 'Ketik nama nahkoda kapal...' }],
    []
  );

  return (
    <div className="space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      <DeleteModal
        isOpen={activeModal?.type === 'delete'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Nahkoda"
        message="Apakah Anda yakin ingin menghapus data nahkoda ini?"
        itemName={activeModal?.item?.nama_nahkoda}
        isLoading={isSubmitting}
      />

      <FormAction
        isOpen={activeModal?.type === 'form'}
        onClose={() => setActiveModal(null)}
        title={activeModal?.item ? 'Edit Data Nahkoda' : 'Tambah Nahkoda Baru'}
        icon={UserCheck}
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
            <UserCheck size={26} className="text-[#0284C7]" />
            Master Nahkoda Kapal
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola data nakhoda / kapten kapal pelayaran terdaftar
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={dataList}
        isLoading={isLoading}
        searchPlaceholder="Cari nama nahkoda..."
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Nahkoda</span>
          </button>
        }
        emptyMessage="Belum ada data nahkoda kapal terdaftar"
      />
    </div>
  );
}
