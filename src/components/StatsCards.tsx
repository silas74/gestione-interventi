import React, { useMemo } from 'react';
import { Clock, CheckCircle2, AlertCircle, Wrench, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { InterventionRequest } from '../types';

interface StatsCardsProps {
  interventions: InterventionRequest[];
}

interface MetricComparison {
  current: number;
  diff: number;
  label: string;
}

export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ interventions }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    let pending = 0;
    let inProg = 0;
    let done = 0;
    let hours = 0;

    let curTotal = 0;
    let prevTotal = 0;
    let curPending = 0;
    let prevPending = 0;
    let curInProg = 0;
    let prevInProg = 0;
    let curDone = 0;
    let prevDone = 0;
    let curHours = 0;
    let prevHours = 0;

    for (let idx = 0; idx < interventions.length; idx++) {
      const i = interventions[idx];
      const st = i.status;
      const isCompleted = st === 'completed' || st === 'completato';
      const isInProgress =
        !isCompleted &&
        (st === 'in_progress' ||
          st === 'in_corso' ||
          st === 'scheduled' ||
          i.report?.statusOutcome === 'waiting_for_parts' ||
          (i.report?.statusOutcome as string) === 'in_attesa_ricambi');
      const isPending = !isCompleted && !isInProgress && (st === 'pending' || st === 'in_attesa');
      const itemHours = i.report?.hoursWorked || 0;

      if (isCompleted) done++;
      else if (isInProgress) inProg++;
      else if (isPending) pending++;
      hours += itemHours;

      const rawDate = i.report?.interventionDate || i.lastActionDate || i.desiredAccessDate || i.createdAt;
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = parsed.getMonth();
          if (y === currentYear && m === currentMonth) {
            curTotal++;
            if (isCompleted) curDone++;
            else if (isInProgress) curInProg++;
            else if (isPending) curPending++;
            curHours += itemHours;
          } else if (y === prevYear && m === prevMonth) {
            prevTotal++;
            if (isCompleted) prevDone++;
            else if (isInProgress) prevInProg++;
            else if (isPending) prevPending++;
            prevHours += itemHours;
          }
        }
      }
    }

    const formatComparison = (cur: number, prev: number, isHours = false): MetricComparison => {
      const diff = Number((cur - prev).toFixed(isHours ? 1 : 0));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      const unit = isHours ? 'h' : '';
      return {
        current: cur,
        diff,
        label: `${sign}${unit} rispetto al mese prima`,
      };
    };

    return {
      total: interventions.length,
      inAttesa: pending,
      inCorso: inProg,
      completati: done,
      totalHours: hours,
      totalComp: formatComparison(curTotal, prevTotal),
      pendingComp: formatComparison(curPending, prevPending),
      inProgComp: formatComparison(curInProg, prevInProg),
      doneComp: formatComparison(curDone, prevDone),
      hoursComp: formatComparison(curHours, prevHours, true),
    };
  }, [interventions]);

  const renderTrendIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />;
    if (diff < 0) return <TrendingDown className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />;
    return <Minus className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.75} />;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {/* Totale interventi */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-normal text-zinc-400">Totale interventi</span>
          <FileText className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
        </div>
        <div className="mt-2 font-mono imp-tabular text-2xl font-semibold text-zinc-100">
          {stats.total}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-normal text-zinc-400">
          {renderTrendIcon(stats.totalComp.diff)}
          <span>{stats.totalComp.label}</span>
        </div>
      </div>

      {/* Da fare */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-normal text-zinc-400">Da fare</span>
          <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
        </div>
        <div className="mt-2 font-mono imp-tabular text-2xl font-semibold text-zinc-100">
          {stats.inAttesa}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-normal text-zinc-400">
          {renderTrendIcon(stats.pendingComp.diff)}
          <span>{stats.pendingComp.label}</span>
        </div>
      </div>

      {/* In lavorazione */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-normal text-zinc-400">In lavorazione</span>
          <Wrench className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
        </div>
        <div className="mt-2 font-mono imp-tabular text-2xl font-semibold text-zinc-100">
          {stats.inCorso}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-normal text-zinc-400">
          {renderTrendIcon(stats.inProgComp.diff)}
          <span>{stats.inProgComp.label}</span>
        </div>
      </div>

      {/* Completati */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-normal text-zinc-400">Completati</span>
          <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
        </div>
        <div className="mt-2 font-mono imp-tabular text-2xl font-semibold text-zinc-100">
          {stats.completati}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-normal text-zinc-400">
          {renderTrendIcon(stats.doneComp.diff)}
          <span>{stats.doneComp.label}</span>
        </div>
      </div>

      {/* Ore lavorate */}
      <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-normal text-zinc-400">Ore registrate</span>
          <Clock className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
        </div>
        <div className="mt-2 font-mono imp-tabular text-2xl font-semibold text-zinc-100">
          {stats.totalHours.toFixed(1)}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-normal text-zinc-400">
          {renderTrendIcon(stats.hoursComp.diff)}
          <span>{stats.hoursComp.label}</span>
        </div>
      </div>
    </div>
  );
});
