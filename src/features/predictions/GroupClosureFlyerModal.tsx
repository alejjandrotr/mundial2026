import { useMemo, useRef, useState, useEffect } from 'react';
import { X, Trophy, Download, Smartphone, Monitor } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFlagUrl } from '../../utils/flags';
import type { Partido, Usuario } from '../../models/types';
import { abbreviateTeam } from './ComparisonGrid';
import { getAbbreviatedUserNames } from '../../utils/userNames';
import { calculateAllGroupStandings, getBestThirdPlaceTeams, isGroupComplete } from '../../utils/standings';

interface GroupClosureFlyerModalProps {
  group: string;
  matches: Partido[];
  users: Usuario[];
  predictions: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>;
  onClose: () => void;
}

export default function GroupClosureFlyerModal({
  group,
  matches,
  users,
  predictions,
  onClose,
}: GroupClosureFlyerModalProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [isVertical, setIsVertical] = useState(false);

  const groups = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(flyerRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0f172a',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `Resumen_Grupo_${group}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al exportar la imagen:', err);
    } finally {
      setDownloading(false);
    }
  };

  const userAbbreviations = useMemo(() => {
    return getAbbreviatedUserNames(users.map(u => u.displayName));
  }, [users]);

  // 1. Calcular Datos Oficiales
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
    const isResolved = isGroupComplete(matches, group, getGoals);

    const groupTeams = standings[group] || [];
    const bestThirdNames = new Set(bestThirds.slice(0, 8).map(t => t.name));

    return { groupTeams, bestThirdNames, isResolved };
  }, [matches, group, groups]);

  // 2. Calcular Datos de Todos los Usuarios
  const allUserData = useMemo(() => {
    const data: Record<string, { standings: any[], bestThirdNames: Set<string> }> = {};

    users.forEach(user => {
      const userPreds = predictions[user.uid] || {};
      const getGoals = (matchId: string) => {
        const pred = userPreds[matchId];
        if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
          return { homeGoals: pred.homeGoals, awayGoals: pred.awayGoals };
        }
        return null;
      };

      const userStandings = calculateAllGroupStandings(matches, groups, getGoals);
      const userBestThirds = getBestThirdPlaceTeams(userStandings);
      
      data[user.uid] = {
        standings: userStandings[group] || [],
        bestThirdNames: new Set(userBestThirds.slice(0, 8).map(t => t.name)),
      };
    });

    return data;
  }, [users, predictions, matches, groups, group]);

  // 3. Evaluar el color de una predicción
  const getPredictionColor = (
    predIndex: number, 
    offIndex: number, 
    userBestThirdNames: Set<string>, 
    teamName: string,
    isResolved: boolean
  ) => {
    if (!isResolved) return 'bg-slate-800/40 border-slate-700 text-slate-400';

    if (predIndex === offIndex) {
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
    }

    const officialQualified = offIndex === 0 || offIndex === 1 || (offIndex === 2 && officialData.bestThirdNames.has(teamName));
    const userQualified = predIndex === 0 || predIndex === 1 || (predIndex === 2 && userBestThirdNames.has(teamName));

    if (officialQualified && userQualified) {
      return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    }

    return 'bg-red-500/10 border-red-500/30 text-red-400/80';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity" onClick={onClose} />

      <div className={`relative w-full ${isVertical ? 'max-w-[500px]' : 'max-w-6xl'} max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 transition-all duration-300`}>
        {/* Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
              <Trophy className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">
                Resumen Grupo {group}
              </h2>
              <p className="text-xs text-slate-400">Predicciones y Resultados Finales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVertical(!isVertical)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer mr-1"
            >
              {isVertical ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-550 text-white text-xs font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Foto</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={flyerRef} className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900">
          
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6 border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40"></span>
              <span className="text-yellow-400 font-medium">Acertó Posición</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></span>
              <span className="text-emerald-400 font-medium">Clasificó en otra pos.</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded bg-red-500/10 border border-red-500/30"></span>
              <span className="text-red-400 font-medium">Falló clasificación</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs ml-4 border-l border-slate-700 pl-4">
              <span className="text-emerald-400 font-black">⭐</span>
              <span className="text-slate-400 font-medium">Su 3º Clasificaba</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-red-400 font-black">❌</span>
              <span className="text-slate-400 font-medium">Su 3º Eliminado</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            
            {!isVertical && (
              <div className="hidden lg:flex flex-row gap-4 mb-2">
                <div className="w-[200px] shrink-0"></div>
                <div className="flex-1 grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((pos) => (
                    <div key={pos} className="bg-slate-800/50 py-2 rounded-xl text-center border border-slate-700/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pronosticó {pos}º</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {officialData.groupTeams.slice(0, 4).map((offTeam, offIndex) => (
              <div key={offTeam.id} className="flex flex-col lg:flex-row gap-4 mb-4 lg:mb-0">
                
                {/* Official Team Row Header */}
                <div className={`w-full lg:w-[200px] shrink-0 flex items-center ${isVertical ? 'bg-slate-800/80 p-3 rounded-2xl mb-2' : 'bg-slate-800/30 p-4 rounded-2xl flex-col justify-center'} border border-slate-700/50 relative overflow-hidden group`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className={`flex items-center gap-3 z-10 ${!isVertical ? 'flex-col text-center' : 'w-full'}`}>
                    <span className="text-xs font-black text-slate-500 font-mono">{offIndex + 1}º</span>
                    <img src={getFlagUrl(offTeam.name)} alt="" className={`object-cover rounded-md shadow-md ring-1 ring-white/10 ${!isVertical ? 'w-14 h-10' : 'w-8 h-6'}`} />
                    <div className="flex flex-col">
                      <h3 className="font-black text-sm text-white">{offTeam.name}</h3>
                      {offIndex === 2 && (
                        <span className={`text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full ${officialData.bestThirdNames.has(offTeam.name) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                          {officialData.bestThirdNames.has(offTeam.name) ? '⭐ MEJOR 3º' : '❌ ELIMINADO'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Predictions Cells */}
                <div className={`flex-1 grid grid-cols-2 ${!isVertical ? 'lg:grid-cols-4' : ''} gap-3`}>
                  {[0, 1, 2, 3].map((predIndex) => {
                    // Buscar usuarios que pusieron a este equipo en predIndex
                    const usersInCell = users.filter(u => {
                      const uData = allUserData[u.uid];
                      if (!uData || uData.standings.length <= predIndex) return false;
                      return uData.standings[predIndex].name === offTeam.name;
                    });

                    return (
                      <div key={predIndex} className="bg-slate-800/20 rounded-2xl p-3 border border-slate-700/30 flex flex-col min-h-[100px]">
                        {isVertical && (
                          <div className="text-[9px] font-black uppercase text-slate-500 mb-2 border-b border-slate-700/50 pb-1 text-center">
                            Pronosticó {predIndex + 1}º
                          </div>
                        )}
                        
                        <div className="flex-1 flex flex-col justify-center gap-1.5 items-center">
                          {usersInCell.length === 0 ? (
                            <span className="text-[10px] text-slate-600 italic">Nadie</span>
                          ) : usersInCell.length <= 2 ? (
                            usersInCell.map(u => {
                              const colorClass = getPredictionColor(predIndex, offIndex, allUserData[u.uid].bestThirdNames, offTeam.name, officialData.isResolved);
                              const isThird = predIndex === 2;
                              const isUserBestThird = allUserData[u.uid].bestThirdNames.has(offTeam.name);
                              
                              return (
                                <div key={u.uid} className={`px-3 py-2 rounded-xl text-center w-full shadow-sm border transition-all flex flex-col items-center justify-center ${colorClass}`}>
                                  <span className={`${usersInCell.length === 1 ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'} font-black tracking-wide truncate max-w-full`} title={u.displayName}>
                                    {userAbbreviations[u.displayName] || u.displayName}
                                  </span>
                                  {isThird && (
                                    <span className="text-[10px] mt-0.5 font-bold flex items-center gap-1">
                                      {isUserBestThird ? <><span className="text-emerald-400">⭐</span> <span className="opacity-80">Clasificaba</span></> : <><span className="text-red-400">❌</span> <span className="opacity-80">Eliminado</span></>}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {usersInCell.map(u => {
                                const colorClass = getPredictionColor(predIndex, offIndex, allUserData[u.uid].bestThirdNames, offTeam.name, officialData.isResolved);
                                const isThird = predIndex === 2;
                                const isUserBestThird = allUserData[u.uid].bestThirdNames.has(offTeam.name);
                                
                                return (
                                  <div key={u.uid} className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${colorClass}`}>
                                    <span className="truncate max-w-[80px]" title={u.displayName}>{userAbbreviations[u.displayName] || u.displayName}</span>
                                    {isThird && (
                                      <span className="text-xs leading-none" title={isUserBestThird ? 'Su 3º Clasificaba' : 'Su 3º quedaba Eliminado'}>
                                        {isUserBestThird ? '⭐' : '❌'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
