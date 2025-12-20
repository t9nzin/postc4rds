"use client";

import { Upload, Sparkles, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import Link from "next/link";

export default function CreatePage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-white px-8 md:px-16 py-12 flex flex-col" style={{ fontFamily: "'Instrument Serif', serif" }}>
      {/* Header */}
      <div className="mb-16">
        <Link href="/">
          <button className="inline-flex items-center gap-2 text-black hover:text-black/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to home
          </button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col justify-center">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl text-black leading-[0.95] tracking-tight mb-4">
            create your <em>postcard</em>
          </h1>
          <p className="text-xl md:text-2xl text-black/60">
            Upload an image and let AI transform it into something beautiful
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Upload & Prompt Section */}
          <div className="space-y-8">
            {/* Image Upload */}
            <div>
              <label className="block text-2xl mb-4 text-black">
                Upload Image
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="block w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-black/20 bg-white/50 backdrop-blur-sm hover:border-black/40 transition-colors cursor-pointer overflow-hidden"
                >
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-black/40">
                      <Upload className="w-12 h-12 mb-4" />
                      <p className="text-lg">Click to upload</p>
                      <p className="text-sm mt-2">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Right: Text Prompt Section */}
          <div>
            <label className="block text-2xl mb-4 text-black">
              Prompt <span className="text-black/40 text-lg">(optional)</span>
            </label>
            <div className="relative w-full aspect-[4/3]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you'd like to see on your postcard... e.g., 'vintage style with warm tones' or 'dreamy watercolor effect'"
                className={`absolute inset-0 w-full h-full px-6 py-4 rounded-2xl border border-black/20 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-black/40 transition-colors resize-none placeholder:text-black/30 ${
    prompt ? "text-black" : "text-black/30"}`}
                style={{ fontFamily: "'Instrument Serif', serif" }}
              />
            </div>
          </div>
        </div>

        {/* Generate Button - Centered */}
        <div className="flex justify-center mt-12">
          <button className="px-12 py-4 bg-black text-white hover:bg-black/70 transition-all duration-300 rounded-full inline-flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Postcard
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <p className="text-base md:text-lg text-black/60">
          built with love by t9nzin
        </p>
      </footer>
    </div>
  );
}
