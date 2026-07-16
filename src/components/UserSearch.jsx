import { useState, useCallback } from 'react';
import { Search, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { searchUsers, followUser, unfollowUser, getFollowingIds } from '../services/socialService';

export default function UserSearch({ currentUserId, onSelectUser }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [siguiendo, setSiguiendo] = useState(new Set());
  const [procesando, setProcesando] = useState(new Set());
  const [buscando, setBuscando] = useState(false);

  async function manejarBusqueda(e) {
    e.preventDefault();
    const termino = query.trim();
    if (!termino) return;

    setBuscando(true);
    try {
      const [usuarios, idsSeguidos] = await Promise.all([
        searchUsers(termino, currentUserId),
        getFollowingIds(currentUserId),
      ]);
      setResultados(usuarios);
      setSiguiendo(new Set(idsSeguidos));
    } catch (err) {
      console.error(err);
    }
    setBuscando(false);
  }

  const alternarSeguir = useCallback(async (targetId) => {
    if (procesando.has(targetId)) return; // evita doble click / race condition

    setProcesando(prev => new Set(prev).add(targetId));
    const yaLoSigo = siguiendo.has(targetId);

    try {
      if (yaLoSigo) {
        await unfollowUser(currentUserId, targetId);
        setSiguiendo(prev => { const n = new Set(prev); n.delete(targetId); return n; });
      } else {
        await followUser(currentUserId, targetId);
        setSiguiendo(prev => new Set(prev).add(targetId));
      }
    } catch (err) {
      console.error(err);
    }

    setProcesando(prev => { const n = new Set(prev); n.delete(targetId); return n; });
  }, [siguiendo, procesando, currentUserId]);

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={manejarBusqueda} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugadores"
          className="flex-1 bg-surface border border-white/5 text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={buscando}
          className="flex items-center justify-center w-11 bg-surface border border-white/5 text-muted rounded-lg hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
        >
          {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} strokeWidth={2} />}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {resultados.map((usuario) => {
          const yaLoSigo = siguiendo.has(usuario.id);
          const cargando = procesando.has(usuario.id);

          return (
            <div key={usuario.id} className="flex items-center gap-3 bg-surface border border-white/5 rounded-lg p-2.5">
              <button onClick={() => onSelectUser(usuario.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer">
  {usuario.avatar_url ? (
    <img src={usuario.avatar_url} alt={usuario.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-accent/15 flex-shrink-0" />
  )}
  <span className="text-sm text-gray-100 truncate">{usuario.username}</span>
</button>

              <button
                onClick={() => alternarSeguir(usuario.id)}
                disabled={cargando}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  yaLoSigo
                    ? 'bg-transparent border border-white/10 text-muted hover:border-red-500/40 hover:text-red-400'
                    : 'bg-accent text-gray-100 hover:bg-violet-700'
                }`}
              >
                {cargando ? <Loader2 size={13} className="animate-spin" /> : yaLoSigo ? <UserMinus size={13} strokeWidth={2} /> : <UserPlus size={13} strokeWidth={2} />}
                {cargando ? 'Un momento' : yaLoSigo ? 'Dejar de seguir' : 'Seguir'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}