import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Map, Plus, Globe2, Building, LandPlot, MapPin } from 'lucide-react';
import DataTable from '../../component/ui/DataTable';
import Flash from '../../component/notif/flash';
import FormAction from '../../component/modal/formaction';
import DeleteModal from '../../component/modal/delete';
import ActionMenu from '../../component/common/ActionMenu';

const TAB_OPTIONS = [
  { id: 'negara', label: 'Negara', addLabel: 'Tambah Negara', fetchEndpoint: '/api/negara/all', baseEndpoint: '/api/negara', idKey: 'id_negara', icon: Globe2 },
  { id: 'provinsi', label: 'Provinsi', addLabel: 'Tambah Provinsi', fetchEndpoint: '/api/provinsi/all', baseEndpoint: '/api/provinsi', idKey: 'id_provinsi', icon: Building },
  { id: 'kabupaten', label: 'Kabupaten/Kota', addLabel: 'Tambah Kabupaten/Kota', fetchEndpoint: '/api/kabupaten/all', baseEndpoint: '/api/kabupaten', idKey: 'id_kabupaten', icon: LandPlot },
  { id: 'kecamatan', label: 'Kecamatan', addLabel: 'Tambah Kecamatan', fetchEndpoint: '/api/kecamatan/all', baseEndpoint: '/api/kecamatan', idKey: 'id_kecamatan', icon: MapPin },
];

