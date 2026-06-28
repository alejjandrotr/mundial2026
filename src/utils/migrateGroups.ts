import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export const migrateDataToPhaseStats = async () => {
  const batch = writeBatch(db);
  
  // 1. Migrar Partidos: Setear phase: 'grupos' a todos los que no tienen phase
  const partidosRef = collection(db, 'partidos');
  const partidosSnap = await getDocs(partidosRef);
  
  partidosSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.phase) {
      batch.update(doc.ref, { phase: 'grupos' });
    }
  });

  // 2. Migrar Usuarios: Mover totalPoints a phaseStats.grupos
  const usersRef = collection(db, 'usuarios');
  const usersSnap = await getDocs(usersRef);

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const currentTotalPoints = data.totalPoints || 0;

    batch.update(doc.ref, {
      'phaseStats.grupos.totalPoints': currentTotalPoints
    });
  });

  await batch.commit();
  console.log('Migration to phaseStats completed successfully!');
};
