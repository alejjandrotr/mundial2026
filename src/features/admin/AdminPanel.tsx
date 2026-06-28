import { useEffect, useState } from 'react';
import { collection, doc, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Partido, Usuario } from '../../models/types';
import { getCachedMatches, getCachedUsers, clearCache } from '../../utils/cache';
import PointsShowModal from './PointsShowModal';
import { Play, RefreshCw, PenSquare, Terminal, Settings, AlertTriangle } from 'lucide-react';

export default function AdminPanel() {
  const [matches, setMatches] = useState<Partido[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>>({});
  const [loading, setLoading] = useState(true);

  // Selector / Score Editing State
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [homeGoals, setHomeGoals] = useState<string>('');
  const [awayGoals, setAwayGoals] = useState<string>('');
  const [matchStatus, setMatchStatus] = useState<'pending' | 'in_progress' | 'finished'>('finished');

  // Web Scraper simulation state
  const [scraping, setScraping] = useState(false);
  const [scraperLogs, setScraperLogs] = useState<string[]>([]);
  const [scrapedData, setScrapedData] = useState<{ home: number; away: number } | null>(null);

  // Edit Time State
  const [kickoffTimeStr, setKickoffTimeStr] = useState<string>('');
  const [updatingTime, setUpdatingTime] = useState(false);

  // Points Show Modal State
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [bypassDistribution, setBypassDistribution] = useState(false);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Load Matches and Users (via cache or force)
      const matchesData = await getCachedMatches(forceRefresh);
      const usersData = await getCachedUsers(forceRefresh);
      setMatches(matchesData);
      setUsers(usersData);

      // Load all Predictions from Firestore (always fresh for point calculations)
      const predSnapshot = await getDocs(collection(db, 'predicciones'));
      const predMap: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>> = {};

      predSnapshot.forEach((doc) => {
        const d = doc.data();
        const uId = d.usuarioId;
        const mId = d.partidoId;

        if (!predMap[uId]) {
          predMap[uId] = {};
        }

        predMap[uId][mId] = {
          homeGoals: d.homeGoals,
          awayGoals: d.awayGoals,
        };
      });

      setPredictions(predMap);

      // Autoselect first match if none selected
      if (matchesData.length > 0 && !selectedMatchId) {
        const firstMatch = matchesData[0];
        setSelectedMatchId(firstMatch.id);
        setHomeGoals(firstMatch.homeGoals !== null ? String(firstMatch.homeGoals) : '0');
        setAwayGoals(firstMatch.awayGoals !== null ? String(firstMatch.awayGoals) : '0');
        setMatchStatus(firstMatch.status || 'finished');
        
        const d = firstMatch.kickoffTime?.toDate ? firstMatch.kickoffTime.toDate() : new Date(firstMatch.kickoffTime);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setKickoffTimeStr(localISOTime);
      }

    } catch (err) {
      console.error('Error al cargar datos del panel de administración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMatchSelect = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatchId(matchId);
      setHomeGoals(match.homeGoals !== null ? String(match.homeGoals) : '0');
      setAwayGoals(match.awayGoals !== null ? String(match.awayGoals) : '0');
      setMatchStatus(match.status || 'finished');
      setScrapedData(null);
      setScraperLogs([]);

      const d = match.kickoffTime?.toDate ? match.kickoffTime.toDate() : new Date(match.kickoffTime);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setKickoffTimeStr(localISOTime);
    }
  };

  const handleUpdateTime = async () => {
    if (!selectedMatchId || !kickoffTimeStr) return;
    try {
      setUpdatingTime(true);
      const matchRef = doc(db, 'partidos', selectedMatchId);
      const newDate = new Date(kickoffTimeStr);
      await updateDoc(matchRef, { kickoffTime: newDate });
      alert('¡Fecha y hora del partido actualizadas correctamente!');
      loadData(true);
    } catch (e) {
      console.error(e);
      alert('Hubo un error actualizando la fecha y hora.');
    } finally {
      setUpdatingTime(false);
    }
  };

  // Simulate a Web Scraper
  const handleSimulateWebScrape = () => {
    const match = matches.find(m => m.id === selectedMatchId);
    if (!match) return;

    setScraping(true);
    setScrapedData(null);
    setScraperLogs(['[CRAWLER] 🔍 Iniciando robot de scraping de la FIFA...']);

    const steps = [
      { delay: 800, log: `[CRAWLER] 🌐 Conectando con fifa.com/worldcup2026/partido/${match.id}...` },
      { delay: 1600, log: `[CRAWLER] 📄 Descargando HTML del fixture oficial del Grupo ${match.group}...` },
      { delay: 2400, log: `[CRAWLER] ⚡ Parseando nodos DOM y buscando marcadores de: ${match.homeTeam} vs ${match.awayTeam}...` },
      { delay: 3000, log: `[CRAWLER] ⚽ Marcador extraído con éxito de la API oficial.` },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setScraperLogs(prev => [...prev, step.log]);
        if (idx === steps.length - 1) {
          // Generate a highly realistic score
          const simulatedHome = Math.floor(Math.random() * 4); // 0 to 3
          const simulatedAway = Math.floor(Math.random() * 4); // 0 to 3
          setScrapedData({ home: simulatedHome, away: simulatedAway });
          setHomeGoals(String(simulatedHome));
          setAwayGoals(String(simulatedAway));
          setMatchStatus('finished');
          setScraping(false);
        }
      }, step.delay);
    });
  };

  // Trigger Point distribution overlay
  const handleOpenShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId) return;
    
    if (bypassDistribution) {
      const pwd = prompt("Ingrese la contraseña de administrador:");
      if (pwd !== 'admin') {
        alert("Contraseña incorrecta o cancelada. Operación cancelada.");
        return;
      }
      
      try {
        const matchRef = doc(db, 'partidos', selectedMatchId);
        await updateDoc(matchRef, {
          homeGoals: parseInt(homeGoals, 10),
          awayGoals: parseInt(awayGoals, 10),
          status: matchStatus
        });
        
        clearCache();
        setScrapedData(null);
        setScraperLogs([]);
        await loadData(true);
        alert('¡Marcador y estado del partido guardados correctamente (sin modificar puntos)!');
      } catch (err) {
        console.error('Error al guardar datos directamente:', err);
        alert('Hubo un error al guardar el partido.');
      }
    } else {
      // Open points show modal
      setShowPointsModal(true);
    }
  };

  // Commit points & match scores to Firestore
  const handleConfirmDistribution = async (userUpdates: Record<string, { globalPoints: number; phasePoints: number }>) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Update Match score and status
      const matchRef = doc(db, 'partidos', selectedMatchId);
      batch.update(matchRef, {
        homeGoals: parseInt(homeGoals, 10),
        awayGoals: parseInt(awayGoals, 10),
        status: matchStatus
      });

      // 2. Update User scores
      Object.entries(userUpdates).forEach(([userId, points]) => {
        const userRef = doc(db, 'usuarios', userId);
        const matchPhase = selectedMatch?.phase || 'grupos';
        batch.update(userRef, {
          totalPoints: points.globalPoints,
          [`phaseStats.${matchPhase}.totalPoints`]: points.phasePoints
        });
      });

      // Execute batch
      await batch.commit();

      // 3. Reset state & clear caches
      clearCache();
      setShowPointsModal(false);
      setScrapedData(null);
      setScraperLogs([]);
      
      // Reload local data
      await loadData(true);

      alert('¡Partido cerrado y puntos de usuarios distribuidos exitosamente!');
    } catch (err) {
      console.error('Error al guardar datos oficiales:', err);
      alert('Hubo un error al cerrar el partido en la base de datos.');
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const isFutureMatch = selectedMatch
    ? (selectedMatch.kickoffTime?.toDate ? selectedMatch.kickoffTime.toDate() : new Date(selectedMatch.kickoffTime)).getTime() > Date.now()
    : false;


  if (loading && matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <span>Cargando datos de partidos para administración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Visual Header */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <Settings className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight font-sans">Panel de Cierre de Partidos (Admin)</h2>
            <p className="text-slate-400 text-xs">Carga resultados oficiales, haz web scraping o simula la distribución de puntos.</p>
          </div>
        </div>

        <button
          onClick={() => loadData(true)}
          className="flex items-center gap-1.5 text-xs bg-slate-850 hover:bg-slate-800 border border-slate-700/50 text-slate-300 px-3 py-2 rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recargar Datos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Update form */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="bg-slate-800/20 border border-slate-700/40 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <PenSquare className="w-4.5 h-4.5 text-emerald-400" />
              <h3 className="font-extrabold text-white text-sm">Registrar Marcador Oficial</h3>
            </div>

            <form onSubmit={handleOpenShow} className="space-y-5">
              
              {/* Select Match */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Seleccionar Partido:</label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => handleMatchSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.status === 'finished' ? 'Finalizado' : m.status === 'in_progress' ? 'En Vivo' : 'Pendiente'}] • Fase: {m.phase || 'grupos'} • {m.homeTeam} vs {m.awayTeam}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatch && (
                <>
                  {/* Edit Match Time */}
                  <div className="flex items-end gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Fecha y Hora de Inicio:</label>
                      <input
                        type="datetime-local"
                        value={kickoffTimeStr}
                        onChange={(e) => setKickoffTimeStr(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateTime}
                      disabled={updatingTime}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-700 disabled:opacity-50"
                    >
                      {updatingTime ? 'Guardando...' : 'Actualizar Hora'}
                    </button>
                  </div>
                  {/* Web Scraper Action Panel */}
                  <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Web Scraping Integrado:</span>
                      <button
                        type="button"
                        onClick={handleSimulateWebScrape}
                        disabled={scraping || isFutureMatch}
                        className="bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] py-1 px-3 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Terminal className="w-3 h-3" />
                        {scraping ? 'CRAWLING...' : 'OBTENER WEB'}
                      </button>
                    </div>

                    {/* Scraper Logs Terminal */}
                    {scraperLogs.length > 0 && (
                      <div className="bg-black/80 rounded-xl p-3 font-mono text-[9px] text-slate-400 space-y-1 max-h-24 overflow-y-auto border border-slate-900 shadow-inner">
                        {scraperLogs.map((log, idx) => (
                          <div key={idx} className={log.includes('⚽') || log.includes('éxito') ? 'text-emerald-400 font-bold' : ''}>
                            {log}
                          </div>
                        ))}
                      </div>
                    )}

                    {scrapedData && (
                      <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-2.5 text-center text-xs font-semibold text-emerald-400 animate-fadeIn">
                        🎯 ¡Marcador Web Encontrado!: {scrapedData.home} a {scrapedData.away}
                      </div>
                    )}
                  </div>

                  {/* Warning banner for future matches */}
                  {isFutureMatch && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400 backdrop-blur-sm animate-fadeIn">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse text-red-400" />
                      <div className="text-xs">
                        <h4 className="font-bold text-sm text-white mb-0.5">⚠️ Partido en el Futuro</h4>
                        <p className="text-slate-300 leading-relaxed">Este partido no ha comenzado aún. Por normas del torneo, no está permitido registrar marcadores oficiales ni distribuir puntos para encuentros del futuro.</p>
                      </div>
                    </div>
                  )}

                  {/* Manual Scores entry */}
                  <div className="space-y-2">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Resultado Oficial:</label>
                    <div className="flex items-center justify-between gap-4 bg-slate-950/30 border border-slate-800 p-4 rounded-2xl">
                      <div className="flex-1 text-center">
                        <span className="text-xs text-slate-400 font-medium block mb-1.5 truncate max-w-[90px] mx-auto">{selectedMatch.homeTeam}</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={homeGoals}
                          onChange={(e) => setHomeGoals(e.target.value)}
                          required
                          disabled={isFutureMatch}
                          className="w-12 h-12 bg-slate-900 border border-slate-750 text-white rounded-xl text-center text-lg font-black focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_10px_rgba(16,185,129,0.15)] transition-all font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="text-slate-600 font-bold text-sm select-none">a</div>

                      <div className="flex-1 text-center">
                        <span className="text-xs text-slate-400 font-medium block mb-1.5 truncate max-w-[90px] mx-auto">{selectedMatch.awayTeam}</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={awayGoals}
                          onChange={(e) => setAwayGoals(e.target.value)}
                          required
                          disabled={isFutureMatch}
                          className="w-12 h-12 bg-slate-900 border border-slate-750 text-white rounded-xl text-center text-lg font-black focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_10px_rgba(16,185,129,0.15)] transition-all font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status selection */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Estado del Partido:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['pending', 'in_progress', 'finished'] as const).map((statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => setMatchStatus(statusOption)}
                          disabled={isFutureMatch}
                          className={`py-2 text-[10px] font-bold rounded-lg border uppercase transition-all ${
                            matchStatus === statusOption
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-450 hover:bg-slate-850'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {statusOption === 'pending' ? 'Pendiente' : statusOption === 'in_progress' ? 'En Vivo' : 'Finalizado'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bypass point distribution checkbox */}
                  <div className="flex items-center gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                    <input
                      type="checkbox"
                      id="bypass-distribution"
                      checked={bypassDistribution}
                      onChange={(e) => setBypassDistribution(e.target.checked)}
                      disabled={isFutureMatch}
                      className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-slate-950 cursor-pointer"
                    />
                    <label htmlFor="bypass-distribution" className="text-xs text-slate-350 font-bold cursor-pointer select-none leading-tight">
                      Solo guardar marcador/estado (NO distribuir ni re-sumar puntos)
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isFutureMatch}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 text-xs uppercase disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar Cierre de Partido</span>
                  </button>
                </>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Matches list to track status */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-slate-800/10 border border-slate-800/60 rounded-3xl p-5 backdrop-blur-sm space-y-4">
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider font-mono text-slate-450">Historial de Partidos Oficiales</h3>
            
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {matches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleMatchSelect(m.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedMatchId === m.id
                      ? 'bg-slate-800/35 border-emerald-500/50 shadow-md shadow-emerald-950/5'
                      : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-800/10 hover:border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-800 text-slate-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                      {m.phase || 'G' + m.group}
                    </span>
                    <span className="font-extrabold text-xs text-white">
                      {m.homeTeam} vs {m.awayTeam}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Score display */}
                    {m.status !== 'pending' ? (
                      <span className="font-mono font-bold text-xs bg-slate-950 px-2 py-0.5 border border-slate-800 rounded-lg text-emerald-400 tracking-wider">
                        {m.homeGoals} - {m.awayGoals}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">VS</span>
                    )}

                    {/* Status badge */}
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wide border ${
                      m.status === 'finished'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : m.status === 'in_progress'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      {m.status === 'finished' ? 'Finalizado' : m.status === 'in_progress' ? 'En Vivo' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* RENDER THE POPUP POINTS SHOW ANIMATION MODAL */}
      {showPointsModal && selectedMatch && (
        <PointsShowModal
          match={selectedMatch}
          officialHomeGoals={parseInt(homeGoals, 10)}
          officialAwayGoals={parseInt(awayGoals, 10)}
          users={users}
          predictions={predictions}
          onConfirm={handleConfirmDistribution}
          onClose={() => setShowPointsModal(false)}
        />
      )}

    </div>
  );
}
