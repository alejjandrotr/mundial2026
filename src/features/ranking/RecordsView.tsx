import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Usuario, Partido } from '../../models/types';
import { Trophy, Target, Award, Sparkles, Medal, Loader2, Flame, Crosshair, MapPin, Download, Play } from 'lucide-react';
import { toTitleCase } from '../../utils/format';
import { generateBarChartRaceCSV } from '../../utils/barchart';
import { calculateAllGroupStandings, getBestThirdPlaceTeams } from '../../utils/standings';
import BarChartRace from './BarChartRace';

interface UserRecordStats extends Usuario {
  exactHits: number;
  goalHits: number;
  outcomeHits: number;
  maxStreak: number;
  qualifiersExactHits: number;
  qualifiersAnyHits: number;
  avgDistanceToOfficial: number;
}

export default function RecordsView() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [matches, setMatches] = useState<Partido[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});
  const [loading, setLoading] = useState(true);
  const [showBarChartRace, setShowBarChartRace] = useState(false);

  useEffect(() => {
    // 1. Escuchar partidos
    const unsubscribeMatches = onSnapshot(collection(db, 'partidos'), (snapshot) => {
      const matchesData: Partido[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        matchesData.push({
          ...data,
          kickoffTime: data.kickoffTime?.toDate ? data.kickoffTime.toDate() : new Date(data.kickoffTime)
        } as Partido);
      });
      setMatches(matchesData);
    });

    // 2. Escuchar usuarios
    const unsubscribeUsers = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const usersData: Usuario[] = [];
      snapshot.forEach((doc) => {
        const u = doc.data() as Usuario;
        if (u.displayName) {
          u.displayName = toTitleCase(u.displayName);
        }
        usersData.push(u);
      });
      setUsers(usersData);
    });

    // 3. Escuchar predicciones
    const unsubscribePreds = onSnapshot(collection(db, 'predicciones'), (snapshot) => {
      const predsMap: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>> = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.usuarioId;
        const matchId = data.partidoId;
        const homeG = data.homeGoals;
        const awayG = data.awayGoals;

        if (!predsMap[userId]) predsMap[userId] = {};
        predsMap[userId][matchId] = {
          homeGoals: homeG !== undefined ? homeG : null,
          awayGoals: awayG !== undefined ? awayG : null,
        };
      });
      setPredictions(predsMap);
      setLoading(false);
    });

    return () => {
      unsubscribeMatches();
      unsubscribeUsers();
      unsubscribePreds();
    };
  }, []);

  // Calcular las estadísticas para cada usuario en base a predicciones y partidos reales
  const computedRecords = useMemo<UserRecordStats[]>(() => {
    // Ordenar partidos finalizados cronológicamente para el cálculo de rachas
    const chronMatches = [...matches]
      .filter(m => m.status === 'finished' && m.homeGoals !== null && m.awayGoals !== null)
      .sort((a, b) => {
        const timeA = a.kickoffTime?.toDate ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime).getTime();
        const timeB = b.kickoffTime?.toDate ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime).getTime();
        return timeA - timeB;
      });

    // --- LÓGICA PARA CLASIFICADOS OFICIALES ---
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const getOfficialGoals = (matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (match && match.homeGoals !== null && match.awayGoals !== null) {
        return { homeGoals: match.homeGoals, awayGoals: match.awayGoals };
      }
      return null;
    };
    const officialStandings = calculateAllGroupStandings(matches, groups, getOfficialGoals);
    const officialBestThirds = getBestThirdPlaceTeams(officialStandings);
    
    const officialQualifiers: { team: string; type: '1st' | '2nd' | '3rd'; group: string }[] = [];
    const officialQualifierNames = new Set<string>();

    groups.forEach(g => {
      const groupStandings = officialStandings[g];
      if (groupStandings.length > 0 && groupStandings[0].played > 0) {
        officialQualifiers.push({ team: groupStandings[0].name, type: '1st', group: g });
        officialQualifierNames.add(groupStandings[0].name);
      }
      if (groupStandings.length > 1 && groupStandings[1].played > 0) {
        officialQualifiers.push({ team: groupStandings[1].name, type: '2nd', group: g });
        officialQualifierNames.add(groupStandings[1].name);
      }
    });

    officialBestThirds.slice(0, 8).forEach(t => {
      if (t.played > 0) {
        officialQualifiers.push({ team: t.name, type: '3rd', group: t.group });
        officialQualifierNames.add(t.name);
      }
    });
    // ------------------------------------------

    return users.map(user => {
      const userPreds = predictions[user.uid] || {};
      let exactHits = 0;
      let goalHits = 0;
      let outcomeHits = 0;
      let qualifiersExactHits = 0;
      let qualifiersAnyHits = 0;
      let totalDistance = 0;
      let predictedMatchesCount = 0;
      
      let maxStreak = 0;
      let currentStreak = 0;

      // Calcular estadísticas generales
      matches.forEach(match => {
        if (match.status === 'finished' && match.homeGoals !== null && match.awayGoals !== null) {
          const pred = userPreds[match.id];
          if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
            // 1. Marcadores exactos (ME)
            if (pred.homeGoals === match.homeGoals && pred.awayGoals === match.awayGoals) {
              exactHits++;
            }
            
            // 2. Aciertos individuales de goles (AG)
            if (pred.homeGoals === match.homeGoals) goalHits++;
            if (pred.awayGoals === match.awayGoals) goalHits++;

            // 3. Acierto de resultado/tendencia (AP)
            const predOutcome = pred.homeGoals > pred.awayGoals ? 'home' : pred.homeGoals < pred.awayGoals ? 'away' : 'draw';
            const realOutcome = match.homeGoals > match.awayGoals ? 'home' : match.homeGoals < match.awayGoals ? 'away' : 'draw';
            if (predOutcome === realOutcome) {
              outcomeHits++;
            }

            // Anti-Batacazo: Distancia respecto al resultado oficial
            const distance = Math.abs(pred.homeGoals - match.homeGoals) + Math.abs(pred.awayGoals - match.awayGoals);
            totalDistance += distance;
            predictedMatchesCount++;
          }
        }
      });

      // Calcular racha más larga (con aciertos en partidos continuos)
      chronMatches.forEach(match => {
        const pred = userPreds[match.id];
        if (pred && pred.homeGoals !== null && pred.awayGoals !== null && match.homeGoals !== null && match.awayGoals !== null) {
          const predOutcome = pred.homeGoals > pred.awayGoals ? 'home' : pred.homeGoals < pred.awayGoals ? 'away' : 'draw';
          const realOutcome = match.homeGoals > match.awayGoals ? 'home' : match.homeGoals < match.awayGoals ? 'away' : 'draw';
          
          if (predOutcome === realOutcome) {
            currentStreak++;
            if (currentStreak > maxStreak) {
              maxStreak = currentStreak;
            }
          } else {
            currentStreak = 0;
          }
        } else {
          currentStreak = 0; // Si no predijo, rompe la racha
        }
      });

      // --- LÓGICA PARA CLASIFICADOS DEL USUARIO ---
      const getUserGoals = (matchId: string) => {
        const pred = userPreds[matchId];
        if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
          return { homeGoals: pred.homeGoals, awayGoals: pred.awayGoals };
        }
        return null;
      };

      const userStandings = calculateAllGroupStandings(matches, groups, getUserGoals);
      const userBestThirds = getBestThirdPlaceTeams(userStandings);
      
      const userQualifiers: { team: string; type: '1st' | '2nd' | '3rd'; group: string }[] = [];
      
      groups.forEach(g => {
        const groupStandings = userStandings[g];
        if (groupStandings.length > 0 && groupStandings[0].played > 0) {
          userQualifiers.push({ team: groupStandings[0].name, type: '1st', group: g });
        }
        if (groupStandings.length > 1 && groupStandings[1].played > 0) {
          userQualifiers.push({ team: groupStandings[1].name, type: '2nd', group: g });
        }
      });
      userBestThirds.slice(0, 8).forEach(t => {
        if (t.played > 0) {
          userQualifiers.push({ team: t.name, type: '3rd', group: t.group });
        }
      });

      userQualifiers.forEach(uq => {
        // Verificar Acierto Exacto
        const exactMatch = officialQualifiers.find(oq => oq.team === uq.team && oq.type === uq.type && oq.group === uq.group);
        if (exactMatch) qualifiersExactHits++;
        
        // Verificar Acierto General
        if (officialQualifierNames.has(uq.team)) qualifiersAnyHits++;
      });
      // --------------------------------------------

      return {
        ...user,
        exactHits,
        goalHits,
        outcomeHits,
        maxStreak,
        qualifiersExactHits,
        qualifiersAnyHits,
        avgDistanceToOfficial: predictedMatchesCount > 0 ? parseFloat((totalDistance / predictedMatchesCount).toFixed(2)) : 999
      };
    });
  }, [users, matches, predictions]);

  // Rankings específicos ordenados
  const topGoalHits = useMemo(() => {
    return [...computedRecords].sort((a, b) => {
      if (b.goalHits !== a.goalHits) return b.goalHits - a.goalHits;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      return b.totalPoints - a.totalPoints;
    });
  }, [computedRecords]);

  const topExactHits = useMemo(() => {
    return [...computedRecords].sort((a, b) => {
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      if (b.goalHits !== a.goalHits) return b.goalHits - a.goalHits;
      return b.totalPoints - a.totalPoints;
    });
  }, [computedRecords]);

  const topOutcomeHits = useMemo(() => {
    return [...computedRecords].sort((a, b) => {
      if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
      if (b.goalHits !== a.goalHits) return b.goalHits - a.goalHits;
      return b.totalPoints - a.totalPoints;
    });
  }, [computedRecords]);

  const topStreaks = useMemo(() => {
    return [...computedRecords].sort((a, b) => {
      if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
      if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
      return b.totalPoints - a.totalPoints;
    });
  }, [computedRecords]);

  const topQualifiersExact = useMemo(() => {
    return [...computedRecords].sort((a, b) => {
      if (b.qualifiersExactHits !== a.qualifiersExactHits) return b.qualifiersExactHits - a.qualifiersExactHits;
      return b.totalPoints - a.totalPoints;
    });
  }, [computedRecords]);

  const topQualifiersAny = useMemo(() => {
    return [...computedRecords].sort((a, b) => {
      if (b.qualifiersAnyHits !== a.qualifiersAnyHits) return b.qualifiersAnyHits - a.qualifiersAnyHits;
      return b.totalPoints - a.totalPoints;
    });
  }, [computedRecords]);

  const topAvgDistance = useMemo(() => {
    return [...computedRecords]
      .filter(u => u.avgDistanceToOfficial < 999)
      .sort((a, b) => {
        if (a.avgDistanceToOfficial !== b.avgDistanceToOfficial) return a.avgDistanceToOfficial - b.avgDistanceToOfficial;
        return b.totalPoints - a.totalPoints; // Tie break: More total points
      });
  }, [computedRecords]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <span>Cargando salón de records mundiales...</span>
      </div>
    );
  }

  const renderRankList = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    data: UserRecordStats[],
    keyExtractor: (user: UserRecordStats) => number,
    label: string,
    badgeColor: string,
    limit: number = 10
  ) => {
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-xl flex flex-col h-full">
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-3 mb-4">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/50">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-white tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="divide-y divide-slate-850 flex-1">
          {data.slice(0, limit).map((user, idx) => {
            const rank = idx + 1;
            const value = keyExtractor(user);
            let rankBadge = null;

            if (rank === 1) {
              rankBadge = <Medal className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]" />;
            } else if (rank === 2) {
              rankBadge = <Medal className="w-4 h-4 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.4)]" />;
            } else if (rank === 3) {
              rankBadge = <Medal className="w-4 h-4 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.4)]" />;
            } else {
              rankBadge = <span className="text-[11px] font-mono text-slate-500 font-bold">{rank}</span>;
            }

            return (
              <div key={user.uid} className="flex items-center justify-between py-3 hover:bg-slate-800/10 transition-colors px-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 flex justify-center flex-shrink-0">
                    {rankBadge}
                  </div>
                  <span className="text-xs text-slate-200 truncate font-semibold">
                    {user.displayName}
                  </span>
                </div>
                <div className={`flex flex-col items-center justify-center ${badgeColor} px-2.5 py-0.5 rounded-lg border min-w-[50px] shadow-sm`}>
                  <span className="text-xs font-black">{value}</span>
                  <span className="text-[7px] font-bold uppercase tracking-tight opacity-80">{label}</span>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Sin datos disponibles aún.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Intro Header */}
      <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/25">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>🏅 Salón de Records & Rankings Alternativos</span>
            </h2>
            <p className="text-slate-400 text-xs">Consulta quién lidera en puntería de goles individuales, precisión exacta o aciertos generales de resultados.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={() => setShowBarChartRace(true)}
            className="flex w-full sm:w-auto justify-center items-center gap-2 bg-worldcup-purple hover:bg-worldcup-purple/80 text-white px-4 py-2 rounded-xl transition-all font-bold text-sm active:scale-95 whitespace-nowrap shadow-[0_0_15px_rgba(114,9,183,0.4)]"
          >
            <Play className="w-4 h-4" />
            Bar Chart Race Interactivo
          </button>

          <button 
            onClick={() => generateBarChartRaceCSV(users, matches, predictions)}
            className="flex w-full sm:w-auto justify-center items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl transition-all font-bold text-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Grid of Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Top AG */}
        {renderRankList(
          "Top Acierto de Goles (AG)",
          "Suma de aciertos por goles de cada equipo por partido",
          <Target className="w-5 h-5 text-sky-400" />,
          topGoalHits,
          (u) => u.goalHits,
          "Goles",
          "bg-sky-950/30 text-sky-400 border-sky-500/20"
        )}

        {/* Top ME */}
        {renderRankList(
          "Top Marcadores Exactos (ME)",
          "Número de marcadores clavados de forma idéntica",
          <Trophy className="w-5 h-5 text-amber-500" />,
          topExactHits,
          (u) => u.exactHits,
          "Exactos",
          "bg-amber-950/30 text-amber-400 border-amber-500/20"
        )}

        {/* Top Aciertos Resultado (AP) */}
        {renderRankList(
          "Top Tendencia de Partidos (AP)",
          "Partidos donde acertó ganador o empate",
          <Award className="w-5 h-5 text-emerald-400" />,
          topOutcomeHits,
          (u) => u.outcomeHits,
          "Partidos",
          "bg-emerald-950/30 text-emerald-400 border-emerald-500/20"
        )}

        {/* Top 5 Rachas Ganadoras */}
        {renderRankList(
          "Top 5 Rachas Ganadoras (RG)",
          "Mayor cantidad de aciertos en partidos consecutivos",
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />,
          topStreaks,
          (u) => u.maxStreak,
          "Partidos",
          "bg-orange-950/30 text-orange-400 border-orange-500/20",
          5
        )}
        
        {/* Top Clasificados (Cualquier) */}
        {renderRankList(
          "Top Clasificados (Cualquier)",
          "Acertó que el equipo clasificaba",
          <MapPin className="w-5 h-5 text-purple-400" />,
          topQualifiersAny,
          (u) => u.qualifiersAnyHits,
          "Equipos",
          "bg-purple-950/30 text-purple-400 border-purple-500/20"
        )}
        
        {/* Top Clasificados (Exactos) */}
        {renderRankList(
          "Top Clasificados (Exactos)",
          "Acertó el equipo y su posición exacta",
          <Crosshair className="w-5 h-5 text-fuchsia-400" />,
          topQualifiersExact,
          (u) => u.qualifiersExactHits,
          "Equipos",
          "bg-fuchsia-950/30 text-fuchsia-400 border-fuchsia-500/20"
        )}

        {/* Top Cercanía (Anti-Batacazo) */}
        {renderRankList(
          "Top Cercanía",
          "Promedio de distancia al resultado oficial",
          <Target className="w-5 h-5 text-indigo-400" />,
          topAvgDistance,
          (u) => u.avgDistanceToOfficial,
          "Distancia",
          "bg-indigo-950/30 text-indigo-400 border-indigo-500/20"
        )}
      </div>

      {showBarChartRace && (
        <BarChartRace 
          users={users} 
          matches={matches} 
          predictions={predictions} 
          onClose={() => setShowBarChartRace(false)} 
        />
      )}
    </div>
  );
}
