import { useState, useRef } from 'react';
import { Camera, Loader2, Check } from 'lucide-react';
import { subirAvatar, actualizarPerfil } from '../perfilService';
import './EditarPerfil.css';

export default function EditarPerfil({ user, perfil, onPerfilActualizado }) {
  const [username, setUsername] = useState(perfil?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(perfil?.avatar_url ?? '');
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [error, setError] = useState(null);
  const inputArchivoRef = useRef(null);

  async function manejarSeleccionArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setError('La imagen no puede superar 2MB.');
      return;
    }

    setError(null);
    setSubiendoAvatar(true);

    try {
      const url = await subirAvatar(user.id, archivo);
      const urlConCache = `${url}?t=${Date.now()}`; // evita servir la imagen vieja cacheada
      await actualizarPerfil(user.id, { avatar_url: urlConCache });
      setAvatarUrl(urlConCache);
      onPerfilActualizado?.({ avatar_url: urlConCache });
    } catch (err) {
      console.error(err);
      setError('No se pudo subir el avatar. Inténtalo de nuevo.');
    }

    setSubiendoAvatar(false);
  }

  async function guardarUsername() {
    const nombreLimpio = username.trim();
    if (!nombreLimpio) {
      setError('El nombre de usuario no puede estar vacío.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await actualizarPerfil(user.id, { username: nombreLimpio });
      onPerfilActualizado?.({ username: nombreLimpio });
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 2000);
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar. Ese nombre puede estar en uso.');
    }

    setGuardando(false);
  }

  return (
    <div className="editar-perfil">
      <button
        type="button"
        className="avatar-boton"
        onClick={() => inputArchivoRef.current?.click()}
        disabled={subiendoAvatar}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">
            <Camera size={22} strokeWidth={1.75} />
          </div>
        )}

        <span className="avatar-overlay">
          {subiendoAvatar ? <Loader2 size={16} className="girando" /> : <Camera size={16} strokeWidth={2} />}
        </span>
      </button>

      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/*"
        onChange={manejarSeleccionArchivo}
        hidden
      />

      <div className="username-editor">
        <input
          className="username-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario"
          maxLength={24}
        />
        <button
          type="button"
          className="btn-guardar-username"
          onClick={guardarUsername}
          disabled={guardando || username.trim() === perfil?.username}
        >
          {guardando ? <Loader2 size={14} className="girando" /> : guardadoOk ? <Check size={14} /> : 'Guardar'}
        </button>
      </div>

      {error && <p className="editar-perfil-error">{error}</p>}
    </div>
  );
}