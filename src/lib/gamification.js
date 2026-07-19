export function calcularNivelGamer(totalCompletados) {
  if (totalCompletados >= 16) return { nombre: 'Leyenda', color: '#F5A623' };
  if (totalCompletados >= 6) return { nombre: 'Aventurero', color: '#7C3AED' };
  if (totalCompletados >= 1) return { nombre: 'Novato', color: '#22D3EE' };
  return { nombre: 'Recién llegado', color: '#9CA3AF' };
}
export function calcularCompatibilidad(misJuegos, susJuegos) {
  const misPuntuados = new Map(
    misJuegos.filter(j => j.status === 'completado' && j.puntuacion > 0).map(j => [j.game_id, j.puntuacion])
  );
  const compartidos = susJuegos.filter(j => j.status === 'completado' && j.puntuacion > 0 && misPuntuados.has(j.game_id));

  if (compartidos.length === 0) return null;

  const diferenciaPromedio = compartidos.reduce(
    (suma, j) => suma + Math.abs(misPuntuados.get(j.game_id) - j.puntuacion), 0
  ) / compartidos.length;

  const porcentaje = Math.round(Math.max(0, 100 - diferenciaPromedio * 20));
  return { porcentaje, juegosCompartidos: compartidos.length };
}