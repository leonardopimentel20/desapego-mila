'use client';

import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(images[0] || '');

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[450px] bg-neutral-100 rounded-3xl flex items-center justify-center border border-neutral-200 text-sm text-neutral-400">
        Sem Foto Cadastrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-[450px] bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200 shadow-xs flex items-center justify-center">
        <img
          src={selectedImage}
          alt={title}
          className="w-full h-full object-cover transition-all duration-300"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, index) => {
            const isSelected = img === selectedImage;
            return (
              <button
                type="button"
                key={index}
                onClick={() => setSelectedImage(img)}
                aria-label={`Ver foto ${index + 1} de ${title}`}
                className={`w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer bg-neutral-100 ${
                  isSelected
                    ? 'border-pink-600 scale-105 shadow-md shadow-pink-600/20'
                    : 'border-neutral-200 opacity-70 hover:opacity-100 hover:border-neutral-300'
                }`}
              >
                <img src={img} alt={`${title} - miniatura ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}