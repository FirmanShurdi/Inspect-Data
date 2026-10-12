import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteModal({
  isOpen = false, onClose, onConfirm, title = 'Hapus Data',
  message = 'Apakah Anda yakin ingin menghapus data ini?', itemName = '', isLoading = false,
}) {
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && isOpen && !isLoading && onClose?.();
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => !isLoading && onClose?.()}>
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 ring-8 ring-rose-50/50">
            <Trash2 size={24} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
          {itemName && <div className="mt-1.5 px-3 py-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 max-w-full truncate">"{itemName}"</div>}
          <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">{message}</p>
        </div>
        <div className="mt-5 flex items-center gap-2.5">
          <button type="button" disabled={isLoading} onClick={onClose} className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer outline-none">
            Batal
          </button>
          <button type="button" disabled={isLoading} onClick={onConfirm} className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 outline-none">
            {isLoading ? <><Loader2 size={14} className="animate-spin" /><span>Menghapus...</span></> : <span>Ya, Hapus</span>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
