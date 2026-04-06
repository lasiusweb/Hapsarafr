import React, { useState, useRef } from 'react';
import { FieldError } from './FieldError';

interface PhotoCaptureProps {
  photo: string;
  onChange: (photo: string) => void;
  error?: string;
}

export function PhotoCapture({ photo, onChange, error }: PhotoCaptureProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please use file upload.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onChange(dataUrl);
        closeCamera();
      }
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 480;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            onChange(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    onChange('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Photo <span className="text-gray-400">(optional)</span>
        </label>
        
        {!photo ? (
          <div className="mt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={openCamera}
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </button>
            <span className="text-center text-gray-400">or</span>
            <label className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              Upload Photo
            </label>
          </div>
        ) : (
          <div className="relative mt-2">
            <img src={photo} alt="Farmer" className="w-32 h-32 object-cover rounded-lg border" />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && <FieldError message={error} />}
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex justify-around p-4 bg-gray-900">
            <button onClick={closeCamera} className="px-4 py-2 bg-red-600 text-white rounded">Cancel</button>
            <button onClick={capturePhoto} className="px-4 py-2 bg-green-600 text-white rounded">Capture</button>
          </div>
        </div>
      )}
    </div>
  );
}