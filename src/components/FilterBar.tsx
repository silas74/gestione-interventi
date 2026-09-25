import React from 'react';
import { Search, Filter, ShieldAlert } from 'lucide-react';
import { InterventionStatus, InterventionPriority } from '../types';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onlyUrgent: boolean;
  onToggleUrgent: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onlyUrgent,
  onToggleUrgent,
}) => {
  const statusOptions = [
    { id: 'all', label: 'Tutti' },
    { id: 'in_attesa', label: 'Da Pianificare' },
    { id: 'in_corso', label: 'In Corso' },
    { id: 'completato', label: 'Completati' },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
      
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca per codice, cliente, impianto, descrizione o guasto..."
          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            Cancella
          </button>
        )}
      </div>

      {/* Filter Tabs & Urgent Toggle */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onStatusFilterChange(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                statusFilter === opt.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Toggle urgent */}
        <button
          onClick={onToggleUrgent}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            onlyUrgent
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-900/20'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Solo Urgenti</span>
        </button>
      </div>

    </div>
  );
};
