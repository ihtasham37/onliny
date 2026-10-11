import React from 'react';
import { Icons } from '../icons/Icons';
import { resolveImageUrl, DEFAULT_PLACEHOLDER_IMAGE } from '../../utils/imageResolver';

interface MediaPreviewProps {
  src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showVideoBadge?: boolean;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ 
  src, 
  className, 
  controls = true, 
  autoPlay = false, 
  loop = false, 
  muted = true,
  showVideoBadge = true
}) => {
  const resolvedSrc = resolveImageUrl(src);

  if (!resolvedSrc) {
    return (
      <div className={`${className || 'w-full h-full'} flex items-center justify-center bg-gray-100 text-gray-400 rounded`}>
        <Icons.image className="w-8 h-8 opacity-60" />
      </div>
    );
  }

  const isVideo = Boolean(
    resolvedSrc.match(/\.(mp4|webm|ogg|mov|avi|m4v)($|\?)/i) || 
    resolvedSrc.includes('video/upload') ||
    resolvedSrc.includes('/videos/') ||
    resolvedSrc.includes('type=video')
  );

  if (isVideo) {
    return (
      <div className={`relative overflow-hidden ${className || 'w-full h-full'}`}>
        <video
          src={resolvedSrc}
          className="w-full h-full object-cover rounded"
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
        />
        {/* Video Icon Indicator when video is previewed without full controls or in thumbnails */}
        {showVideoBadge && !controls && (
          <div className="absolute top-2 left-2 pointer-events-none z-10 flex items-center gap-1 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md border border-white/20">
            <Icons.play className="w-2.5 h-2.5 fill-white text-white" />
            <span>Video</span>
          </div>
        )}
        {showVideoBadge && !controls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
              <Icons.play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      className={`${className || 'w-full h-full'} object-cover rounded`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (target.src && target.src.startsWith('http') && !target.src.includes('/api/proxy-image') && !target.src.includes(window.location.origin)) {
          target.src = `/api/proxy-image?url=${encodeURIComponent(target.src)}`;
          return;
        }
        if (target.src !== window.location.origin + DEFAULT_PLACEHOLDER_IMAGE && !target.src.endsWith(DEFAULT_PLACEHOLDER_IMAGE)) {
          target.src = DEFAULT_PLACEHOLDER_IMAGE;
        }
      }}
    />
  );
};
