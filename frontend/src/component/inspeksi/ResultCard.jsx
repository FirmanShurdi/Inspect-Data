import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  RefreshCw, CheckCircle2, Copy, Image as ImageIcon, ShieldCheck,
  ChevronLeft, ChevronRight, Check, Trash2, Camera
} from 'lucide-react';
import { decodeNIK } from '../../utils/nikDecoder';
import DeleteModal from '../modal/delete';
import ImagePreviewModal from './ImagePreviewModal';
import ChildForm from './ChildForm';

// --- Pure Helper Utilities ---
function getKategoriUsia(str) {
  if (!str) return '';
  const s = String(str).trim();
  let day, month, year;
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
    const p = s.split(/[-/]/);
    day = +p[0]; month = +p[1] - 1; year = +p[2];
  } else if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    const p = s.split(/[-/]/);
    year = +p[0]; month = +p[1] - 1; day = +p[2];
  } else return '';
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return '';
  return (new Date().getFullYear() - d.getFullYear()) < 12 ? 'Anak' : 'Dewasa';
}

export function formatToDateInput(val) {
  if (!val) return '';
  const clean = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('-');
    return `${y}-${m}-${d}`;
  }
  return clean;
}

function normalizeGender(val) {
  if (!val) return 'LAKI-LAKI';
  const s = String(val).trim().toUpperCase();
  if (s === 'L' || s.includes('LAK') || s === 'MALE') return 'LAKI-LAKI';
  if (s === 'P' || s.includes('PEREM') || s === 'FEMALE') return 'PEREMPUAN';
  return s;
}

const getPhotoSrc = (obj = {}, fallback = '') =>
  obj.foto_ktp || obj.foto || obj.foto_base64 || fallback || '';

function parseInitialAnakList(data = {}) {
  const katUsia = getKategoriUsia(data.tanggalLahir || data.tanggal_lahir);
  const isAnakOnly = Boolean(
    data?.is_anak_only || data?.id_anak || katUsia === 'Anak' ||
    String(data?.id_penumpang || '').toLowerCase().startsWith('anak_') ||
    String(data?.id_penumpang || '').toLowerCase().startsWith('new_anak_') ||
    String(data?.kategori_penumpang || '').toLowerCase() === 'anak' ||
    String(data?.kategoriPenumpang || '').toLowerCase() === 'anak'
  );
  if (isAnakOnly) return [];

  const rawList = data.anak_list || data.penumpang_anak || data.anakList || [];
  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((item, idx) => ({
      id: item.id_anak || item.id || Date.now() + idx,
      namaAnak: item.nama_anak || item.namaAnak || '',
      tanggalLahirAnak: item.tanggal_lahir || item.tanggalLahirAnak || '',
      jenisKelaminAnak: normalizeGender(item.jenis_kelamin || item.jenisKelaminAnak),
      showDetails: false,
    }));
  }
  if (data.namaAnak || data.nama_anak) {
    return [{
      id: Date.now(),
      namaAnak: data.namaAnak || data.nama_anak,
      tanggalLahirAnak: data.tanggalLahirAnak || data.tanggal_lahir_anak || '',
      jenisKelaminAnak: normalizeGender(data.jenisKelaminAnak || data.jenis_kelamin_anak),
      showDetails: false,
    }];
  }
  return [];
}

const mapInitialData = (data = {}, selectedKapal = null) => ({
  nik: data.nik || '',
  nama: data.nama || data.nama_penumpang || '',
  tempatLahir: data.tempatLahir || data.tempat_lahir || '',
  tanggalLahir: data.tanggalLahir || data.tanggal_lahir || '',
  jenisKelamin: normalizeGender(data.jenisKelamin || data.jenis_kelamin),
  alamat: data.alamat || '',
  foto_ktp: getPhotoSrc(data),
  foto: getPhotoSrc(data),
  foto_base64: getPhotoSrc(data),
  namaKapal: data.namaKapal || selectedKapal?.nama || selectedKapal?.nama_kapal || 'KM SYAHBANDAR KSOP',
});

