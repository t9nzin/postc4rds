"use client";

import Link from "next/link";
import { ArrowLeft, Send, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface Postcard {
  id: string;
  originalPhotoUrl: string;
  generatedImageUrl: string | null;
  aiPrompt: string | null;
  status: string;
  message: string | null;
  recipientEmail: string | null;
}

export default function ResultPage() {
  const params = useParams();
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchPostcard = async () => {
      try {
        const response = await fetch(`/api/postcards/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setPostcard(data);
        } else {
          console.error('Failed to fetch postcard');
        }
      } catch (error) {
        console.error('Error fetching postcard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostcard();
  }, [params.id]);

  const handleSendPostcard = async () => {
    // Validate email
    if (!email) {
      toast('Please enter a recipient email');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/postcards/${params.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          senderName,
          recipientEmail: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Postcard sent successfully!');
        // Clear form
        setMessage('');
        setSenderName('');
        setEmail('');
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to send postcard:', error);
      toast.error('Failed to send postcard. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <p className="text-xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Loading postcard...
        </p>
      </div>
    );
  }

  if (!postcard) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <p className="text-xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Postcard not found
        </p>
      </div>
    );
  }

  return (
    <>
    <Toaster position="top-center" richColors />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          {/* Left Column: Postcard */}
          <div>
            <div className="aspect-[4/3] rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <img
                src={postcard.generatedImageUrl || postcard.originalPhotoUrl}
                alt="Generated postcard"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Column: Message */}
          <div>
            <label className="block text-2xl mb-4">
              Message <span className="text-black/40 text-lg">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              placeholder="Write a personal message to include with your postcard..."
              className="w-full h-[400px] px-6 py-4 rounded-2xl border border-black/20 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-black/40 transition-colors resize-none placeholder:text-black/30"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            />
            <p
            className={`mt-2 text-sm text-right ${
              message.length == 200
                ? "text-red-500"
                : message.length > 170
                ? "text-amber-500"
                : "text-black/40"
            }`}
            >{message.length} / 200 characters</p>
          </div>
        </div>

        {/* Bottom Row: Sender Name and Send To side by side */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          {/* Sender Name */}
          <div>
            <label className="block text-2xl mb-4">
              Your name <span className="text-black/40 text-lg">(optional, but recommended)</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
              className="w-full h-14 px-6 rounded-full border border-black/20 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-black/40 transition-colors placeholder:text-black/30"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            />
          </div>

          {/* Send To */}
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
              <button
                onClick={handleSendPostcard}
                disabled={sending}
                className="h-14 px-8 bg-black text-white hover:bg-black/70 disabled:bg-black/40 disabled:cursor-not-allowed transition-all duration-300 rounded-full flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Send className="w-5 h-5" />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}