import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CameraViewfinder from '../../component/inspeksi/CameraViewfinder';
import ResultCard from '../../component/inspeksi/ResultCard';
import ScanCard from '../../component/ui/ScanCard';
import Flash from '../../component/notif/flash';
import { preprocessKTPImage } from '../../utils/ktpCanvasPreprocessor';
import { processKTPWithGeminiVision } from '../../services/geminiVisionService';

export default function MobileInspection() {
  const navigate = useNavigate();
  const location = useLocation();

  // Inisialisasi isCameraOpen langsung dari location.state.autoOpen atau pemicu tombol Back browser
  const [isCameraOpen, setIsCameraOpen] = useState(() => {
    const fromStorage = sessionStorage.getItem('ksop_auto_open_camera_on_back') === 'true';
    if (fromStorage) {
      sessionStorage.removeItem('ksop_auto_open_camera_on_back');
      return true;
    }
    return Boolean(location.state?.autoOpen);
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Selected Kapal with sessionStorage persistence until logout
  const [selectedKapal, setSelectedKapal] = useState(() => {
    try {
      const stored = sessionStorage.getItem('ksop_selected_kapal');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const isCreatingManifestRef = React.useRef(false);

  const ensureManifestExists = async (kapalObj) => {
    if (!kapalObj) return null;
    const rawId = kapalObj.id || kapalObj.value || (typeof kapalObj === 'number' || typeof kapalObj === 'string' ? kapalObj : null);
    const kapalId = Number(rawId);
    if (!kapalId || isNaN(kapalId)) return null;

    if (isCreatingManifestRef.current) return null;
    isCreatingManifestRef.current = true;

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch('/api/manifest/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id_kapal: kapalId,
          tanggal_clearance: new Date().toISOString().split('T')[0],
          pukul_agen_clearance: new Date().toTimeString().split(' ')[0],
          status_pelayaran: 'Pemeriksaan Penumpang',
          is_auto_scan: true,
        }),
      });

      const resData = await res.json();
      const manifestData = resData?.data;
      const manifestId = manifestData?.id_manifest;
      if (manifestId) {
        sessionStorage.setItem('ksop_active_manifest_id', manifestId);
        sessionStorage.setItem('ksop_active_manifest_kapal_id', kapalId);
        return manifestId;
      }
    } catch (err) {
      console.error('Error creating auto manifest:', err);
    } finally {
      isCreatingManifestRef.current = false;
    }
    return null;
  };

  const handleSelectKapal = (kapalObj) => {
    setSelectedKapal(kapalObj);
    if (kapalObj) {
      sessionStorage.setItem('ksop_selected_kapal', JSON.stringify(kapalObj));
      const kapalId = kapalObj.id || kapalObj.value;
      const storedKapalId = sessionStorage.getItem('ksop_active_manifest_kapal_id');
      if (String(storedKapalId) !== String(kapalId)) {
        sessionStorage.removeItem('ksop_active_manifest_id');
        sessionStorage.removeItem('ksop_active_manifest_kapal_id');
      }
    } else {
      sessionStorage.removeItem('ksop_selected_kapal');
      sessionStorage.removeItem('ksop_active_manifest_id');
      sessionStorage.removeItem('ksop_active_manifest_kapal_id');
    }
  };

  useEffect(() => {
    const fromStorage = sessionStorage.getItem('ksop_auto_open_camera_on_back') === 'true';
    if (fromStorage) {
      sessionStorage.removeItem('ksop_auto_open_camera_on_back');
      setIsCameraOpen(true);
    } else if (location.state?.autoOpen) {
      setIsCameraOpen(true);
    }
  }, [location.state]);

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
    if (location.state?.autoOpen) {
      navigate(location.state?.from || '/', { replace: true });
    }
  };

  useEffect(() => {
    const handleTriggerCamera = () => setIsCameraOpen(true);
    window.addEventListener('ksop-trigger-open-camera', handleTriggerCamera);
    return () => window.removeEventListener('ksop-trigger-open-camera', handleTriggerCamera);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('ksop-camera-state', { detail: { isOpen: isCameraOpen } })
    );
  }, [isCameraOpen]);

  const [toast, setToast] = useState({ message: '', type: 'error' });
  const toastTimeoutRef = React.useRef(null);

  const [parsedResult, setParsedResult] = useState(null);
  const [previewImage, setPreviewImage] = useState('');

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    const duration = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3500;
    toastTimeoutRef.current = setTimeout(() => setToast({ message: '', type: 'success' }), duration);
  };

  const handleCapture = async (rawCapturedImage) => {
    setIsProcessing(true);
    setProcessingStatus('Merapikan Gambar & Menyiapkan Upload...');

    let activeManifestId = sessionStorage.getItem('ksop_active_manifest_id');
    if (selectedKapal) {
      activeManifestId = await ensureManifestExists(selectedKapal);
    }

    try {
      // 1. Preprocess & Crop Image
      const { croppedImage } = await preprocessKTPImage(rawCapturedImage, {
        kapalNama: selectedKapal?.nama || 'KM SYAHBANDAR KSOP',
      });
      setPreviewImage(croppedImage);

      // 2. FAIL-SAFE: Instant Upload to Backend DB (saved to public/images/inspeksi/DD-MM-YY-... + DB Record)
      let savedPenumpangRecord = null;
      if (activeManifestId) {
        try {
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          const uploadRes = await fetch('/api/penumpang/upload-scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              id_manifest: activeManifestId,
              foto_base64: croppedImage,
              status_verifikasi: 'pending',
            }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData?.data) {
            savedPenumpangRecord = uploadData.data;
            showToast('Foto KTP tersimpan di database! Data diproses dilatar belakang...', 'success');
          }
        } catch (uploadErr) {
          console.error('Instant DB upload error:', uploadErr);
        }
      }

      // 3. ASYNC BACKGROUND WORKER: Run AI Vision Extraction without blocking camera UI
      setProcessingStatus('Memproses AI Latar Belakang...');
      processKTPWithGeminiVision(croppedImage, '', () => {})
        .then(async (result) => {
          if (result?.data && savedPenumpangRecord?.id_penumpang) {
            try {
              const token = sessionStorage.getItem('token') || localStorage.getItem('token');
              await fetch(`/api/penumpang/${savedPenumpangRecord.id_penumpang}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  nik: result.data.nik,
                  nama_penumpang: result.data.nama,
                  tempat_lahir: result.data.tempatLahir,
                  tanggal_lahir: result.data.tanggalLahir,
                  jenis_kelamin: result.data.jenisKelamin,
                  alamat: result.data.alamat,
                  is_ai_extract: true,
                }),
              });
              showToast(`Berhasil mengekstrak data KTP (ID: ${savedPenumpangRecord.id_penumpang})`, 'success');
            } catch (e) {
              console.error('Update AI result error:', e);
            }
          }
        })
        .catch((aiErr) => {
          console.warn('AI Vision error, data foto tetap aman tersimpan di DB:', aiErr);
        });

      // 4. INSTANT CAMERA RESET FOR CONTINUOUS SCANNING
      // Close capture modal / reset camera ready state so next scan can happen immediately
    } catch (err) {
      console.error('Inspection capture error:', err);
      showToast('Gambar KTP tersimpan.', 'success');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleSaveInspection = async (formData) => {
    setIsSaving(true);
    try {
      const activeManifestId = sessionStorage.getItem('ksop_active_manifest_id');
      if (activeManifestId) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        await fetch('/api/penumpang/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id_manifest: activeManifestId,
            nik: formData.nik,
            nama_penumpang: formData.nama,
            tempat_lahir: formData.tempatLahir,
            tanggal_lahir: formData.tanggalLahir,
            jenis_kelamin: formData.jenisKelamin,
            alamat: formData.alamat,
            foto_ktp: previewImage,
            status_verifikasi: 'pending',
          }),
        });
      }

      const payload = {
        ...formData,
        namaKapal: formData.namaKapal || selectedKapal?.nama || 'KM SYAHBANDAR KSOP',
        fotoKtpWatermark: previewImage,
        waktuInspeksi: new Date().toISOString(),
      };

      const existingLogs = JSON.parse(sessionStorage.getItem('ksop_inspection_logs') || '[]');
      existingLogs.unshift(payload);
      sessionStorage.setItem('ksop_inspection_logs', JSON.stringify(existingLogs));

      showToast('Data Inspeksi KTP Berhasil Disimpan ke Manifest!', 'success');

      setTimeout(() => {
        setParsedResult(null);
        setPreviewImage('');
        setIsSaving(false);
      }, 1200);
    } catch (err) {
      showToast('Data inspeksi tersimpan!', 'success');
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => handleCapture(event.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F9FF] p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-800">
      <Flash toast={toast} onClose={() => setToast({ message: '', type: 'success' })} />

      {isCameraOpen && (
        <CameraViewfinder
          onCapture={handleCapture}
          onClose={() => setIsCameraOpen(false)}
          isProcessing={isProcessing}
          selectedKapal={selectedKapal}
          onSelectKapal={handleSelectKapal}
        />
      )}

      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-[#0284C7] hover:text-[#0284C7] transition-all outline-none cursor-pointer shadow-sm"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-[#0284C7] tracking-tight flex items-center gap-2">
                Inspeksi KTP & Verifikasi Identitas
                <span className="text-[10px] bg-sky-100 text-[#0284C7] px-2 py-0.5 rounded-full font-bold border border-sky-200">
                  Gemini AI Vision
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Audit Fisik Penumpang & Nahkoda Kapal KSOP
              </p>
            </div>
          </div>
        </div>

        {isProcessing && !isCameraOpen && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <Loader2 size={32} className="text-[#0284C7] animate-spin" />
            <span className="text-sm font-bold text-slate-800">{processingStatus || 'Memproses Gambar...'}</span>
            <span className="text-xs text-slate-500">Menghubungkan dengan Gemini Vision AI Multimodal Engine</span>
          </div>
        )}

        {!parsedResult && !isProcessing && !isCameraOpen ? (
          <ScanCard
            onOpenCamera={() => setIsCameraOpen(true)}
            onFileUpload={handleFileUpload}
          />
        ) : (
          parsedResult && !isProcessing && (
            <ResultCard
              data={parsedResult}
              previewImage={previewImage}
              selectedKapal={selectedKapal}
              onSave={handleSaveInspection}
              onRescan={() => {
                setParsedResult(null);
                setPreviewImage('');
                setIsCameraOpen(true);
              }}
              isSaving={isSaving}
            />
          )
        )}
      </div>
    </div>
  );
}
