import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './context/WalletContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import InstitutePage from './pages/InstitutePage';
import StudentPage from './pages/StudentPage';
import RecruiterPage from './pages/RecruiterPage';
import AppLabPage from './pages/AppLabPage';
import FundingPage from './pages/FundingPage';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1728',
              color: '#f5f3ff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9rem',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#1a1728' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#1a1728' },
            },
          }}
        />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/institute" element={<InstitutePage />} />
            <Route path="/student" element={<StudentPage />} />
            <Route path="/recruiter" element={<RecruiterPage />} />
            <Route path="/verify" element={<RecruiterPage />} />
            <Route path="/app-lab" element={<AppLabPage />} />
            <Route path="/funding" element={<FundingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WalletProvider>
  );
}
