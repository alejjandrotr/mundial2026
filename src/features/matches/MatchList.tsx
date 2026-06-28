import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Partido, Usuario } from '../../models/types';
import { CalendarDays, Clock, PlayCircle, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { getFlagUrl } from '../../utils/flags';
import { getMatchVenue } from '../../utils/venues';
import { getCachedUsers, getCachedPredictions } from '../../utils/cache';
import { useAuth } from '../../context/AuthContext';
import MatchFlyerModal from '../predictions/MatchFlyerModal';
import TodayMatchesFlyerModal from '../predictions/TodayMatchesFlyerModal';

import { usePhase } from '../../context/PhaseContext';
import { isPrivacyEnabledForPhase } from '../../config/constants';

export default function MatchList() {
  const [matches, setMatches] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState<Usuario[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});
  const [selectedMatchForFlyer, setSelectedMatchForFlyer] = useState<Partido | null>(null);
  const [showTodayFlyer, setShowTodayFlyer] = useState(false);
  const { currentUser } = useAuth();
  const { activePhase } = usePhase();

  useEffect(() => {
    const q = query(collection(db, 'partidos'), orderBy('kickoffTime', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData: Partido[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        matchesData.push({
          ...data,
          // Handle Firestore Timestamp to JS Date
          kickoffTime: data.kickoffTime?.toDate ? data.kickoffTime.toDate() : new Date(data.kickoffTime)
        } as Partido);
      });
      setMatches(matchesData);
      setLoading(false);
    });

    // Fetch users and predictions for flyer modal
    Promise.all([getCachedUsers(), getCachedPredictions()])
      .then(([usersData, predictionsData]) => {
        setUsers(usersData);
        setPredictions(predictionsData);
      })
      .catch((err) => console.error('Error fetching cache data in MatchList:', err));

    return () => unsubscribe();
  }, []);

  const sortedUsers = useMemo(() => {
    if (!currentUser) return users;
    const currentIdx = users.findIndex(u => u.uid === currentUser.uid);
    if (currentIdx === -1) return users;
    const result = [...users];
    const [me] = result.splice(currentIdx, 1);
    return [me, ...result];
  }, [users, currentUser]);

  const isLockedForOthers = useMemo(() => {
    return isPrivacyEnabledForPhase(activePhase);
  }, [activePhase]);

  const phaseMatches = useMemo(() => matches.filter(m => (m.phase || 'grupos') === activePhase), [matches, activePhase]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return <div className="text-slate-400 text-center py-8">Cargando partidos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Próximos Partidos</h2>
        </div>
        
        <button
          onClick={() => setShowTodayFlyer(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/35 hover:to-fuchsia-600/35 text-fuchsia-350 border border-fuchsia-500/30 text-xs font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-fuchsia-950/10 cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <span>Partidos de Hoy (Flyer)</span>
        </button>
      </div>

      {phaseMatches.map((match) => {
        const venue = getMatchVenue(match.group || 'A', match.homeTeam);
        return (
          <div key={match.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm hover:border-slate-600/50 transition-colors">
            
            {/* Status Bar */}
            <div className="flex justify-between items-center mb-4 text-xs font-medium uppercase tracking-wider gap-2">
              <div className="flex items-center gap-4">
                {match.status === 'pending' && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isToday(match.kickoffTime) ? 'Hoy' : match.kickoffTime.toLocaleDateString([], { day: '2-digit', month: 'short' })}, {formatTime(match.kickoffTime)}</span>
                  </div>
                )}
                {match.status === 'in_progress' && (
                  <div className="flex items-center gap-1.5 text-red-400 animate-pulse">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>En Vivo</span>
                  </div>
                )}
                {match.status === 'finished' && (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finalizado</span>
                  </div>
                )}
              </div>

              {/* Venue Badge */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
                <span>{venue.flag}</span>
                <span className="font-semibold text-slate-300 font-sans normal-case">{venue.city}, {venue.country}</span>
              </div>
            </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              {getFlagUrl(match.homeTeam) && (
                <img src={getFlagUrl(match.homeTeam)} alt="" className="w-12 h-9 object-cover rounded-lg border border-slate-700/60 shadow-md flex-shrink-0" />
              )}
              <div className="text-sm md:text-base font-extrabold text-white tracking-wide truncate max-w-[120px] sm:max-w-none">{match.homeTeam}</div>
            </div>
            
            <div className="px-4 flex items-center justify-center">
              {match.status === 'pending' ? (
                <div className="text-slate-500 font-bold text-sm bg-slate-900/60 border border-slate-700/40 px-3 py-1 rounded-full font-mono tracking-wider">VS</div>
              ) : (
                <div className="flex items-center gap-3 text-3xl font-black text-white">
                  <span className={match.homeGoals! > match.awayGoals! ? 'text-emerald-400' : ''}>{match.homeGoals}</span>
                  <span className="text-slate-600">-</span>
                  <span className={match.awayGoals! > match.homeGoals! ? 'text-emerald-400' : ''}>{match.awayGoals}</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              {getFlagUrl(match.awayTeam) && (
                <img src={getFlagUrl(match.awayTeam)} alt="" className="w-12 h-9 object-cover rounded-lg border border-slate-700/60 shadow-md flex-shrink-0" />
              )}
              <div className="text-sm md:text-base font-extrabold text-white tracking-wide truncate max-w-[120px] sm:max-w-none">{match.awayTeam}</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-5 text-center">
            <button
              onClick={() => setSelectedMatchForFlyer(match)}
              className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/35 hover:to-fuchsia-600/35 text-fuchsia-300 border border-fuchsia-500/35 text-[11px] font-bold py-2 px-5 rounded-lg transition-all transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-1.5 w-full sm:w-auto mx-auto cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Ver Pronósticos</span>
            </button>
          </div>

          </div>
        );
      })}

      {phaseMatches.length === 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-400">
          No hay partidos programados.
        </div>
      )}

      {selectedMatchForFlyer && (
        <MatchFlyerModal 
          match={selectedMatchForFlyer}
          users={sortedUsers}
          predictions={predictions}
          onClose={() => setSelectedMatchForFlyer(null)}
          currentUserUid={currentUser?.uid}
          isLockedForOthers={isLockedForOthers}
        />
      )}

      {showTodayFlyer && (
        <TodayMatchesFlyerModal
          matches={phaseMatches}
          users={sortedUsers}
          predictions={predictions}
          onClose={() => setShowTodayFlyer(false)}
          currentUserUid={currentUser?.uid}
          isLockedForOthers={isLockedForOthers}
        />
      )}
    </div>
  );
}
