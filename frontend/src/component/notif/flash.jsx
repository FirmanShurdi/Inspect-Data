import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Lightweight & Clean Web/Mobile Toast Notification Component
 * Rendered via React Portal directly on document.body to ensure zero layout shift.
 */
const Flash = ({ toast, onClose, duration = 3500 }) => {
  if (!toast || !toast.message) return null;

  const type = toast.type || 'success';
  const toastDuration = toast.duration !== undefined ? toast.duration : duration;

  useEffect(() => {
    if (!onClose) return;
    if (toastDuration === 0 || toastDuration === false || toastDuration === Infinity) return;
    const timer = setTimeout(() => onClose(), toastDuration);
    return () => clearTimeout(timer);
  }, [toast, onClose, toastDuration]);

  const config = {
    success: {
      bg: 'bg-emerald-50/95 border-emerald-300 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50/95 border-rose-300 text-rose-950',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50/95 border-amber-300 text-amber-950',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    info: {
      bg: 'bg-sky-50/95 border-sky-300 text-sky-950',
      icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
    },
  }[type] || {
    bg: 'bg-slate-50/95 border-slate-300 text-slate-900',
    icon: <Info className="w-5 h-5 text-slate-600 shrink-0" />,
  };

  return createPortal(
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none select-none flex justify-center max-w-[92vw] sm:max-w-md w-max">
      <div className={`relative overflow-hidden flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all ${config.bg} max-w-full pointer-events-auto`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {config.icon}
          <p className="text-[13px] font-bold leading-snug tracking-tight text-left whitespace-normal break-words flex-1">
            {toast.message}
          </p>
        </div>
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 rounded-full hover:bg-black/10 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0 outline-none flex items-center justify-center"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Flash;
