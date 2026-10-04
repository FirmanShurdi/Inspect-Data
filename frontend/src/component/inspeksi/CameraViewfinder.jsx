import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, RefreshCw, Zap, ZapOff, X, AlertCircle } from 'lucide-react';
import CustomSelect from '../form/CustomSelect';
import Flash from '../notif/flash';

let fetchKapalPromise = null;

async function loadKapalOptions() {
  if (fetchKapalPromise) {
    return fetchKapalPromise;
  }

  fetchKapalPromise = (async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resK, resM] = await Promise.all([
        fetch('/api/kapal?simple=true', { headers }),
        fetch('/api/manifest/today-active-kapal', { headers }),
      ]);

      const dataK = resK.ok ? await resK.json() : null;
      const dataM = resM.ok ? await resM.json() : null;

      const kapalList = dataK?.datas || [];
      const rawActiveIds = dataM?.activeKapalIds || [];
      const activeKapalIds = new Set(rawActiveIds.map((id) => String(id)));

      const options = kapalList.map((k) => {
        const isActive = activeKapalIds.has(String(k.id_kapal));
        return {
          value: k.id_kapal,
          label: k.nama_kapal,
          rawLabel: k.nama_kapal,
          isActive,
        };
      });

      options.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

      return options;
    } catch (err) {
      console.error('Fetch Kapal Options Error in Camera:', err);
      return [];
    } finally {
      fetchKapalPromise = null;
    }
  })();

  return fetchKapalPromise;
}

