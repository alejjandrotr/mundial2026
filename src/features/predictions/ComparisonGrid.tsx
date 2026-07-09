import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Partido, Usuario } from '../../models/types';
import { calculateMatchPoints } from '../../utils/scoring';
import { getCachedMatches, getCachedUsers, getCachedPredictions } from '../../utils/cache';
import { Loader2, Table, ShieldAlert, RefreshCw, FlaskConical, Lock, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePhase } from '../../context/PhaseContext';
import { isPrivacyEnabledForPhase } from '../../config/constants';
import MatchFlyerModal from './MatchFlyerModal';

export function abbreviateTeam(name: string): string {
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (clean.includes("mexico")) return "MEX";
  if (clean.includes("sudafrica")) return "RSA";
  if (clean.includes("corea")) return "KOR";
  if (clean.includes("chequia")) return "CZE";
  if (clean.includes("canada")) return "CAN";
  if (clean.includes("bosnia")) return "BIH";
  if (clean.includes("catar")) return "QAT";
  if (clean.includes("suiza")) return "SUI";
  if (clean.includes("brasil")) return "BRA";
  if (clean.includes("marruecos")) return "MAR";
  if (clean.includes("haiti")) return "HAI";
  if (clean.includes("escocia")) return "SCO";
  if (clean.includes("estados unidos") || clean.includes("usa")) return "USA";
  if (clean.includes("paraguay")) return "PAR";
  if (clean.includes("australia")) return "AUS";
  if (clean.includes("turquia")) return "TUR";
  if (clean.includes("alemania")) return "GER";
  if (clean.includes("curazao")) return "CUW";
  if (clean.includes("costa de marfil")) return "CIV";
  if (clean.includes("ecuador")) return "ECU";
  if (clean.includes("japon")) return "JPN";
  if (clean.includes("suecia")) return "SWE";
  if (clean.includes("belgica")) return "BEL";
  if (clean.includes("egipto")) return "EGY";
  if (clean.includes("iran")) return "IRN";
  if (clean.includes("nueva zelanda")) return "NZL";
  if (clean.includes("espana")) return "ESP";
  if (clean.includes("cabo verde")) return "CPV";
  if (clean.includes("arabia")) return "KSA";
  if (clean.includes("uruguay")) return "URU";
  if (clean.includes("francia")) return "FRA";
  if (clean.includes("senegal")) return "SEN";
  if (clean.includes("irak")) return "IRQ";
  if (clean.includes("noruega")) return "NOR";
  if (clean.includes("argentina")) return "ARG";
  if (clean.includes("argelia")) return "ALG";
  if (clean.includes("austria")) return "AUT";
  if (clean.includes("jordania")) return "JOR";
  if (clean.includes("portugal")) return "POR";
  if (clean.includes("congo")) return "COD";
  if (clean.includes("uzbekistan")) return "UZB";
  if (clean.includes("colombia")) return "COL";
  if (clean.includes("inglaterra")) return "ENG";
  if (clean.includes("croacia")) return "CRO";
  if (clean.includes("ghana")) return "GHA";
  if (clean.includes("panama")) return "PAN";
  return name.substring(0, 3).toUpperCase();
}

