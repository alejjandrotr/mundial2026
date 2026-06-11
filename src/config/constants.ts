/**
 * Constantes globales de configuración de la quiniela.
 */

// Fecha y hora límite para enviar predicciones y ocultar los pronósticos de otros usuarios
// Establecido para el 11 de Junio de 2026 a las 16:00:00 UTC
export const PREDICTIONS_LOCK_TIMESTAMP = new Date('2026-06-11T16:00:00Z').getTime();

/**
 * Retorna si los pronósticos ajenos aún están bloqueados (antes del lock time)
 */
export function isLockedForOthers(): boolean {
  return Date.now() < PREDICTIONS_LOCK_TIMESTAMP;
}
