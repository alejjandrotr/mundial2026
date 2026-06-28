export interface Usuario {
  uid: string;
  displayName: string;
  email: string;
  totalPoints: number;
  role: 'admin' | 'user';
  exactHits?: number;
  goalHits?: number;
  outcomeHits?: number;
  phaseStats?: {
    [phase: string]: {
      totalPoints: number;
      exactHits: number;
      goalHits: number;
      outcomeHits: number;
    }
  };
}

export interface Partido {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: any; // Firestore Timestamp en BD, pero lo parsearemos
  status: 'pending' | 'in_progress' | 'finished';
  homeGoals: number | null;
  awayGoals: number | null;
  group?: string;
  phase?: string; // e.g. 'grupos', '32avos', '16avos', etc.
  winner?: 'home' | 'away' | null;
}

export interface Prediccion {
  id: string;
  partidoId: string;
  usuarioId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  pointsEarned: number | null;
  winner?: 'home' | 'away' | null;
}
