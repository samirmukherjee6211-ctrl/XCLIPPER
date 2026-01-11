import React, { useState, useRef } from 'react';
import { geminiService } from './services/geminiService';

type Mode = 'prompt' | 'recreate' | 'edit';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('prompt');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // Simulate generation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // TODO: Implement actual generation logic
      console.log('Generating with prompt:', prompt);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold">MIXO</h1>
        </div>
        
        <nav className="flex-1 px-4">
          <div className="mb-8">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-3 px-3">Tools</div>
            <button className="w-full text-left px-3 py-2 rounded-lg bg-red-950/30 text-red-500 border border-red-900/50">
              Customize
            </button>
          </div>
          
          <div className="mb-8">
            <button className="w-full text-left px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-900">
              Guide
            </button>
          </div>
          
          <div>
            <button className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900 text-white font-medium">
              + New Chat
            </button>
          </div>
          
          <div className="mt-4">
            <input 
              type="text" 
              placeholder="Search your chats..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </nav>
        
        <div className="p-4 border-t border-zinc-800">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Recent</div>
          <div className="space-y-1">
            <div className="text-sm text-zinc-400 px-3 py-2 hover:bg-zinc-900 rounded cursor-pointer">
              Man vs Wild Concepts
            </div>
            <div className="text-sm text-zinc-400 px-3 py-2 hover:bg-zinc-900 rounded cursor-pointer">
              Gaming Life
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-zinc-500 text-sm">ankitaaparna10@gmail.com</p>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <span className="text-lg">+</span> New Thumbnail
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 px-8 py-8 overflow-y-auto">
          <div className="max-w-4xl">
            <h3 className="text-red-500 text-xl font-bold mb-6">Get Started</h3>
            
            {/* Mode Selector */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setMode('prompt')}
                className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
                  mode === 'prompt'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <i className="fas fa-wand-magic-sparkles"></i>
                Prompt
              </button>
              <button
                onClick={() => setMode('recreate')}
                className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
                  mode === 'recreate'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <i className="fas fa-rotate"></i>
                Recreate
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
                  mode === 'edit'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <i className="fas fa-pen"></i>
                Edit
              </button>
            </div>

            {/* Input Area */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="man vs wild"
                className="w-full bg-transparent text-white text-lg placeholder:text-zinc-600 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Options Bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button className="px-5 py-2.5 rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 flex items-center gap-2 text-sm font-medium">
                  <i className="fas fa-users"></i>
                  Personas
                </button>
                <button className="px-5 py-2.5 rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 flex items-center gap-2 text-sm font-medium">
                  <i className="fas fa-palette"></i>
                  Styles
                </button>
              </div>
              
              <div className="flex gap-3">
                <button className="w-10 h-10 rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 flex items-center justify-center">
                  <i className="fas fa-microphone"></i>
                </button>
                <button className="w-10 h-10 rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 flex items-center justify-center">
                  <i className="fas fa-sliders"></i>
                  Enhance
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="px-8 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-bolt"></i>
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Generated Content Area */}
            {generatedImage && (
              <div className="mt-8 bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                <img src={generatedImage} alt="Generated" className="w-full rounded-lg" />
              </div>
            )}
          </div>
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default App;
