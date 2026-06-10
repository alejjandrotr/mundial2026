import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Partido } from '../../models/types';
import StandingTable from './StandingTable';
import QualifiersPreview from './QualifiersPreview';
import { calculateMatchPoints } from '../../utils/scoring';
import { getCachedMatches, clearPredictionsCache } from '../../utils/cache';
import { Save, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Star, Info, Trash2, Lock } from 'lucide-react';
import { getFlagUrl } from '../../utils/flags';
import { getMatchVenue } from '../../utils/venues';


export interface CalculatedTeam {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface PredictionState {
  homeGoals: string;
  awayGoals: string;
}

interface QuinielaFormProps {
  initialGroup?: string;
}

export default function QuinielaForm({ initialGroup = 'A' }: QuinielaFormProps) {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<Partido[]>([]);
  const [predictions, setPredictions] = useState<Record<string, PredictionState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup);

  const isLocked = useMemo(() => {
    // Block editing on June 11, 2026 at 14:40:00 UTC (1h 20m before kickoff)
    const lockTime = new Date('2026-06-11T14:40:00Z').getTime();
    return Date.now() >= lockTime;
  }, []);


  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  useEffect(() => {
    if (initialGroup) {
      setActiveGroup(initialGroup);
    }
  }, [initialGroup]);

  // Cargar partidos y predicciones existentes
  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        setLoading(true);
        // 1. Obtener partidos desde caché (evita lectura duplicada)
        const matchesData = await getCachedMatches();
        setMatches(matchesData);

        // 2. Obtener las predicciones existentes de este usuario (siempre fresco)
        const predQuery = query(
          collection(db, 'predicciones'),
          where('usuarioId', '==', currentUser.uid)
        );
        const predSnapshot = await getDocs(predQuery);
        const predictionsMap: Record<string, PredictionState> = {};
        
        predSnapshot.forEach((doc) => {
          const data = doc.data();
          predictionsMap[data.partidoId] = {
            homeGoals: data.homeGoals !== null ? String(data.homeGoals) : '',
            awayGoals: data.awayGoals !== null ? String(data.awayGoals) : '',
          };
        });

