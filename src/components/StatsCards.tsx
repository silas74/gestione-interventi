import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Wrench, FileText } from 'lucide-react';
import { InterventionRequest } from '../types';

interface StatsCardsProps {
  interventions: InterventionRequest[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ interventions }) => {
  const total = interventions.length;
  const inAttesa = interventions.filter(i => i.status === 'in_attesa').length;
  const inCorso = interventions.filter(i => i.status === 'in_corso' || i.status === 'programmato').length;
  const completati = interventions.filter(i => i.status === 'completato').length;
  
  const totalHours = interventions.reduce((acc, curr) => {
    return acc + (curr.report?.hoursWorked || 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      
      {/* Total */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Totale Interventi</span>
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-white">{total}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Tutti i ticket a sistema</p>
      </div>

      {/* In Attesa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-400">Da Pianificare</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-400">{inAttesa}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Richieste in attesa</p>
      </div>

      {/* In Corso */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-400">In Corso / Schedulati</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Wrench className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-400">{inCorso}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Lavori attivi sul posto</p>
      </div>

      {/* Completati */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-400">Completati con PDF</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-400">{completati}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Rapporti tecnici chiusi</p>
      </div>

      {/* Ore Lavorate */}
      <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-blue-950/40 border border-blue-900/50 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-300">Ore Lavorate Totali</span>
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-300">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-blue-200">
          {totalHours.toFixed(1)} <span className="text-sm font-normal text-blue-400">ore</span>
        </div>
        <p className="text-[11px] text-blue-400/80 mt-0.5">Tracciate da tecnici on-site</p>
      </div>

    </div>
  );
};
