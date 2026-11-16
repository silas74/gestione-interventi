import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Undo2,
  RotateCcw,
  Pencil,
  Circle,
  MoveUpRight,
  Type,
  Clock,
} from 'lucide-react';
import { DefectPhoto } from '../types';
import { applyWatermarkToDataUrl } from '../lib/photoUtils';

interface PhotoAnnotatorModalProps {
  photo: DefectPhoto;
  defaultWatermarkText?: string;
  onClose: () => void;
  onSaveAnnotated: (photoId: string, newDataUrl: string, newCaption?: string) => void;
}

type DrawTool = 'circle' | 'arrow' | 'freehand' | 'text';

const COLORS = [
  { id: '#ef4444', label: 'Rosso', cls: 'bg-red-500' },
  { id: '#facc15', label: 'Giallo', cls: 'bg-yellow-400' },
  { id: '#10b981', label: 'Verde', cls: 'bg-emerald-500' },
  { id: '#3b82f6', label: 'Blu', cls: 'bg-blue-500' },
];

export const PhotoAnnotatorModal: React.FC<PhotoAnnotatorModalProps> = ({
  photo,
  defaultWatermarkText,
  onClose,
  onSaveAnnotated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<DrawTool>('circle');
  const [color, setColor] = useState<string>('#ef4444');
  const [caption, setCaption] = useState<string>(photo.caption || '');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshotBeforeDrag, setSnapshotBeforeDrag] = useState<ImageData | null>(null);

  // Load original photo into canvas preserving exact proportions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
    };
    img.src = photo.url;
  }, [photo.url]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      clientX = t.clientX;
      clientY = t.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getStrokeWidth = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 5;
    return Math.max(4, Math.round(Math.min(canvas.width, canvas.height) * 0.008));
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasCoords(e);

    if (tool === 'text') {
      const label = window.prompt('Inserisci testo da scrivere sulla foto (es. "Sensore CO #3", "Cavo interrotto"):');
      if (label && label.trim()) {
        const fontSize = Math.max(20, Math.round(Math.min(canvas.width, canvas.height) * 0.038));
        ctx.save();
        ctx.font = `bold ${fontSize}px sans-serif`;
        const metrics = ctx.measureText(label.trim());
        const pad = Math.round(fontSize * 0.35);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(pos.x - pad, pos.y - fontSize, metrics.width + pad * 2, fontSize + pad * 1.4);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(pos.x - pad, pos.y - fontSize, metrics.width + pad * 2, fontSize + pad * 1.4);
        ctx.fillStyle = color;
        ctx.fillText(label.trim(), pos.x, pos.y);
        ctx.restore();
        const saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev, saved]);
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setSnapshotBeforeDrag(snap);

    if (tool === 'freehand') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = getStrokeWidth();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    strokeW: number
  ) => {
    const headLen = strokeW * 4.2;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasCoords(e);
    const strokeW = getStrokeWidth();

    if (tool === 'freehand') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }

    if (snapshotBeforeDrag) {
      ctx.putImageData(snapshotBeforeDrag, 0, 0);
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';

    if (tool === 'circle') {
      const rx = Math.abs(pos.x - startPos.x) / 2;
      const ry = Math.abs(pos.y - startPos.y) / 2;
      const cx = (pos.x + startPos.x) / 2;
      const cy = (pos.y + startPos.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(8, rx), Math.max(8, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y, strokeW);
    }
    ctx.restore();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPos(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, snap]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const nextHist = history.slice(0, -1);
    const prevImg = nextHist[nextHist.length - 1];
    ctx.putImageData(prevImg, 0, 0);
    setHistory(nextHist);
  };

  const handleReset = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const first = history[0];
    ctx.putImageData(first, 0, 0);
    setHistory([first]);
  };

  const handleStampTimestamp = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentUrl = canvas.toDataURL('image/jpeg', 0.9);
    const stamp =
      defaultWatermarkText ||
      `Awash Bank • ${new Date().toLocaleDateString('it-IT')} ${new Date().toTimeString().slice(0, 5)}`;
    const stampedUrl = await applyWatermarkToDataUrl(currentUrl, stamp);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev, snap]);
    };
    img.src = stampedUrl;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const finalUrl = canvas.toDataURL('image/jpeg', 0.88);
    onSaveAnnotated(photo.id, finalUrl, caption);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-extrabold text-white">
              ✏️ Segna sulla Foto (Cerchi, Frecce, Testo & Timbro Orario)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          {/* Tools */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTool('circle')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                tool === 'circle'
                  ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>Cerchio</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('arrow')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                tool === 'arrow'
                  ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <MoveUpRight className="w-3.5 h-3.5" />
              <span>Freccia</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('freehand')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                tool === 'freehand'
                  ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Mano libera</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('text')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                tool === 'text'
                  ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Testo</span>
            </button>

            <button
              type="button"
              onClick={handleStampTimestamp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition"
              title="Imprimi fascia Data/Ora/Zona in basso sulla foto"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Timbro Data/Zona</span>
            </button>
          </div>

          {/* Colors & Undo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-5 h-5 rounded-full ${c.cls} transition ${
                    color === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 border border-slate-700"
              title="Annulla ultimo tratto"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={history.length <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 border border-slate-700"
              title="Ripristina foto originale"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Viewport (maintaining exact image aspect ratio) */}
        <div className="flex-1 overflow-auto bg-slate-950 p-3 flex items-center justify-center min-h-[280px] max-h-[60vh]">
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="max-w-full max-h-[55vh] w-auto h-auto object-contain rounded-lg border border-slate-700 cursor-crosshair touch-none shadow-xl"
          />
        </div>

        {/* Caption & Save Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Didascalia foto (es. Sensore CO #4 collegato / Telecamera LPR ingresso)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salva Foto Annotata</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
