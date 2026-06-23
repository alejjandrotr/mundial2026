import { useEffect, useState, useMemo } from 'react';
import type { Partido, Usuario } from '../../models/types';
import { calculateMatchPoints } from '../../utils/scoring';
import { getCachedMatches, getCachedUsers, getCachedPredictions } from '../../utils/cache';
import { Loader2, HelpCircle, Undo, Trophy, Medal, ArrowUp, ArrowDown, Minus, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFlagUrl } from '../../utils/flags';
import { getMatchVenue } from '../../utils/venues';



interface SimulatedMatchState {
  id: string;
  homeTeam: string;
  awayTeam: string;
  group: string;
  homeGoals: string;
  awayGoals: string;
  isSimulated: boolean;
}

import { isLockedForOthers } from '../../config/constants';

export default function WhatIfSimulator() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  const isBeforeRevealDate = useMemo(() => {
    return isLockedForOthers();
  }, []);
  const [matches, setMatches] = useState<Partido[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});

  // sortedUsers se define más abajo, después de realSortedUsers, para evitar error de referencia de TypeScript

  // Local simulated matches state
  const [simulatedMatches, setSimulatedMatches] = useState<Record<string, SimulatedMatchState>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [matchesData, usersData, predsData] = await Promise.all([
        getCachedMatches(),
        getCachedUsers(),
        getCachedPredictions(),
      ]);

      setMatches(matchesData);
      setUsers(usersData);
      setPredictions(predsData);

      // Initialize simulated matches with real official scores (if they exist)
      const initialSimState: Record<string, SimulatedMatchState> = {};
      matchesData.forEach((m) => {
        initialSimState[m.id] = {
          id: m.id,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          group: m.group || 'A',
          homeGoals: m.homeGoals !== null ? String(m.homeGoals) : '',
          awayGoals: m.awayGoals !== null ? String(m.awayGoals) : '',
          isSimulated: false
        };
      });
      setSimulatedMatches(initialSimState);
    } catch (err) {
      console.error('Error al cargar datos en el simulador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle score changes in simulator
  const handleScoreChange = (matchId: string, side: 'homeGoals' | 'awayGoals', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;

    setSimulatedMatches((prev) => {
      const match = prev[matchId];
      if (!match) return prev;

      return {
        ...prev,
        [matchId]: {
          ...match,
          [side]: value,
          isSimulated: true
        }
      };
    });
  };

  // Reset all simulations to actual database scores
  const handleReset = () => {
    const resetState: Record<string, SimulatedMatchState> = {};
    matches.forEach((m) => {
      resetState[m.id] = {
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        group: m.group || 'A',
        homeGoals: m.homeGoals !== null ? String(m.homeGoals) : '',
        awayGoals: m.awayGoals !== null ? String(m.awayGoals) : '',
        isSimulated: false
      };
    });
    setSimulatedMatches(resetState);
  };

  // Calcular los aciertos reales para cada usuario para tener el ranking real de referencia correcto
  const realSortedUsers = useMemo(() => {
    const calculated = users.map(user => {
      const userPreds = predictions[user.uid] || {};
      let exactHits = 0;
      let goalHits = 0;
      matches.forEach(match => {
        if (match.status === 'finished' && match.homeGoals !== null && match.awayGoals !== null) {
          const pred = userPreds[match.id];
          if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
            if (pred.homeGoals === match.homeGoals && pred.awayGoals === match.awayGoals) {
              exactHits++;
            }
            if (pred.homeGoals === match.homeGoals) goalHits++;
            if (pred.awayGoals === match.awayGoals) goalHits++;
          }
        }
      });
      return {
        ...user,
        exactHits,
        goalHits
      };
    });

    // Ordenar por puntos reales (desc) y luego por aciertos de goles individuales reales (desc)
    return calculated.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.goalHits - a.goalHits;
    });
  }, [users, matches, predictions]);

  const sortedUsers = useMemo(() => {
    if (!currentUser) return realSortedUsers;
    const currentIdx = realSortedUsers.findIndex((u) => u.uid === currentUser.uid);
    if (currentIdx === -1) return realSortedUsers;
    const result = [...realSortedUsers];
    const [me] = result.splice(currentIdx, 1);
    return [me, ...result];
  }, [realSortedUsers, currentUser]);

  // Calcular puntos simulados y aciertos exactos e individuales simulados para cada usuario
  const userSimulatedStats = useMemo(() => {
    const stats: Record<string, { simPoints: number; simExactHits: number; simGoalHits: number }> = {};
    
    users.forEach((u) => {
      stats[u.uid] = { simPoints: 0, simExactHits: 0, simGoalHits: 0 };
    });

    Object.values(simulatedMatches).forEach((sm) => {
      const homeG = sm.homeGoals !== '' ? parseInt(sm.homeGoals, 10) : null;
      const awayG = sm.awayGoals !== '' ? parseInt(sm.awayGoals, 10) : null;

      if (homeG !== null && awayG !== null && !isNaN(homeG) && !isNaN(awayG)) {
        users.forEach((user) => {
          const userPreds = predictions[user.uid] || {};
          const pred = userPreds[sm.id];
          
          if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
            const result = calculateMatchPoints(pred.homeGoals, pred.awayGoals, homeG, awayG);
            stats[user.uid].simPoints += result.points;
            if (pred.homeGoals === homeG && pred.awayGoals === awayG) {
              stats[user.uid].simExactHits += 1;
            }
            if (pred.homeGoals === homeG) stats[user.uid].simGoalHits += 1;
            if (pred.awayGoals === awayG) stats[user.uid].simGoalHits += 1;
          }
        });
      }
    });

    return stats;
  }, [simulatedMatches, users, predictions]);

  // Derive the simulated leaderboard with rank comparison
  const simulatedLeaderboard = useMemo(() => {
    const realRanks: Record<string, number> = {};
    realSortedUsers.forEach((u, idx) => {
      realRanks[u.uid] = idx + 1;
    });

    const mapped = realSortedUsers.map((u) => {
      const stats = userSimulatedStats[u.uid] || { simPoints: 0, simExactHits: 0, simGoalHits: 0 };
      return {
        ...u,
        simPoints: stats.simPoints,
        simExactHits: stats.simExactHits,
        simGoalHits: stats.simGoalHits,
        realRank: realRanks[u.uid],
      };
    });

    // Ordenar por puntos simulados (desc) y luego por aciertos de goles individuales simulados (desc)
    mapped.sort((a, b) => {
      if (b.simPoints !== a.simPoints) {
        return b.simPoints - a.simPoints;
      }
      if (b.simGoalHits !== a.simGoalHits) {
        return b.simGoalHits - a.simGoalHits;
      }
      return a.realRank - b.realRank; // Desempate adicional por ranking real previo
    });

    return mapped.map((u, idx) => {
      const simRank = idx + 1;
      const rankDiff = u.realRank - simRank;
      return {
        ...u,
        simRank,
        rankDiff,
      };
    });
  }, [realSortedUsers, userSimulatedStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <span>Iniciando laboratorio de simulación...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 animate-pulse">
            <HelpCircle className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>🔮 Simulador de Escenarios</span>
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Modo Laboratorio</span>
            </h2>
            <p className="text-slate-400 text-xs">Juega a fingir resultados oficiales. Modifica la columna "Simulación Oficial" y mira los cambios en la Tabla de Posiciones al instante.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 px-3 py-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Undo className="w-3.5 h-3.5" />
            Restablecer Fixture
          </button>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-850 hidden sm:flex">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1">Leyenda:</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-yellow-500/10 border border-yellow-500/40 inline-block"></span>
              <span className="text-yellow-400 font-medium">3 pts</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/40 inline-block"></span>
              <span className="text-emerald-400 font-medium">2 pts</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-400 font-bold border border-slate-800 px-1 rounded inline-block bg-slate-950/20">Nº</span>
              <span className="text-slate-300 font-medium">1 pt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: The Interactive Sim Table Grid */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead className="sticky top-0 z-20 bg-slate-900/95 border-b border-slate-700/60 backdrop-blur-md">
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-slate-300 min-w-44 sticky left-0 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.3)] z-30">
                      Partidos
                    </th>
                    <th className="py-3.5 px-3 font-bold text-center text-indigo-300 min-w-32 bg-slate-900/95 z-20 border-l border-indigo-500/20 shadow-[inset_0_0_15px_rgba(79,70,229,0.05)]">
                      Simulación Oficial
                    </th>
                    {sortedUsers.map((user) => {
                      const isSelf = currentUser && user.uid === currentUser.uid;
                      return (
                        <th key={user.uid} className={`py-3.5 px-4 font-bold text-center text-white min-w-32 bg-slate-900/95 border-l border-slate-800 z-20 ${isSelf ? 'bg-indigo-950/30 border-x border-x-indigo-500/25 ring-1 ring-indigo-500/10' : ''}`}>
                          <div className="flex flex-col items-center">
                            <span className={`font-semibold truncate max-w-28 ${isSelf ? 'text-indigo-300 font-extrabold' : 'text-slate-100'}`}>
                              {user.displayName} {isSelf && '(Tú)'}
                            </span>
                             <span className="text-[10px] text-indigo-400 font-mono font-bold mt-0.5">
                              {userSimulatedStats[user.uid]?.simPoints || 0} pts ({userSimulatedStats[user.uid]?.simGoalHits || 0} AG, {userSimulatedStats[user.uid]?.simExactHits || 0} ME)
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              Real: {user.totalPoints || 0} pts ({user.goalHits || 0} AG, {user.exactHits || 0} ME)
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {matches.map((match) => {
                    const simMatch = simulatedMatches[match.id];
                    const isSimulated = simMatch?.isSimulated;
                    const simH = simMatch && simMatch.homeGoals !== '' ? parseInt(simMatch.homeGoals, 10) : null;
                    const simV = simMatch && simMatch.awayGoals !== '' ? parseInt(simMatch.awayGoals, 10) : null;
                    const hasSimResult = simH !== null && simV !== null && !isNaN(simH) && !isNaN(simV);

                    return (
                      <tr key={match.id} className="hover:bg-slate-800/10 transition-colors">
                        {/* Match Name Column */}
                        <td className="py-3 px-4 font-bold text-slate-200 sticky left-0 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.25)] flex items-center gap-2 justify-between z-10">
                          <div className="truncate pr-2 flex items-center gap-1">
                            <span 
                              className="cursor-help bg-slate-850 border border-slate-700/50 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded mr-1 uppercase flex items-center gap-1"
                              title={`Sede: ${getMatchVenue(match.group || 'A', match.homeTeam).city}, ${getMatchVenue(match.group || 'A', match.homeTeam).country}`}
                            >
                              <span>G{match.group}</span>
                              <span>{getMatchVenue(match.group || 'A', match.homeTeam).flag}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              {getFlagUrl(match.homeTeam) && (
                                <img src={getFlagUrl(match.homeTeam)} alt="" className="w-4 h-3 object-cover rounded border border-slate-700/50 flex-shrink-0" />
                              )}
                              <span>{match.homeTeam}</span>
                              <span className="text-slate-500 text-[10px] font-normal">vs</span>
                              {getFlagUrl(match.awayTeam) && (
                                <img src={getFlagUrl(match.awayTeam)} alt="" className="w-4 h-3 object-cover rounded border border-slate-700/50 flex-shrink-0" />
                              )}
                              <span>{match.awayTeam}</span>
                            </span>
                          </div>
                        </td>

                        {/* Simulation Inputs Column */}
                        <td className={`py-2 px-3 text-center border-l border-indigo-500/10 ${isSimulated ? 'bg-indigo-500/[0.03]' : ''}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={simMatch?.homeGoals ?? ''}
                              placeholder="-"
                              onChange={(e) => handleScoreChange(match.id, 'homeGoals', e.target.value)}
                              className={`w-9 h-9 rounded-lg bg-slate-950 text-center font-mono font-black text-xs border focus:outline-none transition-all ${
                                isSimulated 
                                  ? 'border-indigo-500 text-indigo-400 focus:border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)]' 
                                  : 'border-slate-850 text-white focus:border-slate-700'
                              }`}
                            />
                            <span className="text-slate-650 font-bold text-[10px] select-none">a</span>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={simMatch?.awayGoals ?? ''}
                              placeholder="-"
                              onChange={(e) => handleScoreChange(match.id, 'awayGoals', e.target.value)}
                              className={`w-9 h-9 rounded-lg bg-slate-950 text-center font-mono font-black text-xs border focus:outline-none transition-all ${
                                isSimulated 
                                  ? 'border-indigo-500 text-indigo-400 focus:border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)]' 
                                  : 'border-slate-850 text-white focus:border-slate-700'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Users Predictions Columns */}
                        {sortedUsers.map((user) => {
                          const userPreds = predictions[user.uid] || {};
                          const pred = userPreds[match.id];

                          if (!pred || (pred.homeGoals === null && pred.awayGoals === null)) {
                            return (
                              <td key={user.uid} className="py-3 px-4 text-center text-slate-600 italic text-[11px] border-l border-slate-800/60 bg-slate-950/[0.05]">
                                -
                              </td>
                            );
                          }

                          const predH = pred.homeGoals;
                          const predV = pred.awayGoals;

                          const isOwnPrediction = currentUser && user.uid === currentUser.uid;
                          const isHidden = isBeforeRevealDate && !isOwnPrediction && currentUser?.role !== 'admin';

                          // Calcular puntos en base a la simulación
                          const scoreResult = hasSimResult
                            ? calculateMatchPoints(predH, predV, simH, simV)
                            : { points: 0, matchedHome: false, matchedAway: false };

                          let cellClass = "border-l border-slate-800/60 text-center py-3 px-4 font-semibold text-slate-300 transition-all";
                          if (isOwnPrediction) {
                            cellClass += " bg-indigo-500/[0.02] border-x border-x-indigo-500/15";
                          }
                          
                          if (hasSimResult && !isHidden) {
                            if (scoreResult.points === 3) {
                              cellClass += " bg-yellow-500/[0.04] text-yellow-300 border-l border-yellow-500/20 shadow-[inset_0_0_10px_rgba(234,179,8,0.05)] border-y border-y-yellow-500/10";
                            } else if (scoreResult.points === 2) {
                              cellClass += " bg-emerald-500/[0.03] text-emerald-300 border-l border-emerald-500/20";
                            } else if (isSimulated) {
                               cellClass += " opacity-60";
                            }
                          } else if (isSimulated) {
                            cellClass += " opacity-60";
                          }

                          if (isHidden) {
                            return (
                              <td key={user.uid} className={cellClass} title="Oculto hasta el 11 de junio">
                                <div className="flex items-center justify-center text-slate-500 gap-1 bg-slate-950/[0.05] py-1.5 px-2 rounded-lg border border-slate-800/40">
                                  <Lock className="w-3.5 h-3.5 text-slate-500/80" />
                                  <span className="text-[10px] text-slate-500 font-semibold font-mono tracking-wide uppercase">Oculto</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={user.uid} className={cellClass}>
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <div className="flex items-center justify-center gap-1">
                                  <span className={hasSimResult && scoreResult.matchedHome ? "text-emerald-400 font-black text-sm" : ""}>
                                    {predH}
                                  </span>
                                  <span className="text-slate-500 text-[10px] font-normal select-none">a</span>
                                  <span className={hasSimResult && scoreResult.matchedAway ? "text-emerald-400 font-black text-sm" : ""}>
                                    {predV}
                                  </span>
                                </div>

                                {hasSimResult && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono mt-0.5 ${
                                    scoreResult.points === 3
                                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                      : scoreResult.points === 2
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : scoreResult.points === 1
                                      ? 'bg-slate-800 text-emerald-400 border border-slate-700/50'
                                      : 'bg-slate-900 text-slate-500 border border-slate-850'
                                  }`}>
                                    +{scoreResult.points} pts
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: The Dynamic Leaderboard Side Panel */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl animate-fadeIn">
            <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-400 animate-bounce" />
                <h3 className="text-sm font-bold text-white tracking-tight">Tabla Simulada</h3>
              </div>
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black font-mono px-2 py-0.5 rounded-full uppercase">
                En Vivo
              </span>
            </div>

            <div className="divide-y divide-slate-700/30 max-h-[75vh] overflow-y-auto">
              {simulatedLeaderboard.map((user) => {
                const rank = user.simRank;
                const diff = user.rankDiff;
                let rankIcon = null;
                let rankColor = "text-slate-400";
                
                if (rank === 1) {
                  rankIcon = <Medal className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />;
                  rankColor = "text-yellow-400 font-black";
                } else if (rank === 2) {
                  rankIcon = <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" />;
                  rankColor = "text-slate-300 font-bold";
                } else if (rank === 3) {
                  rankIcon = <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]" />;
                  rankColor = "text-amber-600 font-bold";
                } else {
                  rankIcon = <span className="w-5 text-center font-mono text-xs font-bold text-slate-400">{rank}</span>;
                }

                // Determine rank variation badge
                let variationBadge = null;
                if (diff > 0) {
                  variationBadge = (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <ArrowUp className="w-2.5 h-2.5" />
                      {diff}
                    </span>
                  );
                } else if (diff < 0) {
                  variationBadge = (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      <ArrowDown className="w-2.5 h-2.5" />
                      {Math.abs(diff)}
                    </span>
                  );
                } else {
                  variationBadge = (
                    <span className="inline-flex items-center text-[10px] font-medium text-slate-500 px-1">
                      <Minus className="w-3 h-3" />
                    </span>
                  );
                }

                return (
                  <div 
                    key={user.uid} 
                    className={`flex items-center justify-between p-3.5 hover:bg-slate-700/10 transition-colors ${
                      rank <= 3 ? 'bg-slate-800/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex justify-center w-5 flex-shrink-0">
                        {rankIcon}
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs truncate ${rank <= 3 ? 'text-white font-bold' : 'text-slate-300 font-medium'}`}>
                          {user.displayName}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                          Real: {user.realRank}º ({user.totalPoints} pts, {user.goalHits || 0} AG, {user.exactHits || 0} ME)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {variationBadge}
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-black font-mono ${rank <= 3 ? rankColor : 'text-indigo-400'}`}>
                            {user.simPoints}
                          </span>
                          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">pts</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-900/60 px-1 py-0.5 rounded border border-slate-700/40 min-w-[28px]" title="Aciertos de Goles simulados (Desempate)">
                          <span className="text-[10px] font-bold text-sky-400">{user.simGoalHits}</span>
                          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tight">AG</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-900/40 px-1 py-0.5 rounded border border-slate-700/20 min-w-[28px]" title="Marcadores exactos acertados simulados (Top)">
                          <span className="text-[10px] font-bold text-amber-500">{user.simExactHits}</span>
                          <span className="text-[7px] text-slate-450 font-bold uppercase tracking-tight">ME</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {simulatedLeaderboard.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aún no hay participantes registrados.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
