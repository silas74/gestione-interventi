import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Wrench, FileText } from 'lucide-react';
import { InterventionRequest } from '../types';

interface StatsCardsProps {
  interventions: InterventionRequest[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ interventions }) => {
  const total = interventions.length;
  const inAttesa = interventions.filter(i => i.status === 'pending' || i.status === 'in_attesa').length;
  const inCorso = interventions.filter(i => 
    i.status === 'in_progress' || i.status === 'in_corso' || i.status === 'scheduled'
  ).length;
  const completati = interventions.filter(i => i.status === 'completed' || i.status === 'completato').length;
  
  const totalHours = interventions.reduce((acc, curr) => {
    return acc + (curr.report?.hoursWorked || 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5 mb-6">
      
      {/* Total */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-slate-400">Total Tickets</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-white">{total}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">All in system</p>
      </div>

      {/* To Do / Pending */}
      <div className="bg-slate-900 border border-rose-900/30 rounded-xl p-3 sm:p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-rose-400">To Do</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-rose-400">{inAttesa}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Pending dispatch</p>
      </div>

      {/* In Progress */}
      <div className="bg-slate-900 border border-blue-900/30 rounded-xl p-3 sm:p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-blue-400">In Progress</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-blue-400">{inCorso}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Active on-site</p>
      </div>

      {/* Completed */}
      <div className="bg-slate-900 border border-emerald-900/30 rounded-xl p-3 sm:p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">Completed</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-emerald-400">{completati}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Closed with PDF</p>
      </div>

      {/* Hours Worked */}
      <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-blue-950/40 border border-blue-900/50 rounded-xl p-3 sm:p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-blue-300">Hours Worked</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-600/20 text-blue-300">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-blue-200">
          {totalHours.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-blue-400">hours</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-blue-400/80 mt-0.5">Logged on-site</p>
      </div>

    </div>
  );
};
