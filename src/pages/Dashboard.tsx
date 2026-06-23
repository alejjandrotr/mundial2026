import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trophy, Database, Gamepad2, Play, Table, Settings, Lock, Unlock, KeyRound, Award } from 'lucide-react';
import Leaderboard from '../features/ranking/Leaderboard';
import MatchList from '../features/matches/MatchList';
import QuinielaForm from '../features/predictions/QuinielaForm';
import ComparisonGrid from '../features/predictions/ComparisonGrid';
import AdminPanel from '../features/admin/AdminPanel';
import DangerZone from '../features/admin/DangerZone';
import QualifiersView from '../features/predictions/QualifiersView';
import RecordsView from '../features/ranking/RecordsView';
import { seedMockMatches, simulateRealScores } from '../utils/seed';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'quiniela' | 'comparison' | 'admin' | 'clasificados' | 'records'>('quiniela');
  const quinielaGroup = 'A';

  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState(false);

  const handleUnlockDev = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPassword === 'admin') {
      setDevUnlocked(true);
      setDevError(false);
    } else {
      setDevError(true);
      setTimeout(() => setDevError(false), 2000);
    }
  };

  const handleSeed = async () => {
    if (confirm('¿Estás seguro de inyectar los 72 partidos reales de la fase de grupos? Esto sobreescribirá los partidos actuales.')) {
      await seedMockMatches();
      alert('Partidos reales inyectados con éxito. ¡Refresca o vuelve a ingresar para ver los cambios!');
    }
  };

  const handleSimulateRealScores = async () => {
    if (confirm('¿Estás seguro de simular resultados reales (finalizados y en vivo) para los primeros 10 partidos del Mundial? Esto actualizará la base de datos.')) {
      await simulateRealScores();
      alert('¡Resultados simulados con éxito! Refresca o vuelve a ingresar para ver los marcadores reales en el Mundial y la Comparativa.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-2 sm:p-4 relative overflow-hidden">
      {/* Background World Cup Aura Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-worldcup-purple/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-worldcup-pink/5 blur-[150px] pointer-events-none" />

      {/* Encabezado */}
      <header className="no-print flex justify-between items-center max-w-full xl:max-w-[1600px] mx-auto bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md mb-8 relative shadow-lg">
        {/* Top brand line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-worldcup-gradient rounded-t-2xl" />
        <div className="flex items-center gap-3">
          <div className="bg-worldcup-purple/20 p-2 rounded-xl border border-worldcup-purple/30">
            <img src="/favicon.svg" alt="Logo Mundial 2026" className="w-6 h-6 object-contain" />
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tight">
            Quiniela <span className="text-worldcup-green font-black">Mundial 2026</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-xs font-semibold hidden sm:inline bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-850">
            👤 {currentUser?.displayName || 'Jugador'}
          </span>
          <button 
             onClick={logout}
            className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3.5 py-1.5 rounded-xl transition-all font-bold text-xs border border-red-500/20 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-full xl:max-w-[1600px] mx-auto relative">
        {/* Selector de Pestañas Principal */}
        <div className="no-print flex bg-slate-900/60 border border-slate-800/70 p-1.5 rounded-2xl backdrop-blur-md max-w-3xl mb-8 gap-1 shadow-inner flex-wrap md:flex-nowrap">
          <button
            onClick={() => setActiveTab('quiniela')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[100px] ${
              activeTab === 'quiniela'
                ? 'bg-worldcup-gradient text-white shadow-[0_0_20px_rgba(114,9,183,0.35)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Mi Quiniela
          </button>
          
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[110px] ${
              activeTab === 'comparison'
                ? 'bg-worldcup-gradient text-white shadow-[0_0_20px_rgba(114,9,183,0.35)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Table className="w-4 h-4" />
            Comparativa
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[110px] ${
              activeTab === 'live'
                ? 'bg-worldcup-gradient text-white shadow-[0_0_20px_rgba(114,9,183,0.35)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Resultados
          </button>

          <button
            onClick={() => setActiveTab('clasificados')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[110px] ${
              activeTab === 'clasificados'
                ? 'bg-worldcup-gradient text-white shadow-[0_0_20px_rgba(114,9,183,0.35)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Clasificados
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[90px] ${
              activeTab === 'records'
                ? 'bg-worldcup-gradient text-white shadow-[0_0_20px_rgba(114,9,183,0.35)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-4 h-4" />
            Records
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[90px] ${
              activeTab === 'admin'
                ? 'bg-worldcup-green text-slate-950 shadow-[0_0_15px_rgba(0,245,118,0.35)] font-black scale-[1.02]'
                : 'text-worldcup-green hover:bg-worldcup-green/5 border border-transparent hover:border-worldcup-green/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            Admin
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        {activeTab === 'quiniela' && (
          <QuinielaForm initialGroup={quinielaGroup} />
        )}

        {activeTab === 'comparison' && (
          <ComparisonGrid />
        )}

        {activeTab === 'clasificados' && (
          <QualifiersView />
        )}

        {activeTab === 'records' && (
          <RecordsView />
        )}

        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Columna Izquierda: Tabla de Posiciones */}
            <div className="lg:col-span-5 xl:col-span-4">
              <Leaderboard />
            </div>

            {/* Columna Derecha: Partidos Reales */}
            <div className="lg:col-span-7 xl:col-span-8">
              <MatchList />
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <AdminPanel />
        )}

        {/* Zona de Desarrollo Protegida */}
        <div className="no-print mt-16 max-w-md bg-slate-800/10 border border-slate-800/60 rounded-3xl p-5 backdrop-blur-sm transition-all duration-300">
          {!devUnlocked ? (
            <form onSubmit={handleUnlockDev} className="space-y-3.5">
              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">🛠️ Zona de Desarrollo</h3>
              </div>
              <p className="text-[11px] text-slate-400">Ingresa la contraseña de administrador para desbloquear las herramientas de simulación de datos.</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  placeholder="Contraseña..."
                  className={`flex-1 bg-slate-950 border text-xs px-3 py-2 rounded-xl text-white outline-none transition-all ${
                    devError ? 'border-red-500 animate-pulse ring-2 ring-red-500/15' : 'border-slate-800 focus:border-slate-700'
                  }`}
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 border border-slate-700/50 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Acceder
                </button>
              </div>
              {devError && (
                <span className="text-[10px] text-red-400 font-bold block animate-fadeIn">❌ Contraseña incorrecta</span>
              )}
            </form>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Unlock className="w-4 h-4 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">🛠️ Zona de Desarrollo</h3>
                </div>
                <button
                  onClick={() => {
                    setDevUnlocked(false);
                    setDevPassword('');
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-400 hover:bg-slate-800/60 px-2 py-1 rounded-lg transition-all border border-slate-800/40 cursor-pointer"
                >
                  Bloquear
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">1. Estructura base:</p>
                  <button
                    onClick={handleSeed}
                    className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 px-4 py-2.5 rounded-xl transition-all w-full cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-blue-400" />
                    Cargar 72 Partidos (Vacíos)
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <p className="text-xs text-slate-400 font-medium">2. Simular marcadores reales (Mundial):</p>
                  <button
                    onClick={handleSimulateRealScores}
                    className="flex items-center gap-2 text-xs font-bold bg-slate-850 hover:bg-slate-800 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-xl transition-all w-full shadow-lg shadow-emerald-950/10 cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400/10 animate-pulse" />
                    Simular Resultados Reales (Mundial)
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-800/60 mt-4">
                <DangerZone />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
