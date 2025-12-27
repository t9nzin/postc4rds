"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send, Download } from 'lucide-react';
import { useState } from 'react';

export default function ResultPage() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-full overflow-y-auto bg-white px-8 md:px-16 py-12 flex flex-col" style={{ fontFamily: "'Instrument Serif', serif" }}>
      {/* Header */}
      <div className="mb-16">
        <Link href="/create">
            <button className="inline-flex items-center gap-2 text-black hover:text-black/70 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to create
            </button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col justify-center">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl leading-[0.95] tracking-tight mb-4">
            your <em>generated</em> postcard
          </h1>
          <p className="text-xl md:text-2xl text-black/60">
            Share it with someone special
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
          {/* Left Column: Postcard and Download */}
          <div className="space-y-6">
            <div className="aspect-[4/3] rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Placeholder for generated postcard - will be replaced with actual AI-generated image */}
              <Image
                src="/postcard1.jpg"
                alt="Generated postcard"
                fill 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Download Button */}
            <button className="w-full px-8 h-14 border border-black/20 text-black hover:bg-black/5 transition-all duration-300 rounded-full inline-flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Download Postcard
            </button>
          </div>

          {/* Right Column: Message and Send */}
          <div className="space-y-6 flex flex-col">
            {/* Optional Message */}
            <div className="flex-1">
              <label className="block text-2xl mb-4">
                Message <span className="text-black/40 text-lg">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a personal message to include with your postcard..."
                className="w-full h-78 px-6 py-4 rounded-2xl border border-black/20 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-black/40 transition-colors resize-none placeholder:text-black/30"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              />
            </div>

            {/* Email Input and Send Button */}
            <div>
              <label className="block text-2xl mb-4">
                Send to
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@email.com"
                  className="flex-1 h-14 px-6 rounded-full border border-black/20 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-black/40 transition-colors placeholder:text-black/30"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                />
                <button className="h-14 px-8 bg-black text-white hover:bg-black/70 transition-all duration-300 rounded-full flex items-center justify-center gap-2 whitespace-nowrap">
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}