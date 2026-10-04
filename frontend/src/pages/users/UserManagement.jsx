import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, UserPlus, UserCheck, Mail, Phone, MapPin, Briefcase, Image as ImageIcon } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import DeleteModal from '../../component/modal/delete';
import FormAction from '../../component/modal/formaction';

const ROLES = [
  { value: 'user', label: 'User (Petugas)' },
  { value: 'koordinator', label: 'Koordinator' },
  { value: 'superuser', label: 'Superuser' },
];

const WILAYAH = [{ value: 'Pusat', label: 'Pusat' }, { value: 'Dungkek', label: 'Dungkek' }];

const INITIAL_FORM = {
  username: '', password: '', nama_lengkap: '', email: '', no_hp: '', jabatan: '', wilayah_kerja: 'Pusat', role: 'user',
};

export default function UserManagement() {
  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fileFoto, setFileFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(editUserTarget?.id_user || editUserTarget?.id);

  useEffect(() => {
    if (!isUserModalOpen) return;
    setFormData(editUserTarget ? {
      username: editUserTarget.username || '', password: '', nama_lengkap: editUserTarget.nama_lengkap || '',
      email: editUserTarget.email || '', no_hp: editUserTarget.no_hp || '', jabatan: editUserTarget.jabatan || '',
      wilayah_kerja: editUserTarget.wilayah_kerja || 'Pusat', role: editUserTarget.role || 'user',
    } : INITIAL_FORM);
    setPreviewFoto(editUserTarget?.foto ? `/${editUserTarget.foto}` : '');
    setFileFoto(null);
  }, [isUserModalOpen, editUserTarget]);

  const isFetchingRef = React.useRef(false);

  const fetchUsers = useCallback(async (query = '') => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users${query ? `?search=${encodeURIComponent(query)}` : ''}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.msg || `HTTP Error ${res.status}`);
      setUsersData(resData.datas || []);
    } catch (err) {
      setToast({ message: err.message || 'Gagal memuat data pengguna', type: 'error' });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchUsers(searchTerm); }, [fetchUsers, searchTerm]);

  const handleOpenCreate = () => { setEditUserTarget(null); setIsUserModalOpen(true); };
  const handleOpenEdit = useCallback((user) => { setEditUserTarget(user); setIsUserModalOpen(true); }, []);
  const handleFormChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setToast(null);
    if (!formData.username.trim()) return setToast({ message: 'Username wajib diisi', type: 'error' });
    if (!formData.nama_lengkap.trim()) return setToast({ message: 'Nama lengkap wajib diisi', type: 'error' });
    if (!isEdit && !formData.password.trim()) return setToast({ message: 'Password wajib diisi untuk pengguna baru', type: 'error' });
    if (formData.password && formData.password.length < 6) return setToast({ message: 'Password wajib minimal 6 karakter!', type: 'error' });

    setIsSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'password' && isEdit && !v) return;
        body.append(k, v);
      });
      if (fileFoto) body.append('foto', fileFoto);

      const url = isEdit ? `/api/users/update/${editUserTarget.id_user || editUserTarget.id}` : '/api/users/store';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || `HTTP Error ${res.status}`);

      setToast({ message: data.msg || (isEdit ? 'Pengguna diperbarui' : 'Pengguna ditambahkan'), type: 'success' });
      setIsUserModalOpen(false);
      fetchUsers(searchTerm);
    } catch (err) {
      setToast({ message: err.message || 'Gagal menyimpan data pengguna', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/delete/${deleteTarget.id_user}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.msg || `HTTP Error ${res.status}`);

      setToast({ message: `Pengguna "${deleteTarget.nama_lengkap || deleteTarget.username}" berhasil dihapus`, type: 'success' });
      setDeleteTarget(null);
      fetchUsers(searchTerm);
    } catch (err) {
      setToast({ message: err.message || 'Gagal menghapus pengguna', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role) => {
    const isSuper = role === 'superuser';
    const isKoor = role === 'koordinator';
    const badgeStyle = isSuper ? 'bg-purple-50 text-purple-700 border-purple-200' : isKoor ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-sky-50 text-sky-700 border-sky-200';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-extrabold border ${badgeStyle}`}>
        {isSuper ? 'Superuser' : isKoor ? 'Koordinator' : 'Petugas'}
      </span>
    );
  };

  const columns = useMemo(() => [
    {
      key: 'username', label: 'Pengguna', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
            {row.foto ? <img src={`/${row.foto}`} alt={row.username} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} /> : (row.nama_lengkap || row.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-800 text-[13px] truncate">{row.nama_lengkap || row.username}</span>
            <span className="text-[12px] text-slate-400 font-medium">@{row.username}</span>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Role Access', sortable: true, render: (v) => getRoleBadge(v) },
    {
      key: 'jabatan', label: 'Jabatan & Wilayah', sortable: true,
      render: (v, r) => (
        <div className="flex flex-col text-[13px] text-slate-600">
          <span className="font-bold flex items-center gap-1"><Briefcase size={12} className="text-slate-400 shrink-0" />{v || '-'}</span>
          <span className="text-[12px] text-slate-400 flex items-center gap-1"><MapPin size={11} className="text-slate-400 shrink-0" />{r.wilayah_kerja || '-'}</span>
        </div>
      ),
    },
    {
      key: 'email', label: 'Kontak',
      render: (v, r) => (
        <div className="flex flex-col text-[13px] text-slate-600">
          <span className="flex items-center gap-1 truncate"><Mail size={12} className="text-slate-400 shrink-0" />{v || '-'}</span>
          <span className="text-[12px] text-slate-400 flex items-center gap-1"><Phone size={11} className="text-slate-400 shrink-0" />{r.no_hp || '-'}</span>
        </div>
      ),
    },
    { key: 'actions', label: 'Aksi', className: 'text-center', onEdit: handleOpenEdit, onDelete: setDeleteTarget },
  ], [handleOpenEdit]);

  return (
    <div className="space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      <DeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengguna"
        message="Apakah Anda yakin ingin menghapus pengguna ini?"
        itemName={deleteTarget?.nama_lengkap || deleteTarget?.username}
        isLoading={isDeleting}
      />

      <FormAction
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={isEdit ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
        icon={isEdit ? UserCheck : UserPlus}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        submitLabel={isEdit ? 'Simpan' : 'Tambah'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FormAction.Label>Username *</FormAction.Label><FormAction.Input name="username" value={formData.username} onChange={handleFormChange} required placeholder="username" /></div>
          <div>
            <FormAction.Label>Password {isEdit ? '(Opsional, Min 6 Karakter)' : '* (Min 6 Karakter)'}</FormAction.Label>
            <FormAction.Input name="password" type="password" value={formData.password} onChange={handleFormChange} required={!isEdit} minLength={6} placeholder="••••••••" />
          </div>
        </div>
        <div><FormAction.Label>Nama Lengkap *</FormAction.Label><FormAction.Input name="nama_lengkap" value={formData.nama_lengkap} onChange={handleFormChange} required placeholder="Nama lengkap petugas" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FormAction.Label>Email</FormAction.Label><FormAction.Input name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="nama@ksop.go.id" /></div>
          <div><FormAction.Label>No HP</FormAction.Label><FormAction.Input name="no_hp" value={formData.no_hp} onChange={handleFormChange} placeholder="08123456789" /></div>
        </div>
        <div><FormAction.Label>Role Akses *</FormAction.Label><FormAction.Select options={ROLES} selected={formData.role} onChange={(v) => setFormData((p) => ({ ...p, role: v }))} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FormAction.Label>Jabatan</FormAction.Label><FormAction.Input name="jabatan" value={formData.jabatan} onChange={handleFormChange} placeholder="Ketik jabatan..." /></div>
          <div><FormAction.Label>Wilayah Kerja</FormAction.Label><FormAction.Select options={WILAYAH} selected={formData.wilayah_kerja} onChange={(v) => setFormData((p) => ({ ...p, wilayah_kerja: v }))} /></div>
        </div>
        <div>
          <FormAction.Label>Foto Profil</FormAction.Label>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
              {previewFoto ? <img src={previewFoto} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
            </div>
            <FormAction.File onChange={(e) => { const f = e.target.files[0]; if (f) { setFileFoto(f); setPreviewFoto(URL.createObjectURL(f)); } }} accept="image/*" />
          </div>
        </div>
      </FormAction>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5"><Users size={26} className="text-[#0284C7]" />Manajemen Pengguna</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Kelola data akun pengguna, role akses, jabatan, dan wilayah kerja petugas KSOP</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={usersData}
        isLoading={isLoading}
        searchPlaceholder="Cari nama, username, role, wilayah..."
        searchValue={searchTerm}
        onSearchChange={(val) => setSearchTerm(typeof val === 'string' ? val : val.target.value)}
        actions={
          <button type="button" onClick={handleOpenCreate} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer">
            <UserPlus size={15} /><span>Tambah User</span>
          </button>
        }
        pageSize={5}
        emptyMessage="Tidak ada data pengguna ditemukan"
      />
    </div>
  );
}
