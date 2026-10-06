import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, UserCheck, CheckCircle2, Clock } from 'lucide-react';
import ResultCard from '../../component/inspeksi/ResultCard';
import Flash from '../../component/notif/flash';

// --- Pure Helper Functions ---
function buildApprovePayload(cur, formData, manifestId) {
  const isAnakOnly = Boolean(
    cur?.is_anak_only || formData.is_anak_only || formData.kategoriPenumpang === 'Anak'
  );

  const getPhoto = (...candidates) => candidates.find(Boolean) || null;
  const photo = getPhoto(formData.foto, formData.foto_ktp, formData.foto_base64, cur?.foto, cur?.foto_ktp);
  const photoKtp = getPhoto(formData.foto_ktp, formData.foto, formData.foto_base64, cur?.foto_ktp, cur?.foto);
  const photoBase64 = getPhoto(formData.foto_base64, formData.foto_ktp, formData.foto, cur?.foto_base64, cur?.foto_ktp, cur?.foto);

  return {
    id_manifest: manifestId,
    is_anak_only: isAnakOnly,
    nik: isAnakOnly ? null : (formData.nik || null),
    nama_penumpang: formData.nama,
    tempat_lahir: formData.tempatLahir || null,
    tanggal_lahir: formData.tanggalLahir || null,
    jenis_kelamin: formData.jenisKelamin,
    alamat: formData.alamat || null,
    foto: photo,
    foto_ktp: photoKtp,
    foto_base64: photoBase64,
    kategori_penumpang: isAnakOnly ? 'Anak' : (formData.kategoriPenumpang || 'Dewasa'),
    status_verifikasi: 'selesai',
    bawa_anak: isAnakOnly ? false : Boolean(formData.bawaAnak || (Array.isArray(formData.anakList) && formData.anakList.length > 0)),
    anakList: isAnakOnly ? [] : (formData.anakList || []),
    nama_anak: isAnakOnly ? null : (formData.namaAnak || null),
    tanggal_lahir_anak: isAnakOnly ? null : (formData.tanggalLahirAnak || null),
    jenis_kelamin_anak: isAnakOnly ? null : (formData.jenisKelaminAnak || null),
  };
}

function createDefaultAnakCard() {
  return {
    id_penumpang: `new_anak_${Date.now()}`,
    is_anak_only: true,
    nik: '',
    nama_penumpang: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'LAKI-LAKI',
    alamat: '',
    kategori_penumpang: 'Anak',
    status_verifikasi: 'pending',
    isNew: true,
  };
}

/**
 * VerifikasiPenumpang Page Component
 * Halaman verifikasi manifest penumpang (Approval & Manajemen Data Penumpang + Penumpang Anak)
 */
