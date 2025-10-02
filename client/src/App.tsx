import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AuthModal } from './components/AuthModal';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'health':
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Health Module
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your fitness, nutrition, and wellness goals
            </p>
            <div className="mt-8 p-8 card max-w-md mx-auto">
              <p className="text-sm text-gray-500">Coming Soon...</p>
            </div>
          </div>
        );
      case 'wealth':
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Wealth Module
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your finances, budget, and investment goals
            </p>
            <div className="mt-8 p-8 card max-w-md mx-auto">
              <p className="text-sm text-gray-500">Coming Soon...</p>
            </div>
          </div>
        );
      case 'insurance':
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Insurance Module
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Protect your future with comprehensive coverage
            </p>
            <div className="mt-8 p-8 card max-w-md mx-auto">
              <p className="text-sm text-gray-500">Coming Soon...</p>
            </div>
          </div>
        );
      case 'community':
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Community Module
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Connect with others on similar wellness journeys
            </p>
            <div className="mt-8 p-8 card max-w-md mx-auto">
              <p className="text-sm text-gray-500">Coming Soon...</p>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Analytics Module
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize your progress and insights
            </p>
            <div className="mt-8 p-8 card max-w-md mx-auto">
              <p className="text-sm text-gray-500">Coming Soon...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Customize your WellnessHub experience
            </p>
            <div className="mt-8 p-8 card max-w-md mx-auto">
              <p className="text-sm text-gray-500">Coming Soon...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      user={user}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <AppContent />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
