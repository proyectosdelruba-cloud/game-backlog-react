import { supabase } from './supabaseClient';

export async function obtenerPerfil(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarPerfil(userId, cambios) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function subirAvatar(userId, archivo) {
  // Ruta fija por usuario: sobrescribe siempre el mismo archivo (upsert),
  // evita acumular avatares huérfanos en el bucket y encaja con la política
  // RLS que valida (storage.foldername(name))[1] = auth.uid().
  const extension = archivo.name.split('.').pop();
  const ruta = `${userId}/avatar.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from('avatars')
    .upload(ruta, archivo, { upsert: true, cacheControl: '3600' });

  if (errorSubida) throw errorSubida;

  const { data } = supabase.storage.from('avatars').getPublicUrl(ruta);
  return data.publicUrl;
}

export async function actualizarRachaDiaria(userId) {
  const hoy = new Date().toISOString().split('T')[0];

  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('streak_count, last_active_date')
    .eq('id', userId)
    .single();
  if (error) throw error;

  if (perfil.last_active_date === hoy) return perfil.streak_count;

  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toISOString().split('T')[0];

  const nuevaRacha = perfil.last_active_date === ayerStr ? perfil.streak_count + 1 : 1;

  const { error: errorUpdate } = await supabase
    .from('profiles')
    .update({ streak_count: nuevaRacha, last_active_date: hoy })
    .eq('id', userId);
  if (errorUpdate) throw errorUpdate;

  return nuevaRacha;
}