export default function VerifikasiPenumpang() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // Navigation Origin Detection
  const fromPath = location.state?.from || '';
  const isFromCamera = Boolean(
    location.state?.fromCamera || (fromPath && (fromPath.includes('/inspeksi') || fromPath.includes('MobileInspection')))
  );

  const handleBack = () => {
    if (isFromCamera) return navigate('/inspeksi', { state: { autoOpen: true } });
    if (fromPath) return navigate(fromPath);
    if (window.history.length > 1) return navigate(-1);
    navigate('/manifest');
  };

  // State
  const [manifest, setManifest] = useState(null);
  const [penumpang, setPenumpang] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
  const isFetchingRef = useRef(false);
  const touchStartRef = useRef({ x: null, y: null });

  // Data Fetching
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const [resM, resP] = await Promise.all([
        fetch(`/api/manifest/${id}`, { headers }),
        fetch(`/api/penumpang/manifest/${id}`, { headers }),
      ]);

      if (resM.ok) {
        const m = await resM.json();
        setManifest(m.data || m.datas || m);
      }
      if (resP.ok) {
        const p = await resP.json();
        const rawList = p.datas || p.data || [];
        const list = [...rawList].sort(
          (a, b) => Number(b.id_penumpang || b.id || 0) - Number(a.id_penumpang || a.id || 0)
        );
        setPenumpang(list);
        const pendingIdx = list.findIndex((item) => item.status_verifikasi === 'pending');
        if (pendingIdx !== -1) setIdx(pendingIdx);
      }
    } catch {
      setToast({ message: 'Gagal memuat data penumpang', type: 'error' });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [id, headers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Approval Mutation Handler
  const handleApprove = async (formData) => {
    const cur = penumpang[idx];
    if (!cur) return;
    setSaving(true);
    try {
      const payload = buildApprovePayload(cur, formData, id);
      const isNewRecord = Boolean(cur.isNew || !cur.id_penumpang || String(cur.id_penumpang).startsWith('new_'));
      const url = isNewRecord ? '/api/penumpang' : `/api/penumpang/${cur.id_penumpang}`;
      const method = isNewRecord ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resData = await res.json();
        const updatedData = resData.data || { ...cur, ...payload, status_verifikasi: 'selesai' };
        setToast({
          message: `Penumpang "${formData.nama}" ${payload.bawa_anak ? 'beserta Anak' : ''} berhasil disetujui!`,
          type: 'success',
        });
        setPenumpang((prev) => prev.map((item, i) => (i === idx ? updatedData : item)));
      } else {
        setToast({ message: 'Gagal menyetujui penumpang', type: 'error' });
      }
    } catch (err) {
      console.error('Error handleApprove:', err);
      setToast({ message: 'Terjadi kesalahan sistem: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPenumpangAnakCard = () => {
    setPenumpang((prev) => [createDefaultAnakCard(), ...prev]);
    setIdx(0);
  };

  const handleDeletePenumpang = async (penumpangItem) => {
    if (!penumpangItem?.id_penumpang) return;
    try {
      const res = await fetch(`/api/penumpang/${penumpangItem.id_penumpang}`, { method: 'DELETE', headers });
      if (res.ok) {
        setToast({
          message: `Data penumpang "${penumpangItem.nama_penumpang || penumpangItem.nama || 'Penumpang'}" berhasil dihapus`,
          type: 'success',
        });
        setPenumpang((prev) => prev.filter((p) => p.id_penumpang !== penumpangItem.id_penumpang));
        setIdx((i) => Math.max(0, Math.min(i, penumpang.length - 2)));
      } else {
        setToast({ message: 'Gagal menghapus data penumpang', type: 'error' });
      }
    } catch (err) {
      console.error('Error handleDeletePenumpang:', err);
      setToast({ message: 'Terjadi kesalahan sistem: ' + err.message, type: 'error' });
    }
  };

  // Touch Swipe Gesture Handler
  const handleTouchStart = (e) => {
    if (e.touches?.[0]) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e) => {
    const { x: startX, y: startY } = touchStartRef.current;
    touchStartRef.current = { x: null, y: null };
    if (startX === null || startY === null || !e.changedTouches?.[0]) return;

    const diffX = startX - e.changedTouches[0].clientX;
    const diffY = startY - e.changedTouches[0].clientY;
    const absX = Math.abs(diffX);

    // Min 100px swipe & 3.0x horizontal dominance
    if (absX > 100 && absX > Math.abs(diffY) * 3.0) {
      setIdx((i) => (diffX > 0 ? Math.min(penumpang.length - 1, i + 1) : Math.max(0, i - 1)));
    }
  };

  // Single-pass Stats Computation
  const { pendingCount, selesaiCount } = useMemo(() => {
    let pending = 0, selesai = 0;
    for (let i = 0; i < penumpang.length; i++) {
      if (penumpang[i].status_verifikasi === 'pending') pending++;
      else if (penumpang[i].status_verifikasi === 'selesai') selesai++;
    }
    return { pendingCount: pending, selesaiCount: selesai };
  }, [penumpang]);

  const currentP = penumpang[idx];
  const rawPhoto = currentP?.foto_ktp || currentP?.foto || currentP?.foto_base64 || '';
  const photoUrl = rawPhoto
    ? (rawPhoto.startsWith('data:') || rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`)
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-xs font-bold">
        Memuat data...
      </div>
    );
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="space-y-2.5 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-xs text-[#0284C7] hover:underline font-bold mb-0.5 cursor-pointer"
          >
            <ArrowLeft size={15} />
            {isFromCamera ? 'Kembali ke Kamera' : 'Kembali ke Manifest'}
          </button>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck size={22} className="text-[#0284C7]" /> Verifikasi Penumpang
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kapal: <strong className="text-slate-800 uppercase">{manifest?.nama_kapal || manifest?.kapal?.nama_kapal || '-'}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddPenumpangAnakCard}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-extrabold transition-all cursor-pointer outline-none shadow-xs self-end sm:self-center"
        >
          <span>+ Tambah Penumpang Anak</span>
        </button>
      </div>

      {/* Centered Stats Pill */}
      <div className="flex justify-center my-0.5">
        <div className="inline-flex items-center justify-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="px-2.5 py-1 rounded-xl text-slate-600 text-xs font-extrabold">Total: {penumpang.length}</span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200 flex items-center gap-1">
            <Clock size={12} className="animate-pulse" /> Pending: {pendingCount}
          </span>
          <span className="px-2.5 py-1 rounded-xl text-slate-600 text-xs font-extrabold flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#0284C7]" /> Selesai: {selesaiCount}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {penumpang.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Belum ada data penumpang pada manifest ini.
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          {currentP && (
            <ResultCard
              key={currentP.id_penumpang || idx}
              data={currentP}
              previewImage={photoUrl}
              selectedKapal={manifest?.kapal}
              onSave={handleApprove}
              onRescan={loadData}
              onDelete={handleDeletePenumpang}
              isSaving={saving}
              currentIndex={idx}
              totalCount={penumpang.length}
              onPrev={() => setIdx((i) => Math.max(0, i - 1))}
              onNext={() => setIdx((i) => Math.min(penumpang.length - 1, i + 1))}
              saveButtonText="Verifikasi?"
            />
          )}
        </div>
      )}
    </div>
  );
}
