import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const seed16avosMatches = async () => {
  const batch = writeBatch(db);
  const partidosRef = collection(db, 'partidos');

  // 1. Obtener y borrar partidos viejos de 16avos
  const q = query(partidosRef, where('phase', '==', '16avos'));
  const snap = await getDocs(q);
  snap.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const matches16avos = [
    { "id": "match_16_01", "homeTeam": "Canadá", "awayTeam": "Marruecos", "kickoffTime": "2026-07-04T18:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_02", "homeTeam": "Paraguay", "awayTeam": "Francia", "kickoffTime": "2026-07-04T21:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_03", "homeTeam": "Brasil", "awayTeam": "Noruega", "kickoffTime": "2026-07-05T20:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_04", "homeTeam": "México", "awayTeam": "Inglaterra", "kickoffTime": "2026-07-06T02:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_05", "homeTeam": "Portugal", "awayTeam": "España", "kickoffTime": "2026-07-06T20:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_06", "homeTeam": "Estados Unidos", "awayTeam": "Bélgica", "kickoffTime": "2026-07-07T03:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_07", "homeTeam": "Argentina", "awayTeam": "Egipto", "kickoffTime": "2026-07-07T16:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_16_08", "homeTeam": "Suiza", "awayTeam": "Colombia", "kickoffTime": "2026-07-07T23:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null }
  ];

  for (const m of matches16avos) {
    const docRef = doc(partidosRef, m.id);
    batch.set(docRef, {
      ...m,
      kickoffTime: new Date(m.kickoffTime),
      phase: '16avos',
      group: null
    });
  }

  await batch.commit();
  console.log("16avos matches seeded successfully!");
};
