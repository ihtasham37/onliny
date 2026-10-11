
import React, { useState, useEffect } from 'react';
import { Icons } from '../icons/Icons';
import { resolveImageUrl, DEFAULT_PLACEHOLDER_IMAGE } from '../../utils/imageResolver';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ 
  src, 
  fallbackSrc = DEFAULT_PLACEHOLDER_IMAGE, 
  className = '', 
  alt = '',
  ...props 
}) => {
  const resolved = resolveImageUrl(src);
  const [imgSrc, setImgSrc] = useState<string>(resolved || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const nextUrl = resolveImageUrl(src);
    setImgSrc(nextUrl || fallbackSrc);
    setHasError(false);
  }, [src, fallbackSrc]);

  const onError = () => {
    if (!hasError) {
      if (imgSrc && imgSrc.startsWith('http') && !imgSrc.includes('/api/proxy-image') && !imgSrc.includes(window.location.origin)) {
        setImgSrc(`/api/proxy-image?url=${encodeURIComponent(imgSrc)}`);
        return;
      }
      if (imgSrc !== fallbackSrc && fallbackSrc) {
        setImgSrc(fallbackSrc);
      } else {
        setHasError(true);
      }
    }
  };

  if (hasError || (!imgSrc && !fallbackSrc)) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-400 overflow-hidden`}>
        <Icons.image className="w-1/2 h-1/2 opacity-70" />
      </div>
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt={alt}
      onError={onError} 
      className={className} 
      loading="lazy" 
      referrerPolicy="no-referrer"
      {...props} 
    />
  );
};