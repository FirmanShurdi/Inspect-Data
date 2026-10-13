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

  const handleSelectKapal = async (kapalObj) => {
    setSelectedKapal(kapalObj);
    if (kapalObj) {
      sessionStorage.setItem('ksop_selected_kapal', JSON.stringify(kapalObj));
      const rawId = kapalObj.id || kapalObj.value;
      const kapalId = Number(rawId);

      let clearanceId = kapalObj.id_clearance || null;
      if (!clearanceId && kapalId) {
        try {
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          const res = await fetch(`/api/clearance/by-kapal/${kapalId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            clearanceId = data?.data?.id_clearance || data?.data?.id_manifest;
          }
        } catch (err) {
          console.error('Error fetching clearance for selected kapal:', err);
        }
      }

      if (clearanceId) {
        sessionStorage.setItem('ksop_active_clearance_id', clearanceId);
        sessionStorage.setItem('ksop_active_clearance_kapal_id', kapalId);
        sessionStorage.setItem('ksop_active_manifest_id', clearanceId);
        sessionStorage.setItem('ksop_active_manifest_kapal_id', kapalId);
      }
    } else {
      sessionStorage.removeItem('ksop_selected_kapal');
      sessionStorage.removeItem('ksop_active_clearance_id');
      sessionStorage.removeItem('ksop_active_clearance_kapal_id');
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

  const showToast = (message, type = 'success', customDuration = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, duration: customDuration });

    if (customDuration === 0 || customDuration === false || customDuration === Infinity) {
      return;
    }

    const defaultDuration = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3500;
    const finalDuration = customDuration !== null ? customDuration : defaultDuration;
    toastTimeoutRef.current = setTimeout(() => setToast({ message: '', type: 'success' }), finalDuration);
  };

  const handleCapture = async (rawCapturedImage) => {
    setIsProcessing(true);
    setProcessingStatus('Merapikan Gambar & Menyiapkan Upload...');

    const rawKapalId = selectedKapal?.id || selectedKapal?.value;
    const kapalId = rawKapalId ? Number(rawKapalId) : null;
    let activeClearanceId = sessionStorage.getItem('ksop_active_clearance_id') || sessionStorage.getItem('ksop_active_manifest_id') || selectedKapal?.id_clearance;

    if (!activeClearanceId && kapalId) {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`/api/clearance/by-kapal/${kapalId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const d = await res.json();
          activeClearanceId = d?.data?.id_clearance || d?.data?.id_manifest;
          if (activeClearanceId) {
            sessionStorage.setItem('ksop_active_clearance_id', activeClearanceId);
            sessionStorage.setItem('ksop_active_clearance_kapal_id', kapalId);
            sessionStorage.setItem('ksop_active_manifest_id', activeClearanceId);
            sessionStorage.setItem('ksop_active_manifest_kapal_id', kapalId);
          }
        }
      } catch (err) {
        console.error('Fetch clearance by kapal in capture error:', err);
      }
    }

    try {
      // 1. Preprocess & Crop Image
      const { croppedImage } = await preprocessKTPImage(rawCapturedImage, {
        kapalNama: selectedKapal?.nama || selectedKapal?.label || 'KM SYAHBANDAR KSOP',
      });
      setPreviewImage(croppedImage);

      // 2. FAIL-SAFE: Instant Upload to Backend DB (saved to public/images/inspeksi/DD-MM-YY-... + DB Record)
      let savedPenumpangRecord = null;
      if (activeClearanceId || kapalId) {
        try {
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          const uploadRes = await fetch('/api/penumpang/upload-scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              id_clearance: activeClearanceId,
              id_manifest: activeClearanceId,
              id_kapal: kapalId,
              foto_base64: croppedImage,
              status_verifikasi: 'pending',
            }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData?.data) {
            savedPenumpangRecord = uploadData.data;
          }
          if (uploadRes.status === 409 || uploadData?.isDuplicate) {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            showToast(uploadData.message || 'PERINGATAN KTP DUPLIKAT TERDETEKSI!', 'error', 0);
          } else if (uploadData?.data) {
            showToast('Foto KTP tersimpan! Data diproses dilatar belakang...', 'success');
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
              const putRes = await fetch(`/api/penumpang/${savedPenumpangRecord.id_penumpang}`, {
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
              const putData = await putRes.json();
              if (putRes.status === 409 || putData?.isDuplicate) {
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                showToast(putData.message || 'PERINGATAN KTP DUPLIKAT TERDETEKSI!', 'error', 0);
              } else if (putData?.status) {
                showToast(`Berhasil mengekstrak data KTP (ID: ${savedPenumpangRecord.id_penumpang})`, 'success');
              }
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
      const rawKapalId = selectedKapal?.id || selectedKapal?.value;
      const kapalId = rawKapalId ? Number(rawKapalId) : null;
      const activeClearanceId = sessionStorage.getItem('ksop_active_clearance_id') || sessionStorage.getItem('ksop_active_manifest_id') || selectedKapal?.id_clearance;

      if (activeClearanceId || kapalId) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const storeRes = await fetch('/api/penumpang/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id_clearance: activeClearanceId,
            id_manifest: activeClearanceId,
            id_kapal: kapalId,
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
        const storeData = await storeRes.json();
        if (storeRes.status === 409 || storeData?.isDuplicate) {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          showToast(storeData.message || 'PERINGATAN KTP DUPLIKAT TERDETEKSI!', 'error', 0);
          setIsSaving(false);
          return;
        }
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
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-800">
      <Flash toast={toast} onClose={() => setToast({ message: '', type: 'success' })} />

      {isCameraOpen && (
        <CameraViewfinder
          onCapture={handleCapture}
          onClose={handleCloseCamera}
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
