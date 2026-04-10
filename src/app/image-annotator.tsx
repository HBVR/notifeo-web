'use client';

import { useRef, useState } from 'react';

type Tool = 'draw' | 'text';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#2563eb', '#7c3aed', '#000000', '#ffffff'];
const BRUSH_SIZES = [2, 4, 8, 12];

interface Props {
  imageUrl: string; // signed URL or blob URL
  storagePath: string; // original storage path for server-side download on export
  onSave: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}

export default function ImageAnnotator({ imageUrl, storagePath, onSave, onCancel }: Props) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Text
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  // Undo stack (store overlay snapshots)
  const historyRef = useRef<ImageData[]>([]);

  function saveToHistory() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
  }

  function undo() {
    const canvas = overlayRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    historyRef.current.pop();
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (historyRef.current.length > 0) {
      ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    }
  }

  // Sync overlay canvas size with displayed image
  function onImageLoad() {
    const img = imgRef.current;
    const canvas = overlayRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    setImgLoaded(true);
  }

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (tool === 'text') {
      setTextPos(getPos(e));
      setTextInput('');
      return;
    }
    const canvas = overlayRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || tool !== 'draw') return;
    e.preventDefault();
    const ctx = overlayRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  }

  function addText() {
    if (!textPos || !textInput.trim()) {
      setTextPos(null);
      return;
    }
    const canvas = overlayRef.current!;
    const ctx = canvas.getContext('2d')!;
    const fontSize = Math.max(20, Math.round(canvas.width / 25));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.strokeStyle = color === '#ffffff' ? '#000000' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeText(textInput, textPos.x, textPos.y);
    ctx.fillText(textInput, textPos.x, textPos.y);
    saveToHistory();
    setTextPos(null);
    setTextInput('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Download original image via our server-side proxy (no CORS)
      const proxyResp = await fetch(
        `/api/image-proxy?path=${encodeURIComponent(storagePath)}`
      );
      if (!proxyResp.ok) throw new Error('Failed to download image for export');
      const imgBlob = await proxyResp.blob();

      // Load original into a fresh canvas
      const origImg = await createImageBitmap(imgBlob);
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = origImg.width;
      exportCanvas.height = origImg.height;
      const ctx = exportCanvas.getContext('2d')!;

      // Draw original image
      ctx.drawImage(origImg, 0, 0);

      // Draw overlay annotations on top
      const overlay = overlayRef.current;
      if (overlay) {
        ctx.drawImage(overlay, 0, 0, origImg.width, origImg.height);
      }

      // Export
      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/jpeg',
          0.85
        );
      });

      await onSave(blob);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-800 px-3 py-2 border-b border-gray-700">
        <button
          onClick={() => setTool('draw')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tool === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          ✏️ Dessiner
        </button>
        <button
          onClick={() => setTool('text')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tool === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Aa Texte
        </button>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              color === c ? 'border-white scale-110' : 'border-gray-600'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {BRUSH_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setBrushSize(s)}
            className={`flex items-center justify-center h-7 w-7 rounded-lg ${
              brushSize === s ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <span className="rounded-full bg-white" style={{ width: s + 2, height: s + 2 }} />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-600 mx-1" />

        <button
          onClick={undo}
          className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-600"
        >
          ↩ Annuler
        </button>

        <div className="flex-1" />

        <button
          onClick={onCancel}
          className="rounded-lg bg-gray-700 px-4 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-600"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
        </button>
      </div>

      {/* Canvas area: img background + transparent canvas overlay */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="relative inline-block">
          {/* Background image (always loads, no CORS issue for display) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Photo"
            onLoad={onImageLoad}
            className="max-w-full max-h-[75vh] rounded-lg"
          />

          {/* Drawing overlay (transparent canvas on top) */}
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 w-full h-full cursor-crosshair rounded-lg"
            style={{ touchAction: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />

          {/* Text input overlay */}
          {textPos && overlayRef.current && (
            <div
              className="absolute z-10"
              style={{
                left:
                  (textPos.x / overlayRef.current.width) *
                  (imgRef.current?.clientWidth ?? 1),
                top:
                  (textPos.y / overlayRef.current.height) *
                  (imgRef.current?.clientHeight ?? 1),
              }}
            >
              <div className="flex gap-1">
                <input
                  autoFocus
                  type="text"
                  placeholder="Tapez votre texte..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addText();
                    if (e.key === 'Escape') setTextPos(null);
                  }}
                  className="rounded-lg bg-white/90 px-2 py-1 text-sm text-gray-900 border border-gray-400 shadow-lg w-48"
                />
                <button
                  onClick={addText}
                  className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white font-semibold"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
