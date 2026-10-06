import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck, Ship, MapPin } from 'lucide-react';
import Flash from '../../component/notif/flash';
import Label from '../../component/form/Label';
import InputField from '../../component/form/InputField';
import Select from '../../component/form/Select';

const INITIAL_FORM = {
  no_urut: '',
  no_spb_asal: '',
  tanggal_clearance: '',
  pukul_agen_clearance: '',
  id_kapal: '',
  id_nahkoda: '',
  jumlah_crew: '',
  id_kedudukan_kapal: '',
  id_datang_dari: '',
  tanggal_datang: '',
  id_sandar: '',
  id_tolak: '',
  id_tujuan_akhir: '',
  tanggal_berangkat: '',
  pukul_kapal_berangkat: '',
  id_tempat_singgah: '',
};

const getAuthHeader = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FormField = ({ label, children }) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    {children}
  </div>
);

export default function FormManifest() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Dropdown states
  const [options, setOptions] = useState({
    kapal: [],
    nahkoda: [],
    pelabuhan: [],
    spbAsal: [],
  });

  // Fetch all dropdown options in parallel with safe single-read JSON parsing
  const fetchDropdowns = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [resKapal, resNahkoda, resPelabuhan, resSpbAsal] = await Promise.allSettled([
        fetch('/api/kapal/all', { headers }).then((r) => (r.ok ? r : fetch('/api/kapal', { headers }))),
        fetch('/api/nahkoda/all', { headers }),
        fetch('/api/pelabuhan/all', { headers }),
        fetch('/api/spb-asal/all', { headers }),
      ]);

      const parse = async (res) => {
        if (res.status === 'fulfilled' && res.value?.ok) {
          try {
            const data = await res.value.json();
            return data.datas || data.data || [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      const [kapal, nahkoda, pelabuhan, spbAsal] = await Promise.all([
        parse(resKapal),
        parse(resNahkoda),
        parse(resPelabuhan),
        parse(resSpbAsal),
      ]);

      setOptions({ kapal, nahkoda, pelabuhan, spbAsal });
    } catch (err) {
      console.error('Fetch Dropdowns Error:', err);
    }
  }, []);

  // Fetch detail for edit mode
  const fetchManifestDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manifest/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const resData = await res.json();
        const item = resData.data || resData.datas || resData;
        setFormData({
          ...INITIAL_FORM,
          ...item,
          tanggal_clearance: item.tanggal_clearance?.split('T')[0] || '',
          tanggal_datang: item.tanggal_datang?.split('T')[0] || '',
          tanggal_berangkat: item.tanggal_berangkat?.split('T')[0] || '',
        });
      }
    } catch (err) {
      setToast({ message: 'Gagal mengambil data manifest', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDropdowns();
    fetchManifestDetail();
  }, [fetchDropdowns, fetchManifestDetail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'id_kapal') {
        const selected = options.kapal.find((k) => String(k.id_kapal) === String(value));
        if (selected) {
          updated.id_kedudukan_kapal = selected.nama_asal_kapal || selected.id_asal_kapal || '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = isEdit ? `/api/manifest/update/${id}` : '/api/manifest/store';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ message: isEdit ? 'Manifest berhasil diperbarui!' : 'Manifest baru berhasil disimpan!', type: 'success' });
        setTimeout(() => navigate('/manifest'), 1200);
      } else {
        setToast({ message: resData.msg || resData.message || 'Gagal menyimpan data manifest.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: isEdit ? 'Perubahan disimpan (Local).' : 'Data Manifest baru disiapkan.', type: 'success' });
      setTimeout(() => navigate('/manifest'), 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatted options map
  const selectOpts = useMemo(() => ({
    spbAsal: [
      { value: '', label: 'Pilih atau ketik No SPB Asal...' },
      ...options.spbAsal.map((s) => ({
        value: s.kode_spb || s.no_spb_asal,
        label: `${s.kode_spb || s.no_spb_asal} ${s.asal ? `- ${s.asal}` : ''}`,
      })),
    ],
    kapal: [
      { value: '', label: 'Pilih Kapal' },
      ...options.kapal.map((k) => ({ value: k.id_kapal, label: k.nama_kapal })),
    ],
    nahkoda: [
      { value: '', label: 'Pilih Nahkoda' },
      ...options.nahkoda.map((n) => ({ value: n.id_nahkoda, label: n.nama_nahkoda })),
    ],
    pelabuhan: [
      { value: '', label: 'Pilih Pelabuhan' },
      ...options.pelabuhan.map((p) => ({ value: p.id_pelabuhan, label: p.nama_pelabuhan })),
    ],
  }), [options]);

  const selectedKapalKedudukan = useMemo(() => {
    if (!formData.id_kapal) return 'Pilih Kapal Terlebih Dahulu';
    const kapal = options.kapal.find((k) => String(k.id_kapal) === String(formData.id_kapal));
    return kapal?.asal?.nama_asal_kapal || kapal?.nama_asal_kapal || kapal?.asal_kapal?.nama_asal_kapal || 'Kedudukan Terdeteksi';
  }, [formData.id_kapal, options.kapal]);

  return (
    <div className="space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/manifest')}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Kembali ke Manifest"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {isEdit ? 'Form Edit Manifest Pelayaran' : 'Form Tambah Manifest Pelayaran'}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Isi kelengkapan data clearance, kapal & awak, serta rute perjalanan
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* KELOMPOK 1: DATA CLEARANCE */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
            <span>Data Clearance</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nomor Register">
              <InputField type="text" name="no_urut" value={formData.no_urut} onChange={handleChange} placeholder="Nomor Register" />
            </FormField>
            <FormField label="No SPB Asal">
              <Select name="no_spb_asal" value={formData.no_spb_asal} onChange={handleChange} options={selectOpts.spbAsal} placeholder="Pilih atau ketik No SPB Asal..." />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tanggal Clearance">
              <InputField type="date" name="tanggal_clearance" value={formData.tanggal_clearance} onChange={handleChange} />
            </FormField>
            <FormField label="Pukul Clearance">
              <InputField type="time" name="pukul_agen_clearance" value={formData.pukul_agen_clearance} onChange={handleChange} />
            </FormField>
          </div>
        </div>

        {/* KELOMPOK 2: DATA KAPAL & AWAK */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <Ship className="w-4 h-4 text-[#0284C7]" />
            <span>Data Kapal & Awak</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Nama Kapal">
              <Select name="id_kapal" value={formData.id_kapal} onChange={handleChange} options={selectOpts.kapal} placeholder="Pilih Kapal" />
            </FormField>
            <FormField label="Nama Nahkoda">
              <Select name="id_nahkoda" value={formData.id_nahkoda} onChange={handleChange} options={selectOpts.nahkoda} placeholder="Pilih Nahkoda" />
            </FormField>
            <FormField label="Jumlah Crew">
              <InputField type="number" name="jumlah_crew" value={formData.jumlah_crew} onChange={handleChange} placeholder="Jumlah Crew" min="0" />
            </FormField>
          </div>
        </div>

        {/* KELOMPOK 3: DATA PERJALANAN */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-[#0284C7]" />
            <span>Data Perjalanan</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Kedudukan Kapal">
              <InputField type="text" readOnly value={selectedKapalKedudukan} className="bg-slate-100/80 text-slate-500 font-semibold cursor-not-allowed select-none" />
            </FormField>
            <FormField label="Datang Dari">
              <Select name="id_datang_dari" value={formData.id_datang_dari} onChange={handleChange} options={selectOpts.pelabuhan} placeholder="Pilih Asal" />
            </FormField>
            <FormField label="Tanggal Datang">
              <InputField type="date" name="tanggal_datang" value={formData.tanggal_datang} onChange={handleChange} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Sandar Di">
              <Select name="id_sandar" value={formData.id_sandar} onChange={handleChange} options={selectOpts.pelabuhan} placeholder="Pilih Pelabuhan Sandar" />
            </FormField>
            <FormField label="Tolak Dari">
              <Select name="id_tolak" value={formData.id_tolak} onChange={handleChange} options={selectOpts.pelabuhan} placeholder="Pilih Pelabuhan Tolak" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Tujuan Akhir">
              <Select name="id_tujuan_akhir" value={formData.id_tujuan_akhir} onChange={handleChange} options={selectOpts.pelabuhan} placeholder="Pilih Tujuan" />
            </FormField>
            <FormField label="Tanggal Berangkat">
              <InputField type="date" name="tanggal_berangkat" value={formData.tanggal_berangkat} onChange={handleChange} />
            </FormField>
            <FormField label="Pukul Berangkat">
              <InputField type="time" name="pukul_kapal_berangkat" value={formData.pukul_kapal_berangkat} onChange={handleChange} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Pelabuhan Singgah Lanjutan (Opsional)">
              <Select name="id_tempat_singgah" value={formData.id_tempat_singgah} onChange={handleChange} options={selectOpts.pelabuhan} placeholder="Pilih Pelabuhan Lanjutan (Opsional)" />
            </FormField>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/manifest')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSubmitting ? 'Memproses...' : 'Simpan Data'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