// Helper Image Compressor with memory safety
const compressImageFile = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth || h > maxHeight) {
          if (w > h) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
          else { w = Math.round((w * maxHeight) / h); h = maxHeight; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result);
      img.src = e.target?.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export default function ResultCard({
  data = {},
  previewImage = '',
  selectedKapal = null,
  onSave = () => {},
  onRescan = () => {},
  onDelete = null,
  isSaving = false,
  currentIndex = 0,
  totalCount = 0,
  onPrev = null,
  onNext = null,
  saveButtonText = 'Setujui (Status Selesai)',
}) {
  const [formData, setFormData] = useState(() => mapInitialData(data, selectedKapal));
  const [anakList, setAnakList] = useState(() => parseInitialAnakList(data));
  const [childPhotoPreview, setChildPhotoPreview] = useState(() => getPhotoSrc(data));
  const [copiedField, setCopiedField] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData(mapInitialData(data, selectedKapal));
      setAnakList(parseInitialAnakList(data));
      setChildPhotoPreview(getPhotoSrc(data));
      setIsEditing(false);
      setIsDeleteModalOpen(false);
    }
  }, [data, selectedKapal]);

  // Calculated properties & Memoization
  const isVerified = data?.status_verifikasi === 'selesai';
  const kategoriUsia = useMemo(() => getKategoriUsia(formData.tanggalLahir), [formData.tanggalLahir]);
  
  const isAnakOnly = useMemo(() => Boolean(
    data?.is_anak_only || data?.id_anak || formData?.is_anak_only || kategoriUsia === 'Anak' ||
    String(data?.id_penumpang || '').toLowerCase().startsWith('anak_') ||
    String(data?.id_penumpang || '').toLowerCase().startsWith('new_anak_') ||
    String(data?.kategori_penumpang || '').toLowerCase() === 'anak' ||
    String(data?.kategoriPenumpang || '').toLowerCase() === 'anak' ||
    String(formData?.kategoriPenumpang || '').toLowerCase() === 'anak'
  ), [data, formData.is_anak_only, formData.kategoriPenumpang, kategoriUsia]);

  const isFormDisabled = isVerified && !isEditing;
  const activeImageSrc = isAnakOnly
    ? (childPhotoPreview || previewImage)
    : (previewImage || getPhotoSrc(data));

  // Form & Camera Handlers
  const handleChildPhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    if (compressed) {
      setChildPhotoPreview(compressed);
      setFormData((prev) => ({ ...prev, foto_ktp: compressed, foto: compressed, foto_base64: compressed }));
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(data);
      } else if (data?.id_penumpang) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        await fetch(`/api/penumpang/${data.id_penumpang}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (onRescan) onRescan();
      }
    } catch (err) {
      console.error('Error deleting passenger:', err);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleNIKChange = (val) => {
    if (isFormDisabled) return;
    const cleanVal = val.replace(/\D/g, '').slice(0, 16);
    setFormData((prev) => {
      const updated = { ...prev, nik: cleanVal };
      if (cleanVal.length === 16) {
        const decoded = decodeNIK(cleanVal);
        if (decoded?.isValid) {
          if (!updated.tanggalLahir) updated.tanggalLahir = decoded.tanggalLahir;
          if (!updated.jenisKelamin) updated.jenisKelamin = normalizeGender(decoded.jenisKelamin);
          if (!updated.tempatLahir) updated.tempatLahir = decoded.tempatLahir;
        }
      }
      return updated;
    });
  };

  const handleChange = (field, val) => {
    if (!isFormDisabled) setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddChild = () => {
    if (isFormDisabled || isAnakOnly) return;
    setAnakList((prev) => [...prev, {
      id: Date.now() + Math.random(), namaAnak: '', tanggalLahirAnak: '', jenisKelaminAnak: 'LAKI-LAKI', showDetails: true
    }]);
  };

  const handleRemoveChild = (id) => {
    if (!isFormDisabled && !isAnakOnly) setAnakList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleChildChange = (id, field, value) => {
    if (!isFormDisabled && !isAnakOnly) {
      setAnakList((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    }
  };

  const toggleChildDetails = (id) => {
    setAnakList((prev) => prev.map((item) => (item.id === id ? { ...item, showDetails: !item.showDetails } : item)));
  };

  const handleCopy = (field, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsEditing(false);
    const finalPhoto = isAnakOnly ? (childPhotoPreview || getPhotoSrc(formData)) : getPhotoSrc(formData, previewImage || getPhotoSrc(data));
    onSave({
      ...formData,
      foto_ktp: finalPhoto,
      foto: finalPhoto,
      foto_base64: finalPhoto,
      is_anak_only: isAnakOnly,
      kategoriPenumpang: isAnakOnly ? 'Anak' : (kategoriUsia || 'Dewasa'),
      bawaAnak: isAnakOnly ? false : (anakList.length > 0),
      anakList: isAnakOnly ? [] : anakList,
      namaAnak: isAnakOnly ? '' : (anakList[0]?.namaAnak || ''),
      tanggalLahirAnak: isAnakOnly ? '' : (anakList[0]?.tanggalLahirAnak || ''),
      jenisKelaminAnak: isAnakOnly ? '' : (anakList[0]?.jenisKelaminAnak || 'LAKI-LAKI'),
    });
  };

  const isFirst = currentIndex === 0 || !onPrev;
  const isLast = currentIndex >= totalCount - 1 || !onNext;

  return (
    <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden font-sans animate-in fade-in duration-200 relative">
      {/* Mobile Fixed Side Arrows */}
      {totalCount > 1 && (
        <>
          <button
            type="button" disabled={isFirst} onClick={onPrev}
            className="sm:hidden fixed left-2 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-sky-200/80 text-[#0284C7] flex items-center justify-center active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer outline-none"
            title="Penumpang Sebelumnya"
          >
            <ChevronLeft size={24} className="stroke-[2.5]" />
          </button>
          <button
            type="button" disabled={isLast} onClick={onNext}
            className="sm:hidden fixed right-2 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-sky-200/80 text-[#0284C7] flex items-center justify-center active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer outline-none"
            title="Penumpang Selanjutnya"
          >
            <ChevronRight size={24} className="stroke-[2.5]" />
          </button>
        </>
      )}

      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] px-4 sm:px-5 py-3.5 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {totalCount > 0 && (
            <div className="px-2.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25 text-xs font-extrabold text-white tracking-wider">
              {totalCount - currentIndex} / {totalCount}
            </div>
          )}
          <div>
            <h2 className="text-sm font-extrabold tracking-wide uppercase">
              {isAnakOnly ? 'Hasil Inspeksi - Penumpang Anak' : 'Hasil Inspeksi e-KTP'}
            </h2>
            <span className="text-[11px] text-sky-100 font-medium">
              {isAnakOnly ? 'Data Penumpang Anak' : 'Data Extract E-KTP'}
            </span>
          </div>
        </div>

        {!isVerified ? (
          <button
            type="button" onClick={onRescan}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white transition-all flex items-center gap-1.5 outline-none cursor-pointer"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Scan Ulang</span>
          </button>
        ) : (
          <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/25 border border-emerald-300/40 text-emerald-100 text-xs font-extrabold flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-300" />
            <span>Terverifikasi</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
        {/* Photo & NIK Section */}
        {!isAnakOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            {(previewImage || getPhotoSrc(data)) && (
              <div
                className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 max-h-36 bg-slate-900 flex items-center justify-center"
                onClick={() => setShowImagePreview(true)}
              >
                <img src={previewImage || getPhotoSrc(data)} alt="KTP Watermarked Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
                  <ImageIcon size={16} />
                  <span>Lihat Foto Watermark</span>
                </div>
              </div>
            )}

            <div className={`flex flex-col justify-center ${(previewImage || getPhotoSrc(data)) ? 'md:col-span-2' : 'md:col-span-3'}`}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  NIK (16 Digit)
                  {formData.nik.length === 16 && <CheckCircle2 size={15} className="text-emerald-500" />}
                </label>
                <button
                  type="button" onClick={() => handleCopy('nik', formData.nik)}
                  className="text-[11px] text-[#0284C7] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} />
                  {copiedField === 'nik' ? 'Tersalin!' : 'Salin'}
                </button>
              </div>
              <input
                type="text" maxLength={16} value={formData.nik} readOnly={isFormDisabled}
                onChange={(e) => handleNIKChange(e.target.value)}
                className={`w-full px-4 py-3 text-base font-extrabold tracking-widest text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none transition-all shadow-inner ${isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
                placeholder="3578xxxxxxxxxxxx" required={!isAnakOnly}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(childPhotoPreview || previewImage) && (
              <div
                className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 max-h-56 w-full bg-slate-900 flex items-center justify-center shadow-xs"
                onClick={() => setShowImagePreview(true)}
              >
                <img src={childPhotoPreview || previewImage} alt="Foto Penumpang Anak" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
                  <ImageIcon size={16} />
                  <span>Lihat Foto</span>
                </div>
              </div>
            )}

            {(!isFormDisabled || !(childPhotoPreview || previewImage)) && (
              <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-xl bg-amber-50/40 hover:bg-amber-50 transition-all text-amber-700 cursor-pointer shadow-xs ${isFormDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <Camera size={18} className="text-amber-600" />
                <span className="text-xs font-extrabold">
                  {(childPhotoPreview || previewImage) ? 'Ganti Foto Anak (Kamera)' : 'Ambil Foto Anak (Kamera)'}
                </span>
                <input type="file" accept="image/*" capture="environment" disabled={isFormDisabled} onChange={handleChildPhotoCapture} className="hidden" />
              </label>
            )}
          </div>
        )}

        {/* Fields Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Kapal / Armada Inspeksi</label>
              {!isFormDisabled && !isAnakOnly && (
                <button
                  type="button" onClick={handleAddChild}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer outline-none bg-amber-500 text-white border border-amber-600 hover:bg-amber-600 shadow-xs active:scale-95"
                >
                  <span>+ Bawa Anak?</span>
                </button>
              )}
            </div>
            <input
              type="text" value={formData.namaKapal} readOnly={isFormDisabled}
              onChange={(e) => handleChange('namaKapal', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-extrabold text-[#0284C7] bg-sky-50/90 border border-sky-200/90 rounded-xl focus:border-[#0284C7] outline-none ${isFormDisabled ? 'cursor-not-allowed opacity-80' : ''}`}
              placeholder="NAMA KAPAL INSPEKSI" required
            />
          </div>

          <FormGroup label="Nama Lengkap" className="sm:col-span-2 lg:col-span-3">
            <input
              type="text" value={formData.nama} readOnly={isFormDisabled}
              onChange={(e) => handleChange('nama', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-[#0284C7] outline-none ${isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
              placeholder={isAnakOnly ? "NAMA LENGKAP ANAK" : "NAMA SESUAI KTP"} required
            />
          </FormGroup>

          {/* Child Form Cards (For Adults Carrying Children) */}
          {!isAnakOnly && (
            <ChildForm
              anakList={anakList}
              isFormDisabled={isFormDisabled}
              onRemoveChild={handleRemoveChild}
              onChildChange={handleChildChange}
              onToggleDetails={toggleChildDetails}
            />
          )}

          {!isAnakOnly && (
            <FormGroup label="Tempat Lahir">
              <input
                type="text" value={formData.tempatLahir} readOnly={isFormDisabled}
                onChange={(e) => handleChange('tempatLahir', e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-[#0284C7] outline-none ${isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
                placeholder="KOTA LAHIR"
                required={!isAnakOnly}
              />
            </FormGroup>
          )}

          <FormGroup
            label={
              <span>
                Tanggal Lahir
                {(isAnakOnly || kategoriUsia === 'Anak') ? (
                  <span className="ml-1.5 font-extrabold text-amber-600">(Anak)</span>
                ) : (
                  kategoriUsia && <span className="ml-1.5 font-extrabold text-[#0284C7]">({kategoriUsia})</span>
                )}
              </span>
            }
          >
            <input
              type="date" value={formatToDateInput(formData.tanggalLahir)} disabled={isFormDisabled}
              onChange={(e) => handleChange('tanggalLahir', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-[#0284C7] outline-none cursor-pointer ${isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
              required
            />
          </FormGroup>

          <FormGroup label="Jenis Kelamin">
            <select
              value={formData.jenisKelamin} disabled={isFormDisabled}
              onChange={(e) => handleChange('jenisKelamin', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-[#0284C7] outline-none cursor-pointer ${isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
              required
            >
              <option value="">-- PILIH JENIS KELAMIN --</option>
              <option value="LAKI-LAKI">LAKI-LAKI</option>
              <option value="PEREMPUAN">PEREMPUAN</option>
            </select>
          </FormGroup>

          <FormGroup label={isAnakOnly ? "Alamat" : "Alamat Sesuai KTP"} className="sm:col-span-2 lg:col-span-3">
            <input
              type="text" value={formData.alamat} readOnly={isFormDisabled}
              onChange={(e) => handleChange('alamat', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-[#0284C7] outline-none ${isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
              placeholder="ALAMAT LENGKAP KOTA/KABUPATEN"
              required
            />
          </FormGroup>
        </div>

        {/* Disclaimer Banner */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-sky-50 border border-sky-200/70 text-sky-800 text-xs font-medium">
          <ShieldCheck size={18} className="text-[#0284C7] shrink-0" />
          <span>Data KTP dilindungi sesuai UU PDP No. 27/2022. Foto arsip otomatis diberi watermark instansi KSOP & Armada Kapal.</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-100">
          {isVerified && !isEditing ? (
            <div className="flex items-center gap-3">
              <button
                type="button" onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-extrabold transition-all cursor-pointer outline-none flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <span>Edit Data</span>
              </button>
              <button
                type="button" onClick={() => setIsDeleteModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Trash2 size={15} />
                <span>Hapus</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (isVerified) {
                    setIsEditing(false);
                    setFormData(mapInitialData(data, selectedKapal));
                    setAnakList(parseInitialAnakList(data));
                  } else {
                    onRescan();
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer outline-none"
              >
                {isVerified ? 'Batal Edit' : 'Batal / Scan Ulang'}
              </button>

              <button
                type="submit" disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/30 hover:opacity-95 active:scale-95 transition-all cursor-pointer outline-none disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? 'Memproses...' : (
                  <>
                    <Check size={16} />
                    <span>{isVerified ? 'Simpan & Verifikasi Ulang' : saveButtonText}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageSrc={activeImageSrc}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Penumpang"
        message="Apakah Anda yakin ingin menghapus data penumpang ini dari manifest?"
        itemName={formData.nama || data?.nama_penumpang || 'Penumpang'}
        isLoading={isDeleting}
      />
    </div>
  );
}

const FormGroup = memo(function FormGroup({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-bold text-slate-700">{label}</label>
      {children}
    </div>
  );
});
