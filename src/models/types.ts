export interface Usuario {
  uid: string;
  displayName: string;
  email: string;
  totalPoints: number;
  role: 'admin' | 'user';
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
}

export interface Prediccion {
  id: string;
  partidoId: string;
  usuarioId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  pointsEarned: number | null;
}