export default function DaerahMaster() {
  const [activeTab, setActiveTab] = useState('negara');
  const [dataList, setDataList] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({ negara: [], provinsi: [], kabupaten: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // { type: 'form' | 'delete', item }
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabConfig = useMemo(() => TAB_OPTIONS.find((t) => t.id === activeTab) || TAB_OPTIONS[0], [activeTab]);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isFetchingRef = React.useRef(false);
  const isFetchingDropdownRef = React.useRef(false);

  const fetchDropdowns = useCallback(async () => {
    if (isFetchingDropdownRef.current) return;
    isFetchingDropdownRef.current = true;
    try {
      const headers = getAuthHeader();
      const promises = [];
      const keys = [];

      if (activeTab !== 'negara') {
        promises.push(fetch('/api/negara/all', { headers }).then((r) => r.json()));
        keys.push('negara');
      }
      if (activeTab !== 'provinsi') {
        promises.push(fetch('/api/provinsi/all', { headers }).then((r) => r.json()));
        keys.push('provinsi');
      }
      if (activeTab !== 'kabupaten') {
        promises.push(fetch('/api/kabupaten/all', { headers }).then((r) => r.json()));
        keys.push('kabupaten');
      }

      if (promises.length === 0) return;

      const results = await Promise.all(promises);
      setDropdownOptions((prev) => {
        const next = { ...prev };
        results.forEach((resData, idx) => {
          const key = keys[idx];
          if (key === 'negara' && resData?.datas) {
            next.negara = resData.datas.map((n) => ({ label: n.nama_negara, value: n.id_negara }));
          } else if (key === 'provinsi' && resData?.datas) {
            next.provinsi = resData.datas.map((p) => ({ label: p.nama_provinsi, value: p.id_provinsi }));
          } else if (key === 'kabupaten' && resData?.datas) {
            next.kabupaten = resData.datas.map((k) => ({ label: k.nama_kabupaten, value: k.id_kabupaten }));
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Fetch Dropdowns Error:', err);
    } finally {
      isFetchingDropdownRef.current = false;
    }
  }, [activeTab]);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch(tabConfig.fetchEndpoint, { headers: getAuthHeader() });
      if (res.ok) {
        const resData = await res.json();
        const rawList = resData.datas || resData.data || [];
        setDataList(rawList);

        if (activeTab === 'negara') {
          setDropdownOptions((prev) => ({
            ...prev,
            negara: rawList.map((n) => ({ label: n.nama_negara, value: n.id_negara })),
          }));
        } else if (activeTab === 'provinsi') {
          setDropdownOptions((prev) => ({
            ...prev,
            provinsi: rawList.map((p) => ({ label: p.nama_provinsi, value: p.id_provinsi })),
          }));
        } else if (activeTab === 'kabupaten') {
          setDropdownOptions((prev) => ({
            ...prev,
            kabupaten: rawList.map((k) => ({ label: k.nama_kabupaten, value: k.id_kabupaten })),
          }));
        }
      }
    } catch (err) {
      console.error('Fetch Data Error:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [tabConfig.fetchEndpoint, activeTab]);

  useEffect(() => {
    fetchData();
    fetchDropdowns();
  }, [fetchData, fetchDropdowns]);

  const handleOpenAdd = () => {
    setFormData({});
    setActiveModal({ type: 'form', item: null });
  };

  const handleOpenEdit = useCallback((item) => {
    setFormData({ ...item });
    setActiveModal({ type: 'form', item });
  }, []);

  const handleOpenDelete = useCallback((item) => {
    setActiveModal({ type: 'delete', item });
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const isEdit = Boolean(activeModal?.item);
    const { baseEndpoint, idKey } = tabConfig;
    const endpoint = isEdit ? `${baseEndpoint}/update/${activeModal.item[idKey]}` : `${baseEndpoint}/store`;

    try {
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ message: isEdit ? `Data ${tabConfig.label} berhasil diperbarui!` : `Data ${tabConfig.label} berhasil ditambahkan!`, type: 'success' });
        setActiveModal(null);
        fetchData();
        fetchDropdowns();
      } else {
        setToast({ message: resData.msg || 'Gagal menyimpan data.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghubungkan ke server.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeModal?.item) return;
    const { baseEndpoint, idKey } = tabConfig;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseEndpoint}/delete/${activeModal.item[idKey]}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        setToast({ message: `Data ${tabConfig.label} berhasil dihapus!`, type: 'success' });
        setActiveModal(null);
        fetchData();
        fetchDropdowns();
      } else {
        setToast({ message: resData.msg || 'Gagal menghapus data.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Gagal menghubungkan ke server.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    const baseCol = [
      {
        key: 'index',
        label: 'NO',
        className: 'w-16 text-center',
        render: (_, __, idx) => <span className="font-semibold text-slate-500">{idx + 1}</span>,
      },
    ];

    if (activeTab === 'negara') {
      baseCol.push(
        {
          key: 'nama_negara',
          label: 'NAMA NEGARA',
          sortable: true,
          render: (val) => (
            <div className="flex items-center justify-end md:justify-start gap-2.5 text-right w-full">
              <div className="hidden md:flex w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] items-center justify-center shrink-0 border border-sky-100">
                <Globe2 size={16} />
              </div>
              <span className="font-bold text-slate-800 break-words text-right">{val || '-'}</span>
            </div>
          ),
        },
        {
          key: 'kode_negara',
          label: 'KODE NEGARA',
          sortable: true,
          render: (val) => <span className="font-semibold text-slate-600 break-words text-right">{val || '-'}</span>,
        }
      );
    } else if (activeTab === 'provinsi') {
      baseCol.push(
        {
          key: 'nama_provinsi',
          label: 'NAMA PROVINSI',
          sortable: true,
          render: (val) => (
            <div className="flex items-center justify-end md:justify-start gap-2.5 text-right w-full">
              <div className="hidden md:flex w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] items-center justify-center shrink-0 border border-sky-100">
                <Building size={16} />
              </div>
              <span className="font-bold text-slate-800 break-words text-right">{val || '-'}</span>
            </div>
          ),
        },
        {
          key: 'negara',
          label: 'NEGARA',
          sortable: true,
          render: (val, row) => <span className="font-semibold text-slate-600 break-words text-right">{val?.nama_negara || row.nama_negara || '-'}</span>,
        }
      );
    } else if (activeTab === 'kabupaten') {
      baseCol.push(
        {
          key: 'nama_kabupaten',
          label: 'KABUPATEN / KOTA',
          sortable: true,
          render: (val) => (
            <div className="flex items-center justify-end md:justify-start gap-2.5 text-right w-full">
              <div className="hidden md:flex w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] items-center justify-center shrink-0 border border-sky-100">
                <LandPlot size={16} />
              </div>
              <span className="font-bold text-slate-800 break-words text-right">{val || '-'}</span>
            </div>
          ),
        },
        {
          key: 'provinsi',
          label: 'PROVINSI',
          sortable: true,
          render: (val, row) => <span className="font-semibold text-slate-600 break-words text-right">{val?.nama_provinsi || row.nama_provinsi || '-'}</span>,
        }
      );
    } else if (activeTab === 'kecamatan') {
      baseCol.push(
        {
          key: 'nama_kecamatan',
          label: 'KECAMATAN',
          sortable: true,
          render: (val) => (
            <div className="flex items-center justify-end md:justify-start gap-2.5 text-right w-full">
              <div className="hidden md:flex w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] items-center justify-center shrink-0 border border-sky-100">
                <MapPin size={16} />
              </div>
              <span className="font-bold text-slate-800 break-words text-right">{val || '-'}</span>
            </div>
          ),
        },
        {
          key: 'kabupaten',
          label: 'KABUPATEN / KOTA',
          sortable: true,
          render: (val, row) => <span className="font-semibold text-slate-600 break-words text-right">{val?.nama_kabupaten || row.nama_kabupaten || '-'}</span>,
        }
      );
    }

    baseCol.push({
      key: 'aksi',
      label: 'AKSI',
      className: 'text-center w-20',
      render: (_, row) => <ActionMenu row={row} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />,
    });

    return baseCol;
  }, [activeTab, handleOpenEdit, handleOpenDelete]);

  const formFields = useMemo(() => {
    if (activeTab === 'negara') {
      return [
        { name: 'nama_negara', label: 'Nama Negara', required: true, placeholder: 'Ketik nama negara...' },
        { name: 'kode_negara', label: 'Kode Negara', placeholder: 'Ketik kode negara (contoh: IDN)...' },
      ];
    } else if (activeTab === 'provinsi') {
      return [
        { name: 'nama_provinsi', label: 'Nama Provinsi', required: true, placeholder: 'Ketik nama provinsi...' },
        { name: 'id_negara', label: 'Pilih Negara', type: 'select', options: dropdownOptions.negara, placeholder: '-- Pilih Negara --', searchable: true },
      ];
    } else if (activeTab === 'kabupaten') {
      return [
        { name: 'nama_kabupaten', label: 'Nama Kabupaten/Kota', required: true, placeholder: 'Ketik nama kabupaten/kota...' },
        { name: 'id_provinsi', label: 'Pilih Provinsi', type: 'select', options: dropdownOptions.provinsi, placeholder: '-- Pilih Provinsi --', searchable: true },
      ];
    } else {
      return [
        { name: 'nama_kecamatan', label: 'Nama Kecamatan', required: true, placeholder: 'Ketik nama kecamatan...' },
        { name: 'id_kabupaten', label: 'Pilih Kabupaten/Kota', type: 'select', options: dropdownOptions.kabupaten, placeholder: '-- Pilih Kabupaten/Kota --', searchable: true },
      ];
    }
  }, [activeTab, dropdownOptions]);

  const getItemDisplayName = (item) => {
    if (!item) return '';
    return item.nama_negara || item.nama_provinsi || item.nama_kabupaten || item.nama_kecamatan || '';
  };

  return (
    <div className="space-y-6 font-sans">
      <Flash toast={toast} onClose={() => setToast(null)} />

      <DeleteModal
        isOpen={activeModal?.type === 'delete'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleConfirmDelete}
        title={`Hapus Data ${tabConfig.label}`}
        message={`Apakah Anda yakin ingin menghapus data ${tabConfig.label} ini?`}
        itemName={getItemDisplayName(activeModal?.item)}
        isLoading={isSubmitting}
      />

      <FormAction
        isOpen={activeModal?.type === 'form'}
        onClose={() => setActiveModal(null)}
        title={activeModal?.item ? `Edit ${tabConfig.label}` : `Tambah ${tabConfig.label} Baru`}
        icon={tabConfig.icon}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        fields={formFields}
        formData={formData}
        onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
        submitLabel={activeModal?.item ? 'Simpan' : 'Tambah'}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Map size={26} className="text-[#0284C7]" />
            Data Daerah
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola wilayah negara, provinsi, kabupaten/kota, dan kecamatan
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-sky-100 flex gap-1 overflow-x-auto scrollbar-none">
        {TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-sky-50 text-[#0284C7] shadow-2xs border border-sky-200/80'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <DataTable
        key={activeTab}
        columns={columns}
        data={dataList}
        isLoading={isLoading}
        searchPlaceholder={`Cari ${tabConfig.label.toLowerCase()}...`}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[linear-gradient(90deg,#0284C7_0%,#0EA5E9_100%)] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>{tabConfig.addLabel}</span>
          </button>
        }
        emptyMessage={`Belum ada data ${tabConfig.label.toLowerCase()} terdaftar`}
      />
    </div>
  );
}
