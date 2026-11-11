import { Download, Moon, Sun } from 'lucide-react';
import type React from 'react';
import type { MainTab } from '../types';

interface HeaderProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isDark, setIsDark, onExport }) => {
  const navTabs: { id: MainTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'route', label: 'Food Truck Route' },
    { id: 'portal', label: 'Upload data' },
    { id: 'dictionary', label: 'Data dictionary' },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Zone 1: Brand title & Official TrackWise Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 group transition-transform hover:scale-[1.01]"
          title="TrackWise - Food Access, Made Visible"
        >
          <img
            src="/assets/aistudio/26959851-60dc-45a7-bc39-aa479279f5cd_6ffdfc91.png"
            alt="TrackWise Logo"
            className="h-8 sm:h-9 w-auto object-contain dark:bg-white/90 dark:p-1 dark:rounded-md"
          />
        </button>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsDark(!isDark)}
          aria-label="Toggle theme"
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#a50f15] hover:bg-[#880d12] rounded-md transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>
    </header>
  );
};
