import React from 'react';
import { Search, ShieldAlert, Hourglass, CircleDot, Clock, CheckCircle2, Layers } from 'lucide-react';
import { RecordCategory } from '../types';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onlyUrgent: boolean;
  onToggleUrgent: () => void;
  pendingCount?: number;
  inProgressCount?: number;
  completedCount?: number;
  waitingReplyCount?: number;
  activeCategoryTab?: RecordCategory;
}

export const FilterBar: React.FC<FilterBarProps> = React.memo(({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onlyUrgent,
  onToggleUrgent,
  pendingCount = 0,
  inProgressCount = 0,
  completedCount = 0,
  waitingReplyCount = 0,
  activeCategoryTab = 'project_work',
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca per codice, cliente, impianto, descrizione o attività..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm font-normal text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-normal text-zinc-400 hover:text-zinc-100"
          >
            Cancella
          </button>
        )}
      </div>

      {/* Filter Tabs & Urgent Toggle */}
      <div className="flex items-center justify-between sm:justify-start gap-2 overflow-x-auto scrollbar-none">
        <div className="flex bg-zinc-950 p-2 rounded-lg border border-zinc-800 shrink-0 gap-2">
          {/* Tutti */}
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 font-normal'
            }`}
          >
            <Layers className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>Tutti</span>
          </button>

          {/* Da fare */}
          <button
            onClick={() => onStatusFilterChange('da_fare')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition ${
              statusFilter === 'da_fare'
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 font-normal'
            }`}
          >
            <CircleDot className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>Da fare</span>
            <span className="font-mono imp-tabular text-xs font-semibold text-zinc-300">
              {pendingCount}
            </span>
          </button>

          {/* In lavorazione */}
          <button
            onClick={() => onStatusFilterChange('in_lavorazione')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition ${
              statusFilter === 'in_lavorazione'
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 font-normal'
            }`}
            title={
              activeCategoryTab === 'project_work'
                ? 'Filtra lavori in corso'
                : 'Filtra interventi in corso o in attesa ricambi'
            }
          >
            <Clock className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>{activeCategoryTab === 'project_work' ? 'In corso' : 'In lavorazione'}</span>
            <span className="font-mono imp-tabular text-xs font-semibold text-zinc-300">
              {inProgressCount}
            </span>
          </button>

          {/* Completati */}
          <button
            onClick={() => onStatusFilterChange('fatti')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition ${
              statusFilter === 'fatti'
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 font-normal'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>Completati</span>
            <span className="font-mono imp-tabular text-xs font-semibold text-zinc-300">
              {completedCount}
            </span>
          </button>

          {/* Attesa risposta */}
          <button
            onClick={() => onStatusFilterChange('attesa_risposta')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition ${
              statusFilter === 'attesa_risposta'
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 font-normal'
            }`}
            title="Filtra i lavori o interventi in cui si attende risposta"
          >
            <Hourglass className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span>Attesa risposta</span>
            <span className="font-mono imp-tabular text-xs font-semibold text-zinc-300">
              {waitingReplyCount}
            </span>
          </button>
        </div>

        {/* Toggle urgent */}
        <button
          onClick={onToggleUrgent}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs border transition shrink-0 ${
            onlyUrgent
              ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 font-normal'
          }`}
        >
          <ShieldAlert className="w-4 h-4" strokeWidth={1.75} />
          <span>Solo urgenti</span>
        </button>
      </div>
    </div>
  );
});
