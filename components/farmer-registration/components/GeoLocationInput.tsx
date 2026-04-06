import React, { useState } from 'react';
import { FieldError } from './FieldError';

interface GeoLocationInputProps {
  latitude?: number;
  longitude?: number;
  onLatitudeChange: (value: number | undefined) => void;
  onLongitudeChange: (value: number | undefined) => void;
  error?: string;
}

export function GeoLocationInput({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  error,
}: GeoLocationInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showManual, setShowManual] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported');
      return;
    }

    setIsLoading(true);
    setStatus('Getting location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLatitudeChange(position.coords.latitude);
        onLongitudeChange(position.coords.longitude);
        setAccuracy(position.coords.accuracy);
        setStatus(`Location captured (Accuracy: ${Math.round(position.coords.accuracy)}m)`);
        setIsLoading(false);
      },
      (err) => {
        setStatus(`Error: ${err.message}`);
        setIsLoading(false);
        setShowManual(true);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleLatChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= -90 && num <= 90) {
      onLatitudeChange(num);
    } else if (value === '') {
      onLatitudeChange(undefined);
    }
  };

  const handleLonChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= -180 && num <= 180) {
      onLongitudeChange(num);
    } else if (value === '') {
      onLongitudeChange(undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location <span className="text-gray-400">(optional)</span>
        </label>

        {!showManual && !latitude ? (
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isLoading ? 'Getting Location...' : 'Get Current Location'}
            </button>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="block text-sm text-blue-600 hover:underline"
            >
              Enter manually
            </button>
            {status && <p className="text-sm text-gray-600">{status}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs text-gray-500">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={latitude ?? ''}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="-90 to 90"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={longitude ?? ''}
                onChange={(e) => handleLonChange(e.target.value)}
                placeholder="-180 to 180"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {latitude && longitude && (
          <button
            type="button"
            onClick={() => {
              onLatitudeChange(undefined);
              onLongitudeChange(undefined);
              setShowManual(false);
              setAccuracy(null);
              setStatus('');
            }}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Clear location
          </button>
        )}

        {accuracy !== null && accuracy > 100 && (
          <p className="mt-2 text-sm text-yellow-600">
            ⚠️ Low accuracy ({Math.round(accuracy)}m). Consider manual entry.
          </p>
        )}

        {error && <FieldError message={error} />}
      </div>
    </div>
  );
}