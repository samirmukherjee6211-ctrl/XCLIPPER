import React, { useState, useEffect } from 'react';

const LoadingOverlay: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Creating your thumbnail...",
    "Adding details...",
    "Enhancing colors...",
    "Almost ready...",
    "Finalizing your image..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="relative mb-16">
        <div className="w-32 h-32 border-8 border-[#FF1F1F]/10 rounded-full"></div>
        <div className="absolute inset-0 w-32 h-32 border-t-8 border-[#FF1F1F] rounded-full animate-[spin_1.5s_linear_infinite]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-image text-4xl text-[#FF1F1F] animate-pulse"></i>
        </div>
        
        {/* Decorative scanning line */}
        <div className="absolute -inset-4 border border-[#FF1F1F]/20 rounded-full animate-ping opacity-20"></div>
      </div>
      
      <div className="text-center px-10">
        <h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-[#FF1F1F] via-white to-[#FF1F1F] bg-clip-text text-transparent uppercase tracking-[0.2em]">
            {messages[messageIndex]}
        </h2>
        <div className="flex items-center justify-center gap-3 text-slate-500 font-black uppercase tracking-widest text-[10px]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF1F1F] animate-pulse"></span>
            GENERATING
        </div>
        <p className="mt-8 text-slate-600 text-[11px] font-bold max-w-sm mx-auto uppercase tracking-tighter leading-relaxed">
            XClipper is generating your professional YouTube thumbnail. This may take a few moments.
        </p>
      </div>
      
      <div className="mt-20 flex gap-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="w-1.5 h-8 bg-[#FF1F1F]/10 rounded-full overflow-hidden relative">
             <div className="absolute inset-x-0 bottom-0 bg-[#FF1F1F] animate-progress-vertical" style={{ animationDelay: `${i * 0.1}s` }}></div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes progress-vertical {
          0% { height: 0%; opacity: 0; }
          50% { height: 100%; opacity: 1; }
          100% { height: 0%; opacity: 0; }
        }
        .animate-progress-vertical {
          animation: progress-vertical 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
