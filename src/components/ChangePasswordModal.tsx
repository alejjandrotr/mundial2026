import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Lock, Eye, EyeOff, LogOut, ShieldAlert } from 'lucide-react';

export default function ChangePasswordModal() {
  const { updatePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword === '1234') {
      setError('Debes elegir una contraseña diferente a "1234".');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(newPassword);
    } catch (err: any) {
      console.error(err);
      setError('Hubo un error al actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top brand line */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-worldcup-gradient" />
        <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-worldcup-purple/15 blur-xl pointer-events-none" />

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Actualización Obligatoria</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              El administrador ha restablecido tu contraseña. Por seguridad, debes cambiar tu clave temporal para poder continuar.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl text-xs animate-fadeIn">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Nueva Contraseña:</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres..."
                  required
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-worldcup-purple focus:ring-2 focus:ring-worldcup-purple/15 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Confirmar Contraseña:</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña..."
                  required
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-worldcup-purple focus:ring-2 focus:ring-worldcup-purple/15 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-worldcup-gradient hover:scale-[1.01] active:scale-98 disabled:opacity-50 disabled:scale-100 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-worldcup-purple/20 flex items-center justify-center gap-2 text-xs uppercase cursor-pointer"
            >
              <span>{loading ? 'Guardando...' : 'Cambiar Contraseña'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={logout}
              className="w-full bg-slate-950 hover:bg-red-500/10 border border-slate-850 hover:border-red-500/20 text-slate-400 hover:text-red-400 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
