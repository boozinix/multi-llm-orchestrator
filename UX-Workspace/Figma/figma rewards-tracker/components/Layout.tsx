import { Outlet, useLocation, Link } from 'react-router';
import { Home, Plus, Settings as SettingsIcon, Database } from 'lucide-react';
import { useEffect } from 'react';
import { initializeMockData } from '../utils/storage';

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    initializeMockData();
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/add-card', icon: Plus, label: 'Add Card' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  // Only show admin link on desktop
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Rewards Tracker</h1>
        {/* Desktop-only admin link */}
        <div className="hidden md:block">
          <Link 
            to="/admin" 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isAdminPage ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Database className="size-4" />
            <span className="text-sm">Admin</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-4">
        <Outlet />
      </main>

      {/* Bottom navigation - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden shadow-lg">
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'text-sky-600 scale-105' : 'text-gray-500'
                }`}
              >
                <Icon className="size-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}