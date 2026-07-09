import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const seed8vosMatches = async () => {
  const batch = writeBatch(db);
  const partidosRef = collection(db, 'partidos');

  // 1. Obtener y borrar partidos viejos de 8vos (Cuartos)
  const q = query(partidosRef, where('phase', '==', '8vos'));
  const snap = await getDocs(q);
  snap.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const matches8vos = [
    { "id": "match_8_01", "homeTeam": "Francia", "awayTeam": "Marruecos", "kickoffTime": "2026-07-09T20:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_8_02", "homeTeam": "España", "awayTeam": "Bélgica", "kickoffTime": "2026-07-10T19:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_8_03", "homeTeam": "Noruega", "awayTeam": "Inglaterra", "kickoffTime": "2026-07-11T21:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_8_04", "homeTeam": "Argentina", "awayTeam": "Suiza", "kickoffTime": "2026-07-12T01:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null }
  ];

  for (const m of matches8vos) {
    const docRef = doc(partidosRef, m.id);
    batch.set(docRef, {
      ...m,
      kickoffTime: new Date(m.kickoffTime),
      phase: '8vos',
      group: null
    });
  }

  await batch.commit();
  console.log("8vos (Cuartos de Final) matches seeded successfully!");
};