export default function CameraViewfinder({
  onCapture = () => {},
  onClose = () => {},
  isProcessing = false,
  selectedKapal = null,
  onSelectKapal = () => {},
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'warning' });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [kapalOptions, setKapalOptions] = useState([]);

  const isKapalSelected = Boolean(
    selectedKapal?.id ||
    selectedKapal?.value ||
    (typeof selectedKapal === 'string' && selectedKapal) ||
    selectedKapal?.nama ||
    selectedKapal?.label
  );

  // Load Kapal Options & Prioritize Active Ships with Promise Deduplication
  useEffect(() => {
    let active = true;

    loadKapalOptions().then((opts) => {
      if (active) setKapalOptions(opts);
    });

    return () => { active = false; };
  }, []);

  // Safe Camera Shutdown
  const stopCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        if (track.kind === 'video' && track.applyConstraints && track.getCapabilities?.().torch) {
          track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
        }
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setIsCameraReady(false);
  }, []);

  // Page Exit & Visibility Event Handlers
  useEffect(() => {
    const handleExit = () => stopCamera();
    const handleVisibility = () => document.hidden && stopCamera();

    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);
    window.addEventListener('popstate', handleExit);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pagehide', handleExit);
      window.removeEventListener('popstate', handleExit);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopCamera();
    };
  }, [stopCamera]);

  // Start Camera Stream
  useEffect(() => {
    let isMounted = true;
    async function initCamera() {
      setIsCameraReady(false);
      setErrorMsg('');
      await stopCamera();

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: { ideal: 'continuous' },
          },
          audio: false,
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          setIsCameraReady(true);
        }

        const track = mediaStream.getVideoTracks()[0];
        if (track?.getCapabilities) {
          const caps = track.getCapabilities();
          setHasTorch(Boolean(caps.torch));
          if (caps.focusMode?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          }
        }
      } catch (err) {
        if (isMounted) setErrorMsg('Gagal mengakses kamera. Pastikan izin kamera telah diberikan pada browser.');
      }
    }

    initCamera();
    return () => { isMounted = false; stopCamera(); };
  }, [facingMode, stopCamera]);

  // Controls Handlers
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const next = !isTorchOn;
        await track.applyConstraints({ advanced: [{ torch: next }] });
        setIsTorchOn(next);
      } catch (e) {}
    }
  };

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  const handleTapToFocus = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setFocusPoint(null), 1200);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track?.getCapabilities?.().focusMode?.includes('single')) {
      track.applyConstraints({ advanced: [{ focusMode: 'single' }] }).catch(() => {});
    }
  };

  const handleCapture = () => {
    // Wajib Pilih Kapal Sebelum Scan
    if (!isKapalSelected) {
      setToast({ message: 'Harap Pilih Kapal Terlebih Dahulu Sebelum Scan!', type: 'warning' });
      return;
    }

    if (!videoRef.current || !isCameraReady || isProcessing) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Flash Toast Notification as requested
    setToast({ message: 'gambar tersimpan, data diproses dilatar belakang', type: 'success' });

    // Instantly ensure camera feed keeps running continuously for next scan
    try { video.play(); } catch (e) {}

    onCapture(dataUrl);
  };

  const navigate = useNavigate();

  const handleViewResult = async () => {
    if (!isKapalSelected) {
      setToast({ message: 'Harap Pilih Kapal Terlebih Dahulu!', type: 'warning' });
      return;
    }

    await stopCamera();

    const kapalId = selectedKapal?.id || (typeof selectedKapal === 'object' ? selectedKapal?.value : null);

    // Simpan pemicu buka kamera otomatis jika pengguna menekan tombol Back browser (Desktop/Mobile)
    sessionStorage.setItem('ksop_auto_open_camera_on_back', 'true');

    // 1. Check if active manifest ID is already saved in sessionStorage
    const activeManifestId = sessionStorage.getItem('ksop_active_manifest_id');
    const activeKapalId = sessionStorage.getItem('ksop_active_manifest_kapal_id');
    if (activeManifestId && String(activeKapalId) === String(kapalId)) {
      navigate(`/manifest/verifikasi/${activeManifestId}`, { state: { from: '/inspeksi', fromCamera: true } });
      return;
    }

    // 2. Check if a manifest already exists in DB for this ship
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('/api/manifest', { headers });
      const data = await res.json();
      if (data?.datas && kapalId) {
        const found = data.datas.find((m) => String(m.id_kapal) === String(kapalId));
        if (found?.id_manifest) {
          sessionStorage.setItem('ksop_active_manifest_id', found.id_manifest);
          sessionStorage.setItem('ksop_active_manifest_kapal_id', kapalId);
          navigate(`/manifest/verifikasi/${found.id_manifest}`, { state: { from: '/inspeksi', fromCamera: true } });
          return;
        }
      }

      // 3. If no manifest exists at all for this ship, create one on-demand so we land directly on VerifikasiPenumpang
      const createRes = await fetch('/api/manifest/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          id_kapal: kapalId,
          tanggal_clearance: new Date().toISOString().split('T')[0],
          pukul_agen_clearance: new Date().toTimeString().split(' ')[0],
          status_pelayaran: 'Pemeriksaan Penumpang',
        }),
      });
      const createData = await createRes.json();
      const newId = createData?.data?.id_manifest;
      if (newId) {
        sessionStorage.setItem('ksop_active_manifest_id', newId);
        sessionStorage.setItem('ksop_active_manifest_kapal_id', kapalId);
        navigate(`/manifest/verifikasi/${newId}`, { state: { from: '/inspeksi', fromCamera: true } });
        return;
      }
    } catch (e) {
      console.error('Error handling view result navigation:', e);
    }

    navigate('/manifest');
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col landscape:flex-row justify-between overflow-hidden font-sans select-none animate-in fade-in duration-200">
      {/* Portaled Flash Toast Notification */}
      <Flash toast={toast} onClose={() => setToast({ message: '', type: 'warning' })} />

      {/* 1. Header Bar Controls */}
      <HeaderBar
        onClose={handleClose}
        hasTorch={hasTorch}
        isTorchOn={isTorchOn}
        onToggleTorch={toggleTorch}
        kapalOptions={kapalOptions}
        selectedKapal={selectedKapal}
        onSelectKapal={onSelectKapal}
      />

      {/* 2. Fullscreen Video Preview & Viewfinder Frame */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-900 overflow-hidden cursor-pointer" onClick={handleTapToFocus}>
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {focusPoint && (
          <div className="absolute z-30 w-14 h-14 border-2 border-amber-400 rounded-full animate-ping pointer-events-none" style={{ top: focusPoint.y - 28, left: focusPoint.x - 28 }} />
        )}

        <ViewfinderFrame isProcessing={isProcessing} />

        {errorMsg && <ErrorOverlay message={errorMsg} onClose={handleClose} />}
      </div>

      {/* 3. Bottom Control Bar */}
      <BottomControlBar
        isCameraReady={isCameraReady}
        isProcessing={isProcessing}
        isKapalSelected={isKapalSelected}
        onCapture={handleCapture}
        onToggleCamera={() => { setFacingMode((p) => (p === 'environment' ? 'user' : 'environment')); setIsTorchOn(false); }}
        onViewResult={handleViewResult}
      />
    </div>
  );
}

function HeaderBar({ onClose, hasTorch, isTorchOn, onToggleTorch, kapalOptions, selectedKapal, onSelectKapal }) {
  return (
    <div className="relative z-20 flex flex-row landscape:flex-col items-center justify-between px-4 py-3 landscape:px-2 landscape:py-5 bg-gradient-to-r landscape:bg-gradient-to-b from-[#0284C7] via-[#0369A1] to-[#0EA5E9] text-white shadow-lg border-b landscape:border-b-0 landscape:border-r border-sky-300/30 landscape:w-24 landscape:h-full gap-2">
      <button
        type="button"
        onClick={onClose}
        className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white outline-none cursor-pointer shadow-sm shrink-0"
        title="Tutup Kamera"
      >
        <X size={20} />
      </button>

      <div className="flex-1 w-full flex items-center justify-center min-w-[140px] max-w-[160px] sm:max-w-[300px] landscape:max-w-none landscape:w-36 landscape:rotate-[-90deg] landscape:my-auto shrink-0">
        <CustomSelect
          options={kapalOptions}
          selected={selectedKapal?.id || selectedKapal}
          onChange={(val) => {
            const opt = kapalOptions.find((o) => String(o.value) === String(val));
            if (opt) onSelectKapal({ id: opt.value, nama: opt.rawLabel || opt.label });
          }}
          placeholder="-- Pilih Kapal --"
          searchable={true}
          alignText="center"
          className="w-full text-slate-800"
        />
      </div>

      {hasTorch ? (
        <button
          type="button"
          onClick={onToggleTorch}
          className={`p-2.5 rounded-full transition-all outline-none cursor-pointer shrink-0 ${
            isTorchOn ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/50 scale-105' : 'bg-white/15 text-white hover:bg-white/25'
          }`}
          title="Senter Kamera"
        >
          {isTorchOn ? <Zap size={20} /> : <ZapOff size={20} />}
        </button>
      ) : (
        <div className="w-10 h-10 shrink-0" />
      )}
    </div>
  );
}

