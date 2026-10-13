import os
import sys
import shutil
import time
import argparse
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ==============================================================================
# KONFIGURASI PATH DEFAULT & THREADING
# ==============================================================================
DEFAULT_SOURCE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_NAS_TARGET = r"\\10.10.20.20\docker\clearance"
DEFAULT_LOCAL_TARGET = r"D:\Magang"
CHECK_INTERVAL = 5 
NUM_THREADS = 16

IGNORE_DIRS = {
    'node_modules',
    '.git',
    'dist',
    'dist-ssr',
    '.vite',
    '.vscode',
    '.idea',
    '__pycache__'
}
lock = threading.Lock()


def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with lock:
        print(f"[{timestamp}] {msg}")


def clean_path(path_str):
    """Membersihkan tanda kutip yang ikut ter-paste saat drag & drop folder."""
    if not path_str:
        return ""
    return path_str.strip(' "\'')


def check_target_connection(target_dir):
    """Memeriksa apakah lokasi tujuan dapat diakses."""
    return os.path.exists(target_dir)


def count_total_files(source_dir):
    """Menghitung total file di folder lokal secara kilat."""
    total = 0
    for root, dirs, files in os.walk(source_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        total += len(files)
    return total


def copy_single_file_job(args_tuple):
    """Fungsi worker paralel untuk menyalin 1 file."""
    src_file, dest_file, file_name, delete_after_copy = args_tuple

    try:
        should_copy = False
        if not os.path.exists(dest_file):
            should_copy = True
        else:
            src_mtime = os.path.getmtime(src_file)
            dest_mtime = os.path.getmtime(dest_file)
            src_size = os.path.getsize(src_file)
            dest_size = os.path.getsize(dest_file)

            if src_mtime > dest_mtime or src_size != dest_size:
                should_copy = True

        if should_copy:
            shutil.copy2(src_file, dest_file)
            if delete_after_copy:
                os.remove(src_file)
            return (True, file_name, None)
        else:
            return (False, file_name, None)

    except Exception as e:
        return (None, file_name, str(e))


def copy_files(source_dir, target_dir, delete_after_copy=False, include_parent_folder=True, max_workers=NUM_THREADS):
    """
    Menyalin SELURUH file dan folder dari source_dir ke target_dir (NAS / Lokal).
    Mengombinasikan Multi-Threading 16 Worker + Indikator Persentase Realtime (0% - 100%).
    """
    source_dir = clean_path(source_dir)
    target_dir = clean_path(target_dir)

    if not os.path.exists(source_dir):
        log(f"❌ ERROR: Folder asal '{source_dir}' tidak ditemukan!")
        return 0

    if not check_target_connection(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
        except Exception:
            log(f"❌ ERROR: Tidak dapat mengakses atau membuat lokasi tujuan di '{target_dir}'.")
            return 0

    folder_name = os.path.basename(os.path.normpath(source_dir))
    if include_parent_folder and folder_name:
        final_target_dir = os.path.join(target_dir, folder_name)
    else:
        final_target_dir = target_dir

    log(f"⚡ Menghitung total file di folder asal...")
    total_files = count_total_files(source_dir)
    log(f"📊 Total ditemukan: {total_files} file. Memulai 16 Thread Paralel ke '{final_target_dir}'...")

    if total_files == 0:
        log("⚠️ Folder kosong, tidak ada file untuk disalin.")
        return 0

    copied_count = 0
    skipped_count = 0
    failed_count = 0
    processed_count = 0

    executor = ThreadPoolExecutor(max_workers=max_workers)
    futures = []

    try:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            rel_path = os.path.relpath(root, source_dir)
            if rel_path == ".":
                dest_folder = final_target_dir
            else:
                dest_folder = os.path.join(final_target_dir, rel_path)

            if not os.path.exists(dest_folder):
                try:
                    os.makedirs(dest_folder, exist_ok=True)
                except Exception as e:
                    log(f"⚠️ Gagal membuat direktori tujuan '{dest_folder}': {e}")
                    continue

            for file_name in files:
                src_file = os.path.join(root, file_name)
                dest_file = os.path.join(dest_folder, file_name)
                
                fut = executor.submit(copy_single_file_job, (src_file, dest_file, file_name, delete_after_copy))
                futures.append(fut)

                # Jika antrean job sudah terkumpul 100, bersihkan hasil yang sudah selesai & cetak progress
                if len(futures) >= 100:
                    done_futures = []
                    for f in list(futures):
                        if f.done():
                            processed_count += 1
                            percentage = (processed_count / total_files) * 100
                            progress_prefix = f"[{percentage:5.1f}%] ({processed_count}/{total_files})"

                            is_copied, fname, err = f.result()
                            if err:
                                failed_count += 1
                                log(f"❌ {progress_prefix} Gagal: {fname} -> {err}")
                            elif is_copied:
                                copied_count += 1
                                if copied_count % 10 == 0 or copied_count <= 5:
                                    log(f"🚀 {progress_prefix} Menyalin: {fname}")
                            else:
                                skipped_count += 1
                            done_futures.append(f)
                    for f in done_futures:
                        futures.remove(f)

        # Tunggu sisa pekerjaan yang belum selesai
        for f in as_completed(futures):
            processed_count += 1
            percentage = (processed_count / total_files) * 100
            progress_prefix = f"[{percentage:5.1f}%] ({processed_count}/{total_files})"

            is_copied, fname, err = f.result()
            if err:
                failed_count += 1
                log(f"❌ {progress_prefix} Gagal: {fname} -> {err}")
            elif is_copied:
                copied_count += 1
                if copied_count % 10 == 0 or copied_count <= 5:
                    log(f"🚀 {progress_prefix} Menyalin: {fname}")
            else:
                skipped_count += 1

    finally:
        executor.shutdown(wait=True)

    log(f"🎉 Selesai 100%! Diproses: {processed_count}/{total_files} file | Baru disalin: {copied_count} | Sudah ada: {skipped_count} | Gagal: {failed_count}")
    return copied_count


def start_watcher(source_dir, target_dir, delete_after_copy=False):
    """Monitoring kontinu folder lokal dan otomatis mengirim ke lokasi tujuan."""
    source_dir = clean_path(source_dir)
    target_dir = clean_path(target_dir)

    folder_name = os.path.basename(os.path.normpath(source_dir))
    final_target = os.path.join(target_dir, folder_name)

    log("==================================================")
    log("🔄 PENGIRIM AKTIF (MODE WATCHER MULTI-THREAD)")
    log(f"📂 Folder Asal  : {source_dir}")
    log(f"🖥️ Lokasi Tujuan: {final_target}")
    log(f"⏱️ Interval Cek : {CHECK_INTERVAL} detik")
    log("Tekan Ctrl + C untuk menghentikan program.")
    log("==================================================")

    try:
        while True:
            copy_files(source_dir, target_dir, delete_after_copy, include_parent_folder=True)
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        log("🛑 Pemantauan dihentikan oleh pengguna.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script Otomatis Copy File/Folder Super Cepat (Multi-Thread)")
    parser.add_argument("--source", help="Direktori lokal asal")
    parser.add_argument("--target", help="Direktori tujuan (NAS atau Lokal)")
    parser.add_argument("--watch", action="store_true", help="Jalankan dalam mode pemantauan realtime")
    parser.add_argument("--move", action="store_true", help="Hapus file di lokal me-copy ke NAS")
    parser.add_argument("--threads", type=int, default=NUM_THREADS, help="Jumlah thread paralel (default: 16)")

    args = parser.parse_args()

    # ==================================================================
    # TAHAP 1: Tanya DULU mau upload ke mana (2 Opsi: NAS / LOKAL)
    # ==================================================================
    target_path = args.target
    if not target_path:
        print("\n==================================================================")
        print("🎯 PILIH LOKASI TUJUAN PENGIRIMAN:")
        print(f"  [1] NAS   : {DEFAULT_NAS_TARGET} (Default)")
        print(f"  [2] LOKAL : {DEFAULT_LOCAL_TARGET}")
        print("==================================================================")
        choice = input("Pilih lokasi tujuan (1 = NAS / 2 = LOKAL) [Tekan Enter untuk NAS]: ").strip()

        if choice == "2":
            target_path = DEFAULT_LOCAL_TARGET
            target_label = f"LOKAL ({DEFAULT_LOCAL_TARGET})"
        else:
            target_path = DEFAULT_NAS_TARGET
            target_label = f"NAS ({DEFAULT_NAS_TARGET})"
    else:
        target_label = target_path

    target_path = clean_path(target_path)
    print(f"\n✅ Tujuan Pengiriman -> {target_label}\n")

    # ==================================================================
    # TAHAP 2: SETELAH TUJUAN DIPILIH, BARU MINTA DRAG & DROP FOLDER ASAL
    # ==================================================================
    source_path = args.source
    if not source_path:
        print("==================================================================")
        print("📂 MASUKKAN / DRAG & DROP FOLDER ASAL")
        print("==================================================================")
        input_folder = input(f"Seret / Drag & Drop Folder Asal ke sini (Tekan Enter untuk default '{DEFAULT_SOURCE}'): ")
        input_folder = clean_path(input_folder)
        source_path = input_folder if input_folder else DEFAULT_SOURCE

    source_path = clean_path(source_path)

    if not os.path.exists(source_path):
        print(f"❌ ERROR: Folder asal '{source_path}' tidak ditemukan!")
        exit(1)

    if args.watch:
        start_watcher(source_path, target_path, args.move)
    else:
        folder_name = os.path.basename(os.path.normpath(source_path))
        log(f"▶️ Memulai proses copy folder '{folder_name}' dari '{source_path}' ke '{os.path.join(target_path, folder_name)}'...")
        copy_files(source_path, target_path, args.move, include_parent_folder=True, max_workers=args.threads)