        setPredictions(predictionsMap);
      } catch (err) {
        console.error('Error al cargar datos de la quiniela:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUser]);

  // Manejar el cambio en los inputs de marcador
  const handleScoreChange = (matchId: string, side: 'homeGoals' | 'awayGoals', value: string) => {
    if (isLocked) return;
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value,
      },
    }));
    
    if (saveStatus !== 'idle') {
      setSaveStatus('idle');
    }
  };

  // Calcular las tablas de posiciones dinámicamente
  const calculateStandings = (groupName: string): CalculatedTeam[] => {
    const groupMatches = matches.filter((m) => m.group === groupName);
    const teamsMap: Record<string, CalculatedTeam> = {};

    groupMatches.forEach((m) => {
      if (!teamsMap[m.homeTeam]) {
        teamsMap[m.homeTeam] = {
          name: m.homeTeam,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };
      }
      if (!teamsMap[m.awayTeam]) {
        teamsMap[m.awayTeam] = {
          name: m.awayTeam,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };
      }
    });

    groupMatches.forEach((m) => {
      const pred = predictions[m.id];
      if (pred && pred.homeGoals !== '' && pred.awayGoals !== '') {
        const homeG = parseInt(pred.homeGoals, 10);
        const awayG = parseInt(pred.awayGoals, 10);

        const homeTeam = teamsMap[m.homeTeam];
        const awayTeam = teamsMap[m.awayTeam];

        if (homeTeam && awayTeam) {
          homeTeam.played += 1;
          awayTeam.played += 1;
          homeTeam.goalsFor += homeG;
          homeTeam.goalsAgainst += awayG;
          awayTeam.goalsFor += awayG;
          awayTeam.goalsAgainst += homeG;
          homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
          awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;

          if (homeG > awayG) {
            homeTeam.won += 1;
            homeTeam.points += 3;
            awayTeam.lost += 1;
          } else if (homeG < awayG) {
            awayTeam.won += 1;
            awayTeam.points += 3;
            homeTeam.lost += 1;
          } else {
            homeTeam.drawn += 1;
            homeTeam.points += 1;
            awayTeam.drawn += 1;
            awayTeam.points += 1;
          }
        }
      }
    });

    return Object.values(teamsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
  };

  // Calcular los 16 clasificados reales en base a las predicciones
  const getQualifiers = (): Record<string, { first: string; second: string }> => {
    const qualifiersMap: Record<string, { first: string; second: string }> = {};
    groups.forEach((g) => {
      const standings = calculateStandings(g);
      const totalSimulatedMatches = standings.reduce((sum, team) => sum + team.played, 0) / 2;
      const expectedMatches = (standings.length * (standings.length - 1)) / 2;

      if (standings.length >= 2 && totalSimulatedMatches >= expectedMatches) {
        qualifiersMap[g] = {
          first: standings[0]?.name || '',
          second: standings[1]?.name || '',
        };
      } else {
        qualifiersMap[g] = {
          first: '',
          second: '',
        };
      }
    });
    return qualifiersMap;
  };

  // Guardar la quiniela completa de forma masiva en la BD
  const handleSaveAll = async () => {
    if (!currentUser || isLocked) return;
    try {
      setSaving(true);
      setSaveStatus('idle');
      const batch = writeBatch(db);
      const predRef = collection(db, 'predicciones');

      let userAccumulatedPoints = 0;

      // Solo guardamos los partidos que tengan algún marcador ingresado
      Object.entries(predictions).forEach(([matchId, pred]) => {
        const homeGVal = pred.homeGoals !== '' ? parseInt(pred.homeGoals, 10) : null;
        const awayGVal = pred.awayGoals !== '' ? parseInt(pred.awayGoals, 10) : null;

        if (homeGVal !== null || awayGVal !== null) {
          const docId = `prediction_${currentUser.uid}_${matchId}`;
          const docRef = doc(predRef, docId);

          batch.set(docRef, {
            id: docId,
            usuarioId: currentUser.uid,
            partidoId: matchId,
            homeGoals: homeGVal,
            awayGoals: awayGVal,
            pointsEarned: null, // Se calculará después al finalizar los partidos
          }, { merge: true });

          // Calcular puntos ganados en tiempo real si el partido real ya se jugó
          const match = matches.find((m) => m.id === matchId);
          if (match && (match.status === 'finished' || match.status === 'in_progress')) {
            const scoreResult = calculateMatchPoints(homeGVal, awayGVal, match.homeGoals, match.awayGoals);
            userAccumulatedPoints += scoreResult.points;
          }
        }
      });

      // Actualizar el total de puntos del usuario en Firestore
      const userRef = doc(db, 'usuarios', currentUser.uid);
      batch.update(userRef, {
        totalPoints: userAccumulatedPoints
      });

      await batch.commit();

      // Sincronizar en localStorage el nuevo puntaje del usuario actual
      const updatedLocalUser = { ...currentUser, totalPoints: userAccumulatedPoints };
      localStorage.setItem('currentUser', JSON.stringify(updatedLocalUser));

      // Invalidar caché de predicciones para que ComparisonGrid se refresque
      clearPredictionsCache();

      setSaveStatus('success');
    } catch (err) {
      console.error('Error al guardar predicciones:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Limpiar todas las predicciones del estado local
  const handleClearAll = () => {
    if (isLocked) return;
    if (confirm('¿Estás seguro de que deseas limpiar todas tus predicciones? Esto borrará tus respuestas locales (debes presionar "Guardar mi Quiniela" para aplicar los cambios en la base de datos).')) {
      setPredictions({});
      setSaveStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <span>Cargando partidos y tus predicciones...</span>
      </div>
    );
  }

  const activeGroupMatches = matches.filter((m) => m.group === activeGroup);
  const activeGroupStandings = calculateStandings(activeGroup);
  const currentQualifiers = getQualifiers();

  return (
    <div className="space-y-8">
      {isLocked && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400 backdrop-blur-sm animate-fadeIn">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse text-red-400" />
          <div className="text-xs">
            <h4 className="font-bold text-sm text-white mb-0.5">🔒 Predicciones Cerradas</h4>
            <p className="text-slate-300 leading-relaxed">La fecha límite para realizar modificaciones ha vencido (<strong>11 de junio de 2026 a las 14:40 UTC</strong>). Actualmente te encuentras en modo lectura y tus pronósticos están protegidos.</p>
          </div>
        </div>
      )}

      {/* 1. Vista Previa de Clasificados en Tiempo Real */}
      <QualifiersPreview qualifiers={currentQualifiers} />

      {/* 2. Selector de Grupo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/40 pb-4">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-mono mr-2">Grupo:</span>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeGroup === g
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border border-slate-700/50'
            }`}
          >
            Grupo {g}
          </button>
        ))}
      </div>

      {/* 3. Panel de Ingreso e Información */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Ingreso de Predicciones */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              ⚽ Partidos del Grupo {activeGroup}
            </h3>
            <span className="text-xs text-slate-500 font-medium">Navega rápido presionando Tab o Enter</span>
          </div>

          <div className="space-y-3">
            {activeGroupMatches.map((match) => {
              const pred = predictions[match.id] || { homeGoals: '', awayGoals: '' };
              const kickoffDate = match.kickoffTime?.toDate ? match.kickoffTime.toDate() : new Date(match.kickoffTime);
              
              const isPlayed = match.status === 'finished' || match.status === 'in_progress';
              const predHomeNum = pred.homeGoals !== '' ? parseInt(pred.homeGoals, 10) : null;
              const predAwayNum = pred.awayGoals !== '' ? parseInt(pred.awayGoals, 10) : null;

              // Calcular los puntos que gana el usuario en este partido
              const scoreResult = isPlayed && predHomeNum !== null && predAwayNum !== null
                ? calculateMatchPoints(predHomeNum, predAwayNum, match.homeGoals, match.awayGoals)
                : null;

              // Identificar ganador real para mostrar en el detalle
              let realWinnerLabel = '';
              if (isPlayed) {
                if (match.homeGoals! > match.awayGoals!) {
                  realWinnerLabel = `Ganador: ${match.homeTeam}`;
                } else if (match.homeGoals! < match.awayGoals!) {
                  realWinnerLabel = `Ganador: ${match.awayTeam}`;
                } else {
                  realWinnerLabel = 'Resultado: Empate';
                }
              }

              return (
                <div
                  key={match.id}
                  className={`bg-slate-800/30 border rounded-2xl p-4 flex flex-col items-center justify-between gap-4 transition-all duration-200 ${
                    scoreResult?.points === 3 
                      ? 'border-yellow-500/50 bg-yellow-500/[0.02]' 
                      : scoreResult?.points === 2 
                      ? 'border-emerald-500/40 bg-emerald-500/[0.01]' 
                      : 'border-slate-700/40 hover:border-slate-600/50'
                  }`}
                >
                  {/* Fila superior: Info, Estado y Puntajes */}
                  <div className="w-full flex justify-between items-center text-xs font-mono pb-2 border-b border-slate-800/60 text-slate-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400">
                          {kickoffDate.toLocaleDateString([], { day: '2-digit', month: 'short' })}
                        </span>
                        <span>{kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-slate-700">|</span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span>{getMatchVenue(match.group || 'A', match.homeTeam).flag}</span>
                        <span className="font-medium text-slate-300">{getMatchVenue(match.group || 'A', match.homeTeam).city}</span>
                      </div>
                    </div>

                    {/* Badge de Puntos Obtenidos */}
                    {scoreResult !== null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                        scoreResult.points === 3
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse'
                          : scoreResult.points === 2
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : scoreResult.points === 1
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                          : 'bg-slate-900 text-slate-500 border border-slate-850'
                      }`}>
                        {scoreResult.points === 3 && <Star className="w-3 h-3 fill-yellow-500" />}
                        +{scoreResult.points} pts
                      </span>
                    )}
                  </div>

                  {/* Fila central: Equipos y Marcadores */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                    {/* Marcador e Inputs */}
                    <div className="flex items-center justify-center gap-3 sm:gap-6 flex-1 w-full order-1">
                      {/* Equipo Local */}
                      <div className="flex-1 flex items-center justify-end gap-2 font-bold text-sm sm:text-base text-slate-100 truncate">
                        <span>{match.homeTeam}</span>
                        {getFlagUrl(match.homeTeam) && (
                          <img src={getFlagUrl(match.homeTeam)} alt="" className="w-5 h-3.5 object-cover rounded border border-slate-700/50 flex-shrink-0" />
                        )}
                      </div>

                      {/* Inputs de Predicción */}
                      <div className="flex items-center gap-2.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pred.homeGoals}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(match.id, 'homeGoals', e.target.value)}
                          disabled={isLocked}
                          className={`w-12 h-12 bg-slate-900 border rounded-xl text-center text-lg font-black outline-none transition-all shadow-inner ${
                            scoreResult?.matchedHome
                              ? 'border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20'
                              : 'border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          placeholder="-"
                        />
                        <span className="text-slate-650 font-bold text-sm select-none">vs</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pred.awayGoals}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(match.id, 'awayGoals', e.target.value)}
                          disabled={isLocked}
                          className={`w-12 h-12 bg-slate-900 border rounded-xl text-center text-lg font-black outline-none transition-all shadow-inner ${
                            scoreResult?.matchedAway
                              ? 'border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20'
                              : 'border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          placeholder="-"
                        />
                      </div>

                      {/* Equipo Visitante */}
                      <div className="flex-1 flex items-center justify-start gap-2 font-bold text-sm sm:text-base text-slate-100 truncate">
                        {getFlagUrl(match.awayTeam) && (
                          <img src={getFlagUrl(match.awayTeam)} alt="" className="w-5 h-3.5 object-cover rounded border border-slate-700/50 flex-shrink-0" />
                        )}
                        <span>{match.awayTeam}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fila inferior: Detalle de resultado real si se jugó */}
                  {isPlayed && (
                    <div className="w-full flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 text-[11px] font-medium text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span>Oficial: <strong className="text-white tracking-wider font-mono bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 ml-1">{match.homeGoals} a {match.awayGoals}</strong></span>
                      </div>
                      <span className="text-emerald-400 font-semibold">{realWinnerLabel}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Tabla Standings Grupo */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-6">
            <StandingTable groupName={activeGroup} teams={activeGroupStandings} />
          </div>
        </div>

      </div>

      {/* 4. Barra de Acciones Flotante / Inferior */}
      <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-2xl sticky bottom-4 z-40">
        <div className="flex items-center gap-2.5">
          {isLocked ? (
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
              <Lock className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-400 font-black">Predicciones Cerradas (Límite Excedido)</span>
            </div>
          ) : saveStatus === 'idle' ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
              <span>Modificaciones locales sin guardar en la base de datos</span>
            </div>
          ) : saveStatus === 'success' ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Quiniela guardada exitosamente</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Error al guardar los datos</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-3">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={saving || isLocked}
            className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-bold py-3 px-5 rounded-xl transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none w-full sm:w-auto text-sm disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar Predicciones</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving || isLocked}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform active:scale-95 disabled:scale-100 disabled:cursor-not-allowed w-full sm:w-auto disabled:shadow-none"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Guardar mi Quiniela</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
