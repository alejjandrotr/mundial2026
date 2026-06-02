import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WhatIfSimulator from '../features/predictions/WhatIfSimulator';

export default function SimulatorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <header className="flex justify-between items-center max-w-7xl mx-auto bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors border border-transparent hover:border-slate-600"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-xl font-bold">Volver al <span className="text-emerald-400">Dashboard</span></h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <WhatIfSimulator />
      </main>
    </div>
  );
}
