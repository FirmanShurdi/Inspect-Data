import ExcelJS from 'exceljs';

/**
 * Format tanggal standar Indonesia
 */
const formatIndonesianDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1] || parts[1];
      const year = parts[0];
      return `${day} ${month} ${year}`;
    }
    return clean;
  } catch {
    return String(dateStr);
  }
};

/**
 * Export Clearance & Penumpang ke File Excel (.xlsx)
 * Disesuaikan persis dengan template resmi KSOP (Header Biru Tua, Subheader Biru Muda,
 * Tabel Utama, dan Sub-tabel Penumpang Anak di sela-sela penumpang terkait).
 *
 * @param {Object} clearanceData - Data clearance lengkap dari API /api/clearance/:id
 */
export async function exportClearanceToExcel(clearanceData) {
  if (!clearanceData) {
    throw new Error('Data clearance tidak ditemukan untuk diexport');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KSOP CaloKapal Inspection System';
  workbook.lastModifiedBy = 'Petugas KSOP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Manifest Penumpang', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ showGridLines: true }],
  });

  // Identitas Kapal & Clearance
  const namaKapal =
    clearanceData.nama_kapal ||
    clearanceData.kapal?.nama_kapal ||
    'KAPAL';
  const noClearance =
    clearanceData.no_urut ||
    clearanceData.id_clearance ||
    clearanceData.id_manifest ||
    '-';
  const todayStr = formatIndonesianDate(new Date().toISOString().split('T')[0]);

  // Kolom Definisi (A s/d H)
  worksheet.columns = [
    { key: 'no', width: 8 }, // A: NO
    { key: 'nik', width: 24 }, // B: NIK
    { key: 'nama', width: 34 }, // C: NAMA LENGKAP
    { key: 'jk', width: 18 }, // D: JENIS KELAMIN
    { key: 'tgl_lahir', width: 20 }, // E: TANGGAL LAHIR
    { key: 'alamat', width: 36 }, // F: ALAMAT
    { key: 'status_verifikasi', width: 22 }, // G: STATUS VERIFIKASI
    { key: 'keterangan', width: 30 }, // H: KETERANGAN / STATUS
  ];

  // ==========================================
  // BARIS 1: HEADER JUDUL BESAR BIRU TUA
  // ==========================================
  const titleRow = worksheet.getRow(1);
  titleRow.height = 36;
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `MANIFEST PENUMPANG KAPAL ${String(namaKapal).toUpperCase()} (#${noClearance})`;
  titleCell.font = {
    name: 'Calibri',
    size: 15,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' }, // Ocean Blue KSOP (#0284C7)
  };
  titleCell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
  };

  // Waktu Keberangkatan & Rute Pelayaran
  const jamBerangkat =
    clearanceData.pukul_kapal_berangkat ||
    clearanceData.pukul_agen_clearance ||
    clearanceData.jam_berangkat ||
    '-';
  const tglBerangkat = formatIndonesianDate(
    clearanceData.tanggal_berangkat || clearanceData.tanggal_clearance
  );
  const pelabuhanAsal =
    clearanceData.pelabuhan_tolak?.nama_pelabuhan ||
    clearanceData.pelabuhan_asal?.nama_pelabuhan ||
    '-';
  const pelabuhanTujuan =
    clearanceData.pelabuhan_tujuan?.nama_pelabuhan ||
    clearanceData.pelabuhan_sandar?.nama_pelabuhan ||
    '-';

  // ==========================================
  // BARIS 2: SUBHEADER BIRU MUDA (JAM KEBERANGKATAN & TANGGAL)
  // ==========================================
  const subTitleRow = worksheet.getRow(2);
  subTitleRow.height = 24;
  worksheet.mergeCells('A2:H2');
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = `Jam Keberangkatan: ${jamBerangkat}${jamBerangkat !== '-' ? ' WIB' : ''} | Tanggal: ${tglBerangkat} | Rute: ${pelabuhanAsal} ➔ ${pelabuhanTujuan} | Cetak: ${todayStr}`;
  subTitleCell.font = {
    name: 'Calibri',
    size: 10.5,
    bold: true,
    color: { argb: 'FF0369A1' }, // Deep Cyan (#0369A1)
  };
  subTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' }, // Soft Sky Blue (#E0F2FE)
  };
  subTitleCell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
  };

  // ==========================================
  // BARIS 3: SPASI KOSONG
  // ==========================================
  const spacerRow = worksheet.getRow(3);
  spacerRow.height = 8;

  // ==========================================
  // BARIS 4: HEADER TABEL (NO, NIK, NAMA, DLL.)
  // ==========================================
  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  const headerTitles = [
    'NO',
    'NIK',
    'NAMA LENGKAP',
    'JENIS KELAMIN',
    'TANGGAL LAHIR',
    'ALAMAT',
    'STATUS VERIFIKASI',
    'KETERANGAN / STATUS',
  ];

  headerTitles.forEach((title, index) => {
    const colNumber = index + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = title;
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }, // Samakan dengan header tabel screenshot
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0284C7' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: 'FF0369A1' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });

  // Border style helper
  const cellBorderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // ==========================================
  // PENGISIAN DATA PENUMPANG & SUB-TABEL ANAK
  // ==========================================
  const rawList = clearanceData.penumpang_list || clearanceData.penumpang || [];
  let currentRowIndex = 5;
  let noUrut = 1;
  let totalDewasaCount = 0;
  let totalAnakCount = 0;

  // Filter penumpang dewasa dan penumpang anak standalone
  rawList.forEach((p) => {
    const isStandaloneChild =
      p.tipe_penumpang === 'anak' ||
      p.kategori_penumpang === 'Anak' ||
      p.is_anak_only === true;

    const children = Array.isArray(p.anak_list) ? p.anak_list : [];
    const hasChildren = children.length > 0;

    const pRow = worksheet.getRow(currentRowIndex);
    pRow.height = 24;

    if (isStandaloneChild) {
      totalAnakCount += 1;
      // Penumpang anak mandiri (tanpa orang tua terikat)
      pRow.getCell(1).value = noUrut;
      pRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      pRow.getCell(2).value = p.nik ? String(p.nik).trim() : '-';
      pRow.getCell(2).numFmt = '@'; // NIK sebagai teks
      pRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

      pRow.getCell(3).value = String(p.nama_penumpang || p.nama || '-').toUpperCase();
      pRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      pRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

      pRow.getCell(4).value = String(p.jenis_kelamin || '-').toUpperCase();
      pRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

      pRow.getCell(5).value = formatIndonesianDate(p.tanggal_lahir);
      pRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

      pRow.getCell(6).value = p.alamat || '-';
      pRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      pRow.getCell(7).value = (p.status_verifikasi || 'pending').toUpperCase();
      pRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      pRow.getCell(7).font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: {
          argb: p.status_verifikasi === 'selesai' || p.status_verifikasi === 'verified'
            ? 'FF15803D'
            : 'FFB45309',
        },
      };

      pRow.getCell(8).value = 'Penumpang Anak (Mandiri)';
      pRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

      // Background soft purple untuk anak mandiri
      for (let c = 1; c <= 8; c++) {
        const cCell = pRow.getCell(c);
        cCell.border = cellBorderThin;
        cCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F3FF' },
        };
      }

      currentRowIndex += 1;
      noUrut += 1;
      return;
    }

    // Penumpang Dewasa
    totalDewasaCount += 1;

    pRow.getCell(1).value = noUrut;
    pRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    pRow.getCell(2).value = p.nik ? String(p.nik).trim() : '-';
    pRow.getCell(2).numFmt = '@'; // Wajib format string agar NIK tidak jadi scientific notation 3.201E+15
    pRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    pRow.getCell(3).value = String(p.nama_penumpang || p.nama || '-').toUpperCase();
    pRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
    pRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

    pRow.getCell(4).value = String(p.jenis_kelamin || '-').toUpperCase();
    pRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

    pRow.getCell(5).value = formatIndonesianDate(p.tanggal_lahir);
    pRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    pRow.getCell(6).value = p.alamat || '-';
    pRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    const statusVerif = (p.status_verifikasi || 'pending').toUpperCase();
    pRow.getCell(7).value = statusVerif;
    pRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    pRow.getCell(7).font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: {
        argb: statusVerif === 'SELESAI' || statusVerif === 'VERIFIED'
          ? 'FF15803D' // Green
          : 'FFB45309', // Amber
      },
    };

    let ketStatus = '-';
    if (hasChildren) {
      ketStatus = `Membawa Anak (${children.length} Orang)`;
    } else if (p.status) {
      ketStatus = p.status;
    }
    pRow.getCell(8).value = ketStatus;
    pRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

    for (let c = 1; c <= 8; c++) {
      const cCell = pRow.getCell(c);
      cCell.border = cellBorderThin;
      // Striping warna baris putih / abu sangat lembut
      if (noUrut % 2 === 0) {
        cCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    }

    currentRowIndex += 1;

    // =========================================================================
    // SUB-TABEL ANAK: DISISIPKAN DI SELA-SELA BAGI PENUMPANG YANG MEMBAWA ANAK
    // =========================================================================
    if (hasChildren) {
      totalAnakCount += children.length;

      // 1. Subheader Tabel Anak
      const childSubHeaderRow = worksheet.getRow(currentRowIndex);
      childSubHeaderRow.height = 20;

      childSubHeaderRow.getCell(1).value = '↳';
      childSubHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      childSubHeaderRow.getCell(2).value = '[TABEL ANAK]';
      childSubHeaderRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      childSubHeaderRow.getCell(2).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      childSubHeaderRow.getCell(3).value = 'NAMA LENGKAP ANAK';
      childSubHeaderRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      childSubHeaderRow.getCell(3).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      childSubHeaderRow.getCell(4).value = 'L / P';
      childSubHeaderRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      childSubHeaderRow.getCell(4).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      childSubHeaderRow.getCell(5).value = 'TGL LAHIR';
      childSubHeaderRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      childSubHeaderRow.getCell(5).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      childSubHeaderRow.getCell(6).value = 'ALAMAT';
      childSubHeaderRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
      childSubHeaderRow.getCell(6).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      childSubHeaderRow.getCell(7).value = 'STATUS';
      childSubHeaderRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      childSubHeaderRow.getCell(7).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      childSubHeaderRow.getCell(8).value = `ANAK DARI: ${String(p.nama_penumpang || '').toUpperCase()}`;
      childSubHeaderRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
      childSubHeaderRow.getCell(8).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };

      // Berikan warna latar subheader anak (Soft Amber / Emas muda elegan)
      for (let c = 1; c <= 8; c++) {
        const cCell = childSubHeaderRow.getCell(c);
        cCell.border = cellBorderThin;
        cCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }, // Amber-100 (#FEF3C7)
        };
      }

      currentRowIndex += 1;

      // 2. Baris Data Setiap Anak
      children.forEach((anak, anakIdx) => {
        const childRow = worksheet.getRow(currentRowIndex);
        childRow.height = 22;

        childRow.getCell(1).value = `${noUrut}.${anakIdx + 1}`;
        childRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        childRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: 'FF78350F' } };

        childRow.getCell(2).value = '- (Anak)';
        childRow.getCell(2).numFmt = '@';
        childRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        childRow.getCell(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };

        childRow.getCell(3).value = `•  ${String(anak.nama_anak || 'Anak').toUpperCase()}`;
        childRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
        childRow.getCell(3).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };

        childRow.getCell(4).value = String(anak.jenis_kelamin || '-').toUpperCase();
        childRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        childRow.getCell(4).font = { name: 'Calibri', size: 9 };

        childRow.getCell(5).value = formatIndonesianDate(anak.tanggal_lahir);
        childRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        childRow.getCell(5).font = { name: 'Calibri', size: 9 };

        childRow.getCell(6).value = anak.alamat || p.alamat || '-';
        childRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        childRow.getCell(6).font = { name: 'Calibri', size: 9 };

        childRow.getCell(7).value = 'VERIFIED';
        childRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        childRow.getCell(7).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF15803D' } };

        childRow.getCell(8).value = `Anak ke-${anakIdx + 1} dari ${p.nama_penumpang}`;
        childRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
        childRow.getCell(8).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };

        // Background baris anak (Cream lembut bersih)
        for (let c = 1; c <= 8; c++) {
          const cCell = childRow.getCell(c);
          cCell.border = cellBorderThin;
          cCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' }, // Amber-50 (#FFFBEB)
          };
        }

        currentRowIndex += 1;
      });
    }

    noUrut += 1;
  });

  // Jika ada standalone children di clearanceData.penumpang_anak_list yang belum ter-render
  const standaloneAnakList = (clearanceData.penumpang_anak_list || []).filter(
    (a) => !a.id_penumpang
  );

  if (standaloneAnakList.length > 0) {
    standaloneAnakList.forEach((anak, idx) => {
      totalAnakCount += 1;
      const childRow = worksheet.getRow(currentRowIndex);
      childRow.height = 24;

      childRow.getCell(1).value = noUrut;
      childRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      childRow.getCell(2).value = '-';
      childRow.getCell(2).numFmt = '@';
      childRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

      childRow.getCell(3).value = String(anak.nama_anak || 'Anak').toUpperCase();
      childRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      childRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

      childRow.getCell(4).value = String(anak.jenis_kelamin || '-').toUpperCase();
      childRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

      childRow.getCell(5).value = formatIndonesianDate(anak.tanggal_lahir);
      childRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

      childRow.getCell(6).value = anak.alamat || '-';
      childRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };

      childRow.getCell(7).value = 'VERIFIED';
      childRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      childRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };

      childRow.getCell(8).value = 'Penumpang Anak (Standalone)';
      childRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

      for (let c = 1; c <= 8; c++) {
        const cCell = childRow.getCell(c);
        cCell.border = cellBorderThin;
        cCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F3FF' },
        };
      }

      currentRowIndex += 1;
      noUrut += 1;
    });
  }

  // Jika tabel kosong
  if (rawList.length === 0 && standaloneAnakList.length === 0) {
    const emptyRow = worksheet.getRow(currentRowIndex);
    emptyRow.height = 30;
    worksheet.mergeCells(`A${currentRowIndex}:H${currentRowIndex}`);
    const emptyCell = emptyRow.getCell(1);
    emptyCell.value = 'Belum ada data penumpang terdaftar pada manifest kapal ini.';
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF94A3B8' } };
    emptyCell.border = cellBorderThin;
    currentRowIndex += 1;
  }

  // ==========================================
  // RINGKASAN TOTAL PENUMPANG DI BAWAH TABEL
  // ==========================================
  currentRowIndex += 1; // Spasi 1 baris

  const summaryHeaderRow = worksheet.getRow(currentRowIndex);
  summaryHeaderRow.height = 22;
  worksheet.mergeCells(`A${currentRowIndex}:C${currentRowIndex}`);
  const sHead = summaryHeaderRow.getCell(1);
  sHead.value = 'RINGKASAN TOTAL MANIFEST';
  sHead.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  sHead.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' },
  };
  sHead.alignment = { vertical: 'middle', horizontal: 'center' };

  currentRowIndex += 1;

  // Dewasa
  const rDewasa = worksheet.getRow(currentRowIndex);
  rDewasa.height = 20;
  worksheet.mergeCells(`A${currentRowIndex}:B${currentRowIndex}`);
  rDewasa.getCell(1).value = 'Total Penumpang Dewasa';
  rDewasa.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
  rDewasa.getCell(3).value = `${totalDewasaCount} Orang`;
  rDewasa.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
  rDewasa.getCell(3).alignment = { horizontal: 'right' };
  rDewasa.getCell(1).border = cellBorderThin;
  rDewasa.getCell(2).border = cellBorderThin;
  rDewasa.getCell(3).border = cellBorderThin;

  currentRowIndex += 1;

  // Anak
  const rAnak = worksheet.getRow(currentRowIndex);
  rAnak.height = 20;
  worksheet.mergeCells(`A${currentRowIndex}:B${currentRowIndex}`);
  rAnak.getCell(1).value = 'Total Penumpang Anak';
  rAnak.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
  rAnak.getCell(3).value = `${totalAnakCount} Orang`;
  rAnak.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
  rAnak.getCell(3).alignment = { horizontal: 'right' };
  rAnak.getCell(1).border = cellBorderThin;
  rAnak.getCell(2).border = cellBorderThin;
  rAnak.getCell(3).border = cellBorderThin;

  currentRowIndex += 1;

  // Total Seluruhnya
  const rTotal = worksheet.getRow(currentRowIndex);
  rTotal.height = 22;
  worksheet.mergeCells(`A${currentRowIndex}:B${currentRowIndex}`);
  rTotal.getCell(1).value = 'TOTAL KESELURUHAN';
  rTotal.getCell(1).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0369A1' } };
  rTotal.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' },
  };
  rTotal.getCell(3).value = `${totalDewasaCount + totalAnakCount} Orang`;
  rTotal.getCell(3).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0369A1' } };
  rTotal.getCell(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2FE' },
  };
  rTotal.getCell(3).alignment = { horizontal: 'right' };
  rTotal.getCell(1).border = cellBorderThin;
  rTotal.getCell(2).border = cellBorderThin;
  rTotal.getCell(3).border = cellBorderThin;

  // Generate binary buffer dan picu unduhan di browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanKapalName = String(namaKapal).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `MANIFEST_${cleanKapalName}_${noClearance}_${new Date().toISOString().split('T')[0]}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return {
    success: true,
    fileName,
    totalDewasa: totalDewasaCount,
    totalAnak: totalAnakCount,
    totalKeseluruhan: totalDewasaCount + totalAnakCount,
  };
}
