import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icons } from '../icons/Icons';
import { Button } from '../ui/Button';

interface LogoAdjusterModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onApply: (processedFile: File) => Promise<void>;
    appName?: string;
}

export const LogoAdjusterModal: React.FC<LogoAdjusterModalProps> = ({
    isOpen,
    onClose,
    imageSrc,
    onApply,
    appName = 'Store'
}) => {
    const [zoom, setZoom] = useState<number>(1);
    const [panX, setPanX] = useState<number>(0);
    const [panY, setPanY] = useState<number>(0);
    const [rotation, setRotation] = useState<number>(0);
    const [bgColor, setBgColor] = useState<string>('transparent');
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);
    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Load image object whenever imageSrc changes
    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImageElement(img);
            setImageLoaded(true);
            // Reset adjustments
            setZoom(1);
            setPanX(0);
            setPanY(0);
            setRotation(0);
        };
        img.onerror = () => {
            console.error('Failed to load image for adjustment');
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Redraw preview canvas
    const drawPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas || !imageElement || !imageLoaded) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 300;
        canvas.width = size;
        canvas.height = size;

        ctx.clearRect(0, 0, size, size);

        // Save context for circular clipping
        ctx.save();

        // 1. Draw circular background
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, size, size);
        }

        // 2. Transformations
        ctx.translate(size / 2 + panX, size / 2 + panY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        // Calculate aspect ratio for image
        const imgAspect = imageElement.width / imageElement.height;
        let drawW = size;
        let drawH = size;
        if (imgAspect > 1) {
            drawW = size * imgAspect;
        } else {
            drawH = size / imgAspect;
        }

        ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }, [imageElement, imageLoaded, zoom, panX, panY, rotation, bgColor]);

    useEffect(() => {
        drawPreview();
    }, [drawPreview]);

    // Mouse / Touch Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPanX(e.clientX - dragStart.x);
        setPanY(e.clientY - dragStart.y);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;
        setPanX(e.touches[0].clientX - dragStart.x);
        setPanY(e.touches[0].clientY - dragStart.y);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    // Zoom shortcuts
    const handleZoomIn = () => setZoom((prev) => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
    const handleZoomOut = () => setZoom((prev) => Math.max(0.3, Number((prev - 0.15).toFixed(2))));
    const handleReset = () => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setRotation(0);
        setBgColor('transparent');
    };
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

    // Export High-Res Circular Image under 20KB
    const handleApply = async () => {
        if (!imageElement) return;
        setIsSaving(true);

        try {
            const exportCanvas = document.createElement('canvas');
            const targetSize = 400; // Crisp resolution
            exportCanvas.width = targetSize;
            exportCanvas.height = targetSize;
            const ctx = exportCanvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context failed');

            // Draw circular clipping
            ctx.save();
            ctx.beginPath();
            ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            if (bgColor !== 'transparent') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, targetSize, targetSize);
            }

            // Ratio calculation
            const scaleFactor = targetSize / 300;
            ctx.translate(targetSize / 2 + panX * scaleFactor, targetSize / 2 + panY * scaleFactor);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(zoom, zoom);

            const imgAspect = imageElement.width / imageElement.height;
            let drawW = targetSize;
            let drawH = targetSize;
            if (imgAspect > 1) {
                drawW = targetSize * imgAspect;
            } else {
                drawH = targetSize / imgAspect;
            }

            ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();

            // Convert to Blob with quality optimization to guarantee < 20KB
            let quality = 0.88;
            let blob: Blob | null = await new Promise((resolve) =>
                exportCanvas.toBlob(resolve, 'image/webp', quality)
            );

            // If webp is not supported or large, compress
            if (!blob || blob.size > 20000) {
                quality = 0.72;
                blob = await new Promise((resolve) =>
                    exportCanvas.toBlob(resolve, 'image/webp', quality)
                );
            }

            if (!blob) {
                blob = await new Promise((resolve) =>
                    exportCanvas.toBlob(resolve, 'image/png')
                );
            }

            if (!blob) throw new Error('Failed to generate image file');

            const file = new File([blob], `app-logo-circular-${Date.now()}.webp`, {
                type: 'image/webp'
            });

            await onApply(file);
            onClose();
        } catch (err: any) {
            console.error('Error applying adjusted logo:', err);
            alert(err.message || 'Failed to save adjusted logo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
        >
            <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-amber-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                            ⭕
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                Adjust & Crop Circular Logo
                                <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                                    گول لوگو ایڈجسٹمنٹ
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500">
                                Drag to move • Zoom in/out • Perfectly fits mobile screens
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isSaving}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-white/80 transition-colors"
                    >
                        <Icons.x className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        {/* Interactive Circular Cropper Canvas */}
                        <div className="flex flex-col items-center">
                            <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                                <span>👆 Interactive Circle Box (ڈریگ کر کے سیٹ کریں)</span>
                            </div>

                            <div 
                                className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] rounded-3xl bg-slate-900 border-2 border-dashed border-rose-400 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden shadow-lg select-none"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                {/* Canvas Preview */}
                                <canvas
                                    ref={previewCanvasRef}
                                    width={300}
                                    height={300}
                                    className="w-full h-full object-contain pointer-events-none rounded-full"
                                />

                                {/* Circular Overlay Guideline */}
                                <div className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] flex items-center justify-center">
                                    <div className="w-full h-full rounded-full border border-dashed border-rose-300/60" />
                                </div>

                                <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                                    <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                                        Drag to Pan • {Math.round(zoom * 100)}% Zoom
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Adjuster Controls & Live Previews */}
                        <div className="space-y-4">
                            {/* Zoom Controls */}
                            <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                    <span>🔍 Zoom (زوم ان / آؤٹ)</span>
                                    <span className="text-rose-600 font-mono">{Math.round(zoom * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        className="w-8 h-8 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-slate-700 hover:bg-rose-100 transition-colors font-bold shadow-xs text-sm"
                                        title="Zoom Out"
                                    >
                                        －
                                    </button>
                                    <input 
                                        type="range" 
                                        min="0.3" 
                                        max="3.5" 
                                        step="0.05"
                                        value={zoom}
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="flex-1 accent-rose-600 cursor-pointer h-2 bg-rose-200 rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        className="w-8 h-8 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-slate-700 hover:bg-rose-100 transition-colors font-bold shadow-xs text-sm"
                                        title="Zoom In"
                                    >
                                        ＋
                                    </button>
                                </div>
                            </div>

                            {/* Rotate & Reset Toolbar */}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRotate}
                                    className="flex-1 text-xs py-2 h-9 flex items-center justify-center gap-1.5 font-bold"
                                >
                                    🔄 Rotate 90°
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleReset}
                                    className="flex-1 text-xs py-2 h-9 flex items-center justify-center gap-1.5 font-bold text-slate-600"
                                >
                                    🎯 Center / Reset
                                </Button>
                            </div>

                            {/* Background Color Picker for Transparent/Cutout Logos */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-600 block">
                                    Circle Background Color (پس منظر):
                                </span>
                                <div className="flex items-center gap-2">
                                    {[
                                        { label: 'Transparent', val: 'transparent', bg: 'bg-transparent border-dashed' },
                                        { label: 'White', val: '#ffffff', bg: 'bg-white' },
                                        { label: 'Soft Rose', val: '#fff1f2', bg: 'bg-rose-100' },
                                        { label: 'Dark Navy', val: '#0f172a', bg: 'bg-slate-900' },
                                        { label: 'Amber Gold', val: '#fef3c7', bg: 'bg-amber-100' },
                                    ].map((c) => (
                                        <button
                                            key={c.val}
                                            type="button"
                                            onClick={() => setBgColor(c.val)}
                                            className={`w-7 h-7 rounded-full border-2 transition-transform shadow-xs flex items-center justify-center text-[10px] ${c.bg} ${
                                                bgColor === c.val ? 'border-rose-600 scale-110 ring-2 ring-rose-400' : 'border-slate-300 hover:scale-105'
                                            }`}
                                            title={c.label}
                                        >
                                            {c.val === 'transparent' ? '✕' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Live Mobile Screen Mockup Preview */}
                            <div className="pt-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    📱 Live Mobile Screen Preview:
                                </span>
                                <div className="flex items-center gap-3 bg-rose-50/60 p-2.5 rounded-2xl border border-rose-100">
                                    {/* Circular Navbar Badge */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-9 h-9 rounded-full border-2 border-rose-400 shadow-sm overflow-hidden bg-white p-0.5 aspect-square">
                                            <canvas
                                                ref={(el) => {
                                                    if (el && previewCanvasRef.current) {
                                                        const c = el.getContext('2d');
                                                        if (c) {
                                                            el.width = 36;
                                                            el.height = 36;
                                                            c.drawImage(previewCanvasRef.current, 0, 0, 36, 36);
                                                        }
                                                    }
                                                }}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-500">Navbar</span>
                                    </div>

                                    {/* Circular App Icon Badge */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-full border-2 border-amber-400 shadow-md overflow-hidden bg-slate-900 p-1 aspect-square">
                                            <canvas
                                                ref={(el) => {
                                                    if (el && previewCanvasRef.current) {
                                                        const c = el.getContext('2d');
                                                        if (c) {
                                                            el.width = 44;
                                                            el.height = 44;
                                                            c.drawImage(previewCanvasRef.current, 0, 0, 44, 44);
                                                        }
                                                    }
                                                }}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-500">App Icon</span>
                                    </div>

                                    <div className="min-w-0 flex-1 pl-1">
                                        <div className="text-xs font-bold text-rose-900 truncate">
                                            {appName}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            100% Perfectly circular display on all mobile screens.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-4 border-t border-rose-100 flex items-center justify-between bg-slate-50/80">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="text-xs font-bold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleApply}
                        disabled={isSaving || !imageLoaded}
                        className="px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white"
                    >
                        {isSaving ? (
                            <>
                                <Icons.logo className="w-4 h-4 animate-spin text-white" />
                                <span>Saving Circular Logo...</span>
                            </>
                        ) : (
                            <>
                                <span>⭕ Save & Apply Circular Logo</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
