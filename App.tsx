
import React, { useState, useEffect, useRef } from 'react';
import ParticleScene from './components/ParticleScene';
import HandTracker from './components/HandTracker';
import { HandData } from './types';

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandData | null>(null);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [debug, setDebug] = useState(false);

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <ParticleScene handData={handData} onGestureChange={setIsGestureActive} />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none select-none">
        <div className="max-w-xl">
          <h1 className="text-4xl font-extralight tracking-widest text-pink-200 opacity-80 mb-2">
            MERIANA
          </h1>
          <p className="text-sm text-pink-100/40 uppercase tracking-tighter">
            Gesture interaction system • v1.0
          </p>
        </div>
      </div>

      {/* Hand Tracker Feed (Small overlay) */}
      <div className={`absolute bottom-6 right-6 z-20 transition-opacity duration-500 ${debug ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
        <HandTracker onHandUpdate={setHandData} />
        <p className="text-[10px] text-center mt-2 text-pink-300 opacity-50 uppercase">Hand Feed (Active)</p>
      </div>

      {/* Interaction Guide */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <div className={`px-6 py-3 rounded-full border border-pink-500/30 bg-black/40 backdrop-blur-sm transition-all duration-700 ${isGestureActive ? 'scale-110 border-pink-400 text-pink-300' : 'scale-100 opacity-60'}`}>
          <p className="text-xs font-medium uppercase tracking-[0.2em]">
            {isGestureActive ? '💖 LOVE GESTURE DETECTED 💖' : 'Touch thumb & index to trigger heart burst'}
          </p>
        </div>
      </div>

      {/* Debug Toggle */}
      <button 
        onClick={() => setDebug(!debug)}
        className="absolute bottom-4 left-4 z-20 text-[10px] uppercase opacity-20 hover:opacity-100 transition-opacity pointer-events-auto"
      >
        {debug ? 'Hide Camera' : 'Show Camera'}
      </button>

      {/* Screen Flash for Explosion (Managed via Scene callback or event would be better, but simplified for React) */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 bg-pink-500/10 ${isGestureActive ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};

export default App;
