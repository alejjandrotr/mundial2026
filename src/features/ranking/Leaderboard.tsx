import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Usuario, Partido } from '../../models/types';
import { Trophy, Share2, Calendar, ArrowUp, ArrowDown, Minus, Info, Medal } from 'lucide-react';
import { toTitleCase } from '../../utils/format';
import { usePhase } from '../../context/PhaseContext';
import HelpModal from '../../components/HelpModal';

export default function Leaderboard() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Partido[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});
  const [showHelp, setShowHelp] = useState(false);
  const { activePhase, availablePhases } = usePhase();

  // Calcular aciertos exactos e individuales de goles de cada usuario en base a partidos jugados y predicciones reales
  const computedUsers = useMemo(() => {
    const phaseMatches = matches.filter(m => (m.phase || 'grupos') === activePhase);

    const calculated = users.map(user => {
      const userPreds = predictions[user.uid] || {};
      let exactHits = 0;
      let goalHits = 0;
      phaseMatches.forEach(match => {
        if (match.status === 'finished' && match.homeGoals !== null && match.awayGoals !== null) {
          const pred = userPreds[match.id];
          if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
            // Acierto exacto de marcador
            if (pred.homeGoals === match.homeGoals && pred.awayGoals === match.awayGoals) {
              exactHits++;
            }
            // Aciertos individuales de goles (goles de local y/o goles de visitante)
            if (pred.homeGoals === match.homeGoals) goalHits++;
            if (pred.awayGoals === match.awayGoals) goalHits++;
          }
        }
      });
      
      const phaseTotalPoints = activePhase === 'grupos' 
        ? (user.phaseStats?.[activePhase]?.totalPoints ?? user.totalPoints) 
        : (user.phaseStats?.[activePhase]?.totalPoints ?? 0);

      return {
        ...user,
        displayPoints: phaseTotalPoints,
        exactHits,
        goalHits
      };
    });

    // Ordenar por puntos (desc) y luego por aciertos de goles individuales (desc) como desempate
    return calculated.sort((a, b) => {
      if (b.displayPoints !== a.displayPoints) {
        return b.displayPoints - a.displayPoints;
      }
      if (b.goalHits !== a.goalHits) {
        return b.goalHits - a.goalHits;
      }
      // Empate total: usar los puntos globales para mantener estabilidad visual
      const totalB = b.totalPoints || 0;
      const totalA = a.totalPoints || 0;
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      // Orden alfabético si todo es igual
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [users, matches, predictions, activePhase]);

  const shareOnWhatsApp = () => {
    if (computedUsers.length === 0) return;

    const phaseLabel = availablePhases.find(p => p.id === activePhase)?.label || activePhase;
    let text = `🏆 *Tabla de Posiciones - Quiniela Mundial 2026 (${phaseLabel})* 🏆\n\n`;
    computedUsers.slice(0, 20).forEach((user, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      text += `${medal} *${user.displayName.trim()}* - ${user.displayPoints} pts (${user.goalHits} AG, ${user.exactHits} ME)\n`;
    });

    text += `\n*AG: Acierto de Goles (Desempate)\n*ME: Marcadores Exactos (Top alternativo)\n\n¡Sigue y simula tus resultados aquí!\n${window.location.origin}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareTodaySummary = async () => {
    if (computedUsers.length === 0) return;

    try {
      // 1. Fetch matches
      const matchesSnap = await getDocs(collection(db, 'partidos'));
      const allMatches: Partido[] = [];
      matchesSnap.forEach(docSnap => {
        const data = docSnap.data();
        allMatches.push({
          ...data,
          kickoffTime: data.kickoffTime?.toDate ? data.kickoffTime.toDate() : new Date(data.kickoffTime)
        } as Partido);
      });

      const finishedMatches = allMatches.filter(m => m.status === 'finished');
      if (finishedMatches.length === 0) {
        alert("No hay partidos finalizados para generar el resumen de la jornada.");
        return;
      }

      // Group by date to find the latest match day
      const matchesByDate: Record<string, Partido[]> = {};
      finishedMatches.forEach(m => {
        const d = new Date(m.kickoffTime);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!matchesByDate[dateStr]) matchesByDate[dateStr] = [];
        matchesByDate[dateStr].push(m);
      });

      const dates = Object.keys(matchesByDate).sort();
      const latestDateStr = dates[dates.length - 1];
      const targetMatches = matchesByDate[latestDateStr];

      // 2. Fetch predictions for these matches
      const predQuery = query(
        collection(db, 'predicciones'),
        where('partidoId', 'in', targetMatches.map(m => m.id))
      );
      const predictionsSnap = await getDocs(predQuery);

      const userTodayPoints: Record<string, number> = {};
      computedUsers.forEach(u => {
        userTodayPoints[u.uid] = 0;
      });

      predictionsSnap.forEach(docSnap => {
        const p = docSnap.data();
        const match = targetMatches.find(m => m.id === p.partidoId);
        if (match && p.homeGoals !== null && p.awayGoals !== null) {
          const scoreResult = calculateMatchPoints(p.homeGoals, p.awayGoals, match.homeGoals, match.awayGoals);
          if (scoreResult.points > 0) {
            userTodayPoints[p.usuarioId] = (userTodayPoints[p.usuarioId] || 0) + scoreResult.points;
          }
        }
      });

      // Format date for display
      const sampleDate = new Date(targetMatches[0].kickoffTime);
      const formattedDate = sampleDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      let text = `📅 *Resumen de la Jornada (${formattedDate}) - Quiniela Mundial 2026* 📅\n\n`;
      text += `⚽ *Partidos:* \n`;
      targetMatches.forEach(m => {
        text += `• ${m.homeTeam} ${m.homeGoals} - ${m.awayGoals} ${m.awayTeam}\n`;
      });

      text += `\n🔥 *Puntos Ganados Hoy (Aciertos):* \n`;

      const sortedToday = Object.entries(userTodayPoints)
        .map(([uid, pts]) => ({
          user: computedUsers.find(u => u.uid === uid),
          points: pts
        }))
        .filter(item => item.user && item.points > 0)
        .sort((a, b) => b.points - a.points);

      if (sortedToday.length === 0) {
        text += `Ningún participante sumó puntos en esta jornada.\n`;
      } else {
        sortedToday.forEach((item, idx) => {
          text += `${idx + 1}. *${item.user!.displayName.trim()}* : +${item.points} pts\n`;
        });
      }

      text += `\n🏆 *Tabla Acumulada (${activePhase}):* \n`;
      computedUsers.slice(0, 10).forEach((user, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        text += `${medal} *${user.displayName.trim()}* - ${user.displayPoints} pts (${user.goalHits} AG, ${user.exactHits} ME)\n`;
      });

      text += `\n¡Sigue y simula tus resultados aquí!\n${window.location.origin}`;

      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error("Error al generar resumen:", err);
      alert("Hubo un error al generar el resumen de la jornada.");
    }
  };

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
    const q = query(collection(db, 'usuarios'), orderBy('totalPoints', 'desc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const usersData: Usuario[] = [];
      snapshot.forEach((doc) => {
        const u = doc.data() as Usuario;
        if (u.displayName) {
          u.displayName = toTitleCase(u.displayName);
        }
        usersData.push(u);
      });
      setUsers(usersData);
      setLoading(false);
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
    });

    return () => {
      unsubscribeMatches();
      unsubscribeUsers();
      unsubscribePreds();
    };
  }, []);

  // Calcular cambios de puestos desde el último partido finalizado
  const rankDifferences = useMemo(() => {
    const diffs: Record<string, number> = {};
    if (computedUsers.length === 0) return diffs;

    // Inicializar diferencias en 0
    computedUsers.forEach(u => {
      diffs[u.uid] = 0;
    });

    // 1. Obtener partidos terminados de la fase, ordenados de más reciente a más antiguo
    const phaseMatches = matches.filter(m => (m.phase || 'grupos') === activePhase);
    const finishedMatches = phaseMatches
      .filter(m => m.status === 'finished')
      .sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());

    if (finishedMatches.length === 0) {
      return diffs;
    }

    // 2. El último partido finalizado es la referencia
    const latestMatch = finishedMatches[0];

    // 3. Calcular los puntos y aciertos previos al último partido finalizado para cada usuario
    const prevUserData = computedUsers.map(user => {
      const userPreds = predictions[user.uid] || {};
      const pred = userPreds[latestMatch.id];
      let lastMatchPoints = 0;
      let lastMatchGoalHits = 0;
      let lastMatchExactHit = 0;
      
      if (
        pred && 
        pred.homeGoals !== null && 
        pred.awayGoals !== null && 
        latestMatch.homeGoals !== null && 
        latestMatch.awayGoals !== null
      ) {
        const scoreResult = calculateMatchPoints(
          pred.homeGoals, 
          pred.awayGoals, 
          latestMatch.homeGoals, 
          latestMatch.awayGoals
        );
        lastMatchPoints = scoreResult.points;
        if (pred.homeGoals === latestMatch.homeGoals) lastMatchGoalHits++;
        if (pred.awayGoals === latestMatch.awayGoals) lastMatchGoalHits++;
        if (pred.homeGoals === latestMatch.homeGoals && pred.awayGoals === latestMatch.awayGoals) {
          lastMatchExactHit = 1;
        }
      }
      return {
        uid: user.uid,
        prevPoints: user.displayPoints - lastMatchPoints,
        prevGoalHits: (user.goalHits || 0) - lastMatchGoalHits,
        prevExactHits: (user.exactHits || 0) - lastMatchExactHit
      };
    });

    // 4. Ordenar usuarios según los puntos previos para obtener el ranking anterior
    const sortedPrev = [...prevUserData].sort((a, b) => {
      if (b.prevPoints !== a.prevPoints) {
        return b.prevPoints - a.prevPoints;
      }
      return b.prevGoalHits - a.prevGoalHits;
    });

    // 5. Comparar el puesto actual con el puesto anterior
    computedUsers.forEach((user, currentIdx) => {
      const currentRank = currentIdx + 1;
      const prevRankIdx = sortedPrev.findIndex(u => u.uid === user.uid);
      const prevRank = prevRankIdx !== -1 ? prevRankIdx + 1 : currentRank;
      
      // Si prevRank era 5 (puesto peor) y currentRank es 3 (puesto mejor), la diferencia es 5 - 3 = +2 (subió 2 puestos)
      diffs[user.uid] = prevRank - currentRank;
    });

    return diffs;
  }, [matches, predictions, computedUsers]);

  if (loading) {
    return <div className="text-slate-400 text-center py-8">Cargando posiciones...</div>;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-white">Tabla de Posiciones ({availablePhases.find(p => p.id === activePhase)?.label})</h2>
          <button 
            onClick={() => setShowHelp(true)}
            className="ml-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 p-1.5 rounded-full transition-colors cursor-pointer"
            title="Ver sistema de puntuación"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-sky-400 bg-sky-950/30 px-2 py-0.5 rounded border border-sky-500/20 font-semibold">
            AG: Acierto de Goles (Desempate)
          </span>
          <span className="text-[10px] text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
            ME: Marcador Exacto (Top)
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-700/30">
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
            rankIcon = <span className={`w-5 text-center font-mono text-sm ${rankColor}`}>{rank}</span>;
          }

          const rankDiff = rankDifferences[user.uid] || 0;
          let badge = null;
          if (rankDiff > 0) {
            badge = (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title={`Subió ${rankDiff} puesto(s) desde el último partido`}>
                <ArrowUp className="w-2.5 h-2.5" />
                <span>{rankDiff}</span>
              </span>
            );
          } else if (rankDiff < 0) {
            badge = (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20" title={`Bajó ${Math.abs(rankDiff)} puesto(s) desde el último partido`}>
                <ArrowDown className="w-2.5 h-2.5" />
                <span>{Math.abs(rankDiff)}</span>
              </span>
            );
          } else {
            badge = (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700/50" title="Mantuvo su puesto desde el último partido">
                <Minus className="w-2.5 h-2.5" />
                <span>0</span>
              </span>
            );
          }

          return (
            <div key={user.uid} className={`flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors ${rank <= 3 ? 'bg-slate-800/20' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex justify-center w-6">
                  {rankIcon}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base ${rank <= 3 ? 'text-white font-medium' : 'text-slate-200'}`}>
                      {user.displayName}
                    </span>
                    {badge}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1 text-right">
                  <span className={`text-xl ${rank <= 3 ? rankColor : 'text-emerald-400 font-semibold'}`}>
                    {user.displayPoints}
                  </span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">pts</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/40 min-w-[44px]" title="Aciertos de goles individuales (Criterio de desempate)">
                  <span className="text-xs font-bold text-sky-400">{user.goalHits}</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">AG</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-900/40 px-2 py-0.5 rounded border border-slate-700/20 min-w-[44px]" title="Marcadores exactos acertados (Top alternativo)">
                  <span className="text-xs font-bold text-amber-500">{user.exactHits}</span>
                  <span className="text-[8px] text-slate-450 font-bold uppercase tracking-tight">ME</span>
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

      {computedUsers.length > 0 && (
        <div className="bg-slate-900/60 p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={shareTodaySummary}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 py-2.5 px-4 rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-md"
          >
            <Calendar className="w-4 h-4" />
            <span>Compartir Resumen del Día</span>
          </button>
          <button
            onClick={shareOnWhatsApp}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-2.5 px-4 rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-md"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir Tabla General</span>
          </button>
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
