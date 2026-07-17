import React from 'react';

// Esqueleto para las cuadrículas de posters de juegos
export function SkeletonPosterGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg"></div>
      ))}
    </div>
  );
}

// Esqueleto para las reviews del feed de comunidad
export function SkeletonReviewCard() {
  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-800 rounded-full"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-800 rounded w-1/4"></div>
          <div className="h-3 bg-gray-800 rounded w-1/6"></div>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-gray-800 rounded w-full"></div>
        <div className="h-4 bg-gray-800 rounded w-5/6"></div>
      </div>
    </div>
  );
}