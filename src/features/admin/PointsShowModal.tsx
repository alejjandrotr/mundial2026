import { useEffect, useState, useRef } from 'react';
import type { Partido, Usuario } from '../../models/types';
import { calculateMatchPoints } from '../../utils/scoring';
import { Trophy, CheckCircle, XCircle, ArrowRight, Award, RefreshCw } from 'lucide-react';

interface PointsShowModalProps {
  match: Partido;
  officialHomeGoals: number;
  officialAwayGoals: number;
  users: Usuario[];
  predictions: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>;
  onConfirm: (userUpdates: Record<string, { globalPoints: number; phasePoints: number }>) => Promise<void>;
  onClose: () => void;
}

interface UserCalculatedResult {
  userId: string;
  userName: string;
  prediction: string;
  predHome: number | null;
  predAway: number | null;
  pointsGained: number;
  matchedHome: boolean;
  matchedAway: boolean;
  previousPoints: number;
  newPoints: number;
  newGlobalPoints: number;
}

export default function PointsShowModal({
  match,
  officialHomeGoals,
  officialAwayGoals,
  users,
  predictions,
  onConfirm,
  onClose
}: PointsShowModalProps) {
  const [currentStep, setCurrentStep] = useState<'reveal' | 'distributing' | 'summary'>('reveal');
  const [revealedScore, setRevealedScore] = useState(false);
  
  // Distributing state
  const [currentUserIndex, setCurrentUserIndex] = useState<number>(-1);
  const [userResults, setUserResults] = useState<UserCalculatedResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const distributionTimerRef = useRef<any>(null);

  // Calculate results on mount
  useEffect(() => {
    const results: UserCalculatedResult[] = users.map((user) => {
      const userPreds = predictions[user.uid] || {};
      const pred = userPreds[match.id];
      
      const predHome = pred && pred.homeGoals !== null ? pred.homeGoals : null;
      const predAway = pred && pred.awayGoals !== null ? pred.awayGoals : null;
      
      const scoreResult = calculateMatchPoints(predHome, predAway, officialHomeGoals, officialAwayGoals);
      const matchPhase = match.phase || 'grupos';
      const prevPhasePoints = user.phaseStats?.[matchPhase]?.totalPoints || 0;
      const prevGlobalPoints = user.totalPoints || 0;
      
      return {
        userId: user.uid,
        userName: user.displayName,
        prediction: predHome !== null && predAway !== null ? `${predHome} - ${predAway}` : 'Sin Predicción',
        predHome,
        predAway,
        pointsGained: scoreResult.points,
        matchedHome: scoreResult.matchedHome,
        matchedAway: scoreResult.matchedAway,
        previousPoints: prevPhasePoints,
        newPoints: prevPhasePoints + scoreResult.points,
        newGlobalPoints: prevGlobalPoints + scoreResult.points
      };
    });

    // Sort results by points gained (descending) for the final summary
    setUserResults(results);
  }, [match, officialHomeGoals, officialAwayGoals, users, predictions]);

  // Step 1 -> Step 2
  const handleRevealScore = () => {
    setRevealedScore(true);
    setTimeout(() => {
      setCurrentStep('distributing');
      setCurrentUserIndex(0);
    }, 2800); // Dramatic wait
  };

  // Step 2 logic: Increment active user index with delay
  useEffect(() => {
    if (currentStep === 'distributing' && currentUserIndex >= 0) {
      if (currentUserIndex < userResults.length) {
        distributionTimerRef.current = setTimeout(() => {
          setCurrentUserIndex((prev) => prev + 1);
        }, 1600); // 1.6s delay per user
      } else {
        // All users processed, go to summary
        setTimeout(() => {
          setCurrentStep('summary');
        }, 800);
      }
    }

    return () => {
      if (distributionTimerRef.current) {
        clearTimeout(distributionTimerRef.current);
      }
    };
  }, [currentStep, currentUserIndex, userResults.length]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Map user ID to new point totals
      const updates: Record<string, { globalPoints: number; phasePoints: number }> = {};
      userResults.forEach(r => {
        updates[r.userId] = {
          globalPoints: r.newGlobalPoints,
          phasePoints: r.newPoints
        };
      });
      await onConfirm(updates);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] my-8">
        
        {/* MODAL STEP 1: REVEAL SCORE */}
        {currentStep === 'reveal' && (
          <div className="p-8 text-center space-y-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
            
            <div className="animate-bounce bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Trophy className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <span className="bg-slate-800 border border-slate-700/85 text-emerald-400 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Fase: {match.phase || 'Grupos'} {match.group ? `• Grupo ${match.group}` : ''}
              </span>
              <h2 className="text-3xl font-black text-white tracking-tight">Cierre de Partido & Puntos</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Registraremos el marcador oficial de <strong>{match.homeTeam} vs {match.awayTeam}</strong> y calcularemos los puntos en vivo.
              </p>
            </div>

            {/* Match Card Screen */}
            <div className="w-full max-w-md bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 relative">
              <div className="flex items-center justify-between gap-6">
                {/* Home */}
                <div className="flex-1 text-center space-y-2">
                  <div className="text-xl font-extrabold text-slate-100">{match.homeTeam}</div>
                </div>

                {/* Simulated spinning score */}
                <div className="flex items-center gap-3 text-4xl font-black">
                  {!revealedScore ? (
                    <div className="flex items-center gap-2">
                      <span className="w-12 h-16 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 animate-pulse font-mono">?</span>
                      <span className="text-slate-700 text-xl font-normal">:</span>
                      <span className="w-12 h-16 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 animate-pulse font-mono">?</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 animate-scaleIn">
                      <span className="w-12 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] font-mono">{officialHomeGoals}</span>
                      <span className="text-slate-500 text-xl font-normal">:</span>
                      <span className="w-12 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] font-mono">{officialAwayGoals}</span>
                    </div>
                  )}
                </div>

                {/* Away */}
                <div className="flex-1 text-center space-y-2">
                  <div className="text-xl font-extrabold text-slate-100">{match.awayTeam}</div>
                </div>
              </div>
            </div>

            {!revealedScore ? (
              <button
                onClick={handleRevealScore}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 tracking-wide uppercase text-sm"
              >
                <span>Revelar y Distribuir Puntos</span>
                <ArrowRight className="w-4 h-4 stroke-[3px]" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold tracking-wide animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Procesando predicciones de los usuarios...</span>
              </div>
            )}
          </div>
        )}

        {/* MODAL STEP 2: DISTRIBUTING POINTS (USER BY USER SHOW) */}
        {currentStep === 'distributing' && currentUserIndex >= 0 && (
          <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            {/* Header progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden absolute top-0 left-0">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(Math.min(currentUserIndex + 1, userResults.length) / userResults.length) * 100}%` }}
              />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                Usuario {Math.min(currentUserIndex + 1, userResults.length)} de {userResults.length}
              </span>
              <h3 className="text-xl font-black text-white">Calculando Puntos por Participante</h3>
            </div>

            {/* Display active user card */}
            {currentUserIndex < userResults.length ? (
              (() => {
                const cur = userResults[currentUserIndex];
                
                // Determine styling based on points gained
                let borderClass = "border-slate-800 bg-slate-950/40";
                let pointsColor = "text-slate-400";
                let pointsLabel = "+0 PTS";
                let pointsBg = "bg-slate-900 border-slate-800 text-slate-500";
                let icon = <XCircle className="w-8 h-8 text-red-500 animate-pulse" />;
                let animationClass = "animate-scaleIn";

                if (cur.pointsGained === 3) {
                  borderClass = "border-yellow-500/50 bg-yellow-500/[0.03] shadow-[0_0_30px_rgba(234,179,8,0.15)]";
                  pointsColor = "text-yellow-400";
                  pointsLabel = "+3 PTS (Exacto)";
                  pointsBg = "bg-yellow-500/20 text-yellow-400 border-yellow-500/35";
                  icon = <Award className="w-8 h-8 text-yellow-400 animate-pulse" />;
                } else if (cur.pointsGained === 2) {
                  borderClass = "border-emerald-500/50 bg-emerald-500/[0.03] shadow-[0_0_30px_rgba(16,185,129,0.15)]";
                  pointsColor = "text-emerald-400";
                  pointsLabel = "+2 PTS (Ganador)";
                  pointsBg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/35";
                  icon = <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse" />;
                } else {
                  // 0 points: show red animation as user requested
                  borderClass = "border-red-500/40 bg-red-500/[0.02] shadow-[0_0_20px_rgba(239,68,68,0.05)]";
                  pointsColor = "text-red-400";
                  pointsLabel = "+0 PTS (Sin Acierto)";
                  pointsBg = "bg-red-500/10 text-red-400 border-red-500/20";
                }

                return (
                  <div key={cur.userId} className={`w-full max-w-md border rounded-3xl p-6 space-y-6 transition-all duration-300 ${borderClass} ${animationClass}`}>
                    
                    {/* User profile row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center font-bold text-white text-base">
                          {cur.userName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-lg">{cur.userName}</h4>
                          <p className="text-slate-400 text-xs">Predijo: {cur.predHome !== null && cur.predAway !== null ? `${cur.predHome} a ${cur.predAway}` : 'Sin predicción'}</p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {icon}
                      </div>
                    </div>

                    {/* Prediction comparison */}
                    <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-850 flex items-center justify-between">
                      <div className="text-center space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Predicción</span>
                        <div className="flex items-center gap-1.5 justify-center text-lg font-black text-slate-300">
                          <span className={cur.matchedHome ? "text-emerald-400 border-b-2 border-emerald-500" : ""}>{cur.predHome ?? '-'}</span>
                          <span className="text-slate-600 font-normal">a</span>
                          <span className={cur.matchedAway ? "text-emerald-400 border-b-2 border-emerald-500" : ""}>{cur.predAway ?? '-'}</span>
                        </div>
                      </div>

                      <div className="h-8 border-l border-slate-800" />

                      <div className="text-center space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Real Oficial</span>
                        <div className="flex items-center gap-1.5 justify-center text-lg font-black text-white">
                          <span>{officialHomeGoals}</span>
                          <span className="text-slate-500 font-normal">a</span>
                          <span>{officialAwayGoals}</span>
                        </div>
                      </div>
                    </div>

                    {/* Point results badge and standing info */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border tracking-wide uppercase ${pointsBg}`}>
                        {pointsLabel}
                      </span>
                      
                      <div className="text-slate-400 text-xs font-mono font-bold flex items-center gap-2">
                        <span>{cur.previousPoints} pts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span className={`${pointsColor} text-sm font-extrabold`}>{cur.newPoints} pts</span>
                      </div>
                    </div>

                  </div>
                );
              })()
            ) : (
              <div className="text-center space-y-4 py-8">
                <Trophy className="w-10 h-10 text-emerald-400 animate-bounce mx-auto" />
                <p className="text-slate-400 text-sm font-semibold">¡Todos los puntos calculados con éxito!</p>
              </div>
            )}
          </div>
        )}

        {/* MODAL STEP 3: SUMMARY TABLE */}
        {currentStep === 'summary' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Tabla Resumen de Puntos</h3>
                  <p className="text-slate-400 text-xs">
                    Resumen de puntos distribuidos para el partido {match.homeTeam} vs {match.awayTeam} ({officialHomeGoals}-{officialAwayGoals})
                  </p>
                </div>
              </div>

              <span className="bg-slate-800 text-slate-300 border border-slate-700/50 text-[10px] font-mono px-2 py-0.5 rounded uppercase">
                Fase: {match.phase || 'grupos'}
              </span>
            </div>

            {/* Main Summary Table */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">Pos</th>
                      <th className="py-3 px-4 font-bold">Participante</th>
                      <th className="py-3 px-4 font-bold text-center">Predicción</th>
                      <th className="py-3 px-4 font-bold text-center">Puntos Ganados</th>
                      <th className="py-3 px-4 font-bold text-right">Puntaje Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {userResults.map((r, idx) => {
                      let tagClass = "bg-slate-900 text-slate-500 border border-slate-800";
                      let pointsText = `+${r.pointsGained} pts`;

                      if (r.pointsGained === 3) {
                        tagClass = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-extrabold";
                      } else if (r.pointsGained === 2) {
                        tagClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-extrabold";
                      } else {
                        // 0 points: red tag as user requested
                        tagClass = "bg-red-500/10 text-red-400 border border-red-500/20";
                      }

                      return (
                        <tr key={r.userId} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-550">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center font-bold text-slate-300 text-[10px]">
                              {r.userName.charAt(0)}
                            </div>
                            <span>{r.userName}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-350">{r.prediction}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide inline-block ${tagClass}`}>
                              {pointsText}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span className="text-slate-550 text-[10px] mr-2">{r.previousPoints} →</span>
                            <span className="text-emerald-400">{r.newPoints}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancelar Cierre
                </button>

                <button
                  onClick={() => {
                    setCurrentStep('reveal');
                    setRevealedScore(false);
                    setCurrentUserIndex(-1);
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-350 px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Repetir Animación
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto justify-center text-xs uppercase"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 stroke-[3px]" />
                    <span>Confirmar y Guardar en Firestore</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