import { getAbbreviatedUserNames } from '../../utils/userNames';

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
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [selectedMatchForFlyer, setSelectedMatchForFlyer] = useState<Partido | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activePhase, availablePhases } = usePhase();

  const phaseMatches = useMemo(() => {
    const isGroups = activePhase === 'grupos';
    const filtered = matches.filter(m => (m.phase || 'grupos') === activePhase);
    return isGroups 
      ? filtered 
      : filtered.sort((a, b) => {
          const da = a.kickoffTime?.toDate ? a.kickoffTime.toDate() : new Date(a.kickoffTime);
          const db = b.kickoffTime?.toDate ? b.kickoffTime.toDate() : new Date(b.kickoffTime);
          return da.getTime() - db.getTime();
        });
  }, [matches, activePhase]);

  const phaseLockedForOthers = useMemo(() => {
    return isPrivacyEnabledForPhase(activePhase);
  }, [activePhase]);

  const sortedUsers = useMemo(() => {
    if (!currentUser) return users;
    const currentIdx = users.findIndex((u) => u.uid === currentUser.uid);
    if (currentIdx === -1) return users;
    const result = [...users];
    const [me] = result.splice(currentIdx, 1);
    return [me, ...result];
  }, [users, currentUser]);

  const userAbbreviations = useMemo(() => {
    const displayNames = users.map(u => u.displayName);
    return getAbbreviatedUserNames(displayNames);
  }, [users]);

  const chunkedUsers = useMemo(() => {
    const chunks = [];
    const chunkSize = 18; // 18 users fits horizontally on a landscape page
    for (let i = 0; i < sortedUsers.length; i += chunkSize) {
      chunks.push(sortedUsers.slice(i, i + chunkSize));
    }
    return chunks;
  }, [sortedUsers]);

  const getTeamName = (name: string) => {
    return isPrintMode ? abbreviateTeam(name) : name;
  };

  const getUserName = (name: string) => {
    return isPrintMode ? (userAbbreviations[name] || name.substring(0, 3).toUpperCase()) : name;
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 150);
  };



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
      {isPrintMode && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body, html, #root {
              background: white !important;
              color: black !important;
              overflow: visible !important;
              height: auto !important;
            }
            .no-print, header, nav, button, .bg-amber-500\\/10, .bg-slate-800\\/30 {
              display: none !important;
            }
            .overflow-x-auto, .max-h-\\[70vh\\] {
              max-height: none !important;
              overflow: visible !important;
            }
            .print-page-break {
              page-break-after: always;
              break-after: page;
              overflow: visible !important;
            }
            table {
              width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
              background: white !important;
              color: black !important;
            }
            .print-partidos-col {
              width: 110px !important;
              min-width: 110px !important;
              max-width: 110px !important;
            }
            .print-oficial-col {
              width: 60px !important;
              min-width: 60px !important;
              max-width: 60px !important;
            }
            .print-user-col {
              min-width: 38px !important;
            }
            th, td {
              border: 1px solid #777 !important;
              color: black !important;
              background: white !important;
              padding: 2px 3px !important;
              font-size: 8.5px !important;
              line-height: 1.1 !important;
            }
            th {
              background-color: #eee !important;
              font-weight: bold !important;
            }
            @page {
              size: landscape;
              margin: 0.4cm;
            }
          }
        `}} />
      )}
      {phaseLockedForOthers && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3 text-amber-400 backdrop-blur-sm animate-fadeIn">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse text-amber-400" />
          <div className="text-xs">
            <h4 className="font-bold text-sm text-white mb-0.5">🔒 Modo Privado Activo</h4>
            <p className="text-slate-350 leading-relaxed">Por políticas de juego limpio, los pronósticos de los demás usuarios estarán ocultos hasta que inicie el primer partido de la fase. ¡Tus propias predicciones siguen siendo visibles para ti!</p>
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
            <p className="text-slate-400 text-xs">Compara tus pronósticos de la fase {availablePhases.find(p => p.id === activePhase)?.label} con los demás</p>
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
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 px-3 py-2 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir PDF
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
      ) : isPrintMode ? (
        <div className="print-container">
          {chunkedUsers.map((userChunk, chunkIdx) => (
            <div key={chunkIdx} className="print-page-break mb-8 bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="text-black font-black text-xs mb-3 font-sans">
                PLANILLA COMPARATIVA DE PRONÓSTICOS — GRUPO DE PARTICIPANTES {chunkIdx + 1} de {chunkedUsers.length}
              </h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="print-partidos-col py-2 px-2 font-bold text-black border border-slate-400 bg-slate-100">
                      Partidos
                    </th>
                    <th className="print-oficial-col py-2 px-2 font-bold text-center text-black border border-slate-400 bg-slate-100">
                      Oficial
                    </th>
                    {userChunk.map((user) => {
                      const isSelf = currentUser && user.uid === currentUser.uid;
                      return (
                        <th key={user.uid} className={`print-user-col py-2 px-2 font-bold text-center text-black border border-slate-400 bg-slate-100 ${isSelf ? 'bg-emerald-50' : ''}`}>
                          {getUserName(user.displayName)} {isSelf && '(Tú)'}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {phaseMatches.map((match) => {
                    const hasRealResult = match.status === 'finished' || match.status === 'in_progress';
                    const realH = match.homeGoals;
                    const realV = match.awayGoals;

                    return (
                      <tr key={match.id} className="hover:bg-slate-50">
                        <td className="print-partidos-col py-1 px-2 font-bold text-black border border-slate-300 truncate font-sans">
                          <span className="text-[9px] text-slate-500 font-mono mr-1">G{match.group}</span>
                          {getTeamName(match.homeTeam)} vs {getTeamName(match.awayTeam)}
                        </td>
                        <td className="print-oficial-col py-1 px-2 text-center text-black border border-slate-300 font-black">
                          {hasRealResult ? `${realH} a ${realV}` : ''}
                        </td>
                        {userChunk.map((user) => {
                          const isSelf = currentUser && user.uid === currentUser.uid;
                          const userPreds = predictions[user.uid] || {};
                          const pred = userPreds[match.id];

                          if (phaseLockedForOthers && !isSelf) {
                            return (
                              <td key={user.uid} className="py-1 px-2 text-center text-slate-400 border border-slate-300 font-mono text-[9px]">
                                🔒
                              </td>
                            );
                          }

                          if (!pred || (pred.homeGoals === null && pred.awayGoals === null)) {
                            return (
                              <td key={user.uid} className="py-1 px-2 text-center text-slate-450 border border-slate-300">
                                
                              </td>
                            );
                          }

                          const predH = pred.homeGoals;
                          const predV = pred.awayGoals;

                          const scoreResult = hasRealResult
                            ? calculateMatchPoints(predH, predV, realH, realV, match.phase)
                            : { points: 0, matchedHome: false, matchedAway: false };

                          let cellBg = isSelf ? 'bg-emerald-50/20' : '';
                          if (hasRealResult) {
                            const isExact = predH === realH && predV === realV;
                            const isOutcome = scoreResult.points > 0 && !isExact;
                            if (isExact) {
                              cellBg = 'bg-yellow-100 font-black';
                            } else if (isOutcome) {
                              cellBg = 'bg-emerald-100';
                            }
                          }

                          return (
                            <td key={user.uid} className={`py-1 px-2 text-center text-black border border-slate-300 ${cellBg}`}>
                              <div className="flex flex-col items-center">
                                <span className="font-semibold">{predH} a {predV}</span>
                                {hasRealResult && (
                                  <span className="text-[8px] font-bold text-slate-600">+{scoreResult.points}p</span>
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
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="sticky top-0 z-20 bg-slate-900/95 border-b border-slate-700/60 backdrop-blur-md">
                <tr>
                  <th className="py-3.5 px-4 font-bold text-slate-300 min-w-44 sticky left-0 z-30 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    Partidos
                  </th>
                  <th className="py-3.5 px-3 font-bold text-center text-slate-300 min-w-28 bg-slate-900/95">
                    Oficial
                  </th>
                  {sortedUsers.map((user) => {
                    const isSelf = currentUser && user.uid === currentUser.uid;
                    return (
                      <th key={user.uid} className={`py-3.5 px-4 font-bold text-center text-white min-w-32 bg-slate-900/95 border-l border-slate-800 ${isSelf ? 'bg-emerald-950/30 border-x border-x-emerald-500/25 ring-1 ring-emerald-500/10' : ''}`}>
                        <div className="flex flex-col items-center">
                          <span className={`font-semibold truncate max-w-28 ${isSelf ? 'text-emerald-300 font-extrabold' : 'text-slate-100'}`}>
                            {getUserName(user.displayName)} {isSelf && '(Tú)'}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">{user.phaseStats?.[activePhase]?.totalPoints || 0} pts</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {phaseMatches.map((match) => {
                  const hasRealResult = match.status === 'finished' || match.status === 'in_progress';
                  const realH = match.homeGoals;
                  const realV = match.awayGoals;

                  return (
                    <tr key={match.id} className="hover:bg-slate-800/10 transition-colors">
                      {/* Match Name Column (Sticky left) */}
                      <td className="py-3 px-4 font-bold text-slate-200 sticky left-0 z-10 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.25)] flex items-center gap-2 justify-between">
                        <div 
                          className="truncate pr-2 cursor-pointer hover:text-white transition-colors flex-1"
                          onClick={() => setSelectedMatchForFlyer(match)}
                          title="Ver resumen y batacazo del partido"
                        >
                          <span className="bg-slate-800 border border-slate-700/50 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded mr-2 uppercase">
                            {match.phase === 'grupos' || !match.phase ? `G${match.group}` : activePhase}
                          </span>
                          <span>{getTeamName(match.homeTeam)} vs {getTeamName(match.awayTeam)}</span>
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
                          <span className="text-slate-500 font-semibold italic text-[11px] print:hidden">Por definir</span>
                        )}
                      </td>

                      {/* Users Predictions Columns */}
                      {sortedUsers.map((user) => {
                        const isSelf = currentUser && user.uid === currentUser.uid;
                        const userPreds = predictions[user.uid] || {};
                        const pred = userPreds[match.id];

                        if (phaseLockedForOthers && !isSelf) {
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
                              <span className="print:hidden">-</span>
                            </td>
                          );
                        }

                        const predH = pred.homeGoals;
                        const predV = pred.awayGoals;

                        // Calcular puntos si hay resultado oficial
                        const scoreResult = hasRealResult
                          ? calculateMatchPoints(predH, predV, realH, realV, match.phase)
                          : { points: 0, matchedHome: false, matchedAway: false };

                        let cellClass = "border-l border-slate-800/60 text-center py-3 px-4 font-semibold text-slate-300";
                        if (isSelf) {
                          cellClass += " bg-emerald-500/[0.02] border-x border-x-emerald-500/15";
                        }
                        
                        const isExact = hasRealResult && predH === realH && predV === realV;
                        const isOutcome = hasRealResult && scoreResult.points > 0 && !isExact;

                        if (hasRealResult) {
                          if (isExact) {
                            cellClass += " bg-yellow-500/[0.04] text-yellow-300 border-l border-yellow-500/20 shadow-[inset_0_0_10px_rgba(234,179,8,0.05)] border-y border-y-yellow-500/10";
                          } else if (isOutcome) {
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
                                  isExact
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : isOutcome
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

      {selectedMatchForFlyer && (
        <MatchFlyerModal 
          match={selectedMatchForFlyer}
          users={sortedUsers}
          predictions={predictions}
          onClose={() => setSelectedMatchForFlyer(null)}
          currentUserUid={currentUser?.uid}
          isLockedForOthers={phaseLockedForOthers}
        />
      )}
    </div>
  );
}
