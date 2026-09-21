import React from 'react';
import { Icons } from '../icons/Icons';

interface MediaPreviewProps {
  src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ 
  src, 
  className, 
  controls = true, 
  autoPlay = false, 
  loop = false, 
  muted = true 
}) => {
  if (!src || typeof src !== 'string') {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-400 rounded`}>
        <Icons.image className="w-8 h-8" />
      </div>
    );
  }

  const isVideo = src.match(/\.(mp4|webm|ogg|mov|avi)($|\?)/i) || src.includes('video/upload');

  if (isVideo) {
    return (
      <video
        src={src}
        className={`${className} object-cover rounded`}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
      />
    );
  }

  return (
    <img
      src={src}
      className={`${className} object-cover rounded`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/placeholder.svg';
      }}
    />
  );
};
