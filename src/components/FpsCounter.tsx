import React, { useState, useEffect, useRef } from 'react';

interface FpsCounterProps {
  className?: string;
}

export const FpsCounter: React.FC<FpsCounterProps> = ({ className = '' }) => {
  const [fps, setFps] = useState(0);
  const [isVisible, setIsVisible] = useState(true); // Show by default for easier debugging
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const updateFps = () => {
      const now = performance.now();
      frameCountRef.current++;

      // Update FPS every second
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateFps);
    };

    if (isVisible) {
      updateFps();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible]);

  // Toggle visibility with keyboard shortcut (F3)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return null;
  }

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div 
      className={`fixed top-4 left-4 z-50 bg-black bg-opacity-90 text-white px-4 py-3 rounded-lg font-mono text-sm backdrop-blur-sm border-2 border-blue-500 shadow-xl ${className}`}
      style={{ userSelect: 'none', pointerEvents: 'auto' }}
    >
      <div className="flex items-center space-x-2">
        <span className="text-gray-300">FPS:</span>
        <span className={`font-bold text-lg ${getFpsColor(fps)}`}>
          {fps}
        </span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        Press F3 to toggle
      </div>
    </div>
  );
};
