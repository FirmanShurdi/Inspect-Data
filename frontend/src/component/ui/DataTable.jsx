import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Database, RefreshCw } from 'lucide-react';
import SearchBar from '../common/SearchBar';
import Pagination from '../common/Pagination';
import ActionMenu from '../common/ActionMenu';

/**
 * Universal Responsive DataTable Component for CaloKapal
 * Supports Desktop Table View, Mobile Card Stack View, and Built-in 3-Dots Action Menu.
 */
export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Cari data...',
  searchValue = '',
  onSearchChange,
  pageSize = 5,
  pageSizeOptions = [5, 10, 25, 50, 100],
  onPageSizeChange,
  currentPage = 1,
  onPageChange,
  totalEntries = null,
  actions = null,
  filters = null,
  onEdit = null,
  onDelete = null,
  mobileCardRender = null,
  emptyMessage = 'Tidak ada data ditemukan',
  className = '',
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPageSize, setInternalPageSize] = useState(pageSize);
  const [internalPage, setInternalPage] = useState(currentPage);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const search = onSearchChange ? searchValue : internalSearch;
  const activePageSize = onPageSizeChange ? pageSize : internalPageSize;
  const activePage = onPageChange ? currentPage : internalPage;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (onSearchChange) onSearchChange(val);
    else { setInternalSearch(val); setInternalPage(1); }
  };

  const handlePageSizeChange = (size) => {
    if (onPageSizeChange) onPageSizeChange(size);
    else { setInternalPageSize(size); setInternalPage(1); }
  };

  const handlePageChange = (page) => {
    if (onPageChange) onPageChange(page);
    else setInternalPage(page);
  };

  const filteredData = useMemo(() => {
    if ((onSearchChange && totalEntries !== null) || !search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search, columns, onSearchChange, totalEntries]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortConfig]);

  const totalItems = totalEntries !== null ? totalEntries : sortedData.length;
  const calculatedTotalPages = Math.ceil(totalItems / activePageSize) || 1;

  const displayData = useMemo(() => {
    if (totalEntries !== null) return data;
    const start = (activePage - 1) * activePageSize;
    return sortedData.slice(start, start + activePageSize);
  }, [sortedData, data, activePage, activePageSize, totalEntries]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderCellContent = (col, row, idx) => {
    if (col.render) return col.render(row[col.key], row, idx);
    const isActionCol = col.key === 'actions' || col.key === 'aksi';
    const hasActions = col.onEdit || col.onDelete || col.items || col.actions || onEdit || onDelete;

    if (isActionCol && hasActions) {
      return (
        <div className="flex items-center justify-center">
          <ActionMenu
            row={row}
            onEdit={col.onEdit || onEdit}
            onDelete={col.onDelete || onDelete}
            editLabel={col.editLabel}
            deleteLabel={col.deleteLabel}
            items={col.items || col.actions}
          />
        </div>
      );
    }
    return row[col.key] ?? '-';
  };

  return (
    <div className={`w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>
      {/* 1. Header Controls (Filters, Search & Actions Unified) */}
      {(filters || searchable || actions) && (
        <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-2.5 bg-slate-50/40">
          {filters}

          {(searchable || actions) && (
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${filters ? 'pt-1' : ''}`}>
              <div className="flex-1 max-w-full sm:max-w-xs order-2 sm:order-1">
                {searchable && (
                  <SearchBar
                    value={search}
                    onChange={handleSearchChange}
                    onClear={() => handleSearchChange({ target: { value: '' } })}
                    placeholder={searchPlaceholder}
                  />
                )}
              </div>
              <div className="flex items-center justify-end gap-3 shrink-0 order-1 sm:order-2">
                {actions && <div className="flex items-center gap-2 w-full sm:w-auto justify-end">{actions}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Main Data View */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0284C7]" />
          <span className="text-xs font-semibold text-slate-500">Memuat data...</span>
        </div>
      ) : displayData.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Database size={24} />
          </div>
          <p className="text-xs font-semibold text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  {columns.map((col) => (
                    <th
                      key={col.key || col.label}
                      className={`py-3.5 px-4 ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1.5 ${
                        col.className?.includes('text-center') ? 'justify-center' :
                        col.className?.includes('text-right') ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{col.label}</span>
                        {col.sortable && (
                          <span className="text-slate-400">
                            {sortConfig.key === col.key ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-[#0284C7]" /> : <ArrowDown size={13} className="text-[#0284C7]" />
                            ) : (
                              <ArrowUpDown size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700 font-medium">
                {displayData.map((row, idx) => (
                  <tr key={row.id || row.id_user || row.id_kapal || idx} className="hover:bg-sky-50/40 transition-colors duration-150">
                    {columns.map((col) => (
                      <td key={col.key || col.label} className={`py-3.5 px-4 align-middle ${col.className || ''}`}>
                        {renderCellContent(col, row, idx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View */}
          <div className="block md:hidden p-3 space-y-3 bg-slate-50/40">
            {displayData.map((row, idx) => (
              mobileCardRender ? (
                <div key={row.id || row.id_user || row.id_kapal || idx}>{mobileCardRender(row, idx)}</div>
              ) : (
                <div key={row.id || row.id_user || row.id_kapal || idx} className="bg-white p-4 rounded-2xl border-2 border-sky-200 shadow-xs space-y-2.5 hover:border-sky-300 transition-colors">
                  {columns.map((col) => (
                    <div key={col.key || col.label} className="flex items-start justify-between gap-3 text-[13px] border-b border-sky-100/60 last:border-none pb-2 last:pb-0">
                      <span className="text-slate-400 font-semibold shrink-0 select-none">{col.label}:</span>
                      <div className="text-slate-800 font-bold text-right break-words min-w-0 flex-1 leading-snug flex justify-end text-right">
                        {renderCellContent(col, row, idx)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        </>
      )}

      {/* 3. Footer */}
      <div className="px-4 border-t border-slate-100 bg-white">
        <Pagination
          currentPage={activePage}
          totalPages={calculatedTotalPages}
          totalEntries={totalItems}
          itemsPerPage={activePageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
