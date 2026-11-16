import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileDown,
  Globe,
  RefreshCw,
  FileCheck2,
  Settings,
} from 'lucide-react';
import { DailySiteReport, InterventionRequest, PdfLanguage } from '../types';
import { generateFinalCommissioningCertificateWithAi, getAiSettings } from '../lib/aiService';
import { downloadFinalCommissioningCertificatePDF } from '../lib/pdfGenerator';
import { SignaturePad } from './SignaturePad';

interface CommissioningHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  dailyReports: DailySiteReport[];
  projectTasks: InterventionRequest[];
  currentUserName: string;
  onOpenAiSettings: () => void;
}

export const CommissioningHandoverModal: React.FC<CommissioningHandoverModalProps> = ({
  isOpen,
  onClose,
  projectName,
  dailyReports,
  projectTasks,
  currentUserName,
  onOpenAiSettings,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [lang, setLang] = useState<PdfLanguage>('it');
  const [date, setDate] = useState<string>(todayStr);
  const [technicianName, setTechnicianName] = useState<string>(currentUserName || 'Pierluigi');
  const [clientSignerName, setClientSignerName] = useState<string>('');
  const [technicianSignature, setTechnicianSignature] = useState<string>('');
  const [clientSignature, setClientSignature] = useState<string>('');

  const buildDefaultTemplate = (l: PdfLanguage) => {
    const isEn = l === 'en';
    const totalDays = dailyReports.length;
    const totalHours = dailyReports.reduce((acc, r) => acc + (Number(r.hoursWorked) || 0), 0);

    const systemsList = projectTasks
      .map((t) => {
        const steps = t.actionSteps || [];
        const done = steps.filter((s) => s.completed).length;
        return `• [${t.code}] ${t.title} (${done}/${steps.length} steps)`;
      })
      .join('\n');

    const completedStepsList = projectTasks
      .flatMap((t) =>
        (t.actionSteps || [])
          .filter((s) => s.completed)
          .map((s) => `• [${t.code}] ${s.text}`)
      )
      .join('\n');

    const pendingStepsList = projectTasks
      .flatMap((t) =>
        (t.actionSteps || [])
          .filter((s) => !s.completed)
          .map((s) => `• [${t.code}] ${s.text}`)
      )
      .join('\n');

    if (isEn) {
      return {
        title: `OFFICIAL COMMISSIONING & HANDOVER CERTIFICATE — ${projectName.toUpperCase()}`,
        executiveSummary: `On-site technical configuration, testing, and commissioning performed at ${projectName} across ${totalDays} working days (${totalHours.toFixed(1)} total engineering hours).`,
        systemsCommissioned: systemsList || `• CCTV System (57 Cameras, 4 Switches, 4 NVR RAID, VMS & SmartWall)\n• Solar System (2x Sungrow SH125CX 250kW + 2x 50kWh Battery Packs)\n• Parking System (2x LPR Cameras, Modbus Controller & 4 Barriers)`,
        testsAndVerifications:
          completedStepsList ||
          dailyReports.map((r) => `• [${r.date}] ${r.workDone}`).join('\n') ||
          '• Preliminary verification, network/IP configuration, functional tests, and stability checks.',
        openPunchListOrNotes:
          pendingStepsList || 'All scheduled tests completed according to specification.',
        handoverConclusion: `The systems listed above have been inspected, tested, and verified on site. This document certifies the technical commissioning and formal handover to ${projectName}.`,
      };
    }

    return {
      title: `VERBALE UFFICIALE DI COLLAUDO E CONSEGNA IMPIANTI — ${projectName.toUpperCase()}`,
      executiveSummary: `Attività di installazione, configurazione, messa in servizio e collaudo tecnico eseguite presso il cantiere ${projectName} per un totale di ${totalDays} giornate lavorative (${totalHours.toFixed(1)} ore tecniche complessive).`,
      systemsCommissioned:
        systemsList ||
        `• Impianto CCTV (57 Telecamere, 4 Switch, 4 NVR RAID, VMS, AcuSeek & SmartWall 8 Monitor)\n• Solar System (2x Inverter Sungrow SH125CX 250 kW + 2x Batterie 50 kWh = 100 kWh)\n• Parking System (2x Telecamere LPR, Controller Modbus, 4 Barriere & VMS Guardiola)`,
      testsAndVerifications:
        completedStepsList ||
        dailyReports.map((r) => `• [${r.date}] ${r.workDone}`).join('\n') ||
        '• Verifiche preliminari, configurazione apparati, prove funzionali diurne/notturne e test sotto carico.',
      openPunchListOrNotes:
        pendingStepsList || 'Tutte le verifiche programmate risultano regolarmente eseguite.',
      handoverConclusion: `Con il presente verbale si attesta il regolare svolgimento delle prove di collaudo e la consegna formale degli impianti sopra descritti al referente di ${projectName}.`,
    };
  };

  const initialTpl = buildDefaultTemplate('it');
  const [title, setTitle] = useState<string>(initialTpl.title);
  const [executiveSummary, setExecutiveSummary] = useState<string>(initialTpl.executiveSummary);
  const [systemsCommissioned, setSystemsCommissioned] = useState<string>(initialTpl.systemsCommissioned);
  const [testsAndVerifications, setTestsAndVerifications] = useState<string>(initialTpl.testsAndVerifications);
  const [openPunchListOrNotes, setOpenPunchListOrNotes] = useState<string>(initialTpl.openPunchListOrNotes);
  const [handoverConclusion, setHandoverConclusion] = useState<string>(initialTpl.handoverConclusion);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSwitchLang = (nextLang: PdfLanguage) => {
    setLang(nextLang);
    const tpl = buildDefaultTemplate(nextLang);
    setTitle(tpl.title);
    setExecutiveSummary(tpl.executiveSummary);
    setSystemsCommissioned(tpl.systemsCommissioned);
    setTestsAndVerifications(tpl.testsAndVerifications);
    setOpenPunchListOrNotes(tpl.openPunchListOrNotes);
    setHandoverConclusion(tpl.handoverConclusion);
  };

  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const result = await generateFinalCommissioningCertificateWithAi({
        projectName,
        dailyReports,
        projectTasks,
        targetLang: lang,
      });
      if (result.title) setTitle(result.title);
      if (result.executiveSummary) setExecutiveSummary(result.executiveSummary);
      if (result.systemsCommissioned) setSystemsCommissioned(result.systemsCommissioned);
      if (result.testsAndVerifications) setTestsAndVerifications(result.testsAndVerifications);
      if (result.openPunchListOrNotes) setOpenPunchListOrNotes(result.openPunchListOrNotes);
      if (result.handoverConclusion) setHandoverConclusion(result.handoverConclusion);
    } catch (err: any) {
      setAiError(err?.message || 'Errore durante la generazione AI del verbale.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const aiSettings = getAiSettings();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-950 gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                📜 Verbale Finale di Collaudo e Consegna Impianti — {projectName}
              </h3>
              <p className="text-xs text-slate-300">
                Genera il documento ufficiale di fine collaudo dai tuoi report giornalieri e dalle checklist ({aiSettings.provider === 'deepseek' ? 'DeepSeek AI' : `Ollama: ${aiSettings.ollamaModel}`})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1" />
              <button
                type="button"
                onClick={() => handleSwitchLang('it')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  lang === 'it' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇮🇹 IT
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLang('en')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  lang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {/* AI Generation Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/70 via-violet-950/50 to-slate-900 border border-indigo-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-indigo-100">
              <strong className="text-yellow-300">✨ Redazione Automatica con AI:</strong> legge le{' '}
              <strong>{dailyReports.length} giornate registrate</strong> e le{' '}
              <strong>{projectTasks.length} schede impianti</strong> di {projectName} per compilare il Verbale di Collaudo in{' '}
              <strong>{lang === 'en' ? 'Inglese' : 'Italiano'}</strong>.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenAiSettings}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                title="Configura DeepSeek API o Ollama Locale"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Config AI</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-extrabold shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                )}
                <span>
                  {isGeneratingAi
                    ? 'Generazione Verbale con AI...'
                    : `✨ Genera Verbale con AI (${lang.toUpperCase()})`}
                </span>
              </button>
            </div>
          </div>

          {aiError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-200 flex items-center justify-between gap-2">
              <span>{aiError}</span>
              <button
                type="button"
                onClick={onOpenAiSettings}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold shrink-0"
              >
                Apri Impostazioni AI
              </button>
            </div>
          )}

          {/* Meta fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Data Verbale</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tecnico Collaudatore</label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Referente Cliente / Cantiere</label>
              <input
                type="text"
                value={clientSignerName}
                onChange={(e) => setClientSignerName(e.target.value)}
                placeholder="Es. Awash Bank Representative / Dodic..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-yellow-300 mb-1">Titolo Documento</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              1. Sintesi Esecutiva (Executive Summary)
            </label>
            <textarea
              rows={2}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              2. Impianti e Apparecchiature Collaudate (Systems Commissioned)
            </label>
            <textarea
              rows={4}
              value={systemsCommissioned}
              onChange={(e) => setSystemsCommissioned(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              3. Prove Funzionali e Verifiche Eseguite (Tests & Verifications)
            </label>
            <textarea
              rows={5}
              value={testsAndVerifications}
              onChange={(e) => setTestsAndVerifications(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              4. Prescrizioni / Punti Aperti (Punch List & Recommendations)
            </label>
            <textarea
              rows={2}
              value={openPunchListOrNotes}
              onChange={(e) => setOpenPunchListOrNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-300 mb-1">
              5. Formula di Consegna e Accettazione (Handover Statement)
            </label>
            <textarea
              rows={2}
              value={handoverConclusion}
              onChange={(e) => setHandoverConclusion(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white leading-relaxed"
            />
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <SignaturePad
              label="Firma Tecnico Collaudatore"
              initialSignature={technicianSignature}
              onChange={setTechnicianSignature}
            />
            <SignaturePad
              label="Firma Accettazione Cliente"
              initialSignature={clientSignature}
              onChange={setClientSignature}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
          >
            Chiudi
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFinalCommissioningCertificatePDF({
                projectName,
                date,
                technicianName,
                clientSignerName,
                title,
                executiveSummary,
                systemsCommissioned,
                testsAndVerifications,
                openPunchListOrNotes,
                handoverConclusion,
                technicianSignature: technicianSignature || undefined,
                clientSignature: clientSignature || undefined,
                lang,
              })
            }
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg transition active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>📜 Scarica PDF Verbale di Collaudo ({lang.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
