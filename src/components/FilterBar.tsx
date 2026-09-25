import React from 'react';
import { Search, ShieldAlert } from 'lucide-react';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onlyUrgent: boolean;
  onToggleUrgent: () => void;
  pendingCount?: number;
  completedCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onlyUrgent,
  onToggleUrgent,
  pendingCount = 0,
  completedCount = 0
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 mb-6 bg-slate-900/60 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
      
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by code, client, facility, description or task..."
          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs (All / To Do in Red / Completed in Green) & Urgent Toggle */}
      <div className="flex items-center justify-between sm:justify-start gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          
          {/* All */}
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>

          {/* 🔴 TO DO (Red) */}
          <button
            onClick={() => onStatusFilterChange('da_fare')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'da_fare'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>To Do</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50">
              {pendingCount}
            </span>
          </button>

          {/* 🟢 COMPLETED (Green) */}
          <button
            onClick={() => onStatusFilterChange('fatti')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'fatti'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Completed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
              {completedCount}
            </span>
          </button>

        </div>

        {/* Toggle urgent */}
        <button
          onClick={onToggleUrgent}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
            onlyUrgent
              ? 'animate-flash-urgent shadow-lg'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="text-[11px] sm:text-xs">Urgent Only</span>
        </button>
      </div>

    </div>
  );
};
