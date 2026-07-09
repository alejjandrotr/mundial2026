import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Usuario, Partido } from '../../models/types';
import { Trophy, Share2, Info, Medal, Target, Award, Sparkles, Loader2, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { toTitleCase } from '../../utils/format';
import { calculateMatchPoints } from '../../utils/scoring';

interface CumulativeUserStats {
  uid: string;
  displayName: string;
  playoffPoints: number;
  exactHits: number;
  goalHits: number;
  outcomeHits: number;
  avgDistance: number;
}

export default function PlayoffCumulative() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [matches, setMatches] = useState<Partido[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

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

  // Fases elegibles para la acumulación de eliminatorias (desde Octavos en adelante)
  // '16avos' en código = Octavos de Final (16 equipos)
  // '8vos' en código = Cuartos de Final (8 equipos)
  // '4tos' en código = Semifinales (4 equipos)
  // 'semis' / 'final' = Finales
  const playoffPhases = ['16avos', '8vos', '4tos', 'semis', 'final'];

  // Calcular estadísticas de eliminatorias consolidadas
  const computedUsers = useMemo<CumulativeUserStats[]>(() => {
    const playoffMatches = matches.filter(m => playoffPhases.includes(m.phase || ''));

    const calculated = users.map(user => {
      const userPreds = predictions[user.uid] || {};
      let playoffPoints = 0;
      let exactHits = 0;
      let goalHits = 0;
      let outcomeHits = 0;
      let totalDistance = 0;
      let predictedMatchesCount = 0;

      playoffMatches.forEach(match => {
        if (match.status === 'finished' && match.homeGoals !== null && match.awayGoals !== null) {
          const pred = userPreds[match.id];
          if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
            // Calcular puntos usando la lógica del juego con la fase correspondiente (ej: Cuartos '8vos' usa la regla de 3pts / 4.5pts)
            const scoreResult = calculateMatchPoints(pred.homeGoals, pred.awayGoals, match.homeGoals, match.awayGoals, match.phase);
            playoffPoints += scoreResult.points;

            // Marcadores exactos (ME)
            if (pred.homeGoals === match.homeGoals && pred.awayGoals === match.awayGoals) {
              exactHits++;
            }
            // Aciertos de goles (AG)
            if (pred.homeGoals === match.homeGoals) goalHits++;
            if (pred.awayGoals === match.awayGoals) goalHits++;

            // Tendencias/Resultados correctos (AP)
            const predOutcome = pred.homeGoals > pred.awayGoals ? 'home' : pred.homeGoals < pred.awayGoals ? 'away' : 'draw';
            const realOutcome = match.homeGoals > match.awayGoals ? 'home' : match.homeGoals < match.awayGoals ? 'away' : 'draw';
            if (predOutcome === realOutcome) {
              outcomeHits++;
            }

            // Distancia para cercanía (Anti-Batacazo)
            totalDistance += Math.abs(pred.homeGoals - match.homeGoals) + Math.abs(pred.awayGoals - match.awayGoals);
            predictedMatchesCount++;
          }
        }
      });

      return {
        uid: user.uid,
        displayName: user.displayName,
        playoffPoints,
        exactHits,
        goalHits,
        outcomeHits,
        avgDistance: predictedMatchesCount > 0 ? parseFloat((totalDistance / predictedMatchesCount).toFixed(2)) : 999
      };
    });

    // Ordenar por puntos acumulados, luego goles (AG) y luego marcadores exactos (ME)
    return calculated.sort((a, b) => {
      if (b.playoffPoints !== a.playoffPoints) {
        return b.playoffPoints - a.playoffPoints;
      }
      if (b.goalHits !== a.goalHits) {
        return b.goalHits - a.goalHits;
      }
      if (b.exactHits !== a.exactHits) {
        return b.exactHits - a.exactHits;
      }
      // Orden alfabético
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [users, matches, predictions]);

  // Rankings específicos ordenados para los récords acumulados
  const topGoalHits = useMemo(() => {
    return [...computedUsers].sort((a, b) => {
      if (b.goalHits !== a.goalHits) return b.goalHits - a.goalHits;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      return b.playoffPoints - a.playoffPoints;
    });
  }, [computedUsers]);

  const topExactHits = useMemo(() => {
    return [...computedUsers].sort((a, b) => {
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      if (b.goalHits !== a.goalHits) return b.goalHits - a.goalHits;
      return b.playoffPoints - a.playoffPoints;
    });
  }, [computedUsers]);

  const topOutcomeHits = useMemo(() => {
    return [...computedUsers].sort((a, b) => {
      if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
      if (b.goalHits !== a.goalHits) return b.goalHits - a.goalHits;
      return b.playoffPoints - a.playoffPoints;
    });
  }, [computedUsers]);

  const topAvgDistance = useMemo(() => {
    return [...computedUsers]
      .filter(u => u.avgDistance < 999)
      .sort((a, b) => {
        if (a.avgDistance !== b.avgDistance) return a.avgDistance - b.avgDistance;
        return b.playoffPoints - a.playoffPoints;
      });
  }, [computedUsers]);

  const shareOnWhatsApp = () => {
    if (computedUsers.length === 0) return;

    let text = `🏆 *Tabla Acumulada de Eliminatorias - Quiniela Mundial 2026* 🏆\n_(Desde Octavos y Cuartos de Final)_\n\n`;
    computedUsers.slice(0, 20).forEach((user, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      text += `${medal} *${user.displayName.trim()}* - ${user.playoffPoints} pts (${user.goalHits} AG, ${user.exactHits} ME)\n`;
    });

    text += `\n*AG: Acierto de Goles (Desempate)\n*ME: Marcadores Exactos (Top alternativo)\n\n¡Sigue y simula tus resultados aquí!\n${window.location.origin}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <span>Cargando datos acumulados de eliminatorias...</span>
      </div>
    );
  }

  const renderMiniRecordList = (
    title: string,
    icon: React.ReactNode,
    data: CumulativeUserStats[],
    keyExtractor: (user: CumulativeUserStats) => number,
    label: string,
    badgeColor: string
  ) => {
    return (
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm flex flex-col h-full">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-3">
          {icon}
          <h4 className="font-bold text-xs text-white tracking-tight">{title}</h4>
        </div>
        <div className="divide-y divide-slate-850 flex-1 space-y-1.5">
          {data.slice(0, 5).map((user, idx) => {
            const rank = idx + 1;
            const value = keyExtractor(user);
            let rankBadge = null;

            if (rank === 1) {
              rankBadge = <Medal className="w-3.5 h-3.5 text-yellow-400" />;
            } else if (rank === 2) {
              rankBadge = <Medal className="w-3.5 h-3.5 text-slate-300" />;
            } else if (rank === 3) {
              rankBadge = <Medal className="w-3.5 h-3.5 text-amber-600" />;
            } else {
              rankBadge = <span className="text-[10px] font-mono text-slate-500 font-bold">{rank}</span>;
            }

            return (
              <div key={user.uid} className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-4 flex justify-center flex-shrink-0">
                    {rankBadge}
                  </div>
                  <span className="text-xs text-slate-300 truncate font-medium">
                    {user.displayName}
                  </span>
                </div>
                <div className={`flex items-center gap-1 ${badgeColor} px-2 py-0.5 rounded text-[10px] font-bold`}>
                  <span>{value}</span>
                  <span className="text-[8px] opacity-75 font-normal">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Info Panel */}
      <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/25">
            <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>🏆 Acumulado de Eliminatorias</span>
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Octavos + Cuartos + Semis + Final
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Consolidado de posiciones y récords obtenidos únicamente durante las fases eliminatorias del torneo (excluye grupos y 16avos).
            </p>
          </div>
        </div>
        
        <button
          onClick={shareOnWhatsApp}
          className="flex items-center justify-center gap-2 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-2.5 px-4 rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-md whitespace-nowrap self-stretch sm:self-auto"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir Acumulado</span>
        </button>
      </div>

      {/* Main Grid: Standings on Left, Records on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: STANDINGS TABLE (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl flex flex-col">
          <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Tabla de Posiciones</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-sky-400 bg-sky-950/30 px-2 py-0.5 rounded border border-sky-500/20 font-bold">
                AG: Goles
              </span>
              <span className="text-[9px] text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                ME: Exactos
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-700/30 overflow-y-auto max-h-[600px]">
            {computedUsers.map((user, index) => {
              const rank = index + 1;
              let rankIcon = null;
              let rankColor = "text-slate-400";

              if (rank === 1) {
                rankIcon = <Medal className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />;
                rankColor = "text-yellow-400 font-bold";
              } else if (rank === 2) {
                rankIcon = <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" />;
                rankColor = "text-slate-300 font-bold";
              } else if (rank === 3) {
                rankIcon = <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]" />;
                rankColor = "text-amber-600 font-bold";
              } else {
                rankIcon = <span className="w-5 text-center font-mono text-sm text-slate-450">{rank}</span>;
              }

              return (
                <div key={user.uid} className={`flex items-center justify-between p-4 hover:bg-slate-700/25 transition-colors ${rank <= 3 ? 'bg-slate-800/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center w-6">
                      {rankIcon}
                    </div>
                    <span className={`text-sm ${rank <= 3 ? 'text-white font-semibold' : 'text-slate-200'}`}>
                      {user.displayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    {/* Points */}
                    <div className="flex items-baseline gap-1 text-right">
                      <span className={`text-lg font-black ${rank <= 3 ? rankColor : 'text-emerald-400'}`}>
                        {user.playoffPoints}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">pts</span>
                    </div>

                    {/* AG Badge */}
                    <div className="flex flex-col items-center justify-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/40 min-w-[36px]" title="Aciertos de goles individuales en eliminatorias">
                      <span className="text-xs font-bold text-sky-400">{user.goalHits}</span>
                      <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tight">AG</span>
                    </div>

                    {/* ME Badge */}
                    <div className="flex flex-col items-center justify-center bg-slate-900/40 px-2 py-0.5 rounded border border-slate-700/20 min-w-[36px]" title="Marcadores exactos acertados en eliminatorias">
                      <span className="text-xs font-bold text-amber-500">{user.exactHits}</span>
                      <span className="text-[7px] text-slate-550 font-bold uppercase tracking-tight">ME</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {computedUsers.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Aún no hay participantes registrados.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RECORDS BOARD (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          <div className="bg-slate-800/10 border border-slate-800/60 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest font-mono mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Líderes de Récords
            </h3>

            <div className="grid grid-cols-1 gap-5">
              {/* Top ME */}
              {renderMiniRecordList(
                "Marcadores Exactos (ME)",
                <Medal className="w-4 h-4 text-amber-400" />,
                topExactHits,
                (u) => u.exactHits,
                "Ex.",
                "bg-amber-950/30 text-amber-400 border border-amber-500/20"
              )}

              {/* Top AG */}
              {renderMiniRecordList(
                "Acierto de Goles (AG)",
                <Target className="w-4 h-4 text-sky-400" />,
                topGoalHits,
                (u) => u.goalHits,
                "Gol.",
                "bg-sky-950/30 text-sky-400 border border-sky-500/20"
              )}

              {/* Top AP */}
              {renderMiniRecordList(
                "Tendencias Correctas (AP)",
                <Award className="w-4 h-4 text-emerald-400" />,
                topOutcomeHits,
                (u) => u.outcomeHits,
                "Part.",
                "bg-emerald-950/30 text-emerald-400 border border-emerald-500/20"
              )}

              {/* Top Cercanía */}
              {renderMiniRecordList(
                "Cercanía (Anti-Batacazo)",
                <Target className="w-4 h-4 text-indigo-400" />,
                topAvgDistance,
                (u) => u.avgDistance,
                "Dist.",
                "bg-indigo-950/30 text-indigo-400 border border-indigo-500/20"
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
