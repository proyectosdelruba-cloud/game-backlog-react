import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Search, Shuffle, Gamepad2, CircleCheck, Bookmark, CircleX,
  Heart, Star, X, ChevronDown, User, Users, LogOut, Sparkles, Eye,
  Pencil, Undo2, Loader2, ImageOff, TrendingUp, ListMusic
} from 'lucide-react';
import { supabase, supabaseHabilitado } from './supabaseClient';
import './App.css';
import EditarPerfil from './components/EditarPerfil';
import { obtenerPerfil, actualizarRachaDiaria } from './perfilService';
import UserSearch from './components/UserSearch';
import SocialFeed from './components/SocialFeed';
import { getFollowingReviews, toggleLikeReview, getActividadGlobal } from './services/socialService';
import UserProfileView from './components/UserProfileView';
import { SkeletonPosterGrid, SkeletonReviewCard } from './components/SkeletonCard';
import { ProgressRing, DailyStreak } from './components/ProgressRing';
import { CelebracionLogro } from './components/CelebracionLogro';
import PlaylistsPanel from './components/PlaylistsPanel';

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api/games";

const COLOR_ACCENT = "#7C3AED";
const COLOR_MUTED = "#9CA3AF";

// ---------- Helpers puros ----------

function obtenerGenero(juego) {
  return juego?.genres?.[0]?.name ?? "—";
}

function obtenerPlataforma(juego) {
  return juego?.platforms?.[0]?.platform?.name ?? "—";
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return "—";
  return new Date(fechaISO).toLocaleDateString();
}

function obtenerRangoUltimoMes() {
  const hoy = new Date();
  const haceUnMes = new Date();
  haceUnMes.setMonth(hoy.getMonth() - 1);

  const formatear = (fecha) => fecha.toISOString().split('T')[0];
  return `${formatear(haceUnMes)},${formatear(hoy)}`;
}

function identidadDesde(obj) {
  return {
    game_id: obj.game_id ?? obj.id,
    name: obj.name,
    background_image: obj.background_image,
  };
}

function lanzarConfetiLegendario() {
  const disparar = (opciones) => confetti({ ...opciones, disableForReducedMotion: true });

  disparar({ particleCount: 60, spread: 55, origin: { x: 0.25, y: 0.65 }, colors: ['#7C3AED', '#A78BFA'] });
  disparar({ particleCount: 60, spread: 55, origin: { x: 0.75, y: 0.65 }, colors: ['#F5A623', '#FFFFFF'] });
  setTimeout(() => {
    disparar({ particleCount: 90, spread: 100, origin: { y: 0.6 }, colors: ['#7C3AED', '#F5A623', '#FFFFFF'] });
  }, 200);
}

// ---------- Subcomponentes: primitivos ----------