function ViewfinderFrame({ isProcessing }) {
  return (
    <div className="relative z-10 w-[85%] max-w-[400px] landscape:max-w-[340px] aspect-[1.58/1] rounded-2xl border-2 border-[#0EA5E9] shadow-[0_0_25px_rgba(14,165,233,0.6)] overflow-hidden flex items-center justify-center bg-transparent">
      <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg shadow-sm" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg shadow-sm" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg shadow-sm" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg shadow-sm" />

      {isProcessing && (
        <div className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl text-slate-900 border-2 border-[#0284C7] shadow-[0_10px_30px_rgba(2,132,199,0.35)] animate-in zoom-in-95 duration-200">
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 border-4 border-sky-200 border-t-[#0284C7] rounded-full animate-spin" />
            <div className="absolute w-4 h-4 bg-[#0EA5E9] rounded-full animate-ping opacity-60" />
          </div>
          <span className="text-xs font-extrabold text-[#0284C7] tracking-wide">Memproses e-KTP...</span>
        </div>
      )}
    </div>
  );
}

function BottomControlBar({ isCameraReady, isProcessing, isKapalSelected, onCapture, onToggleCamera, onViewResult }) {
  return (
    <div className="relative z-20 flex flex-row landscape:flex-col items-center justify-around px-6 py-5 landscape:px-3 landscape:py-6 bg-gradient-to-r landscape:bg-gradient-to-b from-[#0284C7] via-[#0369A1] to-[#0EA5E9] text-white shadow-2xl border-t landscape:border-t-0 landscape:border-l border-sky-300/30 landscape:w-28 landscape:h-full">
      <button
        type="button"
        onClick={onViewResult}
        className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex flex-col items-center justify-center text-white outline-none cursor-pointer shadow-sm border border-white/20 gap-0.5 min-w-[70px]"
        title="Lihat Hasil Verifikasi Penumpang"
      >
        <span className="text-[10px] font-extrabold tracking-wider uppercase leading-none text-white">Hasil</span>
        <span className="text-[10px] font-extrabold tracking-wider uppercase leading-none text-white">Inspeksi</span>
      </button>

      <button
        type="button"
        onClick={onCapture}
        disabled={!isCameraReady || isProcessing}
        className={`w-20 h-20 sm:w-22 sm:h-22 landscape:w-20 landscape:h-20 rounded-full p-1.5 flex items-center justify-center transition-all cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed my-auto ${
          isKapalSelected
            ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.7)] hover:scale-105 active:scale-90'
            : 'bg-white/40 shadow-none opacity-75 hover:bg-white/60'
        }`}
        title={isKapalSelected ? 'Ambil Foto KTP' : 'Pilih Kapal Terlebih Dahulu'}
      >
        <div className={`w-full h-full rounded-full border-4 flex items-center justify-center shadow-inner ${
          isKapalSelected ? 'border-sky-600 bg-gradient-to-tr from-[#0284C7] to-[#0EA5E9]' : 'border-slate-400 bg-slate-500'
        }`}>
          <Camera size={30} className="text-white drop-shadow-md" />
        </div>
      </button>

      <button
        type="button"
        onClick={onToggleCamera}
        className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-all flex items-center justify-center text-white outline-none cursor-pointer shadow-sm"
        title="Tukar Kamera Depan/Belakang"
      >
        <RefreshCw size={20} />
      </button>
    </div>
  );
}

function ErrorOverlay({ message, onClose }) {
  return (
    <div className="absolute inset-6 z-30 flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 rounded-2xl text-center gap-3">
      <AlertCircle size={40} className="text-rose-500" />
      <h3 className="text-base font-bold">Kamera Tidak Aksesibel</h3>
      <p className="text-xs text-slate-300 max-w-xs">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-5 py-2 rounded-xl bg-[#0284C7] text-white font-bold text-xs outline-none cursor-pointer active:scale-95"
      >
        Kembali ke Dashboard
      </button>
    </div>
  );
}