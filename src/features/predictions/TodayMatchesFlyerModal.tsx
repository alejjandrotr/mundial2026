import { useMemo, useEffect, useRef, useState } from 'react';
import { X, Flame, Swords, Download, Loader2, Lock, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFlagUrl } from '../../utils/flags';
import type { Partido, Usuario } from '../../models/types';
import { abbreviateTeam } from './ComparisonGrid';
import { getMatchVenue } from '../../utils/venues';

interface PredictionData {
  homeGoals: number | null;
  awayGoals: number | null;
}

interface TodayMatchesFlyerModalProps {
  matches: Partido[];
  users: Usuario[];
  predictions: Record<string, Record<string, PredictionData>>;
  onClose: () => void;
  currentUserUid?: string;
  isLockedForOthers: boolean;
}

export default function TodayMatchesFlyerModal({
  matches,
  users,
  predictions,
  onClose,
  currentUserUid,
  isLockedForOthers
}: TodayMatchesFlyerModalProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Prevenir scroll en el body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Filtrar partidos de hoy (basado en la fecha del partido)
  const todayMatches = useMemo(() => {
    const todayStr = new Date('2026-06-11').toISOString().slice(0, 10);
    return matches.filter(m => {
      const matchDateStr = new Date(m.kickoffTime).toISOString().slice(0, 10);
      return matchDateStr === todayStr;
    });
  }, [matches]);

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
      link.download = `Partidos_de_Hoy_Resumen.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al exportar la imagen:', err);
    } finally {
      setDownloading(false);
    }
  };

  const getBatacazo = (matchId: string) => {
    let totalH = 0;
    let totalV = 0;
    let count = 0;
    const validPreds: { user: Usuario; pred: PredictionData }[] = [];

    for (const user of users) {
      const pred = predictions[user.uid]?.[matchId];
      if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
        if (isLockedForOthers && user.uid !== currentUserUid) {
          // Ignorar si está bloqueado por privacidad
        } else {
          totalH += pred.homeGoals;
          totalV += pred.awayGoals;
          count++;
          validPreds.push({ user, pred });
        }
      }
    }

    if (count === 0) return null;

    const avgH = totalH / count;
    const avgV = totalV / count;

    let maxDistance = -1;
    let batacazo: { user: Usuario; pred: PredictionData; distance: number } | null = null;

    for (const { user, pred } of validPreds) {
      const distance = Math.sqrt(Math.pow(pred.homeGoals! - avgH, 2) + Math.pow(pred.awayGoals! - avgV, 2));

      if (distance > maxDistance) {
        maxDistance = distance;
        batacazo = { user, pred, distance };
      } else if (distance === maxDistance && batacazo) {
        const totalGoals = pred.homeGoals! + pred.awayGoals!;
        const currentBatacazoGoals = batacazo.pred.homeGoals! + batacazo.pred.awayGoals!;
        if (totalGoals > currentBatacazoGoals) {
          batacazo = { user, pred, distance };
        }
      }
    }

    if (maxDistance === 0) return null;
    return batacazo;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Glows de fondo decorativos */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/20 blur-[120px] rounded-full pointer-events-none" />

        {/* Cabecera */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 p-2 rounded-xl border border-fuchsia-500/25">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                <span>Partidos de Hoy</span>
              </h2>
              <p className="text-xs text-slate-400">Resumen y sorpresas de la jornada</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading || todayMatches.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-650 hover:bg-emerald-550 text-white text-xs font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Exportar Foto</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Renderizable / Capturable */}
        <div className="flex-1 overflow-y-auto p-6 relative z-10 space-y-6">
          <div ref={flyerRef} className="p-6 bg-slate-900 rounded-2xl border border-slate-800/80 space-y-8 relative overflow-hidden">
            {/* Decoración del flyer exportable */}
            <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-30%] left-[-10%] w-[350px] h-[350px] bg-fuchsia-650/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Cabecera del Flyer */}
            <div className="text-center space-y-2 pb-4 border-b border-slate-800/60">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-fuchsia-500/20 rounded-full">
                <Flame className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase text-fuchsia-300 tracking-widest font-sans">Mundial 2026</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase bg-gradient-to-r from-white via-slate-100 to-slate-450 bg-clip-text text-transparent">
                🏆 Partidos de Hoy
              </h1>
              <p className="text-slate-400 text-xs font-medium font-mono">
                {new Date('2026-06-11').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Listado de Partidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {todayMatches.map(match => {
                const batacazo = getBatacazo(match.id);
                const isMatchLocked = isLockedForOthers && currentUserUid !== 'admin'; // locked for display
                const venue = getMatchVenue(match.group || 'A', match.homeTeam);

                return (
                  <div key={match.id} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between gap-5 hover:border-slate-800/60 transition-all shadow-lg backdrop-blur-sm">
                    {/* Equipos, banderas y grupo */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                        <span className="text-indigo-400">{venue.flag} {venue.country} • G{match.group}</span>
                        <span>
                          {new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS
                        </span>
                      </div>

                      {/* Enfrentamiento */}
                      <div className="flex items-center justify-between gap-2 px-2">
                        {/* Home Team */}
                        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
                          {getFlagUrl(match.homeTeam) ? (
                            <img src={getFlagUrl(match.homeTeam)} alt="" className="w-14 h-10 object-cover rounded-xl border border-slate-700/60 shadow-lg" />
                          ) : (
                            <div className="w-14 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-600">?</div>
                          )}
                          <span className="text-sm font-black text-white uppercase tracking-wide truncate max-w-[100px]">
                            {abbreviateTeam(match.homeTeam)}
                          </span>
                        </div>

                        {/* Versus Badge */}
                        <div className="px-3">
                          {match.status === 'pending' ? (
                            <span className="text-[10px] font-black text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full font-mono">VS</span>
                          ) : (
                            <div className="flex items-center gap-2 text-xl font-black text-white font-mono">
                              <span>{match.homeGoals}</span>
                              <span className="text-slate-750">-</span>
                              <span>{match.awayGoals}</span>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
                          {getFlagUrl(match.awayTeam) ? (
                            <img src={getFlagUrl(match.awayTeam)} alt="" className="w-14 h-10 object-cover rounded-xl border border-slate-700/60 shadow-lg" />
                          ) : (
                            <div className="w-14 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-600">?</div>
                          )}
                          <span className="text-sm font-black text-white uppercase tracking-wide truncate max-w-[100px]">
                            {abbreviateTeam(match.awayTeam)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* El Batacazo highlight */}
                    <div className="mt-2">
                      {isMatchLocked ? (
                        <div className="flex items-center justify-center gap-2 bg-slate-900/60 border border-slate-850 p-3 rounded-xl text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Pronósticos Protegidos</span>
                        </div>
                      ) : batacazo ? (
                        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-orange-500/30 p-3.5 rounded-xl space-y-1 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-[40px] h-[40px] bg-orange-500/10 blur-[15px] rounded-full pointer-events-none" />
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-orange-400">
                            <Flame className="w-3.5 h-3.5 fill-orange-500/20 text-orange-500 animate-pulse" />
                            <span>El Batacazo</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-0.5">
                            <span className="text-xs font-black text-slate-200 truncate max-w-[150px]">{batacazo.user.displayName}</span>
                            <span className="text-sm font-mono font-black text-orange-400 tracking-wider bg-slate-950/70 px-2 py-0.5 rounded-md border border-slate-800">
                              {batacazo.pred.homeGoals} - {batacazo.pred.awayGoals}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 bg-slate-900/40 border border-slate-850/50 p-3.5 rounded-xl text-slate-500">
                          <Swords className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Sin batacazos audaces</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {todayMatches.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm font-semibold">
                No hay partidos programados para el día de hoy.
              </div>
            )}

            {/* Footer del Flyer */}
            <div className="text-center pt-2 text-[10px] text-slate-650 font-bold uppercase tracking-widest font-mono">
              Quiniela Qatar vs Ecuador &copy; 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
