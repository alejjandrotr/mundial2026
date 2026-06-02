export interface ScorePointsResult {
  points: number;
  matchedHome: boolean;
  matchedAway: boolean;
}

/**
 * Calcula los puntos obtenidos por una predicción en base a un resultado real.
 * 
 * Reglas:
 * - 3 puntos: Marcador exacto (ej. pred 1-2, real 1-2).
 * - 2 puntos: Acertar ganador o empate, pero no marcador exacto (ej. pred 0-1, real 1-2).
 * - 1 punto: No acertar ganador/empate, pero acertar los goles de 1 equipo (ej. pred 1-0, real 1-2 -> local acertado).
 * - 0 puntos: Cualquier otro caso.
 */
export function calculateMatchPoints(
  predHome: number | null | undefined,
  predAway: number | null | undefined,
  realHome: number | null | undefined,
  realAway: number | null | undefined
): ScorePointsResult {
  // Si no hay predicción o no hay resultado real cargado, no hay puntos aún
  if (
    predHome === null || predHome === undefined ||
    predAway === null || predAway === undefined ||
    realHome === null || realHome === undefined ||
    realAway === null || realAway === undefined
  ) {
    return { points: 0, matchedHome: false, matchedAway: false };
  }

  // 1. Acierto Exacto (3 Puntos)
  if (predHome === realHome && predAway === realAway) {
    return { points: 3, matchedHome: true, matchedAway: true };
  }

  // Calcular tendencias/resultados (Ganador Local, Ganador Visitante, Empate)
  const predOutcome = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const realOutcome = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

  const matchedHome = predHome === realHome;
  const matchedAway = predAway === realAway;

  // 2. Acierto de Tendencia (2 Puntos)
  if (predOutcome === realOutcome) {
    return { points: 2, matchedHome, matchedAway };
  }

  // 3. Acierto Parcial de Goles (1 Punto)
  if (matchedHome || matchedAway) {
    return { points: 1, matchedHome, matchedAway };
  }

  // 4. Ningún Acierto (0 Puntos)
  return { points: 0, matchedHome: false, matchedAway: false };
}
