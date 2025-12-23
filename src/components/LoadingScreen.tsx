import { Sparkles } from 'lucide-react';

export default function LoadingScreen() {
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

      <p className="text-lg md:text-xl text-black/60">
        This will just take a moment...
      </p>

      {/* Loading Dots Animation */}
      <div className="flex gap-2 mt-8">
        <div className="w-3 h-3 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}
