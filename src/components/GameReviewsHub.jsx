import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Frown, Loader2 } from 'lucide-react';
import { getReviewsDeJuego } from '../services/socialService';

function formatearFecha(fechaISO) {
  return fechaISO ? new Date(fechaISO).toLocaleDateString() : '';
}

function EstrellasMini({ puntuacion }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star key={v} size={13} strokeWidth={1.5}
          fill={v <= puntuacion ? '#7C3AED' : 'none'}
          color={v <= puntuacion ? '#7C3AED' : '#9CA3AF'} />
      ))}
    </div>
  );
}

export default function GameReviewsHub({ juego, onCerrar }) {
  const [reviews, setReviews] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    getReviewsDeJuego(juego.game_id)
      .then((data) => { if (!cancelado) setReviews(data); })
      .catch((err) => console.error('No se pudieron cargar las reseñas:', err))
      .finally(() => { if (!cancelado) setCargando(false); });

    return () => { cancelado = true; };
  }, [juego.game_id]);

  const notaMedia = reviews.length > 0
    ? (reviews.reduce((suma, r) => suma + r.puntuacion, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <motion.div
      className="modal-backdrop"
      onClick={onCerrar}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-contenido"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <X size={16} strokeWidth={2} />
        </button>

        <div className="modal-poster">
          <img src={juego.background_image} alt={juego.name} className="modal-poster-img" />
        </div>

        <div className="modal-detalles">
          <h2>{juego.name}</h2>

          {notaMedia && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-gray-100">{notaMedia}</span>
              <EstrellasMini puntuacion={Math.round(notaMedia)} />
              <span className="text-xs text-white/40">({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})</span>
            </div>
          )}

          {cargando ? (
            <p className="flex items-center gap-2 text-sm text-white/40 py-4">
              <Loader2 size={14} className="girando" /> Cargando reseñas...
            </p>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <Frown size={32} strokeWidth={1.5} className="text-white/20" />
              <p className="text-sm text-white/40">No hay reseñas todavía</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-[#2e2e33] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {r.profiles?.avatar_url ? (
                      <img src={r.profiles.avatar_url} alt={r.profiles.username} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent/15" />
                    )}
                    <span className="text-xs font-semibold text-gray-100">{r.profiles?.username ?? 'Jugador'}</span>
                    <span className="text-[10px] text-white/30 ml-auto">{formatearFecha(r.fecha_guardado)}</span>
                  </div>
                  <EstrellasMini puntuacion={r.puntuacion} />
                  <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">{r.resena}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}