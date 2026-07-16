import { memo } from 'react';
import { Heart, Star } from 'lucide-react';

function formatearFecha(fechaISO) {
  return fechaISO ? new Date(fechaISO).toLocaleDateString() : '';
}

const TarjetaReview = memo(function TarjetaReview({ review, onToggleLike }) {
  return (
    <article className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
      <header className="flex items-center gap-3">
        {review.profiles?.avatar_url ? (
          <img src={review.profiles.avatar_url} alt={review.profiles.username} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-accent/15" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100 truncate">{review.profiles?.username ?? 'Jugador'}</p>
          <p className="text-xs text-muted">jugó {review.name}</p>
        </div>
        <span className="text-[11px] text-muted whitespace-nowrap">{formatearFecha(review.fecha_guardado)}</span>
      </header>

      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((valor) => (
          <Star key={valor} size={14} strokeWidth={1.5}
            fill={valor <= review.puntuacion ? '#7C3AED' : 'none'}
            color={valor <= review.puntuacion ? '#7C3AED' : '#9CA3AF'} />
        ))}
      </div>

      <p className="text-sm text-gray-200 leading-relaxed">{review.resena}</p>

      <button
        onClick={() => onToggleLike(review.id)}
        className="flex items-center gap-1.5 self-start text-xs text-muted hover:text-red-400 transition-colors"
      >
        <Heart size={16} strokeWidth={2} fill={review.likedByMe ? '#EF4444' : 'none'} color={review.likedByMe ? '#EF4444' : 'currentColor'} />
        {review.likesCount}
      </button>
    </article>
  );
});

function SocialFeed({ reviews, onToggleLike }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted text-center py-6">Sigue a otros jugadores para ver sus reseñas aquí.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <TarjetaReview key={review.id} review={review} onToggleLike={onToggleLike} />
      ))}
    </div>
  );
}

export default memo(SocialFeed);