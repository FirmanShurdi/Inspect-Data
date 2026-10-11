import React, { useState, useEffect } from 'react';
import { X, Upload, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

const wilkerOptions = [
  { value: 'Pusat', label: 'Pusat' },
  { value: 'Dungkek', label: 'Dungkek' },
  { value: 'Kalianget', label: 'Kalianget' },
  { value: 'Sapudi', label: 'Sapudi' },
  { value: 'Kangean', label: 'Kangean' },
  { value: 'Sapeken', label: 'Sapeken' },
  { value: 'Masalembu', label: 'Masalembu' },
];

export default function EditProfileModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nama_lengkap: user?.nama_lengkap || '',
    username: user?.username || '',
    email: user?.email || '',
    no_hp: user?.no_hp || '',
    jabatan: user?.jabatan || '',
    wilayah_kerja: user?.wilayah_kerja || 'Pusat',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    user?.foto ? `/${user.foto}` : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setErrorMsg('Format file tidak sesuai! Hanya file PNG, JPG, JPEG, atau WEBP yang diperbolehkan.');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMsg('Ukuran file terlalu besar! Maksimal 5MB.');
      e.target.value = '';
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_lengkap.trim() || !formData.username.trim()) {
      setErrorMsg('Nama lengkap dan username wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const data = new FormData();
      data.append('nama_lengkap', formData.nama_lengkap.trim());
      data.append('username', formData.username.trim());
      data.append('email', formData.email.trim());
      data.append('no_hp', formData.no_hp.trim());
      data.append('jabatan', formData.jabatan.trim());
      data.append('wilayah_kerja', formData.wilayah_kerja);

      if (formData.password && formData.password.trim() !== '') {
        data.append('password', formData.password.trim());
      }

      if (selectedFile) {
        data.append('foto', selectedFile);
      }

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/users/update/${user.id_user}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.msg || 'Gagal memperbarui profil pengguna');
      }

      let freshUser = resJson.data;
      if (!freshUser) {
        // Fallback fetch user data if not in response
        const getRes = await fetch(`/api/users/${user.id_user}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (getRes.ok) {
          const getJson = await getRes.json();
          if (getJson.data) {
            freshUser = getJson.data;
          }
        }
      }
      if (!freshUser) {
        freshUser = { ...user, ...formData };
      }

      if (onSuccess) {
        await onSuccess(freshUser);
      }
      onClose();
    } catch (err) {
      console.error('Update Profile Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan perubahan profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-gradient-to-r from-sky-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7] font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Edit Profil Akun</h3>
              <p className="text-xs text-slate-400">Perbarui identitas dan informasi akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Foto Profil Preview & Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <div className="relative h-20 w-20 shrink-0 rounded-full border-2 border-white shadow-md overflow-hidden bg-gradient-to-tr from-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white text-2xl font-bold">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Foto Profil"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  (formData.nama_lengkap || user?.username || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <label
                  htmlFor="foto-input"
                  className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] rounded-xl transition-colors shadow-xs"
                >
                  <Upload size={14} />
                  <span>Pilih Foto Baru</span>
                </label>
                <input
                  type="file"
                  id="foto-input"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Format: JPG, PNG, WEBP (Maksimal 5MB)
                </p>
              </div>
            </div>

            {/* Field Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    value={formData.nama_lengkap}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                    placeholder="Contoh: budi123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                    placeholder="nama@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor HP</label>
                  <input
                    type="tel"
                    name="no_hp"
                    value={formData.no_hp}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Jabatan</label>
                  <input
                    type="text"
                    name="jabatan"
                    value={formData.jabatan}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                    placeholder="Contoh: Petugas Syahbandar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Wilayah Kerja</label>
                  <select
                    name="wilayah_kerja"
                    value={formData.wilayah_kerja}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                  >
                    {wilkerOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Baru (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password Baru <span className="text-slate-400 font-normal">(Kosongkan bila tidak diganti)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2 pr-10 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 outline-none transition-all text-slate-800"
                    placeholder="Masukkan password baru minimal 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] active:scale-95 rounded-xl shadow-md shadow-[#0284C7]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
