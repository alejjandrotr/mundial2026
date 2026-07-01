import { useState, useEffect } from 'react';
import { collection, doc, getDocs, writeBatch, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getCachedMatches, getCachedUsers, clearCache } from '../../utils/cache';
import { RefreshCw, Trash2, UserX, Download, Database, KeyRound } from 'lucide-react';
import type { Usuario } from '../../models/types';

export default function DangerZone() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [usersWithoutPredictions, setUsersWithoutPredictions] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadUsers = async () => {
    try {
      const usersData = await getCachedUsers(true); // Forzar carga limpia
      
      // Consultar todas las predicciones actuales para ver quién no ha subido nada
      const predSnapshot = await getDocs(collection(db, 'predicciones'));
      const activeUserIds = new Set<string>();
      predSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.usuarioId) {
          activeUserIds.add(data.usuarioId);
        }
      });

      // Identificar usuarios sin predicciones
      const noPreds = new Set<string>();
      usersData.forEach(u => {
        if (!activeUserIds.has(u.uid)) {
          noPreds.add(u.uid);
        }
      });

      setUsers(usersData);
      setUsersWithoutPredictions(noPreds);
    } catch (err) {
      console.error("Error al cargar usuarios y predicciones:", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    const userToReset = users.find(u => u.uid === selectedUserId);
    if (!userToReset) return;

    if (!window.confirm(`¿Estás seguro de que deseas resetear la contraseña del usuario "${userToReset.displayName}" a "1234"? Se le obligará a cambiarla la próxima vez que inicie sesión.`)) {
      return;
    }

    try {
      setIsResettingPassword(true);
      const userRef = doc(db, 'usuarios', selectedUserId);
      await updateDoc(userRef, {
        password: '1234',
        mustChangePassword: true
      });
      alert(`Contraseña de ${userToReset.displayName} reseteada a "1234" con éxito.`);
      clearCache();
      setSelectedUserId('');
      await loadUsers();
    } catch (err) {
      console.error('Error al resetear contraseña:', err);
      alert('Hubo un error al intentar resetear la contraseña.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    const userToDel = users.find(u => u.uid === selectedUserId);
    if (!userToDel) return;

    if (!window.confirm(`⚠️ ADVERTENCIA: Estás a punto de eliminar permanentemente al usuario "${userToDel.displayName}" y TODAS sus predicciones.\n\n¿Estás completamente seguro de continuar? Esta acción es irreversible.`)) {
      return;
    }

    try {
      setIsDeletingUser(true);
      const batch = writeBatch(db);

      // 1. Find and delete all predictions
      const q = query(collection(db, 'predicciones'), where('usuarioId', '==', selectedUserId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 2. Delete the user
      batch.delete(doc(db, 'usuarios', selectedUserId));

      // 3. Commit
      await batch.commit();

      alert(`Usuario ${userToDel.displayName} y sus ${snapshot.size} predicciones fueron eliminados exitosamente.`);
      
      // Clear cache and reload
      clearCache();
      setSelectedUserId('');
      await loadUsers();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      alert('Hubo un error al intentar eliminar el usuario. Revisa los permisos.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      // Fetch fresh data for backup
      const matches = await getCachedMatches(true);
      const users = await getCachedUsers(true);
      
      const predSnapshot = await getDocs(collection(db, 'predicciones'));
      const predictions: Record<string, any> = {};
      predSnapshot.forEach((doc) => {
        const d = doc.data();
        const uId = d.usuarioId;
        const mId = d.partidoId;
        if (!predictions[uId]) predictions[uId] = {};
        predictions[uId][mId] = {
          homeGoals: d.homeGoals,
          awayGoals: d.awayGoals,
        };
      });

      const backupData = {
        timestamp: new Date().toISOString(),
        matches,
        users,
        predictions,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `backup_quiniela_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error('Error al exportar backup:', err);
      alert('Hubo un error al generar el backup.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* USER MANAGEMENT PANEL */}
      <div className="bg-slate-800/10 border border-red-900/40 rounded-2xl p-4 backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-red-900/30 pb-2">
          <UserX className="w-4 h-4 text-red-400" />
          <h3 className="font-extrabold text-red-400 text-[10px] uppercase tracking-wider">Gestión de Usuarios (Peligro)</h3>
        </div>
        
        <div className="space-y-2.5 bg-red-950/20 p-3 rounded-xl border border-red-900/20">
          <p className="text-[10px] text-red-300/80 leading-relaxed">
            Selecciona un usuario para administrar su cuenta. Puedes restablecer su contraseña temporal a `"1234"` o eliminar permanentemente su cuenta y <strong className="text-red-400">TODAS</strong> sus predicciones. Los marcados en <span className="text-red-400 font-bold">rojo con [SIN PREDICCIONES]</span> no han enviado ningún pronóstico.
          </p>
          
          <div className="flex flex-col gap-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2 py-2 text-[10px] font-semibold focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="">-- Seleccionar Usuario --</option>
              {users.map((u) => {
                const hasNoPreds = usersWithoutPredictions.has(u.uid);
                return (
                  <option 
                    key={u.uid} 
                    value={u.uid} 
                    className={hasNoPreds ? "text-red-400 bg-red-950/30" : ""}
                  >
                    {u.displayName} {hasNoPreds ? "⚠️ [SIN PREDICCIONES]" : ""} ({u.email || 'Sin correo'})
                  </option>
                );
              })}
            </select>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <button
                onClick={handleResetPassword}
                disabled={!selectedUserId || isResettingPassword}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 disabled:bg-slate-800/40 disabled:border-transparent disabled:text-slate-500 font-bold py-2 px-3 rounded-lg transition-all shadow flex items-center justify-center gap-1.5 text-[10px] uppercase disabled:shadow-none disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {isResettingPassword ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <KeyRound className="w-3 h-3" />
                )}
                Resetear Clave (1234)
              </button>

              <button
                onClick={handleDeleteUser}
                disabled={!selectedUserId || isDeletingUser}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-850 disabled:text-slate-500 text-white font-bold py-2 px-3 rounded-lg transition-all shadow flex items-center justify-center gap-1.5 text-[10px] uppercase disabled:shadow-none disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {isDeletingUser ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BACKUP PANEL */}
      <div className="bg-slate-800/10 border border-blue-900/40 rounded-2xl p-4 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between border-b border-blue-900/30 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <h3 className="font-extrabold text-blue-400 text-[10px] uppercase tracking-wider">Respaldo de Datos</h3>
          </div>
        </div>
        
        <div className="space-y-2.5 bg-blue-950/20 p-3 rounded-xl border border-blue-900/20">
          <p className="text-[10px] text-blue-300/80 leading-relaxed">
            Exporta toda la base de datos (usuarios, partidos y predicciones) en un archivo JSON para tener una copia de seguridad local.
          </p>
          
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2 px-3 rounded-lg transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-1.5 text-[10px] uppercase disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Descargar Backup Completo (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
