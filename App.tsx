import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ImageState, ToolType, EditorMode, Persona } from './types';
import DrawingCanvas from './components/DrawingCanvas';
import ControlPanel from './components/ControlPanel';
import LoadingOverlay from './components/LoadingOverlay';
import { geminiService } from './services/geminiService';
import { creditsService } from './services/creditsService';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'optimize' | 'upgrade'>('home');
  const [images, setImages] = useState<ImageState>({
    original: null,
    edited: null,
    mask: null
  });
  
  const [mode, setMode] = useState<EditorMode>(EditorMode.GENERAL);
  const [editMode, setEditMode] = useState<'prompt' | 'recreate' | 'edit'>('prompt');
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'link'>('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  
  const [tool, setTool] = useState<ToolType>(ToolType.BRUSH);
  const [brushSize, setBrushSize] = useState(40);
  const [brushColor, setBrushColor] = useState('#FFFFFF');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [newPersonaImages, setNewPersonaImages] = useState<string[]>([]);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [personasLoaded, setPersonasLoaded] = useState(false);
  const [showEditControls, setShowEditControls] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<Array<{prompt: string, image: string, timestamp: number}>>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [credits, setCredits] = useState(10); // Will be loaded from Firebase
  const [userId, setUserId] = useState<string>('demo-user'); // Replace with actual auth user ID
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const personaInputRef = useRef<HTMLInputElement>(null);

  // Get selected persona
  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  // Load user credits from Firebase (DISABLED - using local credits)
  useEffect(() => {
    // Set default credits without Firebase
    setCredits(1000);
    setIsLoadingCredits(false);
  }, [userId]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setPrompt(prev => prev + finalTranscript);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt first before enhancing it.');
      return;
    }

    // Check if user has enough credits (local only)
    const enhanceCost = creditsService.getEnhancePromptCost();
    if (credits < enhanceCost) {
      setError(`Insufficient credits. You need ${enhanceCost} credits to enhance a prompt. Please upgrade your plan.`);
      return;
    }

    setIsEnhancing(true);
    setError(null);

    try {
      // Deduct credits locally (no Firebase)
      setCredits(prev => prev - enhanceCost);

      const enhancedPrompt = await geminiService.enhancePrompt(prompt);
      setPrompt(enhancedPrompt);
    } catch (err: any) {
      console.error('Enhance prompt error:', err);
      
      // Refund credits locally if enhancement failed
      setCredits(prev => prev + enhanceCost);
      
      setError(err.message || 'Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Persistence for Personas
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nano_personas');
      if (saved) {
        const parsedPersonas = JSON.parse(saved);
        console.log('Loaded personas from storage:', parsedPersonas.length);
        setPersonas(parsedPersonas);
      }
    } catch (error) {
      console.error('Error loading personas from localStorage:', error);
    }
    setPersonasLoaded(true);
  }, []);

  useEffect(() => {
    // Only save after initial load is complete
    if (!personasLoaded) return;
    
    try {
      const dataToSave = JSON.stringify(personas);
      localStorage.setItem('nano_personas', dataToSave);
      console.log('Saved personas to storage:', personas.length, 'Size:', (dataToSave.length / 1024).toFixed(2), 'KB');
    } catch (error) {
      console.error('Error saving personas to localStorage:', error);
      // If localStorage is full, try to save without images (just metadata)
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        alert('Storage limit reached. Personas may not be saved properly.');
      }
    }
  }, [personas, personasLoaded]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages({
          original: event.target?.result as string,
          edited: null,
          mask: null
        });
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFetchLink = async () => {
    if (!linkUrl.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let imageUrl = linkUrl;
      
      // Check if it's a YouTube URL
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = linkUrl.match(youtubeRegex);
      
      if (match && match[1]) {
        // Extract video ID and get thumbnail
        const videoId = match[1];
        imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      
      // Fetch the image
      const response = await fetch(imageUrl, {
        mode: 'cors'
      });
      
      if (!response.ok) {
        // Try standard quality if maxres fails
        if (match && match[1]) {
          const videoId = match[1];
          imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          const retryResponse = await fetch(imageUrl, { mode: 'cors' });
          if (!retryResponse.ok) throw new Error('Failed to fetch thumbnail');
          const blob = await retryResponse.blob();
          processImage(blob);
          return;
        }
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      processImage(blob);
      
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Failed to fetch thumbnail. Please check the URL.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const processImage = (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImages({
        original: e.target?.result as string,
        edited: null,
        mask: null
      });
      setLinkUrl('');
      setUploadMethod('upload');
    };
    reader.onerror = () => {
      setError('Failed to read image data');
      setIsLoading(false);
    };
    reader.readAsDataURL(blob);
  };

  const startPainting = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== EditorMode.GENERAL) return;
    setIsPainting(true);
    paint(e);
  };

  const stopPainting = () => {
    setIsPainting(false);
  };

  const paint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting && e.type !== 'mousedown') return;
    if (mode !== EditorMode.GENERAL) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setImages(prev => ({ ...prev, mask: null }));
  };

  const handlePersonaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setPersonas(prev => [newPersona, ...prev]);
      setSelectedPersonaId(newPersona.id);
      setNewPersonaImages([]);
      setNewPersonaName('');
      setShowPersonaModal(false);
    } catch (err) {
      console.error(err);
      setError("Failed to train persona. Please try again.");
    } finally {
      setIsTraining(false);
    }
  };

  const captureMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // Check if canvas has any drawings
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawing = imageData.data.some(channel => channel !== 0);
    
    if (!hasDrawing) return null;
    
    return canvas.toDataURL('image/png');
  };

  const handleGenerate = async () => {
    // Check if user has enough credits (local only)
    const generationCost = creditsService.getGenerationCost();
    if (credits < generationCost) {
      setError(`Insufficient credits. You need ${generationCost} credits to generate an image. Please upgrade your plan.`);
      return;
    }

    // PROMPT MODE: Generate image from text only (Chat-style)
    if (editMode === 'prompt' && !images.original) {
      if (!prompt.trim()) {
        setError("Please enter a prompt to generate an image.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Deduct credits locally (no Firebase)
        setCredits(prev => prev - generationCost);

        const result = await geminiService.generateImageFromPrompt(prompt, selectedPersona);
        
        // Add to generation history (chat-style)
        setGenerationHistory(prev => [...prev, {
          prompt: prompt,
          image: result,
          timestamp: Date.now()
        }]);
        
        // Clear prompt for next generation
        setPrompt('');
      } catch (err: any) {
        console.error('Generation error:', err);
        
        // Refund credits locally if generation failed
        setCredits(prev => prev + generationCost);
        
        const errorMessage = err.message || "Image generation failed. Please try again.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // PROMPT MODE: Continue generating in chat mode
    if (editMode === 'prompt' && images.original) {
      if (!prompt.trim()) {
        setError("Please enter a prompt to generate an image.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Deduct credits locally (no Firebase)
        setCredits(prev => prev - generationCost);

        const result = await geminiService.generateImageFromPrompt(prompt, selectedPersona);
        
        // Add to generation history
        setGenerationHistory(prev => [...prev, {
          prompt: prompt,
          image: result,
          timestamp: Date.now()
        }]);
        
        // Clear prompt for next generation
        setPrompt('');
      } catch (err: any) {
        console.error(err);
        
        // Refund credits locally if generation failed
        setCredits(prev => prev + generationCost);
        
        setError(err.message || "Image generation failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // EDIT/RECREATE MODE: Requires an image
    if (!images.original) return;
    
    // Capture the mask from canvas if in Edit mode
    if (mode === EditorMode.GENERAL) {
      const maskData = captureMask();
      setImages(prev => ({ ...prev, mask: maskData }));
    }
    
    if (mode === EditorMode.FACE_SWAP) {
      if (!selectedPersonaId) {
        setError("Please select or train a persona first.");
        return;
      }
      if (!prompt) {
        setError("Describe the target face in the original image.");
        return;
      }

      if (!import.meta.env.VITE_API_KEY || import.meta.env.VITE_API_KEY === 'PLACEHOLDER_API_KEY') {
        setError("Please configure your API key in .env.local");
        return;
      }
    } else if (!prompt) {
      setError("Provide a description for the mask area.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const activePersona = personas.find(p => p.id === selectedPersonaId);
      const maskToUse = mode === EditorMode.GENERAL ? captureMask() : images.mask;
      
      const result = await geminiService.editImage(
        images.original, 
        maskToUse, 
        prompt, 
        mode === EditorMode.FACE_SWAP && activePersona ? activePersona.images : [],
        mode === EditorMode.FACE_SWAP && activePersona ? activePersona.identityProfile : null,
        mode === EditorMode.FACE_SWAP
      );
      
      // Replace the original image with the result
      setImages(prev => ({ ...prev, original: result, edited: result, mask: null }));
      
      // Clear the canvas after generation
      clearCanvas();
    } catch (err: any) {
      if (err.message === "API_KEY_RESET") {
        setError("Pro Model key error. Please check your API key configuration.");
      } else {
        console.error(err);
        setError(err.message || "Edit failed. Ensure prompt and persona are clear.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetEditor = () => {
    setImages({ original: null, edited: null, mask: null });
    setPrompt('');
    setError(null);
    setShowEditControls(false);
  };

  const handleDownload = () => {
    if (!images.original) return;
    const link = document.createElement('a');
    link.href = images.original;
    link.download = `humixo-thumbnail-${Date.now()}.png`;
    link.click();
  };

  const handleSave = () => {
    // TODO: Implement save to user account/cloud storage
    alert('Save feature coming soon!');
  };

  const handleMaskChange = useCallback((mask: string | null) => {
    setImages(prev => ({ ...prev, mask }));
  }, []);

  return (
    <div className="min-h-screen bg-[#030000] text-white selection:bg-[#FF1F1F] selection:text-white flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Outfit', sans-serif;
        }
        
        body {
          background-color: #030000;
        }
        
        .glass-panel {
          background: rgba(20, 20, 20, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.02);
        }

        .glass-button {
          background: linear-gradient(135deg, rgba(255, 31, 31, 0.9), rgba(180, 0, 0, 0.9));
          box-shadow: 0 0 15px rgba(255, 31, 31, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3);
          border: 1px solid rgba(255, 100, 100, 0.2);
        }

        .ambient-glow {
          position: fixed;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255, 31, 31, 0.15), transparent 70%);
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
          animation: blob 10s infinite;
        }

        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        .input-field {
          background: rgba(30, 30, 30, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .input-field:focus {
          background: rgba(40, 40, 40, 0.6);
          border-color: rgba(255, 31, 31, 0.5);
          box-shadow: 0 0 20px rgba(255, 31, 31, 0.2);
          outline: none;
        }
      `}</style>

      {/* Ambient Background Blobs */}
      <div className="ambient-glow" style={{ top: '-20%', left: '-10%' }}></div>
      <div className="ambient-glow" style={{ bottom: '-20%', right: '-10%', animationDelay: '2s', background: 'radial-gradient(circle, rgba(100, 0, 0, 0.2), transparent 70%)' }}></div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl glass-button flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative w-64 bg-black/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-40 transition-transform duration-300 h-screen ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-black tracking-tight">HUMIXO</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2 mb-6">
            <button 
              onClick={() => setCurrentPage('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                currentPage === 'home'
                  ? 'bg-gradient-to-r from-[#FF1F1F]/20 to-red-900/20 border border-[#FF1F1F]/30 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </button>
            
            <button 
              onClick={() => setCurrentPage('optimize')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                currentPage === 'optimize'
                  ? 'bg-gradient-to-r from-[#FF1F1F]/20 to-red-900/20 border border-[#FF1F1F]/30 text-white'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Optimize
            </button>
            
            <button 
              onClick={() => setCurrentPage('upgrade')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                currentPage === 'upgrade'
                  ? 'bg-gradient-to-r from-[#FF1F1F]/20 to-red-900/20 border border-[#FF1F1F]/30 text-white'
                  : 'text-[#FF1F1F] hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upgrade
            </button>
          </div>

          {/* New Chat Button */}
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass-panel hover:bg-white/5 font-medium transition-all mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Recent Chats */}
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2 px-2"></p>
            <div className="space-y-1">
              {/* Chat items would go here */}
            </div>
          </div>
        </nav>

        {/* Credits Section */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="glass-panel rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Credits</span>
              <button 
                onClick={() => setCurrentPage('upgrade')}
                className="text-xs text-[#FF1F1F] hover:text-[#FF1F1F]/80 font-semibold transition-colors"
              >
                Get More
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF1F1F] to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min((credits / 100) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-white">
                {isLoadingCredits ? '...' : credits}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isLoadingCredits ? 'Loading...' : 
               credits >= 10 ? 'Generate: 10 • Enhance: 5' : 
               credits >= 5 ? 'Low credits - Enhance only' : 
               credits > 0 ? 'Almost out of credits!' : 
               'No credits remaining'}
            </p>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1F1F] to-orange-600 flex items-center justify-center font-bold text-sm">
              S
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sampriti Banerjee</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </div>
          <button
            onClick={() => {
              // Clear any local storage/session data if needed
              localStorage.clear();
              // Redirect to signin page
              window.location.href = '/signin.html';
            }}
            className="w-full glass-panel hover:bg-white/5 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navigation */}
        <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl relative z-10">
          <div className="px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
            <div className="ml-12 lg:ml-0">
              <h2 className="text-xl lg:text-2xl font-bold">Dashboard</h2>
              <p className="text-xs lg:text-sm text-gray-400 hidden sm:block">banerjeesampriti7@gmail.com</p>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              {images.original && (
                <button 
                  onClick={resetEditor}
                  className="text-xs lg:text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block"
                >
                  Clear Workspace
                </button>
              )}
            </div>
          </div>
        </nav>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-y-auto h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)]">
        <div className="px-4 lg:px-8 py-4 lg:py-8 min-h-full flex justify-center">
          {currentPage === 'home' ? (
            !images.original ? (
              <div className="max-w-4xl w-full">
                {/* Mode Selector - Always visible at top */}
                <div className="mb-4 lg:mb-8">
                  <h3 className="text-[#FF1F1F] text-xl lg:text-2xl font-bold mb-4 lg:mb-6">Get Started</h3>
                  
                  {/* Mode Selector Buttons */}
                  <div className="flex justify-center gap-2 lg:gap-3 mb-4 lg:mb-6">
                    <button 
                      onClick={() => setEditMode('prompt')}
                      className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-semibold flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm transition-all ${
                        editMode === 'prompt' ? 'glass-button text-white' : 'glass-panel text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Prompt
                    </button>
                    <button 
                      onClick={() => setEditMode('recreate')}
                      className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-semibold flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm transition-all ${
                        editMode === 'recreate' ? 'glass-button text-white' : 'glass-panel text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Recreate
                    </button>
                    <button 
                      onClick={() => setEditMode('edit')}
                      className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-semibold flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm transition-all ${
                        editMode === 'edit' ? 'glass-button text-white' : 'glass-panel text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
                
                {/* Dynamic Content Box with Animation */}
                {editMode === 'prompt' ? (
                  /* CHAT-STYLE PROMPT MODE */
                  generationHistory.length === 0 ? (
                    /* CENTERED LAYOUT - Before first generation */
                    <div className="flex items-center justify-center h-[calc(100vh-20rem)] -mt-12">
                      <div className="max-w-3xl w-full">
                        {/* Start Creating Icon and Text */}
                        <div className="text-center mb-8">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full glass-panel flex items-center justify-center">
                            <svg className="w-10 h-10 text-[#FF1F1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold mb-2">Start Creating</h3>
                          <p className="text-gray-400 text-sm">Describe your YouTube thumbnail and watch it come to life</p>
                        </div>

                        {/* Centered Prompt Box */}
                        <div className="glass-panel rounded-2xl p-5">
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (prompt.trim() && !isLoading) handleGenerate();
                              }
                            }}
                            placeholder="Describe your YouTube thumbnail... (Press Enter to generate)"
                            className="w-full bg-transparent text-white text-base placeholder:text-gray-600 focus:outline-none resize-none mb-3"
                            rows={2}
                          />
                          
                          {/* Bottom Controls */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/10">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setShowPersonaModal(true)}
                                className={`px-3 py-2 rounded-xl glass-panel text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 text-xs font-medium transition-all ${
                                  selectedPersona ? 'border border-[#FF1F1F]/30 bg-[#FF1F1F]/10' : ''
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Personas
                              </button>
                              <button 
                                onClick={toggleVoiceInput}
                                className={`w-8 h-8 rounded-xl glass-panel flex items-center justify-center transition-all ${
                                  isListening ? 'bg-[#FF1F1F]/20 border border-[#FF1F1F] text-[#FF1F1F] animate-pulse' : 'text-gray-400 hover:bg-white/5'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                              </button>
                              <button 
                                onClick={handleEnhancePrompt}
                                disabled={isEnhancing || !prompt.trim()}
                                className="px-3 py-2 rounded-xl glass-panel text-gray-300 hover:bg-white/5 flex items-center gap-2 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                {isEnhancing ? 'Enhancing...' : 'Enhance'}
                              </button>
                            </div>
                            
                            <button
                              onClick={handleGenerate}
                              disabled={isLoading || !prompt.trim()}
                              className="px-6 py-2.5 rounded-xl glass-button text-white font-bold flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              {isLoading ? 'Generating...' : 'Generate'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CHAT LAYOUT - After first generation */
                    <div className="flex flex-col h-[calc(100vh-16rem)]">
                      {/* Generation History (Chat Messages) */}
                      <div className="flex-1 overflow-y-auto mb-4 space-y-6 px-2 pb-4">
                        {generationHistory.map((item, index) => (
                          <div key={index} className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                            {/* User Prompt */}
                            <div className="w-full flex justify-end mb-3">
                              <div className="glass-panel rounded-2xl px-5 py-3 max-w-xl">
                                <p className="text-sm text-gray-300">{item.prompt}</p>
                              </div>
                            </div>
                            
                            {/* Generated Image - Smaller container */}
                            <div className="glass-panel rounded-2xl p-4 max-w-2xl w-full">
                              <div className="relative w-full bg-black/30 rounded-xl overflow-hidden mb-6" style={{ maxHeight: '350px' }}>
                                <img 
                                  src={item.image} 
                                  alt="Generated thumbnail" 
                                  className="w-full h-auto object-cover"
                                  style={{ aspectRatio: '16/9', maxHeight: '350px' }}
                                />
                              </div>
                              
                              {/* Action Buttons Below Image */}
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = item.image;
                                    link.download = `humixo-thumbnail-${item.timestamp}.png`;
                                    link.click();
                                  }}
                                  className="flex-1 px-4 py-2.5 rounded-xl glass-button text-white font-semibold flex items-center justify-center gap-2 text-sm hover:brightness-110 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </button>
                                <button 
                                  onClick={async () => {
                                    // Check credits first (local only)
                                    const generationCost = creditsService.getGenerationCost();
                                    if (credits < generationCost) {
                                      setError(`Insufficient credits. You need ${generationCost} credits to recreate an image.`);
                                      return;
                                    }

                                    setIsLoading(true);
                                    setError(null);
                                    try {
                                      // Deduct credits locally (no Firebase)
                                      setCredits(prev => prev - generationCost);

                                      // Tweak the prompt using ChatGPT
                                      const tweakedPrompt = await geminiService.recreatePrompt(item.prompt);
                                      
                                      // Generate new image with tweaked prompt
                                      const result = await geminiService.generateImageFromPrompt(tweakedPrompt, selectedPersona);
                                      
                                      // Add to generation history
                                      setGenerationHistory(prev => [...prev, {
                                        prompt: tweakedPrompt,
                                        image: result,
                                        timestamp: Date.now()
                                      }]);
                                    } catch (err: any) {
                                      console.error('Recreate error:', err);
                                      
                                      // Refund credits locally if failed
                                      setCredits(prev => prev + generationCost);
                                      
                                      setError(err.message || 'Failed to recreate image. Please try again.');
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex-1 px-4 py-2.5 rounded-xl glass-panel text-gray-400 hover:bg-white/5 hover:text-white font-semibold flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Recreate
                                </button>
                                <button 
                                  onClick={() => {
                                    setImages({ original: item.image, edited: null, mask: null });
                                    setEditMode('edit');
                                    setMode(EditorMode.GENERAL);
                                  }}
                                  className="flex-1 px-4 py-2.5 rounded-xl glass-panel text-gray-400 hover:bg-white/5 hover:text-white font-semibold flex items-center justify-center gap-2 text-sm transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 mt-3 border-t border-white/10">
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Generated successfully
                                </span>
                                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Sticky Prompt Box at Bottom */}
                      <div className="glass-panel rounded-2xl p-4 flex-shrink-0">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (prompt.trim() && !isLoading) handleGenerate();
                            }
                          }}
                          placeholder="Describe your YouTube thumbnail... (Press Enter to generate)"
                          className="w-full bg-transparent text-white text-sm placeholder:text-gray-600 focus:outline-none resize-none mb-2"
                          rows={2}
                        />
                        
                        {/* Bottom Controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => setShowPersonaModal(true)}
                              className={`px-2.5 py-1.5 rounded-lg glass-panel text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-all ${
                                selectedPersona ? 'border border-[#FF1F1F]/30 bg-[#FF1F1F]/10' : ''
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span className="hidden sm:inline">Personas</span>
                            </button>
                            <button 
                              onClick={toggleVoiceInput}
                              className={`w-7 h-7 rounded-lg glass-panel flex items-center justify-center transition-all ${
                                isListening ? 'bg-[#FF1F1F]/20 border border-[#FF1F1F] text-[#FF1F1F] animate-pulse' : 'text-gray-400 hover:bg-white/5'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                            </button>
                            <button 
                              onClick={handleEnhancePrompt}
                              disabled={isEnhancing || !prompt.trim()}
                              className="px-2.5 py-1.5 rounded-lg glass-panel text-gray-300 hover:bg-white/5 flex items-center gap-1.5 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                              <span className="hidden sm:inline">{isEnhancing ? 'Enhancing...' : 'Enhance'}</span>
                            </button>
                          </div>
                          
                          <button
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt.trim()}
                            className="px-5 py-1.5 rounded-lg glass-button text-white font-bold flex items-center gap-1.5 text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {isLoading ? 'Generating...' : 'Generate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : editMode === 'recreate' ? (
                  <div className="glass-panel rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Upload/Link Toggle - Animated sequence */}
                    <div className="flex justify-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-700" style={{ animationDelay: '100ms' }}>
                      <button 
                        onClick={() => setUploadMethod('upload')}
                        className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all ${
                          uploadMethod === 'upload' ? 'glass-button' : 'glass-panel text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload
                      </button>
                      <button 
                        onClick={() => setUploadMethod('link')}
                        className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all ${
                          uploadMethod === 'link' ? 'glass-button' : 'glass-panel text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Link
                      </button>
                    </div>

                    {/* Upload Area or Link Input - Animated */}
                    {uploadMethod === 'upload' ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-700 rounded-xl p-8 mb-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF1F1F]/50 transition-all animate-in fade-in zoom-in-95 duration-700"
                        style={{ animationDelay: '200ms' }}
                      >
                        <svg className="w-12 h-12 text-[#FF1F1F] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-400 text-xs">Click to upload or drag and drop</p>
                      </div>
                    ) : (
                      <div className="mb-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="Link to a thumbnail or a YouTube video."
                            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#FF1F1F]/50"
                          />
                          <button
                            onClick={handleFetchLink}
                            disabled={!linkUrl.trim() || isLoading}
                            className="glass-button px-6 py-3 rounded-xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Persona button - Animated */}
                    <div className="flex justify-center mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: '300ms' }}>
                      <button 
                        onClick={() => setShowPersonaModal(true)}
                        className={`glass-panel px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 text-sm transition-all ${
                          selectedPersona ? 'border border-[#FF1F1F]/30 bg-[#FF1F1F]/10' : ''
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {selectedPersona ? selectedPersona.name : 'Persona'}
                        {selectedPersona && (
                          <svg className="w-3.5 h-3.5 text-[#FF1F1F]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Description textarea - Animated */}
                    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms' }}>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe what you'd like to recreate or change..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#FF1F1F]/50 resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Generate Button - Animated */}
                    <div className="flex justify-center animate-in fade-in zoom-in-95 duration-700" style={{ animationDelay: '500ms' }}>
                      <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="glass-button px-10 py-2.5 rounded-xl font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {isLoading ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Upload/Link Toggle - Animated sequence */}
                    <div className="flex justify-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-700" style={{ animationDelay: '100ms' }}>
                      <button 
                        onClick={() => setUploadMethod('upload')}
                        className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all ${
                          uploadMethod === 'upload' ? 'glass-button' : 'glass-panel text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload
                      </button>
                      <button 
                        onClick={() => setUploadMethod('link')}
                        className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all ${
                          uploadMethod === 'link' ? 'glass-button' : 'glass-panel text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Link
                      </button>
                    </div>

                    {/* Upload Area or Link Input - Animated */}
                    {uploadMethod === 'upload' ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-700 rounded-xl p-8 mb-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF1F1F]/50 transition-all animate-in fade-in zoom-in-95 duration-700"
                        style={{ animationDelay: '200ms' }}
                      >
                        <svg className="w-12 h-12 text-[#FF1F1F] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-400 text-xs">Click to upload or drag and drop</p>
                      </div>
                    ) : (
                      <div className="mb-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="Link to a thumbnail or a YouTube video."
                            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#FF1F1F]/50"
                          />
                          <button
                            onClick={handleFetchLink}
                            disabled={!linkUrl.trim() || isLoading}
                            className="glass-button px-6 py-3 rounded-xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Description textarea - Animated */}
                    <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe what you'd like to edit..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#FF1F1F]/50 resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Generate Button - Animated */}
                    <div className="flex justify-center animate-in fade-in zoom-in-95 duration-700" style={{ animationDelay: '400ms' }}>
                      <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="glass-button px-10 py-2.5 rounded-xl font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        {isLoading ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
          ) : (
            <div className="max-w-xl w-full">
              {/* Edit Thumbnail Header */}
              <div className="text-center mb-3">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl glass-panel flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#FF1F1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold">
                  <span className="text-[#FF1F1F]">Edit</span> Thumbnail
                </h2>
              </div>

              {/* Thumbnail Preview - Properly sized to fit */}
              <div className="glass-panel rounded-2xl p-3 mb-3">
                <div className="relative w-full bg-black/30 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <img 
                    ref={imageRef}
                    src={images.original} 
                    alt="Thumbnail" 
                    className="w-full h-full rounded-xl object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const canvas = canvasRef.current;
                      if (canvas) {
                        canvas.width = img.clientWidth;
                        canvas.height = img.clientHeight;
                      }
                    }}
                  />
                  {/* Canvas only in Edit mode */}
                  {mode === EditorMode.GENERAL && (
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full rounded-xl cursor-crosshair"
                      onMouseDown={startPainting}
                      onMouseMove={paint}
                      onMouseUp={stopPainting}
                      onMouseLeave={stopPainting}
                    />
                  )}
                </div>
              </div>

              {/* Edit Options */}
              <div className="flex justify-center gap-3 mb-3">
                <button 
                  onClick={() => setMode(EditorMode.GENERAL)}
                  className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all ${
                    mode === EditorMode.GENERAL
                      ? 'glass-button text-white'
                      : 'glass-panel text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button 
                  onClick={() => setMode(EditorMode.FACE_SWAP)}
                  className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all ${
                    mode === EditorMode.FACE_SWAP
                      ? 'glass-button text-white'
                      : 'glass-panel text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recreate
                </button>
              </div>

              {/* Paint Controls - Only show in Edit mode */}
              {mode === EditorMode.GENERAL && (
                <div className="glass-panel rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-300">Brush Size: {brushSize}px</span>
                    <button
                      onClick={clearCanvas}
                      className="text-xs px-2 py-1 rounded-lg glass-panel text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF1F1F]"
                  />
                </div>
              )}

              {/* Persona - Only show in Recreate mode */}
              {mode === EditorMode.FACE_SWAP && (
                <div className="flex justify-center mb-3">
                  <button 
                    onClick={() => setShowPersonaModal(true)}
                    className={`glass-panel px-4 py-2 rounded-xl font-medium text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 text-sm transition-all ${
                      selectedPersona ? 'border border-[#FF1F1F]/30 bg-[#FF1F1F]/10' : ''
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {selectedPersona ? selectedPersona.name : 'Persona'}
                    {selectedPersona && (
                      <svg className="w-3.5 h-3.5 text-[#FF1F1F]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Description Box */}
              <div className="glass-panel rounded-xl p-3 mb-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you'd like to add, remove or replace..."
                  className="w-full bg-transparent text-white text-sm placeholder:text-gray-600 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              {/* Generate Button - Always visible */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="glass-button px-8 py-2 rounded-xl font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {isLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          )
        ) : currentPage === 'optimize' ? (
          <div className="max-w-2xl w-full mx-auto">
            <div className="text-center mb-3">
              <h2 className="text-lg font-bold mb-1">Optimize Your Thumbnail</h2>
              <p className="text-gray-400 text-xs">Get AI-powered insights</p>
            </div>

            {!images.original ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF1F1F]/50 transition-all glass-panel"
              >
                <svg className="w-10 h-10 text-[#FF1F1F] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold mb-1">Upload Thumbnail</p>
                <p className="text-gray-400 text-xs">Click to upload</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Thumbnail Preview - Much Smaller */}
                <div className="glass-panel rounded-lg p-1.5 max-w-md mx-auto">
                  <div className="relative w-full bg-black/30 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <img 
                      src={images.original} 
                      alt="Thumbnail to analyze" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Analysis Results */}
                {images.edited ? (
                  <div className="space-y-2">
                    {/* Virality Score - Smaller */}
                    <div className="glass-panel rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <svg className="w-3 h-3 text-[#FF1F1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h3 className="text-xs font-bold">Virality Score</h3>
                        <span className="ml-auto text-xl font-black text-[#FF1F1F]">{JSON.parse(images.edited).viralityScore}</span>
                      </div>
                      <div className="bg-black/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#FF1F1F] to-green-500 transition-all duration-1000"
                          style={{ width: `${JSON.parse(images.edited).viralityScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Pros and Cons - Smaller */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="glass-panel rounded-lg p-2">
                        <h3 className="text-[10px] font-bold mb-1.5 flex items-center gap-1 text-green-400">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Pros
                        </h3>
                        <ul className="space-y-1">
                          {JSON.parse(images.edited).pros.map((pro: string, index: number) => (
                            <li key={index} className="flex items-start gap-1 text-[10px] leading-tight text-gray-300">
                              <span className="text-green-400 text-[8px] mt-0.5 flex-shrink-0">✓</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="glass-panel rounded-lg p-2">
                        <h3 className="text-[10px] font-bold mb-1.5 flex items-center gap-1 text-orange-400">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Cons
                        </h3>
                        <ul className="space-y-1">
                          {JSON.parse(images.edited).cons.map((con: string, index: number) => (
                            <li key={index} className="flex items-start gap-1 text-[10px] leading-tight text-gray-300">
                              <span className="text-orange-400 text-[8px] mt-0.5 flex-shrink-0">✗</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Suggestions - Smaller */}
                    <div className="glass-panel rounded-lg p-2">
                      <h3 className="text-[10px] font-bold mb-1.5 flex items-center gap-1 text-[#FF1F1F]">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Suggestions
                      </h3>
                      <ul className="space-y-1">
                        {JSON.parse(images.edited).suggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="flex items-start gap-1.5 text-[10px] leading-tight text-gray-300">
                            <span className="flex-shrink-0 w-3 h-3 rounded-full bg-[#FF1F1F]/20 text-[#FF1F1F] flex items-center justify-center text-[8px] font-bold mt-0.5">
                              {index + 1}
                            </span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Buttons - Smaller */}
                    <div className="flex gap-2">
                      <button
                        onClick={resetEditor}
                        className="flex-1 glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/5 transition-all"
                      >
                        Analyze Another
                      </button>
                      <button
                        onClick={() => setCurrentPage('home')}
                        className="flex-1 glass-button px-3 py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition-all"
                      >
                        Create New
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        setError(null);
                        try {
                          const analysis = await geminiService.analyzeThumbnail(images.original!);
                          setImages(prev => ({ ...prev, edited: JSON.stringify(analysis) }));
                        } catch (err: any) {
                          console.error('Analysis error:', err);
                          setError(err.message || 'Failed to analyze thumbnail. Please try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="glass-button px-5 py-2 rounded-lg font-bold text-xs text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {isLoading ? 'Analyzing...' : 'Analyze Thumbnail'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl w-full mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Choose Your Plan</h2>
              <p className="text-gray-400 text-lg">Scale your thumbnail creation with the perfect plan</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Starter Plan */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col">
                <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold mb-4 self-start">
                  CURRENT PLAN
                </div>
                
                <h3 className="text-2xl font-bold mb-1">Starter</h3>
                <p className="text-gray-400 text-sm mb-4">For individual creators</p>
                
                <div className="mb-4">
                  <span className="text-gray-500 line-through text-lg">$15 USD</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">$12</span>
                    <span className="text-gray-400 text-sm">USD /mo</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">$144 billed annually</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm mb-2">
                    Create up to <span className="text-[#FF1F1F] font-bold">30</span> thumbnails/month 🔥
                  </p>
                </div>

                <button className="w-full glass-button py-3 rounded-xl font-bold mb-6 hover:brightness-110 transition-all">
                  Get Starter Yearly
                </button>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm"><span className="text-[#FF1F1F] font-bold">300</span> credits/month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Recreate any thumbnail</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Generate super thumbnails with prompts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Edit thumbnails with AI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">4K resolution quality</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Persona feature</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Style feature</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col border-2 border-[#FF1F1F] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full glass-button text-xs font-bold">
                  LITE PLAN
                </div>
                
                <h3 className="text-2xl font-bold mb-1 mt-2">Pro</h3>
                <p className="text-gray-400 text-sm mb-4">For professional creators, marketers & teams</p>
                
                <div className="mb-4">
                  <span className="text-gray-500 line-through text-lg">$20 USD</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[#FF1F1F]">$9.99</span>
                    <span className="text-gray-400 text-sm">USD /mo</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">$119.88 billed annually</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm mb-2">
                    <span className="text-[#FF1F1F] font-bold">80</span> thumbnails/month Create up to 🔥
                  </p>
                </div>

                <button className="w-full glass-button py-3 rounded-xl font-bold mb-6 hover:brightness-110 transition-all">
                  Get Pro Yearly
                </button>

                <p className="text-sm font-semibold mb-3">Everything in Starter, plus:</p>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex items-center gap-2">
                      <span className="text-sm"><span className="text-[#FF1F1F] font-bold">800</span> credits/month</span>
                      <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold">+400 BONUS</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Recreate any thumbnail</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Generate super thumbnails with prompts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Edit thumbnails with AI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">4K resolution quality</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Persona feature</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Style feature</span>
                  </div>
                </div>
              </div>

              {/* Business Plan */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col">
                <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold mb-4 self-start">
                  BUSINESS PLAN
                </div>
                
                <h3 className="text-2xl font-bold mb-1">Business</h3>
                <p className="text-gray-400 text-sm mb-4">For organizations that need tailored solutions</p>
                
                <div className="mb-4 flex-1 flex flex-col justify-center items-center py-8">
                  <div className="text-3xl font-black text-white mb-2">Custom Pricing</div>
                  <p className="text-sm text-gray-400">Customized credits & packs</p>
                </div>

                <button className="w-full glass-panel border border-white/20 py-3 rounded-xl font-bold mb-6 hover:bg-white/5 transition-all">
                  Contact Us
                </button>

                <p className="text-sm font-semibold mb-3">Everything in Pro, plus:</p>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Customized credits</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Priority processing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Custom team seats</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Dedicated support</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">API access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {isLoading && <LoadingOverlay />}

      {/* Error Display */}
      {error && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel rounded-3xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#FF1F1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Error</h3>
              </div>
              <button 
                onClick={() => setError(null)}
                className="w-8 h-8 rounded-full glass-panel hover:bg-white/5 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 mb-6">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="w-full glass-button py-3 rounded-xl font-semibold hover:brightness-110 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Persona Modal */}
      {showPersonaModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel rounded-3xl p-8 max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Create Persona</h3>
              <button 
                onClick={() => {
                  setShowPersonaModal(false);
                  setNewPersonaImages([]);
                  setNewPersonaName('');
                }}
                className="w-8 h-8 rounded-full glass-panel hover:bg-white/5 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Existing Personas */}
            {personas.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Your Personas</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {personas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPersonaId(p.id);
                        setShowPersonaModal(false);
                      }}
                      className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                        selectedPersonaId === p.id 
                          ? 'bg-[#FF1F1F]/10 border-[#FF1F1F] text-white' 
                          : 'glass-panel border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                        <img src={p.images[0]} className="w-full h-full object-cover" alt={p.name} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className="text-xs opacity-60">Trained</p>
                      </div>
                      {selectedPersonaId === p.id && (
                        <svg className="w-5 h-5 text-[#FF1F1F]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Persona */}
            <div className="border-t border-white/10 pt-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Add New Persona</h4>
              
              <input 
                type="text"
                placeholder="Persona Name"
                value={newPersonaName}
                onChange={(e) => setNewPersonaName(e.target.value)}
                className="w-full input-field rounded-xl px-4 py-3 text-white text-sm mb-4"
              />

              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({length: 10}).map((_, i) => (
                  <div 
                    key={i} 
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${
                      newPersonaImages[i] ? 'border-[#FF1F1F] bg-[#FF1F1F]/10' : 'border-dashed border-gray-700 bg-black/30'
                    }`}
                  >
                    {newPersonaImages[i] ? (
                      <img src={newPersonaImages[i]} className="w-full h-full object-cover rounded-lg" alt={`Upload ${i+1}`} />
                    ) : (
                      <span className="text-xs text-gray-600">{i + 1}</span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mb-4">Upload 10 high-quality photos of the same person from different angles</p>

              <div className="flex gap-3">
                <button 
                  onClick={() => personaInputRef.current?.click()}
                  className="flex-1 py-3 glass-panel hover:bg-white/5 rounded-xl font-semibold text-sm transition-all"
                >
                  Add Photos ({newPersonaImages.length}/10)
                </button>
                <button 
                  onClick={handleTrainPersona}
                  disabled={newPersonaImages.length < 10 || !newPersonaName || isTraining}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                    newPersonaImages.length === 10 && newPersonaName 
                    ? 'glass-button text-white hover:brightness-110' 
                    : 'glass-panel text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isTraining ? 'Training...' : 'Train Persona'}
                </button>
              </div>

              <input 
                type="file" 
                multiple 
                ref={personaInputRef} 
                onChange={handlePersonaUpload} 
                accept="image/*"
                className="hidden" 
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default App;
