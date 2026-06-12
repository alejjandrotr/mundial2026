import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Usuario, Partido } from '../../models/types';
import { Medal, Trophy, Share2, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { calculateMatchPoints } from '../../utils/scoring';
import { toTitleCase } from '../../utils/format';

export default function Leaderboard() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [predictionsCount, setPredictionsCount] = useState<Record<string, number>>({});

  const shareOnWhatsApp = () => {
    if (users.length === 0) return;

    let text = `🏆 *Tabla de Posiciones - Quiniela Mundial 2026* 🏆\n\n`;
    users.slice(0, 20).forEach((user, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      text += `${medal} *${user.displayName.trim()}* - ${user.totalPoints} pts\n`;
    });

    text += `\n¡Sigue y simula tus resultados aquí!\n${window.location.origin}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareTodaySummary = async () => {
    if (users.length === 0) return;

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
      users.forEach(u => {
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
          user: users.find(u => u.uid === uid),
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

      text += `\n🏆 *Tabla General Acumulada:* \n`;
      users.slice(0, 10).forEach((user, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        text += `${medal} *${user.displayName.trim()}* - ${user.totalPoints} pts\n`;
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
    // 1. Fetch total matches count once
    getDocs(collection(db, 'partidos'))
      .then((snapshot) => {
        setTotalMatches(snapshot.size);
      })
      .catch((err) => console.error('Error fetching matches count:', err));

    // 2. Listen to users
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

    // 3. Listen to predictions to calculate completion counts
    const unsubscribePreds = onSnapshot(collection(db, 'predicciones'), (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const homeG = data.homeGoals;
        const awayG = data.awayGoals;
        // Count as filled if both values are valid numbers or strings and not empty/null
        if (homeG !== null && awayG !== null && homeG !== '' && awayG !== '') {
          counts[data.usuarioId] = (counts[data.usuarioId] || 0) + 1;
        }
      });
      setPredictionsCount(counts);
    });

    return () => {
      unsubscribeUsers();
      unsubscribePreds();
    };
  }, []);

  if (loading) {
    return <div className="text-slate-400 text-center py-8">Cargando posiciones...</div>;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-bold text-white">Tabla de Posiciones</h2>
      </div>

      <div className="divide-y divide-slate-700/30">
        {users.map((user, index) => {
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

          const predCount = predictionsCount[user.uid] || 0;
          let badge = null;
          if (totalMatches > 0) {
            if (predCount === 0) {
              badge = (
                <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full" title="No ha llenado la quiniela">
                  <AlertCircle className="w-3 h-3" />
                  <span>0/{totalMatches}</span>
                </span>
              );
            } else if (predCount < totalMatches) {
              badge = (
                <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full" title="Quiniela parcialmente llena">
                  <Clock className="w-3 h-3" />
                  <span>{predCount}/{totalMatches}</span>
                </span>
              );
            } else {
              badge = (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full" title="Quiniela completa">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Listo</span>
                </span>
              );
            }
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
              <div className="flex items-baseline gap-1">
                <span className={`text-xl ${rank <= 3 ? rankColor : 'text-emerald-400 font-semibold'}`}>
                  {user.totalPoints}
                </span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">pts</span>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Aún no hay participantes registrados.
          </div>
        )}
      </div>

      {users.length > 0 && (
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
    </div>
  );
}
