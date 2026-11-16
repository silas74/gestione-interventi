import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  Key,
  Server,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Cpu,
  Cloud,
} from 'lucide-react';
import {
  AiSettings,
  AiProvider,
  getAiSettings,
  saveAiSettings,
  fetchLocalOllamaModels,
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
  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [deepseekApiKey, setDeepseekApiKey] = useState<string>(initial.deepseekApiKey);
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState<string>(
    initial.deepseekBaseUrl || 'https://api.deepseek.com'
  );
  const [deepseekModel, setDeepseekModel] = useState<string>(
    initial.deepseekModel || 'deepseek-chat'
  );
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>(
    initial.ollamaBaseUrl || 'http://127.0.0.1:11434'
  );
  const [ollamaModel, setOllamaModel] = useState<string>(
    initial.ollamaModel === 'llama3.2' ? 'qwen2.5:1.5b' : initial.ollamaModel || 'qwen2.5:1.5b'
  );

  const [showKey, setShowKey] = useState(false);
  const [detectedOllamaModels, setDetectedOllamaModels] = useState<string[]>([]);
  const [isDetectingOllama, setIsDetectingOllama] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (provider === 'ollama') {
      handleDetectOllamaModels(false);
    }
  }, [provider]);

  const handleDetectOllamaModels = async (showAlertOnError = true) => {
    setIsDetectingOllama(true);
    setTestResult(null);
    try {
      const models = await fetchLocalOllamaModels(ollamaBaseUrl);
      setDetectedOllamaModels(models);
      if (models.length > 0 && !models.includes(ollamaModel)) {
        setOllamaModel(models[0]);
      }
      if (models.length > 0) {
        setTestResult({
          ok: true,
          msg: `Trovati ${models.length} modelli Ollama sul PC: ${models.join(', ')}`,
        });
      } else if (showAlertOnError) {
        setTestResult({
          ok: false,
          msg: 'Connesso a Ollama, ma nessun modello trovato (esegui "ollama pull llama3.2" nel terminale).',
        });
      }
    } catch (err: any) {
      if (showAlertOnError) {
        setTestResult({
          ok: false,
          msg:
            err?.message ||
            'Impossibile connettersi a Ollama su localhost:11434. Assicurati che Ollama sia avviato sul PC.',
        });
      }
    } finally {
      setIsDetectingOllama(false);
    }
  };

  const buildCurrentSettings = (): AiSettings => ({
    provider,
    deepseekApiKey: deepseekApiKey.trim(),
    deepseekBaseUrl: deepseekBaseUrl.trim() || 'https://api.deepseek.com',
    deepseekModel: deepseekModel.trim() || 'deepseek-chat',
    ollamaBaseUrl: ollamaBaseUrl.trim() || 'http://localhost:11434',
    ollamaModel: ollamaModel.trim() || 'llama3.2',
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
      setTestResult({
        ok: true,
        msg: `Connessione riuscita (${
          provider === 'deepseek' ? `DeepSeek: ${deepseekModel}` : `Ollama: ${ollamaModel}`
        })! Risposta: "${reply.slice(0, 60)}"`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err?.message || 'Errore durante il test di connessione.',
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
                🤖 Impostazioni AI (DeepSeek API & Ollama Locale)
              </h3>
              <p className="text-xs text-slate-300">
                Configura il motore AI per formattare i report, tradurre in Inglese e generare i Verbali di Collaudo
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
          {/* Provider Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Seleziona Motore AI da utilizzare:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setProvider('deepseek');
                  setTestResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  provider === 'deepseek'
                    ? 'bg-blue-600/25 border-blue-400 text-white shadow-md shadow-blue-950/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cloud className={`w-5 h-5 shrink-0 mt-0.5 ${provider === 'deepseek' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-extrabold">☁️ DeepSeek Cloud API</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Ideale su smartphone e PC ovunque (DeepSeek-V3 / R1)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider('ollama');
                  setTestResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  provider === 'ollama'
                    ? 'bg-emerald-600/25 border-emerald-400 text-white shadow-md shadow-emerald-950/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className={`w-5 h-5 shrink-0 mt-0.5 ${provider === 'ollama' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-extrabold">💻 Ollama Locale sul PC</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    100% Gratuito e Offline usando i modelli installati sul tuo computer
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* DeepSeek Configuration Panel */}
          {provider === 'deepseek' && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-blue-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>Configurazione DeepSeek API</span>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  DeepSeek API Key (`sk-...`) *
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
            </div>
          )}

          {/* Local Ollama Configuration Panel */}
          {provider === 'ollama' && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Configurazione Ollama Locale (sul tuo PC)</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDetectOllamaModels(true)}
                  disabled={isDetectingOllama}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDetectingOllama ? 'animate-spin' : ''}`} />
                  <span>Rileva Modelli dal PC</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <label className="block text-xs font-bold text-slate-300">
                    Indirizzo Server Locale (Ollama / llama.cpp)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOllamaBaseUrl('http://127.0.0.1:11434');
                        setTestResult(null);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                        ollamaBaseUrl.includes('11434')
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      🦙 Ollama (127.0.0.1:11434)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOllamaBaseUrl('http://127.0.0.1:8080');
                        setTestResult(null);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                        ollamaBaseUrl.includes('8080')
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      ⚡ llama.cpp (127.0.0.1:8080)
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Modello Locale da usare
                </label>
                {detectedOllamaModels.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-bold text-yellow-300 focus:outline-none"
                    >
                      {detectedOllamaModels.map((m) => (
                        <option key={m} value={m}>
                          {m} (Installato sul PC)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="Es. qwen2.5:1.5b, minicpm-v4.5:latest..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                )}

                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-400">Scelta rapida modelli sul tuo PC:</span>
                  {['qwen2.5:1.5b', 'minicpm-v4.5:latest', 'minicpm-v4.6:q4_1'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOllamaModel(m)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition ${
                        ollamaModel === m
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-emerald-300/90 mt-2">
                  ✅ Bridge CORS locale attivo in background (`127.0.0.1:11436` / `8082`) per permettere la connessione diretta dal browser a Ollama e NVIDIA Personal AI Router.
                </p>
              </div>
            </div>
          )}

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
              <span>{isTesting ? 'Test in corso...' : '🔍 Testa Connessione AI'}</span>
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
