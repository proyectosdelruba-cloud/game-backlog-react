import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, UserPlus, UserMinus, Loader2, Heart, Star, Sparkles,
  Gamepad2, CircleCheck, Bookmark, CircleX, ChevronDown, ImageOff, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPerfilPublico, getFollowingIds, followUser, unfollowUser } from '../services/socialService';
import { calcularNivelGamer, calcularCompatibilidad } from '../lib/gamification';

function celebrarMatch() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.5 },
    colors: ['#EF4444', '#F472B6', '#FFFFFF'],
    disableForReducedMotion: true,
  });
}

function PosterMini({ juego, onAbrirHub }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
  className="relative rounded-lg overflow-hidden aspect-[2/3] bg-surface cursor-pointer"
  onClick={() => onAbrirHub && onAbrirHub(juego)}
>
        {juego.background_image ? (
          <img src={juego.background_image} alt={juego.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10">
            <ImageOff size={18} strokeWidth={1.5} />
          </div>
        )}
        {juego.is_favorite && (
          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-deep/80 flex items-center justify-center">
            <Heart size={10} fill="currentColor" className="text-red-500" strokeWidth={0} />
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-300 truncate">{juego.name}</p>
      {juego.status === 'completado' && juego.puntuacion > 0 && (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((v) => (
            <Star key={v} size={9} strokeWidth={1.5}
              fill={v <= juego.puntuacion ? '#7C3AED' : 'none'}
              color={v <= juego.puntuacion ? '#7C3AED' : '#3a3a40'} />
          ))}
        </div>
      )}
    </div>
  );
}

function SeccionLista({ titulo, Icono, juegos, abierta, onToggle }) {
  return (
    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
          <Icono size={16} strokeWidth={1.75} />
          {titulo}
          <span className="text-xs font-normal text-muted">{juegos.length}</span>
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`} />
      </button>

      {abierta && (
        <div className="px-4 pb-4">
          {juegos.length === 0 ? (
            <p className="text-xs text-muted">Nada por aquí todavía.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {juegos.map((j) => <PosterMini key={j.id} juego={j} onAbrirHub={onAbrirHub} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserProfileView({ userId, currentUserId, onVolver, misJuegos, onAbrirHub }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sigo, setSigo] = useState(false);
  const [procesandoFollow, setProcesandoFollow] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState('completado');

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    Promise.all([getPerfilPublico(userId), getFollowingIds(currentUserId)])
      .then(([perfilDatos, idsSeguidos]) => {
        if (cancelado) return;
        setDatos(perfilDatos);
        setSigo(idsSeguidos.includes(userId));
      })
      .catch((err) => {
        if (cancelado) return;
        console.error(err);
        setError('No se pudo cargar este perfil.');
      })
      .finally(() => !cancelado && setCargando(false));

    return () => { cancelado = true; };
  }, [userId, currentUserId]);

  const alternarSeguir = useCallback(async () => {
    if (procesandoFollow) return;
    setProcesandoFollow(true);
    try {
      if (sigo) { await unfollowUser(currentUserId, userId); setSigo(false); }
      else { await followUser(currentUserId, userId); setSigo(true); }
    } catch (err) {
      console.error(err);
    }
    setProcesandoFollow(false);
  }, [sigo, procesandoFollow, currentUserId, userId]);

  const compatibilidad = useMemo(() => {
  if (!datos || currentUserId === userId) return null;
  const completadosDelOtro = datos.juegos.filter(j => j.status === 'completado');
  return calcularCompatibilidad(misJuegos || [], completadosDelOtro);
}, [datos, currentUserId, userId, misJuegos]);

useEffect(() => {
  if (compatibilidad && compatibilidad.porcentaje > 90) {
    celebrarMatch();
  }
}, [compatibilidad]);

  if (cargando) {
    return <p className="flex items-center gap-2 text-sm text-muted py-6"><Loader2 size={14} className="animate-spin" /> Cargando perfil...</p>;
  }
  if (error || !datos) {
    return <p className="text-sm text-red-400 py-6">{error ?? 'Perfil no encontrado.'}</p>;
  }

  const { perfil, juegos, totalSeguidores, totalSeguidos } = datos;
  const jugando = juegos.filter(j => j.status === 'jugando');
  const completados = juegos.filter(j => j.status === 'completado');
  const pendientes = juegos.filter(j => j.status === 'pendiente');
  const dropeados = juegos.filter(j => j.status === 'dropeado');
  const favoritos = completados.filter(j => j.is_favorite).slice(0, 5);
  const nivel = calcularNivelGamer(completados.length);

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onVolver} className="flex items-center gap-1.5 text-xs text-muted hover:text-gray-100 transition-colors w-fit">
        <ArrowLeft size={14} strokeWidth={2} /> Volver a Comunidad
      </button>

      <div className="bg-surface border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
        {perfil.avatar_url ? (
          <img src={perfil.avatar_url} alt={perfil.username} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-accent">
            <Users size={26} strokeWidth={1.75} />
          </div>
        )}

        <div>
          <p className="text-base font-bold text-gray-100">{perfil.username}</p>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1.5"
            style={{ backgroundColor: `${nivel.color}22`, color: nivel.color }}
          >
            <Sparkles size={11} strokeWidth={2} /> {nivel.nombre}
          </span>
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="text-sm font-bold text-gray-100">{totalSeguidores}</p>
            <p className="text-[11px] text-muted uppercase tracking-wide">Seguidores</p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-100">{totalSeguidos}</p>
            <p className="text-[11px] text-muted uppercase tracking-wide">Seguidos</p>
          </div>
        </div>

        {currentUserId !== userId && (
          <button
            onClick={alternarSeguir}
            disabled={procesandoFollow}
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              sigo ? 'bg-transparent border border-white/10 text-muted hover:border-red-500/40 hover:text-red-400'
                   : 'bg-accent text-gray-100 hover:bg-violet-700'
            }`}
          >
            {procesandoFollow ? <Loader2 size={13} className="animate-spin" /> : sigo ? <UserMinus size={13} /> : <UserPlus size={13} />}
            {procesandoFollow ? 'Un momento' : sigo ? 'Dejar de seguir' : 'Seguir'}
          </button>
        )}

