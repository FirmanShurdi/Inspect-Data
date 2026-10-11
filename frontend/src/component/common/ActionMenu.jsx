import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';

/**
 * Ultra-Responsive 3-Dots Action Menu Component using React Portal & Fixed Positioning
 * Renders modal directly into document.body to prevent table container overflow clipping & scrollbars.
 */
export default function ActionMenu({
  row = null,
  onView = null,
  onEdit = null,
  onDelete = null,
  viewLabel = 'Lihat Detail',
  editLabel = 'Edit Data',
  deleteLabel = 'Hapus Data',
  items = [],
  actions = [],
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const rawList = items.length ? items : actions;
  const menuList = [
    ...(rawList.map((act) => ({
      ...act,
      onClick: () => (act.onClick ? act.onClick(row) : null),
    }))),
    ...(onView
      ? [{ label: viewLabel, icon: Eye, onClick: () => onView(row), variant: 'indigo' }]
      : []),
    ...(onEdit
      ? [{ label: editLabel, icon: Edit, onClick: () => onEdit(row), variant: 'amber' }]
      : []),
    ...(onDelete
      ? [{ label: deleteLabel, icon: Trash2, onClick: () => onDelete(row), variant: 'rose' }]
      : []),
  ];

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176; // w-44 = 176px
      const menuHeight = menuList.length * 40 + 16;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + 20 && rect.top > menuHeight;

      setCoords({
        top: openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left: Math.max(10, rect.right - menuWidth),
        openUpward,
      });
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (isOpen) setIsOpen(false);
    };

    const handleClickOutside = (e) => {
      // Ignore if clicking inside button or portal menu dropdown
      if (
        (buttonRef.current && buttonRef.current.contains(e.target)) ||
        (menuRef.current && menuRef.current.contains(e.target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  if (!menuList.length) return null;

  return (
    <div className={`inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors outline-none cursor-pointer ${
          isOpen ? 'bg-slate-100 text-slate-900 shadow-xs' : ''
        }`}
        title="Pilihan Aksi"
        aria-label="Pilihan Aksi"
      >
        <MoreVertical size={17} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`w-44 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-[99999] animate-in fade-in duration-150 overflow-hidden ${
              coords.openUpward ? 'origin-bottom-right zoom-in-95' : 'origin-top-right zoom-in-95'
            }`}
          >
            {menuList.map((item, idx) => {
              const Icon = item.icon;
              const isDanger = item.variant === 'rose' || item.variant === 'danger' || item.isDangerous;
              const isEdit = item.variant === 'amber' || item.variant === 'edit';
              const isEmerald = item.variant === 'emerald' || item.variant === 'success';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    if (item.onClick) item.onClick();
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isDanger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : isEdit
                      ? 'text-amber-600 hover:bg-amber-50'
                      : isEmerald
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {Icon && (
                    <Icon
                      size={16}
                      className={`shrink-0 ${
                        isDanger
                          ? 'text-rose-500'
                          : isEdit
                          ? 'text-amber-500'
                          : isEmerald
                          ? 'text-emerald-500'
                          : 'text-slate-400'
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
