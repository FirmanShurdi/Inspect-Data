import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import axiosInstance from './api/axiosInstance';
import LoginPage from './pages/auth/login';
import AppLayout from './component/layout/AppLayout';
import Dashboard from './pages/dashboard/dashboard';
import MobileInspection from './pages/inspeksi/MobileInspection';
import UserManagement from './pages/users/UserManagement';
import KapalMaster from './pages/master/KapalMaster';

import Manifest from './pages/dashboard/manifest';
import FormManifest from './pages/dashboard/formManifest';
import DetailManifest from './pages/dashboard/detailmanifest';
import VerifikasiPenumpang from './pages/dashboard/VerifikasiPenumpang';
import NahkodaMaster from './pages/master/NahkodaMaster';
import PelabuhanMaster from './pages/master/PelabuhanMaster';
import SpbAsalMaster from './pages/master/SpbAsalMaster';
import DaerahMaster from './pages/master/DaerahMaster';
import LogAktivitas from './pages/log/LogAktivitas';

// React Error Boundary to catch render errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-md w-full">
            <h1 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan Tampilan</h1>
            <p className="text-xs text-slate-500 mb-4">{this.state.error?.message || 'Aplikasi membutuhkan muat ulang.'}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2.5 px-6 rounded-xl bg-[#0284C7] text-white text-xs font-bold shadow-md hover:bg-[#0369A1] transition-all"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected Route for authenticated session access
const ProtectedRoute = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

function App() {
  React.useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          sessionStorage.removeItem('token');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/inspeksi" element={<MobileInspection />} />
              <Route path="/manifest" element={<Manifest />} />
              <Route path="/manifest/tambah" element={<FormManifest />} />
              <Route path="/manifest/edit/:id" element={<FormManifest />} />
              <Route path="/manifest/detail/:id" element={<DetailManifest />} />
              <Route path="/manifest/verifikasi/:id" element={<VerifikasiPenumpang />} />
              <Route path="/nahkoda" element={<NahkodaMaster />} />
              <Route path="/master/nahkoda" element={<NahkodaMaster />} />
              <Route path="/pelabuhan" element={<PelabuhanMaster />} />
              <Route path="/master/pelabuhan" element={<PelabuhanMaster />} />
              <Route path="/spb-asal" element={<SpbAsalMaster />} />
              <Route path="/master/spb-asal" element={<SpbAsalMaster />} />
              <Route path="/daerah" element={<DaerahMaster />} />
              <Route path="/master/daerah" element={<DaerahMaster />} />
              <Route path="/negara" element={<DaerahMaster />} />
              <Route path="/provinsi" element={<DaerahMaster />} />
              <Route path="/kabupaten" element={<DaerahMaster />} />
              <Route path="/kecamatan" element={<DaerahMaster />} />
              <Route path="/log-aktivitas" element={<LogAktivitas />} />
              <Route path="/master/log-aktivitas" element={<LogAktivitas />} />
              <Route path="/master/:type" element={<KapalMaster />} />
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
                <h1 className="text-4xl font-bold text-[#0284C7]">404</h1>
                <p className="text-lg text-gray-600 mt-2">Halaman Tidak Ditemukan</p>
              </div>
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
