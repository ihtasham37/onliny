
import React, { useState } from 'react';
import { Icons } from '../icons/Icons';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, fallbackSrc = "/placeholder.svg", className, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  const onError = () => {
    if (!error) {
      setError(true);
      setImgSrc(fallbackSrc);
    }
  };

  if (error || !imgSrc || typeof imgSrc !== 'string') {
    return (
        <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-400`}>
           <Icons.image className="w-1/2 h-1/2" />
        </div>
    )
  }

  return <img src={imgSrc} onError={onError} className={className} loading="lazy" {...props} />;
};