import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ship, Plus, Anchor, MapPin } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import FormAction from '../../component/modal/formaction';
import DeleteModal from '../../component/modal/delete';
import ActionMenu from '../../component/common/ActionMenu';

const INITIAL_FORM = {
  nama_kapal: '', tanda_selar: '', nomor_selar: '', gt: '', nt: '', call_sign: '', nomor_imo: '',
  id_jenis: '', id_asal_kapal: '', nama_jenis: '', nama_asal_kapal: '',
};

const TAB_OPTIONS = [
  { id: 'kapal', label: 'Daftar Kapal', addLabel: 'Tambah Kapal', fetchEndpoint: '/api/kapal', baseEndpoint: '/api/kapal', idKey: 'id_kapal' },
  { id: 'jenis', label: 'Jenis Kapal', addLabel: 'Tambah Jenis Kapal', fetchEndpoint: '/api/kapal/jenis/all', baseEndpoint: '/api/kapal/jenis', idKey: 'id_jenis' },
  { id: 'kedudukan', label: 'Kedudukan Kapal', addLabel: 'Tambah Kedudukan', fetchEndpoint: '/api/kapal/asal/all', baseEndpoint: '/api/kapal/asal', idKey: 'id_asal_kapal' },
];

export default function KapalMaster() {
  const [activeTab, setActiveTab] = useState('kapal');
  const [dataList, setDataList] = useState([]);
  const [jenisOptions, setJenisOptions] = useState([]);
  const [asalOptions, setAsalOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabConfig = useMemo(() => TAB_OPTIONS.find((t) => t.id === activeTab) || TAB_OPTIONS[0], [activeTab]);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isFetchingRef = React.useRef(false);
  const isFetchingDropdownRef = React.useRef(false);

  const fetchDropdownOptions = useCallback(async () => {
    if (isFetchingDropdownRef.current) return;
    isFetchingDropdownRef.current = true;
    try {
      const headers = getAuthHeader();
      const [resJenis, resAsal] = await Promise.all([
        fetch('/api/kapal/jenis/all', { headers }),
        fetch('/api/kapal/asal/all', { headers }),
      ]);
      const [dJenis, dAsal] = await Promise.all([resJenis.json(), resAsal.json()]);
      if (dJenis?.datas) setJenisOptions(dJenis.datas.map((j) => ({ label: j.nama_jenis, value: j.id_jenis })));
      if (dAsal?.datas) setAsalOptions(dAsal.datas.map((a) => ({ label: a.nama_asal_kapal, value: a.id_asal_kapal })));
    } catch (err) {
      console.error('Fetch Dropdown Options Error:', err);
    } finally {
      isFetchingDropdownRef.current = false;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch(tabConfig.fetchEndpoint, { headers: getAuthHeader() });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.msg || 'Gagal memuat data');
      setDataList(resData.datas || []);
    } catch (err) {
      setToast({ message: 'Gagal memuat data dari database!', type: 'error' });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [tabConfig.fetchEndpoint]);

  useEffect(() => {
    fetchData();
    fetchDropdownOptions();
  }, [fetchData, fetchDropdownOptions]);

  const handleOpenAdd = () => { setSelectedItem(null); setFormData(INITIAL_FORM); setIsFormOpen(true); };
  const handleOpenEdit = useCallback((item) => {
    setSelectedItem(item);
    setFormData({ ...INITIAL_FORM, ...item, id_jenis: item.id_jenis || '', id_asal_kapal: item.id_asal_kapal || '' });
    setIsFormOpen(true);
  }, []);
  const handleOpenDelete = useCallback((item) => { setSelectedItem(item); setIsDeleteOpen(true); }, []);
  const handleFormChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isEdit = Boolean(selectedItem);
      const { baseEndpoint, idKey } = tabConfig;
      const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };

      let url = isEdit ? `${baseEndpoint}/update/${selectedItem[idKey]}` : `${baseEndpoint}/store`;
      let bodyData = {};

      if (activeTab === 'kapal') {
        if (!formData.nama_kapal.trim()) return setToast({ message: 'Nama kapal wajib diisi!', type: 'warning' });
        bodyData = formData;
      } else if (activeTab === 'jenis') {
        if (!formData.nama_jenis.trim()) return setToast({ message: 'Nama jenis kapal wajib diisi!', type: 'warning' });
        bodyData = { nama_jenis: formData.nama_jenis };
      } else {
        if (!formData.nama_asal_kapal.trim()) return setToast({ message: 'Nama kedudukan kapal wajib diisi!', type: 'warning' });
        bodyData = { nama_asal_kapal: formData.nama_asal_kapal };
      }

      const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers, body: JSON.stringify(bodyData) });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.msg || 'Gagal menyimpan data.');

      setToast({ message: `Data berhasil ${isEdit ? 'diperbarui' : 'disimpan'}!`, type: 'success' });
      setIsFormOpen(false);
      fetchData();
      if (activeTab !== 'kapal') fetchDropdownOptions();
    } catch (err) {
      setToast({ message: err.message || 'Gagal menyimpan data.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${tabConfig.baseEndpoint}/delete/${selectedItem[tabConfig.idKey]}`, { method: 'DELETE', headers: getAuthHeader() });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.msg || 'Gagal menghapus data.');

      setToast({ message: 'Data berhasil dihapus dari database.', type: 'success' });
      setIsDeleteOpen(false);
      fetchData();
      if (activeTab !== 'kapal') fetchDropdownOptions();
    } catch (err) {
      setToast({ message: err.message || 'Gagal menghapus data.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    if (activeTab === 'jenis') {
      return [
        { key: 'no', label: 'NO.', className: 'w-16 text-center font-bold text-slate-600 text-[13px]', render: (_, __, idx) => idx + 1 },
        { key: 'nama_jenis', label: 'NAMA JENIS KAPAL', sortable: true, render: (v) => <span className="font-bold text-slate-800 text-[13px] uppercase">{v || '-'}</span> },
        { key: 'actions', label: 'AKSI', className: 'text-center w-24', onEdit: handleOpenEdit, onDelete: handleOpenDelete },
      ];
    }
    if (activeTab === 'kedudukan') {
      return [
        { key: 'no', label: 'NO.', className: 'w-16 text-center font-bold text-slate-600 text-[13px]', render: (_, __, idx) => idx + 1 },
        { key: 'nama_asal_kapal', label: 'KEDUDUKAN KAPAL', sortable: true, render: (v) => <span className="font-bold text-slate-800 text-[13px] uppercase">{v || '-'}</span> },
        { key: 'actions', label: 'AKSI', className: 'text-center w-24', onEdit: handleOpenEdit, onDelete: handleOpenDelete },
      ];
    }
    return [
      {
        key: 'nama_kapal', label: 'NAMA KAPAL', sortable: true,
        render: (val, row) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-slate-600 text-xs">
              <Ship size={16} className="text-[#0284C7]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-800 text-[13px] truncate">{val}</span>
              <span className="text-[12px] text-slate-400 font-medium">{row.jenis?.nama_jenis || 'Kapal Laut'}</span>
            </div>
          </div>
        ),
      },
      { key: 'tanda_selar', label: 'TANDA SELAR', sortable: true, render: (val) => <span className="font-bold text-slate-700 text-[13px]">{val || '-'}</span> },
      {
        key: 'gt', label: 'GT / NT', sortable: true,
        render: (val, row) => (
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200 font-extrabold">GT.{val || 0}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">NT.{row.nt || 0}</span>
          </div>
        ),
      },
      {
        key: 'call_sign', label: 'CALL SIGN / IMO', sortable: true,
        render: (val, row) => (
          <div className="flex flex-col text-[13px]">
            <span className="font-bold text-slate-800">{val || '-'}</span>
            {row.nomor_imo && row.nomor_imo !== '-' && <span className="text-[12px] text-slate-400 font-medium">IMO: {row.nomor_imo}</span>}
          </div>
        ),
      },
      { key: 'asal', label: 'PELABUHAN / ASAL', sortable: true, render: (val, row) => <span className="text-[13px] font-semibold text-slate-600">{row.asal?.nama_asal_kapal || '-'}</span> },
      { key: 'actions', label: 'AKSI', className: 'text-center w-24', onEdit: handleOpenEdit, onDelete: handleOpenDelete },
    ];
  }, [activeTab, handleOpenEdit, handleOpenDelete]);

  // Ultra-Clean Custom Mobile Card Render (Aksi tetap di paling bawah seperti semula)
  const renderMobileCard = useCallback((row, idx) => {
    if (activeTab === 'jenis') {
      return (
        <div className="bg-white p-3.5 rounded-2xl border-2 border-sky-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
            <span className="font-extrabold text-slate-800 text-[13.5px] uppercase">{row.nama_jenis}</span>
          </div>
          <ActionMenu row={row} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
        </div>
      );
    }
    if (activeTab === 'kedudukan') {
      return (
        <div className="bg-white p-3.5 rounded-2xl border-2 border-sky-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
            <span className="font-extrabold text-slate-800 text-[13.5px] uppercase">{row.nama_asal_kapal}</span>
          </div>
          <ActionMenu row={row} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
        </div>
      );
    }
    return (
      <div className="bg-white p-4 rounded-2xl border-2 border-sky-200 shadow-xs space-y-2.5">
        {/* 1. Header: NAMA KAPAL (Rata Kanan Presisi & Maksimal Ruang) */}
        <div className="border-b border-sky-100/80 pb-2.5 flex items-start justify-between gap-3">
          <span className="text-slate-400 font-bold text-[12px] shrink-0 pt-0.5">NAMA KAPAL:</span>
          <div className="flex flex-col items-end text-right min-w-0 flex-1">
            <span className="text-slate-900 font-extrabold text-[14px] leading-snug break-words text-right w-full">
              {row.nama_kapal}
            </span>
            <span className="text-[12px] text-[#0284C7] font-extrabold text-right mt-0.5">
              {row.jenis?.nama_jenis || 'Kapal Laut'}
            </span>
          </div>
        </div>

        {/* 2. Detail Fields */}
        <div className="flex items-center justify-between text-[12.5px] border-b border-sky-100/60 pb-2">
          <span className="text-slate-400 font-semibold shrink-0">TANDA SELAR:</span>
          <span className="font-bold text-slate-800 truncate text-right">{row.tanda_selar || '-'}</span>
        </div>

        <div className="flex items-center justify-between text-[12.5px] border-b border-sky-100/60 pb-2">
          <span className="text-slate-400 font-semibold shrink-0">GT / NT:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200 text-xs font-extrabold">GT.{row.gt || 0}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">NT.{row.nt || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[12.5px] border-b border-sky-100/60 pb-2">
          <span className="text-slate-400 font-semibold shrink-0">CALL SIGN / IMO:</span>
          <span className="font-bold text-slate-800 text-right truncate">
            {row.call_sign || '-'} {row.nomor_imo && row.nomor_imo !== '-' ? `(IMO: ${row.nomor_imo})` : ''}
          </span>
        </div>

        <div className="flex items-center justify-between text-[12.5px] border-b border-sky-100/60 pb-2">
          <span className="text-slate-400 font-semibold shrink-0">PELABUHAN / ASAL:</span>
          <span className="font-bold text-slate-800 text-right truncate">{row.asal?.nama_asal_kapal || '-'}</span>
        </div>

        {/* 3. Footer: AKSI (Paling Bawah Seperti Semula) */}
        <div className="flex items-center justify-between text-[12.5px] pt-1">
          <span className="text-slate-400 font-semibold shrink-0">AKSI:</span>
          <ActionMenu row={row} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
        </div>
      </div>
    );
  }, [activeTab, handleOpenEdit, handleOpenDelete]);

  return (
    <div className="w-full space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={() => !isSubmitting && setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={`Hapus Data ${tabConfig.label}`}
        message="Apakah Anda yakin ingin menghapus data ini dari database MySQL?"
        itemName={selectedItem?.nama_kapal || selectedItem?.nama_jenis || selectedItem?.nama_asal_kapal}
        isLoading={isSubmitting}
      />

      <FormAction
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedItem ? `Edit ${tabConfig.label}` : tabConfig.addLabel}
        icon={activeTab === 'jenis' ? Anchor : activeTab === 'kedudukan' ? MapPin : Ship}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        submitLabel={selectedItem ? 'Simpan' : 'Tambah'}
      >
        {activeTab === 'kapal' && (
          <>
            <div><FormAction.Label>Nama Kapal *</FormAction.Label><FormAction.Input name="nama_kapal" value={formData.nama_kapal} onChange={handleFormChange} required placeholder="Contoh: KM. SABUK NUSANTARA 92" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><FormAction.Label>Jenis Kapal</FormAction.Label><FormAction.Select options={jenisOptions} selected={formData.id_jenis} onChange={(v) => setFormData((p) => ({ ...p, id_jenis: v }))} placeholder="Pilih Jenis Kapal" searchable /></div>
              <div><FormAction.Label>Kedudukan Kapal</FormAction.Label><FormAction.Select options={asalOptions} selected={formData.id_asal_kapal} onChange={(v) => setFormData((p) => ({ ...p, id_asal_kapal: v }))} placeholder="Pilih Kedudukan Kapal" searchable /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><FormAction.Label>Gross Tonnage (GT)</FormAction.Label><FormAction.Input name="gt" type="number" value={formData.gt} onChange={handleFormChange} placeholder="1200" /></div>
              <div><FormAction.Label>Nomor Selar</FormAction.Label><FormAction.Input name="nomor_selar" value={formData.nomor_selar} onChange={handleFormChange} placeholder="Contoh: 452" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><FormAction.Label>Tanda Selar</FormAction.Label><FormAction.Input name="tanda_selar" value={formData.tanda_selar} onChange={handleFormChange} placeholder="GT.1200 No.452/Ba" /></div>
              <div><FormAction.Label>Nomor IMO (opsional)</FormAction.Label><FormAction.Input name="nomor_imo" value={formData.nomor_imo} onChange={handleFormChange} placeholder="9845120" /></div>
            </div>
            <div><FormAction.Label>Call Sign</FormAction.Label><FormAction.Input name="call_sign" value={formData.call_sign} onChange={handleFormChange} placeholder="YD9231" /></div>
          </>
        )}
        {activeTab === 'jenis' && <div><FormAction.Label>Nama Jenis Kapal *</FormAction.Label><FormAction.Input name="nama_jenis" value={formData.nama_jenis} onChange={handleFormChange} required placeholder="KLM / MT / KM" /></div>}
        {activeTab === 'kedudukan' && <div><FormAction.Label>Nama Kedudukan / Pelabuhan Asal *</FormAction.Label><FormAction.Input name="nama_asal_kapal" value={formData.nama_asal_kapal} onChange={handleFormChange} required placeholder="BANGKALAN / BANJARMASIN" /></div>}
      </FormAction>

      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5"><Ship size={26} className="text-[#0284C7]" /> Master Data Kapal</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Kelola data resmi armada kapal, jenis kapal & kedudukan kapal clearance KSOP</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-6 px-6 pt-4 border-b border-slate-200/80 bg-white">
          {TAB_OPTIONS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`pb-3 text-sm font-bold transition-all cursor-pointer outline-none relative ${activeTab === tab.id ? 'text-[#0284C7]' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab.label}
              {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0284C7] rounded-full" />}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-6">
          <DataTable
            columns={columns}
            data={dataList}
            isLoading={isLoading}
            searchable={true}
            searchPlaceholder={`Cari data ${tabConfig.label.toLowerCase()}...`}
            pageSize={5}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            emptyMessage={`Belum ada data ${tabConfig.label.toLowerCase()} di database.`}
            mobileCardRender={renderMobileCard}
            actions={
              <button type="button" onClick={handleOpenAdd} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all outline-none cursor-pointer">
                <Plus size={15} /><span>{tabConfig.addLabel}</span>
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
