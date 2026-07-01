import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="bg-emerald-500/10 p-4 rounded-full inline-block mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex justify-center items-center">
            <img src="/favicon.svg" alt="Logo Mundial 2026" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Únete a la <span className="text-emerald-400">Quiniela</span></h1>
          <p className="text-slate-400 mt-2">Crea tu cuenta y empieza a predecir</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-center">
          <h2 className="text-2xl font-semibold text-white mb-6">Crear Cuenta</h2>
          
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-4 rounded-xl mb-4 font-semibold text-sm">
            🚫 Registro de nuevos usuarios deshabilitado
          </div>
          
          <p className="text-slate-350 text-xs leading-relaxed mb-6">
            Las inscripciones para la Quiniela del Mundial 2026 han sido cerradas temporalmente. Si necesitas acceso o una cuenta de prueba, por favor contacta al administrador del torneo.
          </p>

          <div className="mt-6">
            <Link 
              to="/login" 
              className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors border border-slate-700 active:scale-95 transform"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
