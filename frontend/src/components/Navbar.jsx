import React, { useState } from 'react';
import { Sun, Moon, User, Menu, X, LogOut, LayoutDashboard, MessageSquare, BookOpen, History, Settings } from 'lucide-react';

export default function Navbar({ user, darkMode, toggleDarkMode, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 w-full flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      {/* Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <h2 className="hidden md:block text-lg font-bold text-slate-800 dark:text-white capitalize">
          UT Academic Assistant AI
        </h2>
        <span className="md:hidden text-sm font-extrabold text-blue-600 dark:text-blue-400">
          UT AI Bot
        </span>
      </div>

      {/* Control Right */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Switcher */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Ganti Tema"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {user?.nama || 'Administrator'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              NIM: {user?.nim || '-'}
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Only visible on Mobile view) */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl flex flex-col p-4 space-y-2 md:hidden">
          <button 
            onClick={() => { window.location.reload(); }} 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </header>
  );
}
