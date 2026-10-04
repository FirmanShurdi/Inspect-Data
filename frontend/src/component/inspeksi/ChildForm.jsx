import React, { memo } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { formatToDateInput } from './ResultCard';

const ChildForm = memo(function ChildForm({
  anakList = [],
  isFormDisabled = false,
  onRemoveChild = () => {},
  onChildChange = () => {},
  onToggleDetails = () => {},
}) {
  if (!anakList || anakList.length === 0) return null;

  return (
    <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-3">
      {anakList.map((anak, index) => (
        <div
          key={anak.id}
          className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-xs flex flex-col gap-3.5 animate-in fade-in duration-200"
        >
          {/* Header Card Anak dengan Tombol Batal X */}
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <span className="text-xs font-extrabold text-amber-900 uppercase">
              Data Penumpang Anak #{index + 1}
            </span>
            {!isFormDisabled && (
              <button
                type="button"
                onClick={() => onRemoveChild(anak.id)}
                className="p-1 rounded-lg text-amber-800 hover:text-rose-600 hover:bg-rose-100/70 transition-all cursor-pointer flex items-center justify-center border border-amber-300/60"
                title="Batal / Hapus Form Anak Ini"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Kolom Nama Anak */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Nama Lengkap Anak</label>
              <button
                type="button"
                onClick={() => onToggleDetails(anak.id)}
                className="text-[#0284C7] hover:underline text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>{anak.showDetails ? 'Sembunyikan Detail' : 'Detail'}</span>
                {anak.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <input
              type="text"
              value={anak.namaAnak}
              readOnly={isFormDisabled}
              onChange={(e) => onChildChange(anak.id, 'namaAnak', e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-amber-300 rounded-xl focus:border-amber-500 outline-none ${
                isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''
              }`}
              placeholder="NAMA LENGKAP ANAK"
              required
            />
          </div>

          {/* Expandable Detail Section */}
          {anak.showDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Tanggal Lahir Anak</label>
                <input
                  type="date"
                  value={formatToDateInput(anak.tanggalLahirAnak)}
                  disabled={isFormDisabled}
                  onChange={(e) => onChildChange(anak.id, 'tanggalLahirAnak', e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-xl focus:border-amber-500 outline-none cursor-pointer ${
                    isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''
                  }`}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Jenis Kelamin Anak</label>
                <select
                  value={anak.jenisKelaminAnak}
                  disabled={isFormDisabled}
                  onChange={(e) => onChildChange(anak.id, 'jenisKelaminAnak', e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-amber-300 rounded-xl focus:border-amber-500 outline-none cursor-pointer ${
                    isFormDisabled ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''
                  }`}
                  required
                >
                  <option value="LAKI-LAKI">LAKI-LAKI</option>
                  <option value="PEREMPUAN">PEREMPUAN</option>
                </select>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default ChildForm;
