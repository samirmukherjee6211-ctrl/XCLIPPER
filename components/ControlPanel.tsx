
import React, { useRef, useState } from 'react';
import { ToolType, EditorMode, Persona } from '../types';
import { geminiService } from '../services/geminiService';

interface ControlPanelProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  personas: Persona[];
  onPersonaCreate: (p: Persona) => void;
  onPersonaDelete: (id: string) => void;
  selectedPersonaId: string | null;
  setSelectedPersonaId: (id: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  hasImage: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  tool, setTool,
  mode, setMode,
  brushSize, setBrushSize,
  brushColor, setBrushColor,
  prompt, setPrompt,
  personas,
  onPersonaCreate,
  onPersonaDelete,
  selectedPersonaId,
  setSelectedPersonaId,
  onGenerate,
  isLoading,
  hasImage
}) => {
  const [newPersonaImages, setNewPersonaImages] = useState<string[]>([]);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const personaInputRef = useRef<HTMLInputElement>(null);

  const handlePersonaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Explicitly cast to File[] to ensure each file is recognized as a Blob/File
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const remaining = 10 - newPersonaImages.length;
    const filesToLoad = selectedFiles.slice(0, remaining);

    let count = 0;
    const batch: string[] = [];

    filesToLoad.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        batch.push(event.target?.result as string);
        count++;
        if (count === filesToLoad.length) {
          setNewPersonaImages(prev => [...prev, ...batch].slice(0, 10));
        }
      };
      // Fixed: 'file' is now correctly typed as File (which extends Blob)
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleTrainPersona = async () => {
    if (newPersonaImages.length < 10 || !newPersonaName) return;
    setIsTraining(true);
    try {
      const profile = await geminiService.trainPersona(newPersonaImages);
      const newPersona: Persona = {
        id: Date.now().toString(),
        name: newPersonaName,
        images: newPersonaImages,
        identityProfile: profile,
        isTrained: true
      };
      onPersonaCreate(newPersona);
      setNewPersonaImages([]);
      setNewPersonaName('');
    } catch (err) {
      console.error(err);
      alert("Failed to analyze identity profile. Please try again.");
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="bg-slate-900 border-l border-slate-800 w-96 flex flex-col h-full shadow-2xl overflow-hidden">
      <div className="p-6 flex-1 overflow-y-auto space-y-8 scrollbar-hide">
        {/* Mode Selector */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-microchip text-blue-500 text-xs"></i>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Processing Core</h3>
          </div>
          <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setMode(EditorMode.GENERAL)}
              className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all ${
                mode === EditorMode.GENERAL ? 'bg-slate-800 text-white shadow-inner border border-slate-700' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              FLASH INPAINT
            </button>
            <button
              onClick={() => setMode(EditorMode.FACE_SWAP)}
              className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all ${
                mode === EditorMode.FACE_SWAP ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              PRO IDENTITY
            </button>
          </div>
        </div>

        {mode === EditorMode.FACE_SWAP && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Persona Manager */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <i className="fas fa-fingerprint text-blue-400 text-xs"></i>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identity Bank</h3>
                </div>
                {personas.length > 0 && (
                  <span className="text-[10px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    {personas.length} PROFILES
                  </span>
                )}
              </div>

              {personas.length === 0 ? (
                <div className="bg-slate-950 border border-dashed border-slate-800 rounded-2xl p-6 text-center">
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-4">No Personas Found</p>
                   <p className="text-[11px] text-slate-600 leading-relaxed mb-4">Nano Banana Pro requires a trained biometric profile (10 photos) for surgical face swaps.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {personas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersonaId(p.id)}
                      className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                        selectedPersonaId === p.id 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-800 flex-shrink-0">
                        <img src={p.images[0]} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-black uppercase tracking-tight">{p.name}</p>
                        <p className="text-[9px] font-bold opacity-60">PROFILE ACTIVE</p>
                      </div>
                      <div onClick={(e) => { e.stopPropagation(); onPersonaDelete(p.id); }} className="p-2 hover:text-red-500">
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Training Box */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Neural Training Box</h4>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <input 
                    type="text"
                    placeholder="Subject Name..."
                    value={newPersonaName}
                    onChange={(e) => setNewPersonaName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs mb-3 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-5 gap-1.5 mb-4">
                    {Array.from({length: 10}).map((_, i) => (
                      <div key={i} className={`aspect-square rounded border flex items-center justify-center transition-all ${
                        newPersonaImages[i] ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 border-dashed bg-slate-900'
                      }`}>
                        {newPersonaImages[i] ? (
                          <img src={newPersonaImages[i]} className="w-full h-full object-cover rounded" />
                        ) : (
                          <i className="fas fa-plus text-[8px] text-slate-700"></i>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => personaInputRef.current?.click()}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-[9px] font-black uppercase rounded-lg transition-all"
                    >
                      Add Photos
                    </button>
                    <button 
                      onClick={handleTrainPersona}
                      disabled={newPersonaImages.length < 10 || !newPersonaName || isTraining}
                      className={`flex-[2] py-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                        newPersonaImages.length === 10 && newPersonaName 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isTraining ? <i className="fas fa-dna fa-spin mr-1"></i> : null}
                      {isTraining ? 'Training...' : 'Analyze identity'}
                    </button>
                  </div>
                  <input type="file" multiple ref={personaInputRef} onChange={handlePersonaUpload} className="hidden" />
                  <p className="text-[8px] text-slate-600 mt-3 font-bold uppercase tracking-tight text-center">Required: Exactly 10 high-quality facial close-ups</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === EditorMode.GENERAL && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-paint-roller text-blue-400 text-xs"></i>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Flash Inpaint Tools</h3>
            </div>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTool(ToolType.BRUSH)}
                className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                  tool === ToolType.BRUSH ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-slate-800 hover:border-slate-700 text-slate-500'
                }`}
              >
                <i className="fas fa-paint-brush"></i>
                <span className="text-[10px] font-black uppercase tracking-tighter">Brush</span>
              </button>
              <button
                onClick={() => setTool(ToolType.ERASER)}
                className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                  tool === ToolType.ERASER ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-slate-800 hover:border-slate-700 text-slate-500'
                }`}
              >
                <i className="fas fa-eraser"></i>
                <span className="text-[10px] font-black uppercase tracking-tighter">Eraser</span>
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Stroke Density</h3>
              <input
                type="range"
                min="5"
                max="120"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}

        <div className="space-y-4 pb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-terminal text-blue-400 text-xs"></i>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {mode === EditorMode.FACE_SWAP ? 'Target Lock Command' : 'Context Prompt'}
            </h3>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === EditorMode.FACE_SWAP 
              ? "Describe target, e.g. 'the central man in the chain'" 
              : "Describe objects to synthesize in mask..."}
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none placeholder:text-slate-700"
            disabled={!hasImage}
          />
        </div>
      </div>

      <div className="p-6 bg-slate-950 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={onGenerate}
          disabled={!hasImage || isLoading || (mode === EditorMode.FACE_SWAP && (!selectedPersonaId || !prompt))}
          className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-[10px] ${
            !hasImage || isLoading || (mode === EditorMode.FACE_SWAP && (!selectedPersonaId || !prompt))
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : mode === EditorMode.FACE_SWAP 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20' 
                : 'bg-slate-100 hover:bg-white text-slate-950 shadow-xl'
          }`}
        >
          {isLoading ? (
            <i className="fas fa-atom fa-spin"></i>
          ) : (
            <i className={`fas ${mode === EditorMode.FACE_SWAP ? 'fa-dna' : 'fa-wand-magic-sparkles'}`}></i>
          )}
          {isLoading ? 'Processing Neural Edit...' : mode === EditorMode.FACE_SWAP ? 'Deploy Nano Banana Pro' : 'Run Context Edit'}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
