import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Edit3, Save, LogOut } from 'lucide-react';

export default function UnsavedChangesModal({
  isOpen,
  onClose,
  onLeaveWithoutSaving,
  onSaveAndLeave,
  isSaving = false,
  title = 'Perubahan Belum Disimpan!',
  message = 'Anda sedang berada di formulir edit/input data. Apakah Anda ingin melanjutkan edit, menyimpan data terlebih dahulu, atau membatalkan perubahan untuk berpindah halaman?',
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100 font-sans">
        {/* Header with Warning Icon */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 border border-amber-200/80 shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2.5">
          {/* 1. Lanjut Edit (Keep Editing) */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] active:scale-95 rounded-xl shadow-md shadow-[#0284C7]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Edit3 size={15} />
            <span>Lanjut Edit</span>
          </button>

          {/* 2. Simpan Data / Simpan Edit */}
          {onSaveAndLeave && (
            <button
              type="button"
              onClick={onSaveAndLeave}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          )}

          {/* 3. Batalkan Edit / Tinggalkan Halaman */}
          <button
            type="button"
            onClick={onLeaveWithoutSaving}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <LogOut size={15} />
            <span>Batalkan Edit</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
