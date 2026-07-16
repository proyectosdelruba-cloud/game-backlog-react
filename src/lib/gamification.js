export function calcularNivelGamer(totalCompletados) {
  if (totalCompletados >= 16) return { nombre: 'Leyenda', color: '#F5A623' };
  if (totalCompletados >= 6) return { nombre: 'Aventurero', color: '#7C3AED' };
  if (totalCompletados >= 1) return { nombre: 'Novato', color: '#22D3EE' };
  return { nombre: 'Recién llegado', color: '#9CA3AF' };
}