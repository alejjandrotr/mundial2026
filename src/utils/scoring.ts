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
  realAway: number | null | undefined,
  phase?: string
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

  // 1. Acierto Exacto
  const matchedExact = predHome === realHome && predAway === realAway;

  // Calcular tendencias/resultados (Ganador Local, Ganador Visitante, Empate)
  const predOutcome = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const realOutcome = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

  const matchedHome = predHome === realHome;
  const matchedAway = predAway === realAway;

  const matchedOutcome = predOutcome === realOutcome;

  // Reglas especiales para Cuartos de Final (fase '8vos')
  if (phase === '8vos') {
    if (matchedExact) {
      return { points: 4.5, matchedHome: true, matchedAway: true };
    }
    if (matchedOutcome) {
      return { points: 3, matchedHome, matchedAway };
    }
    return { points: 0, matchedHome, matchedAway };
  }

  // Reglas estándar del torneo
  if (matchedExact) {
    return { points: 3, matchedHome: true, matchedAway: true };
  }

  // 2. Acierto de Tendencia
  if (matchedOutcome) {
    return { points: 2, matchedHome, matchedAway };
  }

  // 3. Acierto Parcial de Goles (0 Puntos, solo visual)
  if (matchedHome || matchedAway) {
    return { points: 0, matchedHome, matchedAway };
  }

  // 4. Ningún Acierto (0 Puntos)
  return { points: 0, matchedHome: false, matchedAway: false };
}
