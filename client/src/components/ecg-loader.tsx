import React from 'react';

interface EcgLoaderProps {
  title?: string;
  minHeight?: string;
  showTitle?: boolean;
  size?: string;
  className?: string;
  text?: string;
}

export const EcgLoader = ({ title, text, minHeight = 'min-h-[200px]', showTitle = true, size, className }: EcgLoaderProps) => {
  const displayTitle = text || title || 'Loading...';
  // Map size to minHeight if provided
  const effectiveMinHeight = size === 'sm' ? 'min-h-0' : size === 'lg' ? 'min-h-[400px]' : minHeight;
  return (
    <div className={`flex flex-col items-center justify-center ${effectiveMinHeight} w-full ${className || ''}`}>
      <svg
        className={`w-32 h-12 ${showTitle ? 'mb-4' : ''}`}
        viewBox="0 0 200 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grid background */}
        <defs>
          <style>{`
            @keyframes pulse-ecg {
              0% {
                stroke-dashoffset: 1000;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            
            .ecg-line {
              fill: none;
              stroke: hsl(var(--primary));
              stroke-width: 2;
              stroke-linecap: round;
              stroke-linejoin: round;
              animation: pulse-ecg 2s linear infinite;
              stroke-dasharray: 1000;
            }
          `}</style>
        </defs>

        {/* ECG Path - creates a heartbeat-like waveform */}
        <path
          className="ecg-line"
          d="M 0 25 L 15 25 L 18 15 L 20 30 L 23 25 L 35 25 L 40 10 L 43 30 L 46 25 L 60 25 L 65 18 L 68 28 L 70 25 L 85 25 L 90 20 L 93 27 L 96 25 L 110 25 L 115 15 L 118 30 L 120 25 L 135 25 L 140 22 L 143 27 L 145 25 L 160 25 L 165 15 L 168 30 L 170 25 L 200 25"
        />
      </svg>
      {showTitle && <p className="text-sm text-muted-foreground animate-pulse">{displayTitle}</p>}
    </div>
  );
};
