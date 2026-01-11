
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType, DrawingAction, DrawingPoint } from '../types';

interface DrawingCanvasProps {
  imageSrc: string;
  tool: ToolType;
  brushSize: number;
  brushColor: string;
  onMaskChange: (maskBase64: string | null) => void;
  disabled?: boolean;
  maskingEnabled: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  imageSrc,
  tool,
  brushSize,
  brushColor,
  onMaskChange,
  disabled = false,
  maskingEnabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawingAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawingAction | null>(null);

  // Robust sizing logic
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!container || !bgCanvas || !canvas) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      if (containerWidth === 0 || containerHeight === 0) return;

      const imgRatio = img.width / img.height;
      const containerRatio = containerWidth / containerHeight;

      let displayWidth, displayHeight;
      if (imgRatio > containerRatio) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imgRatio;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imgRatio;
      }

      // Internal resolution should match original image
      canvas.width = img.width;
      canvas.height = img.height;
      bgCanvas.width = img.width;
      bgCanvas.height = img.height;

      // Display size matches container containment
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      bgCanvas.style.width = `${displayWidth}px`;
      bgCanvas.style.height = `${displayHeight}px`;

      const ctxBg = bgCanvas.getContext('2d');
      if (ctxBg) {
        ctxBg.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        ctxBg.drawImage(img, 0, 0, img.width, img.height);
      }
      
      redraw();
    };
  }, [imageSrc]);

  useEffect(() => {
    resizeCanvases();
    
    const observer = new ResizeObserver(() => resizeCanvases());
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [resizeCanvases]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear for UI
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!maskingEnabled) {
      onMaskChange(null);
      return;
    }

    const allActions = [...actions];
    if (currentAction) allActions.push(currentAction);

    // Draw visible feedback for the user
    allActions.forEach(action => {
      if (action.points.length < 2) return;
      ctx.beginPath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = action.size;
      
      if (action.tool === ToolType.ERASER) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#FFFFFF';
      }

      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';

    // Generate high-contrast mask for the API (White on Black)
    if (actions.length > 0 || currentAction) {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const oCtx = offscreen.getContext('2d');
      if (oCtx) {
        oCtx.fillStyle = '#000000';
        oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        oCtx.drawImage(canvas, 0, 0);
        onMaskChange(offscreen.toDataURL('image/png'));
      }
    } else {
      onMaskChange(null);
    }
  }, [actions, currentAction, onMaskChange, maskingEnabled]);

  useEffect(() => {
    redraw();
  }, [actions, currentAction, redraw]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !maskingEnabled) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentAction({
      points: [coords],
      color: brushColor,
      size: brushSize,
      tool: tool
    });
  };

  const moveDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAction || disabled || !maskingEnabled) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentAction({
      ...currentAction,
      points: [...currentAction.points, coords]
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentAction || disabled || !maskingEnabled) return;
    setIsDrawing(false);
    setActions(prev => [...prev, currentAction]);
    setCurrentAction(null);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900/50 overflow-hidden" ref={containerRef}>
      <div className="relative flex items-center justify-center pointer-events-none">
        <canvas ref={bgCanvasRef} className="shadow-2xl" />
        <canvas
          ref={canvasRef}
          className={`absolute cursor-crosshair transition-opacity duration-300 pointer-events-auto ${disabled ? 'opacity-0' : 'opacity-60'}`}
          onMouseDown={startDrawing}
          onMouseMove={moveDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={moveDrawing}
          onTouchEnd={stopDrawing}
          style={{ mixBlendMode: 'screen' }}
        />
      </div>
      
      {maskingEnabled && !disabled && actions.length > 0 && (
        <button 
          onClick={() => { setActions([]); onMaskChange(null); }}
          className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-600 text-white p-2 w-10 h-10 rounded-full shadow-lg transition-all active:scale-90 z-20 flex items-center justify-center backdrop-blur-sm"
          title="Clear Mask"
        >
          <i className="fas fa-trash-can"></i>
        </button>
      )}
    </div>
  );
};

export default DrawingCanvas;
