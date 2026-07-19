import { memo } from 'react';
import { Heart, Star, Sparkles } from 'lucide-react';

function formatearFecha(fechaISO) {
  return fechaISO ? new Date(fechaISO).toLocaleDateString() : '';
}

const TarjetaReview = memo(function TarjetaReview({ review, onToggleLike, onSelectUser }) {
  return (
    <article className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
      <button onClick={() => onSelectUser(review.user_id)} className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer">
        {review.profiles?.avatar_url ? (
          <img src={review.profiles.avatar_url} alt={review.profiles.username} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-accent/15" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100 truncate">{review.profiles?.username ?? 'Jugador'}</p>
          <p className="text-xs text-muted">jugó {review.name}</p>
        </div>
      </button>
      <span className="text-[11px] text-muted whitespace-nowrap">{formatearFecha(review.fecha_guardado)}</span>

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

function SocialFeed({ reviews, onToggleLike, onSelectUser }) {

function SocialFeed({ reviews, onToggleLike, onSelectUser }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted text-center py-6">Sigue a otros jugadores para ver sus reseñas aquí.</p>;
  }

  
  return (
    <div className="bg-surface border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} strokeWidth={2} className="text-accent" />
      </div>
      <p className="text-sm text-gray-300">
        <span className="font-semibold text-gray-100">{nombre}</span> se ha unido a GameBox
      </p>
    </div>
  );
}

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((item) =>
  item.tipo === 'evento' ? (
    <TarjetaEvento key={`evento-${item.id}`} evento={item} />
  ) : (
    <TarjetaReview key={item.id} review={item} onToggleLike={onToggleLike} onSelectUser={onSelectUser} />
  )
)}
    </div>
  );
}

export default memo(SocialFeed);