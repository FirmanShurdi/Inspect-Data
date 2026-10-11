import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Briefcase, MapPin, ShieldCheck, Edit3, Calendar, CheckCircle2 } from 'lucide-react';
import EditProfileModal from '../../component/modal/EditProfileModal';
import Flash from '../../component/notif/flash';

const DetailCard = ({ icon: Icon, label, value }) => (
  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-start gap-3.5">
    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-[#0284C7] shadow-xs shrink-0">
      <Icon size={18} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-800 truncate">{value || '-'}</p>
    </div>
  </div>
);

export default function Profile() {
  const { user, updateUserSession } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.foto]);

  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">
        Memuat data profil pengguna...
      </div>
    );
  }

  const photoSrc = user.foto ? `/${user.foto}` : null;

  const handleProfileUpdated = (freshUserData) => {
    updateUserSession(freshUserData);
    setToast({
      message: 'Profil akun Anda berhasil diperbarui!',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-10">
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>Profil Pengguna</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Informasi identitas akun dan hak akses pengguna sistem inspeksi KSOP
          </p>
        </div>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:scale-95 text-white text-xs font-bold shadow-md shadow-[#0284C7]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Edit3 size={15} />
          <span>Edit Profil</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs space-y-8">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-dashed border-slate-200 pb-8">
          <div className="relative h-28 w-28 shrink-0 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-tr from-[#0284C7] to-[#0EA5E9] flex items-center justify-center text-white text-3xl font-extrabold select-none">
            {photoSrc && !imgError ? (
              <img
                key={photoSrc}
                src={photoSrc}
                alt={user.nama_lengkap || 'User'}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span>{(user.nama_lengkap || user.username || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="text-center sm:text-left flex-1 space-y-2">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {user.nama_lengkap || 'Nama Pengguna'}
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                @{user.username || 'username'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-[#0284C7] border border-sky-100 uppercase">
                <ShieldCheck size={13} />
                <span>{user.role || 'Superuser'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                <CheckCircle2 size={13} />
                <span>Akun Aktif</span>
              </span>

              {user.wilayah_kerja && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <MapPin size={13} />
                  <span>Wilker {user.wilayah_kerja}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Information Section */}
        <div>
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-800">Informasi Pribadi & Kontak</h3>
            <p className="text-xs text-slate-400">Rincian data identitas resmi petugas pelayaran</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <DetailCard icon={User} label="Nama Lengkap" value={user.nama_lengkap} />
            <DetailCard icon={User} label="Username" value={user.username} />
            <DetailCard icon={Mail} label="Alamat Email" value={user.email} />
            <DetailCard icon={Phone} label="Nomor Telepon / WA" value={user.no_hp} />
            <DetailCard icon={Briefcase} label="Jabatan Resmi" value={user.jabatan} />
            <DetailCard icon={MapPin} label="Wilayah Kerja" value={user.wilayah_kerja} />
            <DetailCard icon={ShieldCheck} label="Tingkat Akses (Role)" value={user.role} />
            <DetailCard icon={Calendar} label="Status Sistem" value="Terverifikasi & Aman" />
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleProfileUpdated}
        />
      )}
    </div>
  );
}
