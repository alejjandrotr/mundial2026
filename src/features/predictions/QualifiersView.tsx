import { useState, useMemo, useEffect } from 'react';
import type { Partido, Usuario } from '../../models/types';
import { getCachedMatches, getCachedUsers, getCachedPredictions } from '../../utils/cache';
import { calculateAllGroupStandings, getBestThirdPlaceTeams, isGroupComplete } from '../../utils/standings';
import { Loader2, Users, Trophy, ChevronDown, Eye } from 'lucide-react';
import { getFlagUrl } from '../../utils/flags';
import GroupClosureFlyerModal from './GroupClosureFlyerModal';

export default function QualifiersView() {
  const [matches, setMatches] = useState<Partido[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [flyerGroup, setFlyerGroup] = useState<string | null>(null);

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  useEffect(() => {
    async function loadData() {
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
        if (usersData.length > 0) {
          setSelectedUserId(usersData[0].uid);
        }
      } catch (err) {
        console.error('Error loading qualifiers data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute Official Qualifiers
  const officialData = useMemo(() => {
    const getGoals = (matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (match && match.homeGoals !== null && match.awayGoals !== null) {
        return { homeGoals: match.homeGoals, awayGoals: match.awayGoals };
      }
      return null;
    };

    const standings = calculateAllGroupStandings(matches, groups, getGoals);
    const bestThirds = getBestThirdPlaceTeams(standings);
    
    const completedGroups = new Set(groups.filter(g => isGroupComplete(matches, g, getGoals)));
    const allGroupsComplete = completedGroups.size === groups.length;

    const qualifiers: { team: string; type: '1st' | '2nd' | '3rd'; group: string; isResolved: boolean }[] = [];
    const qualifierNames = new Set<string>();

    groups.forEach(g => {
      const groupStandings = standings[g];
      const isRes = completedGroups.has(g);
      if (groupStandings.length > 0 && groupStandings[0].played > 0) {
        qualifiers.push({ team: groupStandings[0].name, type: '1st', group: g, isResolved: isRes });
        qualifierNames.add(groupStandings[0].name);
      }
      if (groupStandings.length > 1 && groupStandings[1].played > 0) {
        qualifiers.push({ team: groupStandings[1].name, type: '2nd', group: g, isResolved: isRes });
        qualifierNames.add(groupStandings[1].name);
      }
    });

    bestThirds.slice(0, 8).forEach(t => {
      if (t.played > 0) {
        qualifiers.push({ team: t.name, type: '3rd', group: t.group, isResolved: allGroupsComplete });
        qualifierNames.add(t.name);
      }
    });

    return { standings, qualifiers, qualifierNames, allGroupsComplete, completedGroups };
  }, [matches]);

  // Compute User Qualifiers
  const userData = useMemo(() => {
    if (!selectedUserId) return null;
    const userPreds = predictions[selectedUserId] || {};

    const getGoals = (matchId: string) => {
      const pred = userPreds[matchId];
      if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
        return { homeGoals: pred.homeGoals, awayGoals: pred.awayGoals };
      }
      return null;
    };

    const standings = calculateAllGroupStandings(matches, groups, getGoals);
    const bestThirds = getBestThirdPlaceTeams(standings);

    const qualifiers: { team: string; type: '1st' | '2nd' | '3rd'; group: string }[] = [];
    const qualifierNames = new Set<string>();

    groups.forEach(g => {
      const groupStandings = standings[g];
      if (groupStandings.length > 0 && groupStandings[0].played > 0) {
        qualifiers.push({ team: groupStandings[0].name, type: '1st', group: g });
        qualifierNames.add(groupStandings[0].name);
      }
      if (groupStandings.length > 1 && groupStandings[1].played > 0) {
        qualifiers.push({ team: groupStandings[1].name, type: '2nd', group: g });
        qualifierNames.add(groupStandings[1].name);
      }
    });

    bestThirds.slice(0, 8).forEach(t => {
      if (t.played > 0) {
        qualifiers.push({ team: t.name, type: '3rd', group: t.group });
        qualifierNames.add(t.name);
      }
    });

    return { standings, qualifiers, qualifierNames };
  }, [matches, predictions, selectedUserId]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <span>Cargando clasificados...</span>
      </div>
    );
  }

  const selectedUser = users.find(u => u.uid === selectedUserId);

  const getStatusColor = (userTeam: string, offTeam: string, isResolved: boolean) => {
    if (!userTeam) return 'bg-slate-800/50 text-slate-500 border-slate-700/50';
    if (!isResolved) return 'bg-slate-700/30 text-slate-300 border-slate-600/50'; // Gris
    
    // Si ya está resuelto:
    if (userTeam === offTeam) {
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.2)]'; // Dorado
    }
    if (officialData.qualifierNames.has(userTeam)) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'; // Verde
    }
    return 'bg-red-500/20 text-red-300 border-red-500/40'; // Rojo
  };

  const renderSlot = (title: string, type: '1st' | '2nd' | '3rd', group: string | null, offIndex: number | null) => {
    let offTeamObj;
    let userTeamObj;

    if (type === '3rd' && offIndex !== null) {
      const offThirds = officialData.qualifiers.filter(q => q.type === '3rd');
      offTeamObj = offThirds[offIndex];
      const userThirds = userData?.qualifiers.filter(q => q.type === '3rd') || [];
      userTeamObj = userThirds[offIndex];
    } else {
      offTeamObj = officialData.qualifiers.find(q => q.group === group && q.type === type);
      userTeamObj = userData?.qualifiers.find(q => q.group === group && q.type === type);
    }

    const offTeamName = offTeamObj?.team || 'Por definir';
    const userTeamName = userTeamObj?.team || 'Sin predicción';
    const isResolved = offTeamObj ? offTeamObj.isResolved : false;

    const colorClass = getStatusColor(userTeamObj?.team || '', offTeamObj?.team || '', isResolved);

    return (
      <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-700/50 bg-slate-800/40">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{title}</span>
        
        <div className="flex items-center gap-3">
          {/* Oficial */}
          <div className="flex-1">
            <div className="text-[9px] text-slate-500 mb-0.5">OFICIAL</div>
            <div className={`flex items-center gap-2 p-1.5 rounded-lg border border-slate-700/80 bg-slate-900/50 text-xs font-semibold ${isResolved ? 'text-white' : 'text-slate-400'}`}>
              {offTeamObj && getFlagUrl(offTeamName) ? (
                <img src={getFlagUrl(offTeamName)} alt="" className="w-4 h-3 object-cover rounded" />
              ) : <div className="w-4 h-3 bg-slate-800 rounded"></div>}
              <span className="truncate">{offTeamName}</span>
            </div>
          </div>

          {/* Predicción */}
          <div className="flex-1">
            <div className="text-[9px] text-slate-500 mb-0.5 truncate">{selectedUser?.displayName?.toUpperCase()}</div>
            <div className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs font-bold transition-all ${colorClass}`}>
              {userTeamObj && getFlagUrl(userTeamName) ? (
                <img src={getFlagUrl(userTeamName)} alt="" className="w-4 h-3 object-cover rounded" />
              ) : <div className="w-4 h-3 bg-slate-800/50 rounded"></div>}
              <span className="truncate">{userTeamName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
            <Trophy className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Clasificados a Dieciseisavos (Round of 32)</h2>
            <p className="text-slate-400 text-xs">Compara las clasificaciones oficiales con las predicciones de cada participante.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full md:w-64 pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-medium appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {users.map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1">Leyenda:</span>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40"></span>
          <span className="text-yellow-400 font-medium">Acierto Exacto (Equipo y Posición)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></span>
          <span className="text-emerald-400 font-medium">Clasificó (Otra posición)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40"></span>
          <span className="text-red-400 font-medium">No Clasificó</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-3 rounded bg-slate-700/30 border border-slate-600/50"></span>
          <span className="text-slate-400 font-medium">Aún no resuelto</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Grupos 1ros y 2dos */}
        {groups.map((g) => (
          <div key={g} className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-700/50 pb-2">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">Grupo {g}</span>
              <button 
                onClick={() => setFlyerGroup(g)}
                className="flex items-center gap-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 transition-colors"
                title="Ver predicciones de todos los jugadores"
              >
                <Eye className="w-3 h-3" /> Ver Flyer
              </button>
            </h3>
            {renderSlot(`1º Grupo ${g}`, '1st', g, null)}
            {renderSlot(`2º Grupo ${g}`, '2nd', g, null)}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-700/50 pb-2">
          <span className="bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 border border-blue-500/30">Mejores Terceros</span>
          <span className="text-xs text-slate-400 font-normal">Los 8 mejores equipos que quedaron en tercer lugar en sus grupos.</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <div key={`third-${index}`}>
              {renderSlot(`Mejor Tercero #${index + 1}`, '3rd', null, index)}
            </div>
          ))}
        </div>
      </div>

      {flyerGroup && (
        <GroupClosureFlyerModal
          group={flyerGroup}
          matches={matches}
          users={users}
          predictions={predictions}
          onClose={() => setFlyerGroup(null)}
        />
      )}
    </div>
  );
}