const PosterImage = memo(function PosterImage({ src, alt, className, onClick }) {
  const [fallo, setFallo] = useState(false);
  const mostrarPlaceholder = !src || fallo;

  if (mostrarPlaceholder) {
    return (
      <div className={`${className} poster-placeholder`} role="img" aria-label={alt} onClick={onClick}>
        <ImageOff size={20} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onClick={onClick}
      onError={() => setFallo(true)}
      loading="lazy"
    />
  );
});

function StarRating({ puntuacion, onChange }) {
  return (
    <div className="estrellas" role="radiogroup" aria-label="Puntuación">
      {[1, 2, 3, 4, 5].map((valor) => (
        <motion.button
          key={valor}
          type="button"
          className="estrella-btn"
          onClick={() => onChange(valor)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          aria-label={`${valor} estrellas`}
        >
          <Star
            size={26}
            strokeWidth={1.5}
            fill={valor <= puntuacion ? COLOR_ACCENT : "none"}
            color={valor <= puntuacion ? COLOR_ACCENT : COLOR_MUTED}
          />
        </motion.button>
      ))}
    </div>
  );
}

function EstrellasReadOnly({ puntuacion, size = 16 }) {
  return (
    <div className="estrellas-readonly">
      {[1, 2, 3, 4, 5].map((valor) => (
        <Star
          key={valor}
          size={size}
          strokeWidth={1.5}
          fill={valor <= puntuacion ? COLOR_ACCENT : "none"}
          color={valor <= puntuacion ? COLOR_ACCENT : COLOR_MUTED}
        />
      ))}
    </div>
  );
}

const ResultadoBusqueda = memo(function ResultadoBusqueda({ juego, onSeleccionar }) {
  return (
    <button type="button" className="resultado-item" onClick={() => onSeleccionar(juego)}>
      <PosterImage src={juego.background_image} alt={juego.name} className="resultado-thumb" />
      <span>{juego.name}</span>
    </button>
  );
});

const TarjetaTendencia = memo(function TarjetaTendencia({ juego, onSeleccionar }) {
  return (
    <button type="button" className="tendencia-card" onClick={() => onSeleccionar(juego)}>
      <PosterImage src={juego.background_image} alt={juego.name} className="tendencia-poster" />
      <p className="tendencia-titulo">{juego.name}</p>
    </button>
  );
});

// ---------- Subcomponentes: tarjetas ----------

const ICONOS_ESTADO = {
  jugando: { Icono: Pencil, disparador: "accion", titulo: "Escribir reseña" },
  completado: { Icono: Eye, disparador: "abrir", titulo: "Ver reseña" },
  pendiente: { Icono: CircleCheck, disparador: "accion", titulo: "Marcar como completado" },
  dropeado: { Icono: Undo2, disparador: "accion", titulo: "Volver a pendientes" },
};

const PosterCard = memo(function PosterCard({ juego, tipo, onAbrir, onEliminar, onAccionPrincipal }) {
  const config = ICONOS_ESTADO[tipo];
  const IconoAccion = config.Icono;
  const disparar = config.disparador === "abrir" ? () => onAbrir(juego) : () => onAccionPrincipal(juego);

  return (
    <motion.div
      className="poster-card"
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
    >
      <PosterImage
        src={juego.background_image}
        alt={juego.name}
        className="poster-card-img"
        onClick={() => onAbrir(juego)}
      />

      {juego.is_favorite && (
        <span className="badge-favorito" title="En tu Top 5">
          <Heart size={12} fill="currentColor" strokeWidth={0} />
        </span>
      )}

      <p className="poster-card-titulo">{juego.name}</p>

      <div className="poster-card-overlay">
        <button className="overlay-btn" onClick={disparar} title={config.titulo}>
          <IconoAccion size={15} strokeWidth={1.75} />
        </button>
        <button className="overlay-btn eliminar" onClick={() => onEliminar(juego)} title="Eliminar">
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
    </motion.div>
  );
});

function SeccionDesplegable({ titulo, Icono, cantidad, abierta, onToggle, children }) {
  return (
    <div className="acordeon-seccion">
      <button type="button" className="acordeon-header" onClick={onToggle} aria-expanded={abierta}>
        <span className="acordeon-titulo">
          <Icono size={16} strokeWidth={1.75} />
          {titulo}
          <span className="acordeon-contador">{cantidad}</span>
        </span>
        <motion.span
          className="acordeon-flecha"
          animate={{ rotate: abierta ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} strokeWidth={1.75} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            className="acordeon-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopFavoritos({ favoritos }) {
  const slots = Array.from({ length: 5 }, (_, i) => favoritos[i] || null);

  return (
    <div className="top5-grid">
      {slots.map((juego, i) => (
        <div className="top5-slot" key={juego ? juego.game_id : `vacio-${i}`}>
          {juego ? (
            <PosterImage src={juego.background_image} alt={juego.name} className="top5-img" />
          ) : (
            <div className="top5-vacio">{i + 1}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ModalResena({ juego, onEditar, onCerrar }) {
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
          <PosterImage src={juego.background_image} alt={juego.name} className="modal-poster-img" />
        </div>

        <div className="modal-detalles">
          <h2>{juego.name}</h2>
          <EstrellasReadOnly puntuacion={juego.puntuacion} size={18} />
          <p className="modal-fecha">Guardado el {formatearFecha(juego.fecha_guardado)}</p>

          <div className="modal-resena-texto">
            {juego.resena ? juego.resena : "Sin reseña escrita todavía."}
          </div>

          <button className="btn-guardar" onClick={onEditar}>
            <Pencil size={14} strokeWidth={2} />
            Editar reseña
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FormularioAuth({ onLogin, onRegistro, authError, authCargando, avisoRegistro }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function manejarSubmit(e) {
    e.preventDefault();
    const correo = email.trim();
    if (!correo || !password) return;
    if (modo === "login") onLogin(correo, password);
    else onRegistro(correo, password);
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button type="button" className={modo === "login" ? "activo" : ""} onClick={() => setModo("login")}>
          Iniciar sesión
        </button>
        <button type="button" className={modo === "registro" ? "activo" : ""} onClick={() => setModo("registro")}>
          Registrarse
        </button>
      </div>

      <form onSubmit={manejarSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={modo === "login" ? "current-password" : "new-password"}
        />

        {authError && <p className="auth-error">{authError}</p>}
        {avisoRegistro && <p className="auth-aviso">{avisoRegistro}</p>}

        <button type="submit" className="btn-auth" disabled={authCargando}>
          {authCargando ? <Loader2 size={16} className="girando" /> : modo === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

// ---------- Subcomponentes: pestañas ----------

function PestanaBuscar({
  terminoBusqueda, setTerminoBusqueda, resultadosBusqueda, buscando, onBuscar,
  onAleatorio, cargando, error, juego, estadoActivo, puntuacion, setPuntuacion,
  resenaTexto, setResenaTexto, onActualizarEstado, onGuardarResena, onSeleccionar,
  esFavoritoActual, onToggleFavorito, errorFavoritos, juegosTendencia
}) {
  const mostrarFormularioResena = estadoActivo === "completado" || estadoActivo === "jugando";

  return (
    <div className="pestana-buscar">
      <form className="buscador" onSubmit={onBuscar}>
        <input
          type="text"
          placeholder="Buscar un juego"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
        />
        <button type="submit" disabled={buscando} aria-label="Buscar">
          {buscando ? <Loader2 size={16} className="girando" /> : <Search size={16} strokeWidth={2} />}
        </button>
      </form>

      {resultadosBusqueda.length > 0 && (
        <div className="resultados-busqueda">
          {resultadosBusqueda.map((r) => (
            <ResultadoBusqueda key={r.id} juego={r} onSeleccionar={onSeleccionar} />
          ))}
        </div>
      )}

      <button type="button" className="btn-secundario" onClick={onAleatorio} disabled={cargando}>
        <Shuffle size={14} strokeWidth={2} />
        Descubrir algo al azar
      </button>

      {resultadosBusqueda.length === 0 && juegosTendencia && juegosTendencia.length > 0 && (
        <section className="tendencias-seccion">
          <h3 className="tendencias-titulo">
            <TrendingUp size={16} strokeWidth={2} />
            Tendencias del mes
          </h3>
          <div className="tendencias-scroll">
            {juegosTendencia.map((j) => (
              <TarjetaTendencia key={j.id} juego={j} onSeleccionar={onSeleccionar} />
            ))}
          </div>
        </section>
      )}

      {cargando && <SkeletonPosterGrid count={4} />}

      <AnimatePresence mode="wait">
        {juego && !cargando && (
          <motion.div
            key={juego.id}
            className="ficha-juego"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PosterImage src={juego.background_image} alt={juego.name} className="portada" />
            <h2 className="titulo-juego">{juego.name}</h2>
            <div className="tags">
              <span className="tag">{obtenerGenero(juego)}</span>
              <span className="tag">{obtenerPlataforma(juego)}</span>
            </div>

            <div className="acciones-estado">
              <button className={`btn-estado tipo-jugando ${estadoActivo === "jugando" ? "activo" : ""}`} onClick={() => onActualizarEstado(juego, "jugando")}>
                <Gamepad2 size={14} strokeWidth={2} /> Jugando
              </button>
              <button className={`btn-estado tipo-completado ${estadoActivo === "completado" ? "activo" : ""}`} onClick={() => onActualizarEstado(juego, "completado")}>
                <CircleCheck size={14} strokeWidth={2} /> Completado
              </button>
              <button className={`btn-estado tipo-pendiente ${estadoActivo === "pendiente" ? "activo" : ""}`} onClick={() => onActualizarEstado(juego, "pendiente")}>
                <Bookmark size={14} strokeWidth={2} /> Pendiente
              </button>
              <button className={`btn-estado tipo-dropeado ${estadoActivo === "dropeado" ? "activo" : ""}`} onClick={() => onActualizarEstado(juego, "dropeado")}>
                <CircleX size={14} strokeWidth={2} /> Dropeado
              </button>
            </div>

            {estadoActivo && !mostrarFormularioResena && (
              <p className="confirmacion-estado">Guardado en tu lista</p>
            )}

            {mostrarFormularioResena && (
              <>
                <StarRating puntuacion={puntuacion} onChange={setPuntuacion} />

                <button
                  type="button"
                  className={`btn-favorito ${esFavoritoActual ? "activo" : ""}`}
                  onClick={() => onToggleFavorito(juego)}
                >
                  <Heart size={14} strokeWidth={2} fill={esFavoritoActual ? "currentColor" : "none"} />
                  {esFavoritoActual ? "En tu Top 5" : "Añadir a tu Top 5"}
                </button>

                {errorFavoritos && <p className="mensaje-estado error">{errorFavoritos}</p>}

                <textarea
                  className="campo-resena"
                  placeholder="Escribe tu reseña"
                  value={resenaTexto}
                  onChange={(e) => setResenaTexto(e.target.value)}
                />
                <button className="btn-guardar" onClick={onGuardarResena}>
                  Guardar reseña
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PestanaListas({
  jugando, completados, pendientes, dropeados,
  categoriaAbierta, onToggleCategoria,
  onAbrir, onEliminar, onAccionPrincipal,
  userId, backlogCompleto
}) {
  const categorias = [
    { key: "jugando", titulo: "Jugando actualmente", Icono: Gamepad2, lista: jugando },
    { key: "completado", titulo: "Completados", Icono: CircleCheck, lista: completados },
    { key: "pendiente", titulo: "Pendientes", Icono: Bookmark, lista: pendientes },
    { key: "dropeado", titulo: "Dropeados", Icono: CircleX, lista: dropeados },
  ];

  return (
    <div className="pestana-listas">
      {categorias.map((cat) => (
        <SeccionDesplegable
          key={cat.key}
          titulo={cat.titulo}
          Icono={cat.Icono}
          cantidad={cat.lista.length}
          abierta={categoriaAbierta === cat.key}
          onToggle={() => onToggleCategoria(cat.key)}
        >
          {cat.lista.length === 0 ? (
            <p className="backlog-vacio">Nada por aquí todavía.</p>
          ) : (
            <div className="backlog-grid">
              {cat.lista.map((g) => (
                <PosterCard
                  key={g.game_id}
                  juego={g}
                  tipo={cat.key}
                  onAbrir={onAbrir}
                  onEliminar={onEliminar}
                  onAccionPrincipal={onAccionPrincipal}
                />
              ))}
            </div>
          )}
        </SeccionDesplegable>
      ))}
      <div className="acordeon-seccion" style={{ marginTop: '10px' }}>
        <button
          type="button"
          className="acordeon-header"
          onClick={() => onToggleCategoria('playlists')}
          aria-expanded={categoriaAbierta === 'playlists'}
        >
          <span className="acordeon-titulo">
          <ListMusic size={16} strokeWidth={1.75} />
  Mis Playlists
</span>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            style={{ transform: categoriaAbierta === 'playlists' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {categoriaAbierta === 'playlists' && (
          <div className="acordeon-body">
            <PlaylistsPanel userId={userId} backlog={backlogCompleto} />
          </div>
        )}
      </div>
    </div>
  );
}

function PestanaPerfil({
  supabaseHabilitado: supabaseOn, sesionCargando, user,
  authError, authCargando, avisoRegistro, onLogin, onRegistro, onLogout,
  nombreUsuario, onCambiarNombre,
  totalJugando, totalCompletados, totalPendientes, totalDropeados, favoritos,
  perfil, onPerfilActualizado, racha
}) {
  if (supabaseOn && sesionCargando) {
    return (
      <p className="mensaje-estado">
        <Loader2 size={14} className="girando" /> Cargando sesión
      </p>
    );
  }

  if (supabaseOn && !user) {
    return (
      <FormularioAuth
        onLogin={onLogin}
        onRegistro={onRegistro}
        authError={authError}
        authCargando={authCargando}
        avisoRegistro={avisoRegistro}
      />
    );
  }

  return (
    <div className="pestana-perfil">
      {!supabaseOn && (
        <p className="badge-modo-local">Modo local — conecta Supabase para sincronizar en la nube</p>
      )}

      <section className="top5-seccion">
        <h2><Sparkles size={16} strokeWidth={2} /> Mi Top 5 de la historia</h2>
        <TopFavoritos favoritos={favoritos} />
      </section>

      <section className="perfil-card">
        {supabaseOn ? (
          <>
            <EditarPerfil
              user={user}
              perfil={perfil}
              onPerfilActualizado={onPerfilActualizado}
            />
            <p className="perfil-email">{user.email}</p>
          </>
        ) : (
          <>
            <div className="avatar"><User size={28} strokeWidth={1.75} /></div>
            <input
              className="input-username"
              value={nombreUsuario}
              onChange={(e) => onCambiarNombre(e.target.value)}
              onBlur={(e) => onCambiarNombre(e.target.value.trim() || "Jugador")}
            />
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-5 mb-5 w-full">
          <ProgressRing
            completados={totalCompletados}
            total={totalJugando + totalCompletados + totalPendientes + totalDropeados}
          />
          <DailyStreak racha={racha} />
        </div>

        <div className="estadisticas flex-wrap">
          <div className="stat"><span className="stat-numero">{totalJugando}</span><span className="stat-label">Jugando</span></div>
          <div className="stat"><span className="stat-numero">{totalCompletados}</span><span className="stat-label">Completados</span></div>
          <div className="stat"><span className="stat-numero">{totalPendientes}</span><span className="stat-label">Pendientes</span></div>
          <div className="stat"><span className="stat-numero">{totalDropeados}</span><span className="stat-label">Dropeados</span></div>
        </div>

        {supabaseOn && (
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={14} strokeWidth={2} /> Cerrar sesión
          </button>
        )}
      </section>
    </div>
  );
}

// ---------- Componente principal ----------

export default function App() {
  const [juego, setJuego] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [juegosTendencia, setJuegosTendencia] = useState([]);

  const [estadoActivo, setEstadoActivo] = useState(null);
  const [puntuacion, setPuntuacion] = useState(0);
  const [resenaTexto, setResenaTexto] = useState("");

  const [juegoSeleccionadoModal, setJuegoSeleccionadoModal] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState("buscar");
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);
  const [errorFavoritos, setErrorFavoritos] = useState(null);

  const [nombreUsuario, setNombreUsuario] = useState(
    () => localStorage.getItem("gamebox-username") || "Jugador"
  );
  const [perfil, setPerfil] = useState(null);
  const [racha, setRacha] = useState(0);
  const [celebrando, setCelebrando] = useState(null);

  const [backlog, setBacklog] = useState([]);

  const [user, setUser] = useState(null);
  const [sesionCargando, setSesionCargando] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authCargando, setAuthCargando] = useState(false);
  const [avisoRegistro, setAvisoRegistro] = useState(null);
  const [feedReviews, setFeedReviews] = useState([]);
  const [feedEsGlobal, setFeedEsGlobal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [cargandoFeed, setCargandoFeed] = useState(false);

  // Carga del feed de "Comunidad" con fallback: si no hay actividad de gente
  // que sigues (o no sigues a nadie todavía), muestra las últimas reseñas
  // públicas de toda la base de datos para que la sección nunca se vea vacía.
useEffect(() => {
  if (pestanaActiva !== "comunidad" || !supabaseHabilitado || !user) return;

  let cancelado = false;
  setCargandoFeed(true);

  async function cargarFeed() {
    try {
      let reviews = await getFollowingReviews(user.id);
      let esGlobal = reviews.length > 0 ? false : true;

      if (reviews.length === 0) {
        const { data } = await supabase
          .from('user_games')
          .select(`
            id, name, background_image, puntuacion, resena, fecha_guardado, user_id,
            profiles!user_games_user_id_profiles_fkey ( username, avatar_url ),
            review_likes ( user_id )
          `)
          .not('resena', 'eq', '')
          .order('fecha_guardado', { ascending: false })
          .limit(20);

        reviews = (data || []).map(r => ({
          ...r,
          likesCount: r.review_likes.length,
          likedByMe: r.review_likes.some(l => l.user_id === user.id),
        }));
      }

      const eventos = await getActividadGlobal();

      const combinado = [
        ...reviews.map(r => ({ ...r, tipo: 'review', fecha: r.fecha_guardado })),
        ...eventos.map(e => ({ ...e, tipo: 'evento', fecha: e.created_at })),
      ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20);

      if (!cancelado) {
        setFeedEsGlobal(esGlobal);
        setFeedReviews(combinado);
      }
    } catch (err) {
      if (!cancelado) console.error('No se pudo cargar el feed:', err);
    } finally {
      if (!cancelado) setCargandoFeed(false);
    }
  }

  cargarFeed();
  return () => { cancelado = true; };
}, [pestanaActiva, user]);

  const manejarLikeEnFeed = useCallback(async (reviewId) => {
    const aplicarToggle = (lista) => lista.map(r =>
      r.id === reviewId
        ? { ...r, likedByMe: !r.likedByMe, likesCount: r.likesCount + (r.likedByMe ? -1 : 1) }
        : r
    );

    setFeedReviews(aplicarToggle);

    try {
      const resultado = await toggleLikeReview(reviewId, user.id);
      setFeedReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, likedByMe: resultado.liked, likesCount: resultado.likesCount } : r
      ));
    } catch (err) {
      console.error(err);
      setFeedReviews(aplicarToggle);
    }
  }, [user]);

  const verPerfilDeUsuario = useCallback((userId) => setUsuarioSeleccionado(userId), []);
  const volverAComunidad = useCallback(() => setUsuarioSeleccionado(null), []);

  useEffect(() => {
    if (!supabaseHabilitado) {
      setSesionCargando(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSesionCargando(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (supabaseHabilitado && user) {
      cargarBacklogDesdeSupabase(user.id);
    } else if (!user) {
      const guardado = localStorage.getItem("gamebox-backlog");
      setBacklog(guardado ? JSON.parse(guardado) : []);
    }
  }, [user]);

  useEffect(() => {
    if (supabaseHabilitado && user) {
      obtenerPerfil(user.id)
        .then(setPerfil)
        .then(() => actualizarRachaDiaria(user.id))
        .then(setRacha)
        .catch((err) => console.error('No se pudo cargar el perfil:', err));
    } else {
      setPerfil(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("gamebox-backlog", JSON.stringify(backlog));
    }
  }, [backlog, user]);

  useEffect(() => {
    localStorage.setItem("gamebox-username", nombreUsuario);
  }, [nombreUsuario]);

  useEffect(() => {
    if (!juegoSeleccionadoModal) return;

    function manejarEscape(e) {
      if (e.key === "Escape") setJuegoSeleccionadoModal(null);
    }

    window.addEventListener("keydown", manejarEscape);
    return () => window.removeEventListener("keydown", manejarEscape);
  }, [juegoSeleccionadoModal]);

  useEffect(() => {
    async function cargarTendencias() {
      try {
        const rangoFechas = obtenerRangoUltimoMes();
        const respuesta = await fetch(
          `${RAWG_BASE_URL}?key=${RAWG_API_KEY}&dates=${rangoFechas}&ordering=-added&page_size=10`
        );

        if (!respuesta.ok) throw new Error(`RAWG respondió con estado ${respuesta.status}`);

        const datos = await respuesta.json();
        setJuegosTendencia(datos.results || []);
      } catch (err) {
        console.error("No se pudieron cargar las tendencias:", err);
      }
    }

    cargarTendencias();
  }, []);

  async function cargarBacklogDesdeSupabase(userId) {
    const { data, error: errorCarga } = await supabase
      .from('user_games')
      .select('*')
      .eq('user_id', userId)
      .order('fecha_guardado', { ascending: false });

    if (errorCarga) {
      console.error(errorCarga);
      setError("No se pudo cargar tu backlog desde la nube.");
      return;
    }

    setBacklog(data || []);
  }

  async function iniciarSesion(email, password) {
    if (!supabaseHabilitado) return;
    setAuthCargando(true);
    setAuthError(null);
    setAvisoRegistro(null);

    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password });
    if (errorLogin) setAuthError("Email o contraseña incorrectos.");

    setAuthCargando(false);
  }

  async function registrarse(email, password) {
    if (!supabaseHabilitado) return;
    setAuthCargando(true);
    setAuthError(null);
    setAvisoRegistro(null);

    const { error: errorRegistro } = await supabase.auth.signUp({ email, password });
    if (errorRegistro) {
      setAuthError(errorRegistro.message);
    } else {
      setAvisoRegistro("Cuenta creada. Revisa tu correo para confirmarla.");
    }

    setAuthCargando(false);
  }

  async function cerrarSesion() {
    if (!supabaseHabilitado) return;
    await supabase.auth.signOut();
  }

  async function buscarJuegoAleatorio() {
    setCargando(true);
    setError(null);
    setResultadosBusqueda([]);

    try {
      const paginaAleatoria = Math.floor(Math.random() * 500) + 1;
      const respuesta = await fetch(
        `${RAWG_BASE_URL}?key=${RAWG_API_KEY}&page_size=1&page=${paginaAleatoria}`
      );

      if (!respuesta.ok) throw new Error(`RAWG respondió con estado ${respuesta.status}`);

      const datos = await respuesta.json();
      if (!datos.results || datos.results.length === 0) throw new Error("No se encontraron juegos.");

      seleccionarJuego(datos.results[0]);
    } catch (err) {
      setError("Algo falló al conectar. Inténtalo de nuevo.");
      console.error(err);
    }

    setCargando(false);
  }

  async function buscarPorTexto(e) {
    e.preventDefault();
    const consulta = terminoBusqueda.trim();
    if (!consulta) return;

    setBuscando(true);
    setError(null);

    try {
      const respuesta = await fetch(
        `${RAWG_BASE_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(consulta)}&page_size=5`
      );

      if (!respuesta.ok) throw new Error(`RAWG respondió con estado ${respuesta.status}`);

      const datos = await respuesta.json();
      setResultadosBusqueda(datos.results || []);
    } catch (err) {
      setError("No se pudo buscar. Inténtalo de nuevo.");
      console.error(err);
    }

    setBuscando(false);
  }

  const seleccionarJuego = useCallback((juegoSeleccionado) => {
    setJuego(juegoSeleccionado);
    setResultadosBusqueda([]);
    setTerminoBusqueda("");

    setBacklog(prev => {
      const existente = prev.find(g => g.game_id === juegoSeleccionado.id);
      setEstadoActivo(existente ? existente.status : null);
      setPuntuacion(existente ? existente.puntuacion : 0);
      setResenaTexto(existente ? existente.resena : "");
      return prev;
    });
  }, []);

  const guardarEnBacklog = useCallback(async (juegoOEntry, cambios) => {
    const identidad = identidadDesde(juegoOEntry);
    const existente = backlog.find(g => g.game_id === identidad.game_id);

    const entrada = {
      game_id: identidad.game_id,
      name: identidad.name,
      background_image: identidad.background_image,
      status: existente?.status ?? "pendiente",
      puntuacion: existente?.puntuacion ?? 0,
      resena: existente?.resena ?? "",
      is_favorite: existente?.is_favorite ?? false,
      fecha_guardado: existente?.fecha_guardado ?? new Date().toISOString(),
      ...cambios,
    };

    if (supabaseHabilitado && user) {
      if (existente?.id) {
        const { data, error: errorGuardado } = await supabase
          .from('user_games')
          .update(entrada)
          .eq('id', existente.id)
          .select()
          .single();

        if (errorGuardado) { console.error(errorGuardado); setError("No se pudo guardar en la nube."); return; }
        setBacklog(prev => prev.map(g => (g.game_id === identidad.game_id ? data : g)));
      } else {
        const { data, error: errorGuardado } = await supabase
          .from('user_games')
          .insert({ ...entrada, user_id: user.id })
          .select()
          .single();

        if (errorGuardado) { console.error(errorGuardado); setError("No se pudo guardar en la nube."); return; }
        setBacklog(prev => [...prev, data]);
      }
    } else {
      setBacklog(prev => {
        const yaExiste = prev.some(g => g.game_id === identidad.game_id);
        return yaExiste
          ? prev.map(g => (g.game_id === identidad.game_id ? entrada : g))
          : [...prev, entrada];
      });
    }
  }, [backlog, user]);

  const eliminarDelBacklog = useCallback(async (juegoOEntry) => {
    const identidad = identidadDesde(juegoOEntry);
    const existente = backlog.find(g => g.game_id === identidad.game_id);
    if (!existente) return;

    if (supabaseHabilitado && user && existente.id) {
      const { error: errorEliminar } = await supabase.from('user_games').delete().eq('id', existente.id);
      if (errorEliminar) { console.error(errorEliminar); setError("No se pudo eliminar en la nube."); return; }
    }

    setBacklog(prev => prev.filter(g => g.game_id !== identidad.game_id));

    setJuego(prevJuego => {
      if (prevJuego?.id === identidad.game_id) {
        setEstadoActivo(null);
        setPuntuacion(0);
        setResenaTexto("");
        return null;
      }
      return prevJuego;
    });

    setJuegoSeleccionadoModal(prevModal =>
      prevModal?.game_id === identidad.game_id ? null : prevModal
    );
  }, [backlog, user]);

  const actualizarEstado = useCallback((juegoOEntry, nuevoEstado) => {
    guardarEnBacklog(juegoOEntry, { status: nuevoEstado });
    setEstadoActivo(nuevoEstado);
  }, [guardarEnBacklog]);

  const guardarResena = useCallback(() => {
    guardarEnBacklog(juego, { puntuacion, resena: resenaTexto.trim(), status: "completado" });
    setEstadoActivo("completado");
    lanzarConfetiLegendario();
    setCelebrando(juego.name);
    setTimeout(() => setCelebrando(null), 2600);
  }, [juego, puntuacion, resenaTexto, guardarEnBacklog]);

  const abrirParaEditar = useCallback((entrada) => {
    setJuego({ id: entrada.game_id, name: entrada.name, background_image: entrada.background_image });
    setEstadoActivo(entrada.status);
    setPuntuacion(entrada.puntuacion);
    setResenaTexto(entrada.resena);
  }, []);

  const manejarAccionPrincipal = useCallback((entrada) => {
    if (entrada.status === "pendiente") {
      guardarEnBacklog(entrada, { status: "completado" });
    } else if (entrada.status === "dropeado") {
      guardarEnBacklog(entrada, { status: "pendiente" });
    } else if (entrada.status === "jugando") {
      abrirParaEditar(entrada);
      setPestanaActiva("buscar");
    }
  }, [guardarEnBacklog, abrirParaEditar]);

  const alternarFavorito = useCallback((juegoOEntry) => {
    const identidad = identidadDesde(juegoOEntry);
    const existente = backlog.find(g => g.game_id === identidad.game_id);
    if (!existente) return;

    const totalFavoritos = backlog.filter(g => g.is_favorite).length;

    if (!existente.is_favorite && totalFavoritos >= 5) {
      setErrorFavoritos("Ya tienes 5 juegos en tu Top 5. Quita uno antes de añadir otro.");
      return;
    }

    setErrorFavoritos(null);
    guardarEnBacklog(juegoOEntry, { is_favorite: !existente.is_favorite });
  }, [backlog, guardarEnBacklog]);

  const alternarCategoria = useCallback((clave) => {
    setCategoriaAbierta(prev => (prev === clave ? null : clave));
  }, []);

  const onPerfilActualizado = useCallback((cambios) => {
    setPerfil(prev => ({ ...prev, ...cambios }));
  }, []);

  const jugando = backlog.filter(g => g.status === "jugando");
  const completados = backlog.filter(g => g.status === "completado");
  const pendientes = backlog.filter(g => g.status === "pendiente");
  const dropeados = backlog.filter(g => g.status === "dropeado");
  const favoritos = backlog.filter(g => g.is_favorite);

  const entradaDeJuegoActual = juego ? backlog.find(g => g.game_id === juego.id) : null;
  const esFavoritoActual = entradaDeJuegoActual?.is_favorite ?? false;

  return (
  <div className="w-full min-h-[100dvh] bg-[#0E0E11]">
    <div
      className="app-shell w-full md:max-w-2xl lg:max-w-3xl md:mx-auto flex flex-col overflow-hidden overflow-x-hidden md:border-x md:border-white/5 md:shadow-2xl"
      style={{ height: '100dvh' }}
    >
      <CelebracionLogro visible={!!celebrando} juegoNombre={celebrando} />

      <header className="app-header shrink-0">
        <Gamepad2 size={22} strokeWidth={2} className="logo-icono" />
        <h1>GameBox</h1>
      </header>

      <main className="contenido-pestana flex-1 overflow-y-auto w-full" style={{ minHeight: 0 }}>
        <div className="w-full px-4">
          <AnimatePresence mode="wait">
            {pestanaActiva === "buscar" && (
              <motion.div key="buscar" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.15 }}>
                <PestanaBuscar
                  terminoBusqueda={terminoBusqueda} setTerminoBusqueda={setTerminoBusqueda}
                  resultadosBusqueda={resultadosBusqueda} buscando={buscando} onBuscar={buscarPorTexto}
                  onAleatorio={buscarJuegoAleatorio} cargando={cargando} error={error} juego={juego}
                  estadoActivo={estadoActivo} puntuacion={puntuacion} setPuntuacion={setPuntuacion}
                  resenaTexto={resenaTexto} setResenaTexto={setResenaTexto} onActualizarEstado={actualizarEstado}
                  onGuardarResena={guardarResena} onSeleccionar={seleccionarJuego} esFavoritoActual={esFavoritoActual}
                  onToggleFavorito={alternarFavorito} errorFavoritos={errorFavoritos} juegosTendencia={juegosTendencia}
                />
              </motion.div>
            )}

            {pestanaActiva === "listas" && (
              <motion.div key="listas" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.15 }}>
                <PestanaListas
                  jugando={jugando} completados={completados} pendientes={pendientes} dropeados={dropeados}
                  categoriaAbierta={categoriaAbierta} onToggleCategoria={alternarCategoria}
                  onAbrir={setJuegoSeleccionadoModal} onEliminar={eliminarDelBacklog} onAccionPrincipal={manejarAccionPrincipal}
                  userId={user?.id} backlogCompleto={backlog}
/>
              </motion.div>
            )}

            {pestanaActiva === "perfil" && (
              <motion.div key="perfil" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.15 }}>
                <PestanaPerfil
                  supabaseHabilitado={supabaseHabilitado} sesionCargando={sesionCargando} user={user}
                  authError={authError} authCargando={authCargando} avisoRegistro={avisoRegistro}
                  onLogin={iniciarSesion} onRegistro={registrarse} onLogout={cerrarSesion}
                  nombreUsuario={nombreUsuario} onCambiarNombre={setNombreUsuario}
                  totalJugando={jugando.length} totalCompletados={completados.length}
                  totalPendientes={pendientes.length} totalDropeados={dropeados.length}
                  favoritos={favoritos} perfil={perfil} onPerfilActualizado={onPerfilActualizado} racha={racha}
                />
              </motion.div>
            )}

            {pestanaActiva === "comunidad" && (
              <motion.div key="comunidad" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.15 }}>
                {!supabaseHabilitado || !user ? (
                  <p className="mensaje-estado">Inicia sesión para acceder a la comunidad.</p>
                ) : usuarioSeleccionado ? (
                  <UserProfileView userId={usuarioSeleccionado} currentUserId={user.id} onVolver={volverAComunidad} />
                ) : (
                  <div className="flex flex-col gap-5 w-full">
                    <UserSearch currentUserId={user.id} onSelectUser={verPerfilDeUsuario} />
                    <div className="w-full">
                      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-1">
                        <h3 className="text-sm font-semibold text-gray-100">Actividad reciente</h3>
                        {feedEsGlobal && !cargandoFeed && feedReviews.length > 0 && (
                          <span className="text-[11px] text-white/40">mostrando lo más reciente</span>
                        )}
                      </div>
                      {cargandoFeed ? (
                        <div className="flex flex-col gap-3"><SkeletonReviewCard /><SkeletonReviewCard /></div>
                      ) : (
                        <SocialFeed reviews={feedReviews} onToggleLike={manejarLikeEnFeed} onSelectUser={verPerfilDeUsuario} />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <nav className="tab-bar shrink-0">
        <button type="button" className={`tab-btn ${pestanaActiva === "buscar" ? "activo" : ""}`} onClick={() => setPestanaActiva("buscar")}>
          <Search size={20} strokeWidth={2} /><span className="tab-label">Buscar</span>
        </button>
        <button type="button" className={`tab-btn ${pestanaActiva === "listas" ? "activo" : ""}`} onClick={() => setPestanaActiva("listas")}>
          <Gamepad2 size={20} strokeWidth={2} /><span className="tab-label">Mi Lista</span>
        </button>
        <button type="button" className={`tab-btn ${pestanaActiva === "comunidad" ? "activo" : ""}`} onClick={() => setPestanaActiva("comunidad")}>
          <Users size={20} strokeWidth={1.75} /><span className="tab-label">Comunidad</span>
        </button>
        <button type="button" className={`tab-btn ${pestanaActiva === "perfil" ? "activo" : ""}`} onClick={() => setPestanaActiva("perfil")}>
          <User size={20} strokeWidth={2} /><span className="tab-label">Perfil</span>
        </button>
      </nav>

      <AnimatePresence>
        {juegoSeleccionadoModal && (
          <ModalResena
            juego={juegoSeleccionadoModal}
            onCerrar={() => setJuegoSeleccionadoModal(null)}
            onEditar={() => {
              abrirParaEditar(juegoSeleccionadoModal);
              setJuegoSeleccionadoModal(null);
              setPestanaActiva("buscar");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  </div>
);
}