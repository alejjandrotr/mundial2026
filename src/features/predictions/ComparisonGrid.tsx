import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Partido, Usuario } from '../../models/types';
import { calculateMatchPoints } from '../../utils/scoring';
import { getCachedMatches, getCachedUsers, getCachedPredictions } from '../../utils/cache';
import { Loader2, Table, ShieldAlert, RefreshCw, FlaskConical, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PredictionData {
  homeGoals: number | null;
  awayGoals: number | null;
}

export default function ComparisonGrid() {
  const [matches, setMatches] = useState<Partido[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, PredictionData>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isLockedForOthers = useMemo(() => {
    // Lock predictions for others until June 11, 2026 at 14:40:00 UTC (1h 20m before kickoff)
    const lockTime = new Date('2026-06-11T14:40:00Z').getTime();
    return Date.now() < lockTime;
  }, []);

  const loadGridData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Usa caché inteligente: solo lee de Firestore si el caché expiró o si se fuerza
      const [matchesData, usersData, predsData] = await Promise.all([
        getCachedMatches(forceRefresh),
        getCachedUsers(forceRefresh),
        getCachedPredictions(forceRefresh),
      ]);

      setMatches(matchesData);
      setUsers(usersData);
      setPredictions(predsData);
      setLastLoaded(new Date());
    } catch (err) {
      console.error('Error al cargar la grilla comparativa:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGridData();
  }, [loadGridData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <span>Cargando planilla comparativa...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLockedForOthers && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3 text-amber-400 backdrop-blur-sm animate-fadeIn">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse text-amber-400" />
          <div className="text-xs">
            <h4 className="font-bold text-sm text-white mb-0.5">🔒 Modo Privado Activo</h4>
            <p className="text-slate-350 leading-relaxed">Por políticas de juego limpio, los pronósticos de los demás usuarios estarán ocultos hasta el <strong>11 de junio de 2026 a las 14:40 UTC</strong>. ¡Tus propias predicciones siguen siendo visibles para ti!</p>
          </div>
        </div>
      )}

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <Table className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Planilla Comparativa (Excel)</h2>
            <p className="text-slate-400 text-xs">Compara tus pronósticos codo a codo con los demás participantes</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Botón de recarga manual */}
          <button
            onClick={() => loadGridData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 px-3 py-2 rounded-xl transition-all disabled:opacity-50"
            title="Forzar recarga desde Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Recargando...' : 'Actualizar'}
          </button>

          <button
            onClick={() => navigate('/simulator')}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl transition-all shadow-[0_0_10px_rgba(79,70,229,0.3)]"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Abrir Simulador
          </button>

          {lastLoaded && (
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              Última carga: {lastLoaded.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1">Leyenda:</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-yellow-500/10 border border-yellow-500/40 inline-block"></span>
              <span className="text-yellow-400 font-medium">3 pts (Exacto)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/40 inline-block"></span>
              <span className="text-emerald-400 font-medium">2 pts (Ganador)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-400 font-bold border border-slate-800 px-1 rounded inline-block bg-slate-950/20">Nº</span>
              <span className="text-slate-300 font-medium">1 pt (Goles)</span>
            </div>
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="bg-slate-850/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
          <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          Aún no hay usuarios registrados.
        </div>
      ) : (
        <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="sticky top-0 z-20 bg-slate-900/95 border-b border-slate-700/60 backdrop-blur-md">
                <tr>
                  <th className="py-3.5 px-4 font-bold text-slate-300 min-w-44 sticky left-0 bg-slate-900/98 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    Partidos
                  </th>
                  <th className="py-3.5 px-3 font-bold text-center text-slate-300 min-w-28 bg-slate-900/95">
                    Oficial
                  </th>
                  {users.map((user) => (
                    <th key={user.uid} className="py-3.5 px-4 font-bold text-center text-white min-w-32 bg-slate-900/95 border-l border-slate-800">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-100 truncate max-w-28">{user.displayName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">{user.totalPoints || 0} pts</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {matches.map((match) => {
                  const hasRealResult = match.status === 'finished' || match.status === 'in_progress';
                  const realH = match.homeGoals;
                  const realV = match.awayGoals;

                  return (
                    <tr key={match.id} className="hover:bg-slate-800/10 transition-colors">
                      {/* Match Name Column (Sticky left) */}
                      <td className="py-3 px-4 font-bold text-slate-200 sticky left-0 bg-slate-900/90 shadow-[2px_0_5px_rgba(0,0,0,0.25)] flex items-center gap-2 justify-between">
                        <div className="truncate pr-2">
                          <span className="bg-slate-800 border border-slate-700/50 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded mr-2 uppercase">
                            G{match.group}
                          </span>
                          <span>{match.homeTeam} vs {match.awayTeam}</span>
                        </div>
                      </td>

                      {/* Official Score Column */}
                      <td className="py-3 px-3 text-center">
                        {hasRealResult ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-700 text-xs font-black text-white tracking-wider">
                            {realH} <span className="text-slate-500 font-normal">a</span> {realV}
                            {match.status === 'in_progress' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-semibold italic text-[11px]">Por definir</span>
                        )}
                      </td>

                      {/* Users Predictions Columns */}
                      {users.map((user) => {
                        const isSelf = currentUser && user.uid === currentUser.uid;
                        const userPreds = predictions[user.uid] || {};
                        const pred = userPreds[match.id];

                        if (isLockedForOthers && !isSelf) {
                          return (
                            <td key={user.uid} className="py-3 px-4 text-center text-slate-500 border-l border-slate-800/60 bg-slate-950/[0.08]" title="Oculto por juego limpio">
                              <div className="flex items-center justify-center">
                                <Lock className="w-3.5 h-3.5 text-slate-600/80" />
                              </div>
                            </td>
                          );
                        }

                        if (!pred || (pred.homeGoals === null && pred.awayGoals === null)) {
                          return (
                            <td key={user.uid} className="py-3 px-4 text-center text-slate-600 italic text-[11px] border-l border-slate-800/60 bg-slate-950/[0.05]">
                              -
                            </td>
                          );
                        }

                        const predH = pred.homeGoals;
                        const predV = pred.awayGoals;

                        // Calcular puntos si hay resultado oficial
                        const scoreResult = hasRealResult
                          ? calculateMatchPoints(predH, predV, realH, realV)
                          : { points: 0, matchedHome: false, matchedAway: false };

                        let cellClass = "border-l border-slate-800/60 text-center py-3 px-4 font-semibold text-slate-300";
                        
                        if (hasRealResult) {
                          if (scoreResult.points === 3) {
                            cellClass += " bg-yellow-500/[0.04] text-yellow-300 border-l border-yellow-500/20 shadow-[inset_0_0_10px_rgba(234,179,8,0.05)] border-y border-y-yellow-500/10";
                          } else if (scoreResult.points === 2) {
                            cellClass += " bg-emerald-500/[0.03] text-emerald-300 border-l border-emerald-500/20";
                          }
                        }

                        return (
                          <td key={user.uid} className={cellClass}>
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              {/* Prediction Text style */}
                              <div className="flex items-center justify-center gap-1">
                                <span className={hasRealResult && scoreResult.matchedHome ? "text-emerald-400 font-black text-sm" : ""}>
                                  {predH}
                                </span>
                                <span className="text-slate-500 text-[10px] font-normal select-none">a</span>
                                <span className={hasRealResult && scoreResult.matchedAway ? "text-emerald-400 font-black text-sm" : ""}>
                                  {predV}
                                </span>
                              </div>

                              {/* Points tag overlay */}
                              {hasRealResult && (
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
      )}
    </div>
  );
}
