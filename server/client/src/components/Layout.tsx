import React, { useState } from 'react';
import {
  Menu,
  X,
  Home,
  Heart,
  DollarSign,
  Shield,
  Users,
  BarChart3,
  Settings,
  User,
  Bell,
  Search,
  Zap,
} from 'lucide-react';
import { ThemeToggleCompact } from './ThemeToggle';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'health', label: 'Health', icon: Heart, path: '/health' },
  { id: 'wealth', label: 'Wealth', icon: DollarSign, path: '/wealth' },
  { id: 'insurance', label: 'Insurance', icon: Shield, path: '/insurance' },
  { id: 'community', label: 'Community', icon: Users, path: '/community' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
];

interface HeaderProps {
  onMenuToggle: () => void;
  currentPage: string;
  user?: User;
}

export function Header({ onMenuToggle, currentPage, user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                WellnessHub
              </h1>
            </div>
          </div>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search challenges, tips, or goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
              />
            </div>
          </div>

          {/* Right side - User info and controls */}
          <div className="flex items-center gap-3">
            {/* Points display */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg">
                <Zap size={16} className="text-primary-500" />
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {user.totalPoints.toLocaleString()} pts
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Lv. {user.level}
                </span>
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                3
              </span>
            </button>

            {/* Theme toggle */}
            <ThemeToggleCompact />

            {/* User menu */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-medium">
                    {user.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.fullName}
                    </p>
                  </div>
                </div>
              ) : (
                <button className="btn-primary btn-sm">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ isOpen, onClose, currentPage, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold">WellnessHub</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                  ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-l-4 border-primary-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              onNavigate('settings');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}

interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  level: number;
  experience: number;
  totalPoints: number;
  availablePoints: number;
  currentStreak: number;
  longestStreak: number;
}

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: User;
}

export function Layout({ children, currentPage, onNavigate, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        onMenuToggle={() => setSidebarOpen(true)}
        currentPage={currentPage}
        user={user}
      />
      
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onNavigate={onNavigate}
        />
        
        <main className="flex-1 lg:ml-0">
          <div className="container-custom section-padding">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}