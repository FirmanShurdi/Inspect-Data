import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { ChevronDown, Check, Search } from 'lucide-react';

const getOptionStyle = (opt, active) => {
  if (opt.isActive) return 'border-2 border-[#0284C7] rounded-none bg-sky-50/90 my-0.5 font-extrabold text-[#0284C7]';
  if (active) return 'bg-sky-50 text-[#0284C7]';
  return 'text-slate-700';
};

export default function CustomSelect({
  options = [],
  selected,
  onChange,
  placeholder = 'Pilih Opsi',
  searchable = false,
  alignText = 'left',
  className = '',
}) {
  const [search, setSearch] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const [coords, setCoords] = useState(null);
  const buttonRef = useRef(null);
  const timerRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(selected)),
    [options, selected]
  );
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter((o) => String(o.label).toLowerCase().includes(query));
  }, [options, searchable, search]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const updateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    let isRotated = false;
    let curr = buttonRef.current;
    while (curr && curr !== document.body) {
      const transform = window.getComputedStyle(curr).transform;
      if (transform && transform !== 'none' && transform.includes('matrix')) {
        const b = parseFloat(transform.split(',')[1]);
        if (Math.abs(b + 1) < 0.25 || Math.abs(b - 1) < 0.25) {
          isRotated = true;
          break;
        }
      }
      curr = curr.parentElement;
    }

    if (isRotated) {
      const safeLeft = Math.max(12, rect.right + 12);
      const safeTop = Math.max(12, Math.min(rect.top, window.innerHeight - 260));
      const safeWidth = Math.min(240, Math.max(160, window.innerWidth - safeLeft - 16));
      setCoords({ top: safeTop, left: safeLeft, width: safeWidth });
    } else {
      const safeLeft = Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12));
      const safeTop = Math.min(rect.bottom + 6, window.innerHeight - 260);
      setCoords({ top: safeTop, left: safeLeft, width: rect.width });
    }
  };

  const handleShow = (label) => {
    if (!label || label === placeholder) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltip(label);
    timerRef.current = setTimeout(() => setTooltip(null), 2500);
  };

  const handleHide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltip(null), 1200);
  };

  return (
    <Listbox value={selected} onChange={onChange}>
      {({ open }) => (
        <div className={`relative inline-block max-w-full ${className}`}>
          <Listbox.Button
            ref={buttonRef}
            onClick={updateCoords}
            onPointerDown={updateCoords}
            onTouchStart={() => handleShow(displayLabel)}
            onTouchEnd={handleHide}
            onMouseEnter={() => handleShow(displayLabel)}
            onMouseLeave={handleHide}
            className="relative h-10 sm:h-11 min-w-[100px] max-w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 sm:px-3.5 py-2 text-left text-xs sm:text-sm shadow-xs focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 inline-flex items-center justify-between gap-1.5 sm:gap-2 transition-all w-full"
          >
            <span className={`block truncate flex-1 ${alignText === 'center' ? 'text-center' : 'text-left'} ${selectedOption ? 'text-slate-800 font-semibold' : 'text-slate-400 font-medium'}`}>
              {displayLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0 pointer-events-none" />
          </Listbox.Button>

          {/* Tooltip rendered via portal */}
          {tooltip && coords && createPortal(
            <div
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left + coords.width / 2}px`,
                transform: 'translateX(-50%)',
                zIndex: 100000,
              }}
              className="whitespace-nowrap bg-white text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-2xl border border-sky-200 animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
            >
              <span>{tooltip}</span>
            </div>,
            document.body
          )}

          {/* Dropdown Options rendered via portal */}
          {open && coords && createPortal(
            <div
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 99999,
              }}
              className="animate-in fade-in zoom-in-95 duration-150 text-left"
            >
              <Listbox.Options
                static
                className="max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white py-1 text-xs sm:text-sm shadow-2xl ring-1 ring-black/5 focus:outline-none text-left"
              >
                {searchable && (
                  <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10 text-left">
                    <div className="relative text-left">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0284C7] bg-slate-50/50 text-left"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}
                {filteredOptions.length === 0 ? (
                  <div className="py-2.5 px-4 text-xs text-slate-400 font-medium text-center">Tidak ditemukan</div>
                ) : (
                  filteredOptions.map((opt, idx) => (
                    <Listbox.Option
                      key={opt.value || idx}
                      value={opt.value}
                      onTouchStart={() => handleShow(opt.label)}
                      onTouchEnd={handleHide}
                      onMouseEnter={() => handleShow(opt.label)}
                      onMouseLeave={handleHide}
                      className={({ active }) => `relative cursor-pointer select-none py-2.5 pl-9 pr-4 text-left transition-all ${getOptionStyle(opt, active)}`}
                    >
                      {({ selected: isSelected }) => (
                        <>
                          <span className={`block truncate text-left ${isSelected ? 'font-semibold text-[#0284C7]' : 'font-normal'}`}>
                            {opt.label}
                          </span>
                          {isSelected && (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#0284C7]">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </div>,
            document.body
          )}
        </div>
      )}
    </Listbox>
  );
}
