"use client";

import { Upload, Sparkles, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import { toast, Toaster } from 'sonner';

export default function CreatePage() {
  const router = useRouter();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Starting...');

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

  const handleGeneratePostcard = async () => {
    // Validate that image is uploaded
    if (!uploadedImage) {
      toast('Please upload an image first');
      return;
    }

    setIsLoading(true);
    setProgress(5);
    setStatusMessage('Uploading your image...');

    try {
      // Step 1: Upload image directly to Cloudinary from frontend
      console.log('Uploading image to Cloudinary...');
      const formData = new FormData();
      formData.append('file', uploadedImage);
      formData.append('upload_preset', 'postcards_upload');

      const cloudinaryUpload = await fetch(
        `https://api.cloudinary.com/v1_1/dvn8fwibn/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const cloudinaryData = await cloudinaryUpload.json();

      if (!cloudinaryUpload.ok) {
        console.error('Cloudinary error:', cloudinaryData);
        throw new Error(`Failed to upload image to Cloudinary: ${cloudinaryData.error?.message || 'Unknown error'}`);
      }

      const imageUrl = cloudinaryData.secure_url;
      console.log('Image uploaded to Cloudinary:', imageUrl);

      // Step 2: Create postcard with Cloudinary URL (not base64)
      const createResponse = await fetch('/api/postcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalPhotoUrl: imageUrl, // Cloudinary URL instead of base64
          aiPrompt: prompt || '', // Optional prompt
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        console.error('Error creating postcard:', createData.error);
        toast.error(`Error: ${createData.error}`);
        return;
      }

      const postcardId = createData.id;
      console.log('Postcard created:', postcardId);

      // Step 2: Start AI generation (non-blocking, handle errors in background)
      console.log('Starting AI generation...');
      fetch(`/api/postcards/${postcardId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (response) => {
        if (response.status === 429) {
          const errorData = await response.json();
          toast.error(errorData.error || 'Rate limit exceeded. Please try again later.');
          setIsLoading(false);
          return;
        }
        if (!response.ok) {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to generate postcard');
          setIsLoading(false);
        }
      }).catch(error => {
        console.error('Error in generation request:', error);
        toast.error('Failed to start generation. Please try again.');
        setIsLoading(false);
      });

      // Step 3: Poll for progress (starts immediately, doesn't wait for generation)
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/postcards/${postcardId}/status`);
          const statusData = await statusResponse.json();

          // Only update progress if it moves forward (prevents race condition glitch)
          if (statusData.generationProgress !== undefined) {
            setProgress(prev => Math.max(prev, statusData.generationProgress));
          }
          if (statusData.generationStatus) {
            setStatusMessage(statusData.generationStatus);
          }

          // Check if generation is complete
          if (statusData.status === 'generated' && statusData.generationProgress === 100) {
            clearInterval(pollInterval);
            clearTimeout(safetyTimeout);
            console.log('Generation complete!');
            router.push(`/postcards/${postcardId}`);
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 2000); // Poll every 2 seconds

      // Safety timeout after 2 minutes
      const safetyTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        toast.error('Generation is taking longer than expected. Please check back later.');
        setIsLoading(false);
      }, 120000);
    } catch (error) {
      console.error('Failed to generate postcard:', error);
      toast.error('Failed to generate postcard. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading screen when generating
  if (isLoading) {
    return <LoadingScreen progress={progress} statusMessage={statusMessage} />;
  }

  return (
    <>
    <Toaster position="top-center" richColors />
    <div className="min-h-full overflow-y-auto bg-white px-8 md:px-16 py-12 flex flex-col" style={{ fontFamily: "'Instrument Serif', serif" }}>
      {/* Header */}
      <div className="mb-16">
        <Link href="/">
          <button className="inline-flex items-center gap-2 text-black hover:text-black/70 transition-colors">
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
                  className="block w-full aspect-4/3 rounded-2xl border-2 border-dashed border-black/20 bg-white/50 backdrop-blur-sm hover:border-black/40 transition-colors cursor-pointer overflow-hidden"
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
            <div className="relative w-full aspect-4/3">
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
          <button
            onClick={handleGeneratePostcard}
            className="px-12 py-4 bg-black text-white hover:bg-black/70 transition-all duration-300 rounded-full inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Generate Postcard
          </button>
        </div>
      </div>
    </div>
    </>
  );
}