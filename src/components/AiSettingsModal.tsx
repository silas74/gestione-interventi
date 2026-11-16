import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Cloud,
  Wallet,
} from 'lucide-react';
import {
  AiSettings,
  DeepSeekBalanceResponse,
  getAiSettings,
  saveAiSettings,
  fetchDeepSeekBalance,
  callAiCompletion,
} from '../lib/aiService';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: AiSettings) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen) return null;

  const initial = getAiSettings();
  const [deepseekApiKey, setDeepseekApiKey] = useState<string>(initial.deepseekApiKey);
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState<string>(
    initial.deepseekBaseUrl || 'https://api.deepseek.com'
  );
  const [deepseekModel, setDeepseekModel] = useState<string>(
    initial.deepseekModel || 'deepseek-chat'
  );

  const [showKey, setShowKey] = useState(false);
  const [deepseekBalance, setDeepseekBalance] = useState<DeepSeekBalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (deepseekApiKey.trim().length > 8) {
      handleCheckDeepSeekBalance(false);
    }
  }, []);

  const handleCheckDeepSeekBalance = async (showAlertOnError = true) => {
    if (!deepseekApiKey.trim()) {
      if (showAlertOnError) {
        setBalanceError('Inserisci prima la tua DeepSeek API Key (sk-...) per vedere la quota rimasta.');
      }
      return;
    }
    setIsLoadingBalance(true);
    setBalanceError(null);
    try {
      const bal = await fetchDeepSeekBalance(deepseekApiKey, deepseekBaseUrl);
      setDeepseekBalance(bal);
    } catch (err: any) {
      if (showAlertOnError) {
        setBalanceError(err?.message || 'Impossibile recuperare il saldo DeepSeek.');
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const buildCurrentSettings = (): AiSettings => ({
    provider: 'deepseek',
    deepseekApiKey: deepseekApiKey.trim(),
    deepseekBaseUrl: deepseekBaseUrl.trim() || 'https://api.deepseek.com',
    deepseekModel: deepseekModel.trim() || 'deepseek-chat',
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const current = buildCurrentSettings();
    saveAiSettings(current);
    try {
      const reply = await callAiCompletion(
        'You are a concise assistant.',
        'Reply with the exact phrase: OK_CONNECTED',
        0.1
      );
      handleCheckDeepSeekBalance(false);
      setTestResult({
        ok: true,
        msg: `Connessione riuscita (DeepSeek: ${deepseekModel})! Risposta: "${reply.slice(0, 60)}"`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err?.message || 'Errore durante il test di connessione DeepSeek.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = buildCurrentSettings();
    saveAiSettings(updated);
    if (onSaved) onSaved(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                🤖 Impostazioni AI — DeepSeek Cloud API
              </h3>
              <p className="text-xs text-slate-300">
                Configura la tua API Key DeepSeek e controlla la quota rimasta per report, traduzioni e verbali
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          {/* DeepSeek Configuration Panel */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-blue-500/40 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-blue-300 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span>☁️ Configurazione DeepSeek Cloud API</span>
              </span>
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline"
              >
                Ottieni API Key su platform.deepseek.com ↗
              </a>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>DeepSeek API Key (`sk-...`) *</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={deepseekApiKey}
                  onChange={(e) => setDeepseekApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                🔒 La chiave viene salvata esclusivamente nella memoria locale di questo dispositivo (`localStorage`) e non viene mai caricata su GitHub.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Modello DeepSeek
                </label>
                <select
                  value={deepseekModel}
                  onChange={(e) => setDeepseekModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="deepseek-chat">deepseek-chat (DeepSeek-V3 — Veloce, Consigliato)</option>
                  <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek-R1 — Ragionamento)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={deepseekBaseUrl}
                  onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* DeepSeek Remaining Quota / Balance Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/35 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>💰 Quota Rimasta / Credito Residuo DeepSeek</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCheckDeepSeekBalance(true)}
                  disabled={isLoadingBalance}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 text-[11px] font-bold transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                  <span>{isLoadingBalance ? 'Verifica...' : 'Aggiorna Quota Rimasta'}</span>
                </button>
              </div>

              {balanceError && (
                <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2.5 py-1.5">
                  ⚠️ {balanceError}
                </p>
              )}

              {deepseekBalance ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        deepseekBalance.is_available
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {deepseekBalance.is_available ? '🟢 Credito Attivo e Disponibile' : '🔴 Credito Esaurito'}
                    </span>
                  </div>

                  {deepseekBalance.balance_infos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {deepseekBalance.balance_infos.map((b, idx) => {
                        const totalNum = parseFloat(b.total_balance) || 0;
                        const estimatedReports = Math.floor(totalNum / 0.0005);
                        const symbol = b.currency === 'USD' ? '$' : b.currency === 'CNY' ? '¥' : b.currency;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between"
                          >
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] text-slate-400 font-semibold">
                                Saldo Totale ({b.currency}):
                              </span>
                              <span className="text-base font-extrabold text-emerald-400 font-mono">
                                {symbol} {b.total_balance} {b.currency}
                              </span>
                            </div>
                            <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Ricaricato: {symbol}{b.topped_up_balance}</span>
                              <span>Bonus: {symbol}{b.granted_balance}</span>
                            </div>
                            {totalNum > 0 && (
                              <div className="mt-1 text-[10px] text-blue-300 font-semibold">
                                📊 Autonomia stimata: ~{estimatedReports.toLocaleString('it-IT')} report cantiere
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">Nessun dettaglio valuta restituito dall'API.</p>
                  )}
                </div>
              ) : (
                !balanceError && (
                  <p className="text-[11px] text-slate-400">
                    Inserisci la tua API Key DeepSeek e clicca su <strong>"Aggiorna Quota Rimasta"</strong> per vedere il saldo disponibile e il numero stimato di report generabili.
                  </p>
                )
              )}
            </div>
          </div>

          {/* Test Connection Result */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.ok
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.msg}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Test in corso...' : '🔍 Testa Connessione DeepSeek'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva Impostazioni AI</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
