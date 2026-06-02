import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Usuario } from '../../models/types';
import { Medal, Trophy, Share2 } from 'lucide-react';

export default function Leaderboard() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const shareOnWhatsApp = () => {
    if (users.length === 0) return;
    
    let text = `🏆 *Tabla de Posiciones - Quiniela Mundial 2026* 🏆\n\n`;
    users.slice(0, 10).forEach((user, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      text += `${medal} *${user.displayName}* - ${user.totalPoints} pts\n`;
    });
    
    text += `\n¡Sigue y simula tus resultados aquí!\n${window.location.origin}`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), orderBy('totalPoints', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: Usuario[] = [];
      snapshot.forEach((doc) => {
        usersData.push(doc.data() as Usuario);
      });
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-slate-400 text-center py-8">Cargando posiciones...</div>;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-white">Tabla de Posiciones</h2>
        </div>
        {users.length > 0 && (
          <button
            onClick={shareOnWhatsApp}
            className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir en WhatsApp</span>
          </button>
        )}
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

          return (
            <div key={user.uid} className={`flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors ${rank <= 3 ? 'bg-slate-800/20' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex justify-center w-6">
                  {rankIcon}
                </div>
                <div className="flex flex-col">
                  <span className={`text-base ${rank <= 3 ? 'text-white font-medium' : 'text-slate-200'}`}>
                    {user.displayName}
                  </span>
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
    </div>
  );
}
