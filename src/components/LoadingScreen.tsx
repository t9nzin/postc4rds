import { Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  progress?: number;
  statusMessage?: string;
}

export default function LoadingScreen({ progress = 0, statusMessage = 'Starting...' }: LoadingScreenProps) {
  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center bg-white"
      style={{ fontFamily: "'Instrument Serif', serif" }}
    >
      {/* Animated Sparkles Icon */}
      <div className="relative mb-8">
        <Sparkles
          className="w-16 h-16 text-black animate-pulse"
          strokeWidth={1.5}
        />
      </div>

      {/* Loading Text */}
      <h2 className="text-3xl md:text-4xl text-black mb-4">
        Generating your <em>postcard</em>
      </h2>

      <p className="text-lg md:text-xl text-black/60 mb-8">
        {statusMessage}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-md px-4">
        <div className="relative w-full h-2 bg-black/10 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center mt-3 text-sm text-black/40">
          {progress}%
        </div>
      </div>
    </div>
  );
}
