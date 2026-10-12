import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, UserPlus } from 'lucide-react';
import Flash from '../notif/flash';
import Label from '../form/Label';
import InputField from '../form/InputField';
import FileInput from '../form/FileInput';
import CustomSelect from '../form/CustomSelect';

/**
 * Universal FormAction Modal Component
 * Encapsulates modal container, header, scrollable body, submit/cancel actions, Flash toast,
 * as well as internal form field primitives (Label, InputField, CustomSelect, FileInput).
 */
export default function FormAction({
  isOpen,
  onClose,
  title = 'Form Modal',
  icon: Icon = UserPlus,
  isLoading = false,
  toast = null,
  onToastClose = null,
  onSubmit,
  submitLabel = 'Simpan',
  cancelLabel = 'Batal',
  fields = [],
  formData = {},
  onChange,
  children,
  maxWidth = 'max-w-lg',
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isLoading && onClose?.()}
    >
      {/* Toast Notification via Flash Component */}
      {toast && <Flash toast={toast} onClose={onToastClose} />}

      <div
        className={`relative w-full ${maxWidth} bg-white rounded-3xl shadow-2xl p-5 border border-slate-100 max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={onSubmit} className="mt-3.5 flex flex-col flex-1 overflow-hidden text-slate-700">
          {/* Scrollable Form Body */}
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {/* Automatic Dynamic Fields Rendering */}
            {fields.length > 0
              ? fields.map((field, idx) => (
                  <div key={field.name || idx} className={field.gridClass || ''}>
                    <Label>{field.label} {field.required && <span className="text-rose-500">*</span>}</Label>
                    {field.type === 'select' ? (
                      <CustomSelect
                        options={field.options || []}
                        selected={formData[field.name]}
                        onChange={(val) => onChange && onChange({ target: { name: field.name, value: val } })}
                        placeholder={field.placeholder || 'Pilih Opsi'}
                        searchable={field.searchable || false}
                      />
                    ) : field.type === 'file' ? (
                      <FileInput onChange={field.onChange} accept={field.accept || 'image/*'} />
                    ) : (
                      <InputField
                        name={field.name}
                        type={field.type || 'text'}
                        value={formData[field.name] || ''}
                        onChange={onChange}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                  </div>
                ))
              : children}
          </div>

          {/* Action Buttons */}
          <div className="pt-3.5 border-t border-slate-100 flex justify-end gap-2 shrink-0 mt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer outline-none transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-2 px-4 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-sky-700 cursor-pointer flex items-center gap-1.5 outline-none transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

FormAction.Label = Label;
FormAction.Input = InputField;
FormAction.Select = CustomSelect;
FormAction.File = FileInput;
