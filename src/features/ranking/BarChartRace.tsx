import { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, X, Trophy, Flame, Settings, AlertCircle, FastForward, SkipBack, SkipForward, Maximize } from 'lucide-react';
import type { Partido, Usuario } from '../../models/types';
import { calculateMatchPoints } from '../../utils/scoring';
import { getFlagUrl } from '../../utils/flags';
import { toTitleCase } from '../../utils/format';
import { usePhase } from '../../context/PhaseContext';

interface BarChartRaceProps {
  users: Usuario[];
  matches: Partido[];
  predictions: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>;
  onClose: () => void;
}

interface UserScore {
  uid: string;
  name: string;
  points: number;
  rank: number;
  color: string;
  streak: number;
}

interface FrameEvent {
  type: 'NEW_LEADER' | 'EXCLUSIVE_HIT' | 'CYCLE_START';
  message: string;
  details?: string;
}

interface Frame {
  match: Partido;
  matchIndex: number;
  scores: UserScore[];
  events: FrameEvent[];
}

const COLORS = [
  '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c',
  '#f15bb5', '#9b5de5', '#00bbf9', '#00f5d4', '#fee440',
  '#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d',
  '#43aa8b', '#577590', '#ff006e', '#8338ec', '#3a86ff'
];

export default function BarChartRace({ users, matches, predictions, onClose }: BarChartRaceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [autoPauseMode, setAutoPauseMode] = useState<'auto' | 'manual'>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [activeEvent, setActiveEvent] = useState<FrameEvent | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [visiblePlayers, setVisiblePlayers] = useState<number | 'all'>('all');

  const timerRef = useRef<any>(null);
  const pauseTimeoutRef = useRef<any>(null);

  const { activePhase, availablePhases } = usePhase();

  // 1. Preprocesar datos en "Frames"
  const frames = useMemo(() => {
    const phaseMatches = matches.filter(m => (m.phase || 'grupos') === activePhase);
    const finishedMatches = [...phaseMatches]
      .filter(m => m.status === 'finished' && m.homeGoals !== null && m.awayGoals !== null)
      .sort((a, b) => {
        const timeA = a.kickoffTime?.toDate ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime).getTime();
        const timeB = b.kickoffTime?.toDate ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime).getTime();
        return timeA - timeB;
      });

    if (finishedMatches.length === 0) return [];

    let currentScores: Record<string, { points: number; streak: number }> = {};
    users.forEach(u => {
      currentScores[u.uid] = { points: 0, streak: 0 };
    });

    let previousLeaderId: string | null = null;
    const generatedFrames: Frame[] = [];

    finishedMatches.forEach((match, idx) => {
      let matchWinnersCount = 0;
      let matchWinnersNames: string[] = [];
      const events: FrameEvent[] = [];

      // Detectar inicio de ciclo (jornadas 1, 2, 3) - Simplificado: Cada 16 partidos es una jornada (48 partidos fase grupos)
      if (activePhase === 'grupos') {
        if (idx === 0) events.push({ type: 'CYCLE_START', message: '¡Inicia la Jornada 1!' });
        if (idx === 16) events.push({ type: 'CYCLE_START', message: '¡Inicia la Jornada 2!' });
        if (idx === 32) events.push({ type: 'CYCLE_START', message: '¡Inicia la Jornada 3!' });
      } else {
        if (idx === 0) events.push({ type: 'CYCLE_START', message: `¡Inicia la fase de ${availablePhases.find(p => p.id === activePhase)?.label}!` });
      }

      users.forEach(user => {
        const pred = predictions[user.uid]?.[match.id];
        let scoredInThisMatch = false;

        if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
          const { points, matchedHome, matchedAway } = calculateMatchPoints(
            pred.homeGoals, pred.awayGoals,
            match.homeGoals, match.awayGoals
          );

          let matchPoints = points;
          if (matchedHome) matchPoints += 0.001;
          if (matchedAway) matchPoints += 0.001;

          currentScores[user.uid].points += matchPoints;

          if (points >= 2) { // Consideramos "ganado" si sacó al menos los 2 puntos de tendencia
            scoredInThisMatch = true;
            matchWinnersCount++;
            matchWinnersNames.push(toTitleCase(user.displayName || ''));
          }
        }

        if (scoredInThisMatch) {
          currentScores[user.uid].streak += 1;
        } else {
          currentScores[user.uid].streak = 0; // Se rompe la racha si no acertó la tendencia
        }
      });

      // Acierto Exclusivo
      if (matchWinnersCount >= 1 && matchWinnersCount <= 3) {
        events.push({
          type: 'EXCLUSIVE_HIT',
          message: 'BATACAZO',
          details: matchWinnersNames.join(', ')
        });
      }

      // Ordenar para obtener ranking
      const sortedUsers = users.map((u, i) => ({
        uid: u.uid,
        name: toTitleCase(u.displayName || 'Jugador'),
        points: currentScores[u.uid].points,
        streak: currentScores[u.uid].streak,
        color: COLORS[i % COLORS.length]
      })).sort((a, b) => b.points - a.points);

      // Asignar rangos
      const scoresWithRank: UserScore[] = sortedUsers.map((su, index) => ({
        ...su,
        rank: index + 1
      }));

      // Detectar cambio de líder
      const currentLeaderId = scoresWithRank[0]?.uid;
      if (idx > 0 && currentLeaderId !== previousLeaderId && previousLeaderId !== null) {
        events.push({
          type: 'NEW_LEADER',
          message: '¡Tenemos un nuevo Líder!',
          details: `${scoresWithRank[0].name} ha tomado la primera posición.`
        });
      }
      previousLeaderId = currentLeaderId;

      generatedFrames.push({
        match,
        matchIndex: idx,
        scores: scoresWithRank,
        events
      });
    });

    return generatedFrames;
  }, [users, matches, predictions, activePhase, availablePhases]);

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  // Lógica principal de reproducción
  useEffect(() => {
    if (isPlaying) {
      if (currentFrameIndex >= frames.length - 1) {
        setIsPlaying(false); // Fin de la animación
        return;
      }

      const advanceFrame = () => {
        setCurrentFrameIndex(prev => {
          const next = prev + 1;
          const nextFrame = frames[next];
          
          if (nextFrame?.events.length > 0) {
            // Mostrar evento
            setActiveEvent(nextFrame.events[0]);
            setIsPlaying(false); // Pausar inmediatamente el motor interno
            
            if (autoPauseMode === 'auto') {
              // Reanudar automáticamente después de 3 segundos
              pauseTimeoutRef.current = setTimeout(() => {
                setActiveEvent(null);
                setIsPlaying(true);
              }, 3000);
            }
          }
          return next;
        });
      };

      timerRef.current = setInterval(advanceFrame, 1200 / speedMultiplier); // 1.2 segundos por partido
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, frames, currentFrameIndex, autoPauseMode, speedMultiplier]);

  const togglePlay = () => {
    if (activeEvent && autoPauseMode === 'manual') {
      // Si estaba pausado manual por un evento, lo quitamos al darle play
      setActiveEvent(null);
    }
    
    if (!isPlaying && currentFrameIndex >= frames.length - 1) {
      setCurrentFrameIndex(0); // Reiniciar si llegó al final
    }
    
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setIsPlaying(!isPlaying);
  };

  if (frames.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
        <p>No hay partidos finalizados para generar la animación.</p>
        <button onClick={onClose} className="mt-4 bg-slate-800 px-4 py-2 rounded-xl">Volver</button>
      </div>
    );
  }

  const currentFrame = frames[currentFrameIndex];
  const maxScore = currentFrame.scores[0]?.points || 1;
  const matchLabel = `${currentFrame.match.homeTeam} ${currentFrame.match.homeGoals} - ${currentFrame.match.awayGoals} ${currentFrame.match.awayTeam}`;
  
  const actualVisibleCountForScale = visiblePlayers === 'all' ? users.length : visiblePlayers;
  const visibleScores = currentFrame.scores.slice(0, actualVisibleCountForScale);
  const minScore = visibleScores.length > 0 ? visibleScores[visibleScores.length - 1].points : 0;
  // Anclaje de escala dinámica: 95% del puntaje más bajo visible, para magnificar diferencias
  const baseScore = maxScore > 10 ? Math.max(0, minScore * 0.95) : 0; 
  const scoreRange = Math.max(1, maxScore - baseScore);
  
  const isBatacazoActive = activeEvent?.type === 'EXCLUSIVE_HIT';
  const batacazoNames = isBatacazoActive && activeEvent.details ? activeEvent.details.split(', ') : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans text-white overflow-hidden">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-worldcup-green" />
          <div>
            <h2 className="text-xl font-black tracking-tight">Bar Chart Race ({availablePhases.find(p => p.id === activePhase)?.label})</h2>
            <p className="text-xs text-slate-400">Evolución partido a partido</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title="Pantalla Completa"
          >
            <Maximize className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Configuración de Pausas"
            >
              <Settings className="w-5 h-5" />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-50">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">Pausas en Eventos</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                    <input 
                      type="radio" 
                      name="pauseMode" 
                      checked={autoPauseMode === 'auto'} 
                      onChange={() => setAutoPauseMode('auto')}
                      className="accent-worldcup-green"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-white block">Automática</span>
                      <span className="text-[10px] text-slate-400">Pausa de 3 segundos y continúa</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                    <input 
                      type="radio" 
                      name="pauseMode" 
                      checked={autoPauseMode === 'manual'} 
                      onChange={() => setAutoPauseMode('manual')}
                      className="accent-worldcup-green"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-white block">Manual</span>
                      <span className="text-[10px] text-slate-400">Requiere presionar Play de nuevo</span>
                    </div>
                  </label>
                </div>
                
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 mt-4 text-slate-400">Velocidad</h4>
                <div className="flex gap-1">
                  {[0.5, 1, 1.5, 2].map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSpeedMultiplier(s)}
                      className={`flex-1 py-1 text-xs rounded-lg font-bold transition-colors ${speedMultiplier === s ? 'bg-worldcup-green text-slate-950' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >{s}x</button>
                  ))}
                </div>

                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 mt-4 text-slate-400">Jugadores Visibles</h4>
                <div className="flex gap-1">
                  {[5, 10, 15, 'all'].map(v => (
                    <button 
                      key={v} 
                      onClick={() => setVisiblePlayers(v as any)}
                      className={`flex-1 py-1 text-xs rounded-lg font-bold transition-colors ${visiblePlayers === v ? 'bg-worldcup-green text-slate-950' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >{v === 'all' ? 'Todos' : v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(e => console.log(e));
              }
              onClose();
            }}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MATCH INFO OVERLAY */}
      <div className="absolute top-24 right-8 z-30 flex flex-col items-end opacity-40">
        <div className="text-[120px] font-black tracking-tighter leading-none">{currentFrame.matchIndex + 1}</div>
        <div className="text-2xl font-bold text-slate-400 -mt-4">/ {frames.length} Partidos</div>
      </div>

      <div className="absolute bottom-32 right-8 z-30 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-2xl max-w-sm">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Partido Actual</h4>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            {getFlagUrl(currentFrame.match.homeTeam) ? (
              <img src={getFlagUrl(currentFrame.match.homeTeam)} className="w-12 h-8 object-cover rounded shadow-md mb-1" />
            ) : <div className="w-12 h-8 bg-slate-800 rounded mb-1"></div>}
            <span className="text-xs font-bold truncate max-w-[80px]">{currentFrame.match.homeTeam}</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-2xl font-black">
            <span>{currentFrame.match.homeGoals}</span>
            <span className="text-slate-600">-</span>
            <span>{currentFrame.match.awayGoals}</span>
          </div>

          <div className="flex flex-col items-center">
             {getFlagUrl(currentFrame.match.awayTeam) ? (
              <img src={getFlagUrl(currentFrame.match.awayTeam)} className="w-12 h-8 object-cover rounded shadow-md mb-1" />
            ) : <div className="w-12 h-8 bg-slate-800 rounded mb-1"></div>}
            <span className="text-xs font-bold truncate max-w-[80px]">{currentFrame.match.awayTeam}</span>
          </div>
        </div>
      </div>

      {/* BANNER EVENTOS ESPECIALES */}
      {activeEvent && (
        <div className="absolute right-8 top-[35%] z-40 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center animate-bounce-slight w-[320px]">
          {activeEvent.type === 'NEW_LEADER' && <Trophy className="w-12 h-12 text-yellow-400 mb-3 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />}
          {activeEvent.type === 'EXCLUSIVE_HIT' && <AlertCircle className="w-12 h-12 text-worldcup-pink mb-3 drop-shadow-[0_0_15px_rgba(241,91,181,0.5)]" />}
          {activeEvent.type === 'CYCLE_START' && <FastForward className="w-12 h-12 text-worldcup-green mb-3 drop-shadow-[0_0_15px_rgba(0,245,212,0.5)]" />}
          
          <h2 className="text-2xl font-black mb-1">{activeEvent.message}</h2>
          {activeEvent.details && <p className="text-slate-400 text-sm font-medium">{activeEvent.details}</p>}
          
          {autoPauseMode === 'manual' && (
            <button onClick={() => { setActiveEvent(null); togglePlay(); }} className="mt-6 bg-white text-slate-900 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors">
              <Play className="w-4 h-4" /> Continuar
            </button>
          )}
        </div>
      )}

      {/* CHART AREA */}
      <div className="flex-1 relative p-6 pt-12 overflow-hidden">
        <div className="absolute left-[200px] top-6 bottom-6 right-[400px] border-l-2 border-slate-800">
          {/* Axis lines - just decorative */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-800/50" style={{ left: `${(i/5)*100}%` }}></div>
          ))}
        </div>

        <div className="relative w-full h-full">
          {users.map(user => {
            const scoreData = currentFrame.scores.find(s => s.uid === user.uid);
            if (!scoreData) return null;
            
            if (visiblePlayers !== 'all' && scoreData.rank > visiblePlayers) return null;

            const actualVisibleCount = visiblePlayers === 'all' ? users.length : visiblePlayers;
            
            // Usamos porcentajes para distribuir el espacio verticalmente
            const topPosition = `calc(${(scoreData.rank - 1) * 100 / actualVisibleCount}%)`;
            const barHeight = `calc(${100 / actualVisibleCount}% - 8px)`;
            
            // Calculamos el ancho relativo usando baseScore y scoreRange para magnificar diferencias
            const widthPercentage = maxScore > 0 ? Math.max(((scoreData.points - baseScore) / scoreRange) * 100, 1) : 1; 
            
            let streakEl = null;
            if (scoreData.streak >= 2) {
              const multiplier = scoreData.streak; // 2 in a row = 1 flame, 3 = x3, 4 = x4
              streakEl = (
                <div className="flex items-center gap-1 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                  {multiplier > 2 && <span className="text-xs font-black text-orange-400">x{multiplier}</span>}
                </div>
              );
            }

            const isBatacazoWinner = isBatacazoActive && batacazoNames.includes(scoreData.name);

            return (
              <div 
                key={user.uid}
                className="absolute left-0 flex items-center transition-all duration-700 ease-in-out"
                style={{
                  top: topPosition,
                  width: 'calc(100% - 600px)', // 200px izq (nombres) + 400px der (overlays)
                  height: barHeight,
                  zIndex: 20 - scoreData.rank // Los primeros arriba
                }}
              >
                {/* Nombre a la izquierda */}
                <div className="w-[180px] text-right pr-4 flex-shrink-0 flex items-center justify-end gap-2">
                  <span className={`text-sm font-bold truncate transition-colors ${isBatacazoWinner ? 'text-worldcup-pink drop-shadow-[0_0_8px_rgba(241,91,181,0.8)]' : 'text-slate-300'}`}>
                    {scoreData.name}
                  </span>
                </div>
                
                {/* Barra */}
                <div className="relative h-full flex items-center transition-all duration-700 ease-in-out" style={{ width: `${widthPercentage}%` }}>
                  <div 
                    className={`absolute inset-0 rounded-r-lg opacity-90 shadow-lg ${isBatacazoWinner ? 'border-2 border-worldcup-pink drop-shadow-[0_0_15px_rgba(241,91,181,0.8)] animate-pulse' : ''}`}
                    style={{ backgroundColor: scoreData.color }}
                  />
                  {/* Puntos numéricos y fueguito integrados a la derecha de la barra */}
                  <div className="absolute right-0 translate-x-full pl-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="flex items-center text-sm font-black drop-shadow-md bg-slate-900/60 px-2 py-0.5 rounded-lg border border-slate-800">
                      {Math.floor(scoreData.points)}
                      <span className="text-[10px] text-slate-400 font-normal">.{(scoreData.points % 1).toFixed(3).substring(2)}</span>
                    </div>
                    {streakEl}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TIMELINE CONTROLS */}
      <div className="h-24 bg-slate-900 border-t border-slate-800 p-4 flex flex-col justify-center gap-2 z-30 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1));
                if (activeEvent) setActiveEvent(null);
                if (isPlaying) setIsPlaying(false);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-12 h-12 bg-white hover:bg-slate-200 text-slate-950 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-1" />}
            </button>
            <button 
              onClick={() => {
                setCurrentFrameIndex(Math.min(frames.length - 1, currentFrameIndex + 1));
                if (activeEvent) setActiveEvent(null);
                if (isPlaying) setIsPlaying(false);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col gap-1">
             <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">
               <span>Partido 1</span>
               <span>{matchLabel}</span>
               <span>Partido {frames.length}</span>
             </div>
             <input 
              type="range" 
              min={0} 
              max={frames.length - 1} 
              value={currentFrameIndex}
              onChange={(e) => {
                setCurrentFrameIndex(parseInt(e.target.value));
                if (activeEvent) setActiveEvent(null);
                if (isPlaying) setIsPlaying(false);
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-worldcup-green hover:accent-worldcup-green/80"
             />
          </div>
        </div>
      </div>
    </div>
  );
}
