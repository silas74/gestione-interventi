import React, { useMemo } from 'react';
import { Clock, CheckCircle2, AlertCircle, Wrench, FileText } from 'lucide-react';
import { InterventionRequest } from '../types';

interface StatsCardsProps {
  interventions: InterventionRequest[];
}

export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ interventions }) => {
  const { total, inAttesa, inCorso, completati, totalHours } = useMemo(() => {
    let pending = 0;
    let inProg = 0;
    let done = 0;
    let hours = 0;

    for (let idx = 0; idx < interventions.length; idx++) {
      const i = interventions[idx];
      const st = i.status;
      if (st === 'completed' || st === 'completato') {
        done++;
      } else if (
        st === 'in_progress' ||
        st === 'in_corso' ||
        st === 'scheduled' ||
        i.report?.statusOutcome === 'waiting_for_parts' ||
        (i.report?.statusOutcome as string) === 'in_attesa_ricambi'
      ) {
        inProg++;
      } else if (st === 'pending' || st === 'in_attesa') {
        pending++;
      }
      hours += i.report?.hoursWorked || 0;
    }

    return {
      total: interventions.length,
      inAttesa: pending,
      inCorso: inProg,
      completati: done,
      totalHours: hours,
    };
  }, [interventions]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5 mb-6">
      
      {/* Total */}
      <div className="liquid-glass rounded-xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-slate-300">Total Tickets</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-white/10 text-slate-200 border border-white/15">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 font-mono imp-tabular text-xl sm:text-2xl font-bold text-white">{total}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">All in system</p>
      </div>

      {/* To Do / Pending */}
      <div className="liquid-glass border-rose-500/35 rounded-xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-rose-300">To Do</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 font-mono imp-tabular text-xl sm:text-2xl font-bold text-rose-400">{inAttesa}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Pending dispatch</p>
      </div>

      {/* In Progress */}
      <div className="liquid-glass border-blue-500/35 rounded-xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-blue-300">In Progress</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 font-mono imp-tabular text-xl sm:text-2xl font-bold text-blue-400">{inCorso}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Active on-site</p>
      </div>

      {/* Completed */}
      <div className="liquid-glass border-emerald-500/35 rounded-xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-300">Completed</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 font-mono imp-tabular text-xl sm:text-2xl font-bold text-emerald-400">{completati}</div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Closed with PDF</p>
      </div>

      {/* Hours Worked */}
      <div className="col-span-2 sm:col-span-2 lg:col-span-1 liquid-glass border-blue-400/40 rounded-xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-blue-300">Hours Worked</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-600/20 text-blue-300">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1 sm:mt-2 font-mono imp-tabular text-xl sm:text-2xl font-bold text-blue-200">
          {totalHours.toFixed(1)} <span className="font-sans text-xs sm:text-sm font-normal text-blue-400">hours</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-blue-400/80 mt-0.5">Logged on-site</p>
      </div>

    </div>
  );
});
