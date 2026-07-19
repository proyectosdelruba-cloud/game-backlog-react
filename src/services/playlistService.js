import { supabase } from '../supabaseClient';

export async function obtenerMisPlaylists(userId) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      id, nombre, es_publica, created_at,
      playlist_juegos ( game_id, name, background_image )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearPlaylist(userId, nombre) {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: userId, nombre })
    .select()
    .single();
  if (error) throw error;
  return { ...data, playlist_juegos: [] };
}

export async function eliminarPlaylist(playlistId) {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

export async function alternarPublica(playlistId, nuevoValor) {
  const { error } = await supabase.from('playlists').update({ es_publica: nuevoValor }).eq('id', playlistId);
  if (error) throw error;
}

export async function agregarJuegoAPlaylist(playlistId, juego) {
  const { error } = await supabase
    .from('playlist_juegos')
    .insert({
      playlist_id: playlistId,
      game_id: juego.game_id,
      name: juego.name,
      background_image: juego.background_image,
    });
  if (error) throw error;
}

export async function eliminarJuegoDePlaylist(playlistId, gameId) {
  const { error } = await supabase
    .from('playlist_juegos')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('game_id', gameId);
  if (error) throw error;
}

export async function obtenerPlaylistsPublicasDe(userId) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      id, nombre,
      playlist_juegos ( game_id, name, background_image )
    `)
    .eq('user_id', userId)
    .eq('es_publica', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}