{compatibilidad && (
  <div className={`mt-1 flex items-center gap-2 rounded-full px-4 py-2 border ${
    compatibilidad.porcentaje > 90
      ? 'bg-gradient-to-r from-pink-500/20 to-red-500/20 border-pink-400/40'
      : 'bg-white/5 border-white/10'
  }`}>
    <Heart
      size={14} strokeWidth={2}
      className={compatibilidad.porcentaje > 90 ? 'text-pink-400' : 'text-white/60'}
      fill={compatibilidad.porcentaje > 90 ? 'currentColor' : 'none'}
    />
    <span className="text-sm font-bold text-gray-100">{compatibilidad.porcentaje}% compatible</span>
    <span className="text-xs text-white/40">· {compatibilidad.juegosCompartidos} en común</span>
  </div>
)}

      </div>

      {favoritos.length > 0 && (
        <div className="bg-surface border border-white/5 rounded-2xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-100 mb-3">
            <Sparkles size={15} strokeWidth={2} className="text-accent" /> Top favoritos
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {favoritos.map((j) => <PosterMini key={j.id} juego={j} onAbrirHub={onAbrirHub} />)}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <SeccionLista titulo="Jugando actualmente" Icono={Gamepad2} juegos={jugando} abierta={seccionAbierta === 'jugando'} onToggle={() => setSeccionAbierta(p => p === 'jugando' ? null : 'jugando')} onAbrirHub={onAbrirHub} />
        <SeccionLista titulo="Completados" Icono={CircleCheck} juegos={completados} abierta={seccionAbierta === 'completado'} onToggle={() => setSeccionAbierta(p => p === 'completado' ? null : 'completado')} onAbrirHub={onAbrirHub} />
        <SeccionLista titulo="Pendientes" Icono={Bookmark} juegos={pendientes} abierta={seccionAbierta === 'pendiente'} onToggle={() => setSeccionAbierta(p => p === 'pendiente' ? null : 'pendiente')} onAbrirHub={onAbrirHub} />
        <SeccionLista titulo="Dropeados" Icono={CircleX} juegos={dropeados} abierta={seccionAbierta === 'dropeado'} onToggle={() => setSeccionAbierta(p => p === 'dropeado' ? null : 'dropeado')} onAbrirHub={onAbrirHub} />
      </div>
    </div>
  );
}