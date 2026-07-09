/**
 * Constantes globales de configuración de la quiniela.
 */

export const PHASE_LOCK_TIMESTAMPS: Record<string, number> = {
  grupos: new Date('2026-06-11T12:10:00Z').getTime(),
  '32avos': new Date('2026-06-28T15:00:00-04:00').getTime(),
  '16avos': new Date('2026-07-04T13:00:00-04:00').getTime(),
  '8vos': new Date('2026-07-09T15:00:00-04:00').getTime(),
};

export function getPhaseLockTimestamp(phase: string): number {
  return PHASE_LOCK_TIMESTAMPS[phase] || PHASE_LOCK_TIMESTAMPS.grupos;
}

export function isPrivacyEnabledForPhase(phase: string): boolean {
  return Date.now() < getPhaseLockTimestamp(phase);
}

export function isFormLockedForPhase(phase: string): boolean {
  return Date.now() >= getPhaseLockTimestamp(phase);
}

// Compatibilidad con código no migrado temporalmente
export const PREDICTIONS_LOCK_TIMESTAMP = PHASE_LOCK_TIMESTAMPS.grupos;
export function isLockedForOthers(): boolean {
  return isPrivacyEnabledForPhase('grupos');
}
