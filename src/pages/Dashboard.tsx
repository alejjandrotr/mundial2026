import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trophy, Database, Gamepad2, Play, Table, Settings, Lock, Unlock, KeyRound } from 'lucide-react';
import Leaderboard from '../features/ranking/Leaderboard';
import MatchList from '../features/matches/MatchList';
import QuinielaForm from '../features/predictions/QuinielaForm';
import ComparisonGrid from '../features/predictions/ComparisonGrid';
import AdminPanel from '../features/admin/AdminPanel';
import { seedMockMatches, simulateRealScores } from '../utils/seed';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'quiniela' | 'comparison' | 'admin'>('quiniela');
  const [quinielaGroup, setQuinielaGroup] = useState<string>('A');

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
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      {/* Encabezado */}
      <header className="flex justify-between items-center max-w-7xl mx-auto bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <Trophy className="w-6 h-6 text-emerald-400 font-bold" />
          </div>
          <h1 className="text-xl font-bold">Quiniela <span className="text-emerald-400">Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-slate-300 font-medium hidden sm:inline">Hola, {currentUser?.displayName || 'Jugador'}</span>
          <button 
            onClick={logout}
            className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors font-medium text-sm border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Selector de Pestañas Principal */}
        <div className="flex bg-slate-800/40 border border-slate-700/50 p-1.5 rounded-2xl backdrop-blur-sm max-w-xl mb-8 gap-1">
          <button
            onClick={() => setActiveTab('quiniela')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'quiniela'
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Mi Quiniela
          </button>
          
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'comparison'
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }`}
          >
            <Table className="w-4 h-4" />
            Comparativa (Excel)
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Resultados del Mundial
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)] font-black'
                : 'text-amber-450 hover:text-amber-300 hover:bg-amber-500/5 border border-transparent hover:border-amber-500/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            Admin (Cerrar Partidos)
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        {activeTab === 'quiniela' && (
          <QuinielaForm initialGroup={quinielaGroup} />
        )}

        {activeTab === 'comparison' && (
          <ComparisonGrid />
        )}

        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Columna Izquierda: Tabla de Posiciones */}
            <div className="lg:col-span-5 xl:col-span-4">
              <Leaderboard />
            </div>

            {/* Columna Derecha: Partidos Reales */}
            <div className="lg:col-span-7 xl:col-span-8">
              <MatchList
                onPredictClick={(group) => {
                  setQuinielaGroup(group);
                  setActiveTab('quiniela');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <AdminPanel />
        )}

        {/* Zona de Desarrollo Protegida */}
        <div className="mt-16 max-w-md bg-slate-800/10 border border-slate-800/60 rounded-3xl p-5 backdrop-blur-sm transition-all duration-300">
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
