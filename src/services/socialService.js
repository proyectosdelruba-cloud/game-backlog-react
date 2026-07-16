import { supabase } from '../supabaseClient';

export async function followUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function getFollowingIds(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) throw error;
  return data.map(f => f.following_id);
}

export async function getContadoresSociales(userId) {
  const [seguidoresRes, seguidosRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  if (seguidoresRes.error) throw seguidoresRes.error;
  if (seguidosRes.error) throw seguidosRes.error;
  return { seguidores: seguidoresRes.count ?? 0, seguidos: seguidosRes.count ?? 0 };
}

// Una única consulta con JOIN embebido: reseña + perfil del autor + likes.
export async function getFollowingReviews(userId) {
  const idsSeguidos = await getFollowingIds(userId);
  if (idsSeguidos.length === 0) return [];

  const { data, error } = await supabase
    .from('user_games')
    .select(`
      id, name, background_image, puntuacion, resena, fecha_guardado, user_id,
      profiles ( username, avatar_url ),
      review_likes ( user_id )
    `)
    .in('user_id', idsSeguidos)
    .not('resena', 'eq', '')
    .order('fecha_guardado', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data.map(r => ({
    ...r,
    likesCount: r.review_likes.length,
    likedByMe: r.review_likes.some(l => l.user_id === userId),
  }));
}

export async function toggleLikeReview(reviewId, userId) {
  const { data: existente, error: errorLectura } = await supabase
    .from('review_likes')
    .select('user_id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle();
  if (errorLectura) throw errorLectura;

  if (existente) {
    const { error } = await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('review_likes').insert({ review_id: reviewId, user_id: userId });
    if (error) throw error;
  }

  const { count, error: errorConteo } = await supabase
    .from('review_likes')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId);
  if (errorConteo) throw errorConteo;

  return { liked: !existente, likesCount: count };
}

export async function searchUsers(query, currentUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(20);
  if (error) throw error;
  return data;
}

// Perfil público completo: datos de perfil + backlog entero + contadores sociales.
export async function getPerfilPublico(userId) {
  const { data: perfil, error: errorPerfil } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', userId)
    .single();
  if (errorPerfil) throw errorPerfil;

  const { data: juegos, error: errorJuegos } = await supabase
    .from('user_games')
    .select('*')
    .eq('user_id', userId)
    .order('fecha_guardado', { ascending: false });
  if (errorJuegos) throw errorJuegos;

  const { seguidores, seguidos } = await getContadoresSociales(userId);

  return { perfil, juegos: juegos || [], totalSeguidores: seguidores, totalSeguidos: seguidos };
}