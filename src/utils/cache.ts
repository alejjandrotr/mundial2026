import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Partido, Usuario } from '../models/types';

/**
 * Caché en memoria a nivel de sesión del navegador.
 * 
 * Evita que cada vez que el usuario navega entre pestañas 
 * (Quiniela, Comparativa, Resultados) se vuelvan a leer 
 * todos los documentos de Firestore.
 * 
 * Se invalida automáticamente al recargar la página (F5) 
 * o manualmente con clearCache().
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Tiempo máximo de caché: 5 minutos (300,000 ms)
const CACHE_TTL = 5 * 60 * 1000;

let matchesCache: CacheEntry<Partido[]> | null = null;
let usersCache: CacheEntry<Usuario[]> | null = null;
let predictionsCache: CacheEntry<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/** Obtiene todos los partidos, usando caché si está fresco */
export async function getCachedMatches(forceRefresh = false): Promise<Partido[]> {
  if (!forceRefresh && isFresh(matchesCache)) {
    return matchesCache.data;
  }

  const q = query(collection(db, 'partidos'), orderBy('kickoffTime', 'asc'));
  const snapshot = await getDocs(q);
  const data: Partido[] = [];
  snapshot.forEach((doc) => {
    data.push(doc.data() as Partido);
  });

  matchesCache = { data, timestamp: Date.now() };
  return data;
}

/** Obtiene todos los usuarios, usando caché si está fresco */
export async function getCachedUsers(forceRefresh = false): Promise<Usuario[]> {
  if (!forceRefresh && isFresh(usersCache)) {
    return usersCache.data;
  }

  const q = query(collection(db, 'usuarios'), orderBy('totalPoints', 'desc'));
  const snapshot = await getDocs(q);
  const data: Usuario[] = [];
  snapshot.forEach((doc) => {
    data.push(doc.data() as Usuario);
  });

  usersCache = { data, timestamp: Date.now() };
  return data;
}

/** Obtiene todas las predicciones agrupadas por usuario, usando caché si está fresco */
export async function getCachedPredictions(forceRefresh = false): Promise<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>> {
  if (!forceRefresh && isFresh(predictionsCache)) {
    return predictionsCache.data;
  }

  const snapshot = await getDocs(collection(db, 'predicciones'));
  const data: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>> = {};

  snapshot.forEach((doc) => {
    const d = doc.data();
    const uId = d.usuarioId as string;
    const mId = d.partidoId as string;

    if (!data[uId]) {
      data[uId] = {};
    }

    data[uId][mId] = {
      homeGoals: d.homeGoals as number | null,
      awayGoals: d.awayGoals as number | null,
    };
  });

  predictionsCache = { data, timestamp: Date.now() };
  return data;
}

/** Invalida todo el caché (útil tras guardar la quiniela o simular datos) */
export function clearCache() {
  matchesCache = null;
  usersCache = null;
  predictionsCache = null;
}

/** Invalida solo el caché de predicciones (útil tras guardar mi quiniela) */
export function clearPredictionsCache() {
  predictionsCache = null;
  usersCache = null; // También usuarios, porque totalPoints puede haber cambiado
}
