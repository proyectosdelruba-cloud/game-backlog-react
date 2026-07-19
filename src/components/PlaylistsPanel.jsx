import { useState, useEffect, useCallback } from 'react';
import { Plus, Globe, Lock, Trash2, ChevronDown, ImageOff, X } from 'lucide-react';
import {
  obtenerMisPlaylists, crearPlaylist, eliminarPlaylist,
  alternarPublica, agregarJuegoAPlaylist, eliminarJuegoDePlaylist,
} from '../services/playlistService';

function MiniPoster({ src, alt }) {
  const [fallo, setFallo] = useState(false);
  if (!src || fallo) {
    return (
      <div className="aspect-[2/3] w-full rounded-lg bg-surface flex items-center justify-center text-white/10">
        <ImageOff size={16} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className="aspect-[2/3] w-full rounded-lg object-cover" onError={() => setFallo(true)} loading="lazy" />
  );
}

export default function PlaylistsPanel({ userId, backlog }) {
  const [playlists, setPlaylists] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombreNueva, setNombreNueva] = useState('');
  const [creando, setCreando] = useState(false);
  const [playlistAbierta, setPlaylistAbierta] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    obtenerMisPlaylists(userId)
      .then(setPlaylists)
      .catch((err) => console.error('No se pudieron cargar las playlists:', err))
      .finally(() => setCargando(false));
  }, [userId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function manejarCrear(e) {
    e.preventDefault();
    const nombre = nombreNueva.trim();
    if (!nombre) return;

    setCreando(true);
    try {
      const nueva = await crearPlaylist(userId, nombre);
      setPlaylists(prev => [nueva, ...prev]);
      setNombreNueva('');
    } catch (err) {
      console.error('No se pudo crear la playlist:', err);
    }
    setCreando(false);
  }

  async function manejarEliminar(playlistId) {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    try {
      await eliminarPlaylist(playlistId);
    } catch (err) {
      console.error('No se pudo eliminar:', err);
      cargar();
    }
  }

  async function manejarTogglePublica(playlist) {
    const nuevoValor = !playlist.es_publica;
    setPlaylists(prev => prev.map(p => (p.id === playlist.id ? { ...p, es_publica: nuevoValor } : p)));
    try {
      await alternarPublica(playlist.id, nuevoValor);
    } catch (err) {
      console.error('No se pudo actualizar:', err);
      cargar();
    }
  }

  async function manejarAgregarJuego(playlistId, juego) {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, playlist_juegos: [...p.playlist_juegos, { game_id: juego.game_id, name: juego.name, background_image: juego.background_image }] }
        : p
    ));
    try {
      await agregarJuegoAPlaylist(playlistId, juego);
    } catch (err) {
      console.error('No se pudo añadir el juego:', err);
      cargar();
    }
  }

  async function manejarQuitarJuego(playlistId, gameId) {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, playlist_juegos: p.playlist_juegos.filter(j => j.game_id !== gameId) }
        : p
    ));
    try {
      await eliminarJuegoDePlaylist(playlistId, gameId);
    } catch (err) {
      console.error('No se pudo quitar el juego:', err);
      cargar();
    }
  }

  if (cargando) {
    return <p className="text-sm text-white/40 py-2">Cargando playlists...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={manejarCrear} className="flex gap-2">
        <input
          type="text"
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          placeholder="Nombre de la nueva playlist"
          className="flex-1 bg-surface border border-white/5 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <button type="submit" disabled={creando} className="flex items-center justify-center w-10 bg-accent rounded-lg text-white disabled:opacity-50">
          <Plus size={16} strokeWidth={2} />
        </button>
      </form>

      {playlists.length === 0 && (
        <p className="text-sm text-white/40">Aún no tienes ninguna playlist. Crea la primera arriba.</p>
      )}

      {playlists.map((playlist) => {
        const abierta = playlistAbierta === playlist.id;
        const idsEnPlaylist = new Set(playlist.playlist_juegos.map(j => j.game_id));
        const candidatos = backlog.filter(g => !idsEnPlaylist.has(g.game_id));

        return (
          <div key={playlist.id} className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3.5"
              onClick={() => setPlaylistAbierta(abierta ? null : playlist.id)}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                {playlist.nombre}
                <span className="text-xs font-normal text-white/40">{playlist.playlist_juegos.length}</span>
              </span>
              <ChevronDown size={16} className={`text-white/40 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`} />
            </button>

            {abierta && (
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => manejarTogglePublica(playlist)}
                    className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
                      playlist.es_publica ? 'bg-accent text-white' : 'bg-transparent border border-white/10 text-white/40'
                    }`}
                  >
                    {playlist.es_publica ? <Globe size={13} strokeWidth={2} /> : <Lock size={13} strokeWidth={2} />}
                    {playlist.es_publica ? 'Pública' : 'Privada'}
                  </button>

                  <button
                    type="button"
                    onClick={() => manejarEliminar(playlist.id)}
                    className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400"
                  >
                    <Trash2 size={13} strokeWidth={2} /> Eliminar
                  </button>
                </div>

                {playlist.playlist_juegos.length === 0 ? (
                  <p className="text-xs text-white/40">Vacía todavía — añade juegos abajo.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {playlist.playlist_juegos.map((j) => (
                      <div key={j.game_id} className="relative">
                        <MiniPoster src={j.background_image} alt={j.name} />
                        <button
                          type="button"
                          onClick={() => manejarQuitarJuego(playlist.id, j.game_id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"
                        >
                          <X size={11} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectorAbierto(selectorAbierto === playlist.id ? null : playlist.id)}
                  className="text-xs text-accent font-semibold text-left"
                >
                  {selectorAbierto === playlist.id ? 'Cerrar' : '+ Añadir juego desde tu lista'}
                </button>

                {selectorAbierto === playlist.id && (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {candidatos.length === 0 ? (
                      <p className="text-xs text-white/40">No tienes más juegos en tu lista para añadir.</p>
                    ) : (
                      candidatos.map((g) => (
                        <button
                          key={g.game_id}
                          type="button"
                          onClick={() => manejarAgregarJuego(playlist.id, g)}
                          className="flex items-center gap-2 text-left text-xs text-gray-200 hover:bg-white/5 rounded-lg px-2 py-1.5"
                        >
                          <span className="truncate">{g.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}