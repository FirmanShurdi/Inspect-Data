import React, { memo } from 'react';

const ImagePreviewModal = memo(function ImagePreviewModal({
  isOpen = false,
  onClose = () => {},
  imageSrc = '',
  title = 'Preview Foto Penumpang',
}) {
  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl p-2 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all cursor-pointer outline-none"
        >
          Tutup Preview
        </button>
      </div>
    </div>
  );
});

export default ImagePreviewModal;
