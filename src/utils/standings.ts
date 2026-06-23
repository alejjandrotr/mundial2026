import type { Partido } from '../models/types';

export interface TeamStanding {
  name: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number; // position within the group (1-4)
}

/**
 * Calcula la tabla de posiciones de un grupo en base a los goles dados.
 * Los goles pueden provenir de resultados oficiales o de las predicciones de un usuario.
 * 
 * @param matches - Todos los partidos (se filtrarán por grupo internamente)
 * @param groupName - El nombre del grupo (A-L)
 * @param getGoals - Función que, dado un matchId, devuelve {homeGoals, awayGoals} o null si no hay resultado
 */
export function calculateGroupStandings(
  matches: Partido[],
  groupName: string,
  getGoals: (matchId: string) => { homeGoals: number; awayGoals: number } | null
): TeamStanding[] {
  const groupMatches = matches.filter((m) => m.group === groupName);
  const teamsMap: Record<string, TeamStanding> = {};

  // Inicializar equipos
  groupMatches.forEach((m) => {
    if (!teamsMap[m.homeTeam]) {
      teamsMap[m.homeTeam] = {
        name: m.homeTeam,
        group: groupName,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        position: 0,
      };
    }
    if (!teamsMap[m.awayTeam]) {
      teamsMap[m.awayTeam] = {
        name: m.awayTeam,
        group: groupName,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        position: 0,
      };
    }
  });

  // Procesar resultados
  groupMatches.forEach((m) => {
    const goals = getGoals(m.id);
    if (goals === null) return;

    const { homeGoals, awayGoals } = goals;
    const homeTeam = teamsMap[m.homeTeam];
    const awayTeam = teamsMap[m.awayTeam];
    if (!homeTeam || !awayTeam) return;

    homeTeam.played += 1;
    awayTeam.played += 1;
    homeTeam.goalsFor += homeGoals;
    homeTeam.goalsAgainst += awayGoals;
    awayTeam.goalsFor += awayGoals;
    awayTeam.goalsAgainst += homeGoals;
    homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
    awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;

    if (homeGoals > awayGoals) {
      homeTeam.won += 1;
      homeTeam.points += 3;
      awayTeam.lost += 1;
    } else if (homeGoals < awayGoals) {
      awayTeam.won += 1;
      awayTeam.points += 3;
      homeTeam.lost += 1;
    } else {
      homeTeam.drawn += 1;
      homeTeam.points += 1;
      awayTeam.drawn += 1;
      awayTeam.points += 1;
    }
  });

  // Ordenar y asignar posiciones
  const sorted = Object.values(teamsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach((team, idx) => {
    team.position = idx + 1;
  });

  return sorted;
}

/**
 * Calcula las tablas de posiciones de todos los grupos.
 */
export function calculateAllGroupStandings(
  matches: Partido[],
  groups: string[],
  getGoals: (matchId: string) => { homeGoals: number; awayGoals: number } | null
): Record<string, TeamStanding[]> {
  const result: Record<string, TeamStanding[]> = {};
  groups.forEach((g) => {
    result[g] = calculateGroupStandings(matches, g, getGoals);
  });
  return result;
}

/**
 * Determina los 8 mejores terceros de entre los 12 grupos.
 * 
 * Criterios FIFA 2026:
 * 1. Mayor número de puntos
 * 2. Mejor diferencia de goles
 * 3. Mayor número de goles anotados
 * 4. Nombre (tie-breaker final simplificado - en la realidad sería Fair Play / Ranking FIFA)
 */
export function getBestThirdPlaceTeams(
  allStandings: Record<string, TeamStanding[]>
): TeamStanding[] {
  const thirdPlaceTeams: TeamStanding[] = [];

  Object.values(allStandings).forEach((groupStandings) => {
    if (groupStandings.length >= 3) {
      thirdPlaceTeams.push(groupStandings[2]); // El 3er lugar (index 2)
    }
  });

  // Ordenar por criterios FIFA
  thirdPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

  return thirdPlaceTeams;
}

/**
 * Verifica si un grupo tiene todos sus partidos resueltos (con goles definidos).
 */
export function isGroupComplete(
  matches: Partido[],
  groupName: string,
  getGoals: (matchId: string) => { homeGoals: number; awayGoals: number } | null
): boolean {
  const groupMatches = matches.filter((m) => m.group === groupName);
  return groupMatches.every((m) => getGoals(m.id) !== null);
}
