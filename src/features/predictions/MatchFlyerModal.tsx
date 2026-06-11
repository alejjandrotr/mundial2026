import { useMemo, useEffect, useRef, useState } from 'react';
import { X, Flame, Swords, ShieldAlert, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFlagUrl } from '../../utils/flags';
import type { Partido, Usuario } from '../../models/types';
import { abbreviateTeam } from './ComparisonGrid';
import { getAbbreviatedUserNames } from '../../utils/userNames';
import { getMatchVenue } from '../../utils/venues';

interface PredictionData {
  homeGoals: number | null;
  awayGoals: number | null;
}

interface MatchFlyerModalProps {
  match: Partido;
  users: Usuario[];
  predictions: Record<string, Record<string, PredictionData>>;
  onClose: () => void;
  currentUserUid?: string;
  isLockedForOthers: boolean;
}

export default function MatchFlyerModal({
  match,
  users,
  predictions,
  onClose,
  currentUserUid,
  isLockedForOthers
}: MatchFlyerModalProps) {

  const flyerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Prevenir scroll en el body cuando el modal está abierto
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
        pixelRatio: 2, // Mejor resolución
        backgroundColor: '#0f172a', // slate-900 para que coincida
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `Resumen_${match.homeTeam}_vs_${match.awayTeam}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al exportar la imagen:', err);
    } finally {
      setDownloading(false);
    }
  };

  const stats = useMemo(() => {
    let totalH = 0;
    let totalV = 0;
    let count = 0;

    const validPreds: { user: Usuario, pred: PredictionData }[] = [];

    users.forEach(user => {
      const pred = predictions[user.uid]?.[match.id];
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
    });

    if (count === 0) {
      return { homeBet: [] as typeof validPreds, awayBet: [] as typeof validPreds, drawBet: [] as typeof validPreds, batacazo: null as { user: Usuario, pred: PredictionData, distance: number } | null, avgH: 0, avgV: 0, validCount: 0 };
    }

    const avgH = totalH / count;
    const avgV = totalV / count;

    let homeBet: typeof validPreds = [];
    let awayBet: typeof validPreds = [];
    let drawBet: typeof validPreds = [];

    let maxDistance = -1;
    let batacazo: { user: Usuario, pred: PredictionData, distance: number } | null = null;

    validPreds.forEach(({ user, pred }) => {
      if (pred.homeGoals! > pred.awayGoals!) homeBet.push({ user, pred });
      else if (pred.homeGoals! < pred.awayGoals!) awayBet.push({ user, pred });
      else drawBet.push({ user, pred });

      // Cálculo de distancia euclidiana
      const distance = Math.sqrt(Math.pow(pred.homeGoals! - avgH, 2) + Math.pow(pred.awayGoals! - avgV, 2));

      if (distance > maxDistance) {
        maxDistance = distance;
        batacazo = { user, pred, distance };
      } else if (distance === maxDistance && batacazo) {
        // Desempate: mayor cantidad total de goles pronosticados
        const totalGoals = pred.homeGoals! + pred.awayGoals!;
        const currentBatacazoGoals = batacazo.pred.homeGoals! + batacazo.pred.awayGoals!;
        if (totalGoals > currentBatacazoGoals) {
          batacazo = { user, pred, distance };
        }
      }
    });

    homeBet.sort((a, b) => (b.pred.homeGoals! - a.pred.homeGoals!) || (a.pred.awayGoals! - b.pred.awayGoals!));
    awayBet.sort((a, b) => (b.pred.awayGoals! - a.pred.awayGoals!) || (a.pred.homeGoals! - b.pred.homeGoals!));
    drawBet.sort((a, b) => (b.pred.homeGoals! - a.pred.homeGoals!));

    // Si todos predijeron exactamente lo mismo, no hay un "batacazo" destacable
    if (maxDistance === 0) batacazo = null;

    return { homeBet, awayBet, drawBet, batacazo, avgH, avgV, validCount: count };
  }, [match.id, users, predictions, isLockedForOthers, currentUserUid]);

  const userAbbreviations = useMemo(() => {
    return getAbbreviatedUserNames(users.map(u => u.displayName));
  }, [users]);

  const flagH = getFlagUrl(match.homeTeam);
  const flagV = getFlagUrl(match.awayTeam);
  const nameH = match.homeTeam;
  const nameV = match.awayTeam;

  const venue = getMatchVenue(match.group || 'A', match.homeTeam);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor principal del Flyer */}
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">

        {/* Glows de fondo decorativos */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />

        {/* Cabecera del Flyer */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
              <Swords className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">
                {abbreviateTeam(nameH)} <span className="text-slate-500 font-medium px-2">VS</span> {abbreviateTeam(nameV)}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-450 font-mono mt-0.5">
                <span>Grupo {match.group}</span>
                <span className="text-slate-600">•</span>
                <span>{new Date(match.kickoffTime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-400 font-bold">{new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-350">{venue.flag} {venue.country} ({venue.city})</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-550 text-white text-xs font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer"
              title="Descargar como imagen"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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

        {/* Contenido scrolleable / Capturable */}
        <div ref={flyerRef} className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-900">

          {stats.validCount === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <ShieldAlert className="w-12 h-12 text-slate-600 mb-2" />
              <p className="text-center font-medium">No hay predicciones visibles para este encuentro.</p>
              {isLockedForOthers && (
                <p className="text-xs text-slate-400 max-w-xs text-center">
                  Las predicciones están ocultas por reglas de juego limpio.
                </p>
              )}
            </div>
          ) : (
            <>
              {stats.batacazo && (
                <div className="relative mx-auto max-w-md bg-gradient-to-r from-orange-500/20 via-red-500/20 to-purple-500/20 p-0.5 rounded-2xl">
                  <div className="bg-slate-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3 backdrop-blur-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-5 h-5 animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                          El Batacazo
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-medium">
                        Promedio general: {stats.avgH.toFixed(1)} - {stats.avgV.toFixed(1)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex-shrink-0">
                      <span className="text-xs font-black text-slate-100 tracking-tight">
                        {stats.batacazo.user.displayName}
                      </span>
                      <div className="flex items-center gap-1 text-xl font-black font-mono tracking-tighter bg-red-500/10 px-2 py-0.5 rounded text-orange-400 border border-red-500/20">
                        <span>{stats.batacazo.pred.homeGoals}</span>
                        <span>-</span>
                        <span>{stats.batacazo.pred.awayGoals}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Columnas de Predicciones */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Columna Equipo A */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-center bg-slate-800/20 p-3 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {flagH && <img src={flagH} alt={nameH} className="w-16 h-10 object-cover rounded-lg shadow-md mb-2 ring-1 ring-white/10" />}
                    <h3 className="font-black text-sm text-center text-white">{nameH}</h3>
                    <span className="text-[10px] font-bold text-slate-450 mt-1 uppercase tracking-widest bg-slate-950/40 px-2 py-0.5 rounded-full">
                      {stats.homeBet.length} Votos
                    </span>
                  </div>

                  <div className="bg-slate-800/10 rounded-xl p-2.5 flex-1 overflow-y-auto max-h-[40vh] custom-scrollbar flex flex-col justify-center">
                    {stats.homeBet.length <= 3 ? (
                      <div className="flex flex-col gap-3 justify-center items-center py-4 h-full min-h-[140px]">
                        {stats.homeBet.map(({ user, pred }) => (
                          <div key={user.uid} className="flex flex-col items-center justify-center bg-slate-950/30 px-4 py-3 rounded-xl hover:border-slate-600/30 transition-all border border-transparent w-full max-w-[200px] text-center gap-1.5 shadow-sm">
                            {stats.homeBet.length <= 1 ? (<span className="text-xs sm:text-2xl font-black text-slate-100 tracking-wide">{user.displayName}</span>) : (<span className="text-xs sm:text-lg font-black text-slate-100 tracking-wide">{user.displayName}</span>)}
                            <div className="flex items-center gap-2 font-black font-mono text-base sm:text-lg">
                              <span className="text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded">{pred.homeGoals}</span>
                              <span className="text-slate-600 text-xs">-</span>
                              <span className="text-slate-400 bg-slate-950/40 px-2 py-0.5 rounded">{pred.awayGoals}</span>
                            </div>
                          </div>
                        ))}
                        {stats.homeBet.length === 0 && (
                          <div className="text-center text-slate-600 text-[10px] italic py-2">Nadie apostó aquí</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 justify-start">
                        {stats.homeBet.map(({ user, pred }) => (
                          <div key={user.uid} className="flex items-center gap-1.5 bg-slate-950/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-350 hover:bg-slate-950/50 transition-colors">
                            <span className="truncate max-w-[100px]" title={user.displayName}>{userAbbreviations[user.displayName] || user.displayName}</span>
                            <span className="flex items-center gap-0.5 font-mono text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded-full">
                              {pred.homeGoals}-{pred.awayGoals}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Empate */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-center justify-center bg-slate-800/10 p-3 rounded-2xl h-[106px]">
                    <div className="text-slate-500 font-black text-3xl mb-1 opacity-50">=</div>
                    <h3 className="font-black text-sm text-center text-slate-400">EMPATE</h3>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest bg-slate-950/40 px-2 py-0.5 rounded-full">
                      {stats.drawBet.length} Votos
                    </span>
                  </div>

                  <div className="bg-slate-800/10 rounded-xl p-2.5 flex-1 overflow-y-auto max-h-[40vh] custom-scrollbar flex flex-col justify-center">
                    {stats.drawBet.length <= 3 ? (
                      <div className="flex flex-col gap-3 justify-center items-center py-4 h-full min-h-[140px]">
                        {stats.drawBet.map(({ user, pred }) => (
                          <div key={user.uid} className="flex flex-col items-center justify-center bg-slate-950/30 px-4 py-3 rounded-xl hover:border-slate-600/30 transition-all border border-transparent w-full max-w-[200px] text-center gap-1.5 shadow-sm">
                            {stats.drawBet.length <= 1 ? (<span className="text-xs sm:text-2xl font-black text-slate-100 tracking-wide">{user.displayName}</span>) : (<span className="text-xs sm:text-lg font-black text-slate-100 tracking-wide">{user.displayName}</span>)}
                            <div className="flex items-center gap-2 font-black font-mono text-base sm:text-lg">
                              <span className="text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded">{pred.homeGoals}</span>
                              <span className="text-slate-650 text-xs">-</span>
                              <span className="text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded">{pred.awayGoals}</span>
                            </div>
                          </div>
                        ))}
                        {stats.drawBet.length === 0 && (
                          <div className="text-center text-slate-600 text-[10px] italic py-2">Nadie apostó aquí</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 justify-start">
                        {stats.drawBet.map(({ user, pred }) => (
                          <div key={user.uid} className="flex items-center gap-1.5 bg-slate-950/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-350 hover:bg-slate-950/50 transition-colors">
                            <span className="truncate max-w-[100px]" title={user.displayName}>{userAbbreviations[user.displayName] || user.displayName}</span>
                            <span className="flex items-center gap-0.5 font-mono text-[10px] font-extrabold bg-yellow-500/10 text-yellow-500 px-1.5 py-0.2 rounded-full">
                              {pred.homeGoals}-{pred.awayGoals}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Equipo B */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-center bg-slate-800/20 p-3 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {flagV && <img src={flagV} alt={nameV} className="w-16 h-10 object-cover rounded-lg shadow-md mb-2 ring-1 ring-white/10" />}
                    <h3 className="font-black text-sm text-center text-white">{nameV}</h3>
                    <span className="text-[10px] font-bold text-slate-450 mt-1 uppercase tracking-widest bg-slate-950/40 px-2 py-0.5 rounded-full">
                      {stats.awayBet.length} Votos
                    </span>
                  </div>

                  <div className="bg-slate-800/10 rounded-xl p-2.5 flex-1 overflow-y-auto max-h-[40vh] custom-scrollbar flex flex-col justify-center">
                    {stats.awayBet.length <= 3 ? (
                      <div className="flex flex-col gap-3 justify-center items-center py-4 h-full min-h-[140px]">
                        {stats.awayBet.map(({ user, pred }) => (
                          <div key={user.uid} className="flex flex-col items-center justify-center bg-slate-950/30 px-4 py-3 rounded-xl hover:border-slate-600/30 transition-all border border-transparent w-full max-w-[200px] text-center gap-1.5 shadow-sm">
                            {stats.awayBet.length <= 1 ? (<span className="text-xs sm:text-2xl font-black text-slate-100 tracking-wide">{user.displayName}</span>) : (<span className="text-xs sm:text-lg font-black text-slate-100 tracking-wide">{user.displayName}</span>)}
                            <div className="flex items-center gap-2 font-black font-mono text-base sm:text-lg">
                              <span className="text-slate-400 bg-slate-950/40 px-2 py-0.5 rounded">{pred.homeGoals}</span>
                              <span className="text-slate-600 text-xs">-</span>
                              <span className="text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded">{pred.awayGoals}</span>
                            </div>
                          </div>
                        ))}
                        {stats.awayBet.length === 0 && (
                          <div className="text-center text-slate-600 text-[10px] italic py-2">Nadie apostó aquí</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 justify-start">
                        {stats.awayBet.map(({ user, pred }) => (
                          <div key={user.uid} className="flex items-center gap-1.5 bg-slate-950/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-350 hover:bg-slate-950/50 transition-colors">
                            <span className="truncate max-w-[100px]" title={user.displayName}>{userAbbreviations[user.displayName] || user.displayName}</span>
                            <span className="flex items-center gap-0.5 font-mono text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded-full">
                              {pred.homeGoals}-{pred.awayGoals}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
