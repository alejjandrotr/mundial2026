import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const seed32avosMatches = async () => {
  const batch = writeBatch(db);
  const partidosRef = collection(db, 'partidos');

  // 1. Obtener y borrar partidos viejos de 32avos
  const q = query(partidosRef, where('phase', '==', '32avos'));
  const snap = await getDocs(q);
  snap.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const matches32avos = [
    { "id": "match_32_01", "homeTeam": "Sudáfrica", "awayTeam": "Canadá", "kickoffTime": "2026-06-28T15:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_02", "homeTeam": "Brasil", "awayTeam": "Japón", "kickoffTime": "2026-06-29T13:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_03", "homeTeam": "Alemania", "awayTeam": "Paraguay", "kickoffTime": "2026-06-29T16:30:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_04", "homeTeam": "Países Bajos", "awayTeam": "Marruecos", "kickoffTime": "2026-06-29T21:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_05", "homeTeam": "Costa de Marfil", "awayTeam": "Noruega", "kickoffTime": "2026-06-30T13:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_06", "homeTeam": "Francia", "awayTeam": "Suecia", "kickoffTime": "2026-06-30T17:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_07", "homeTeam": "México", "awayTeam": "Ecuador", "kickoffTime": "2026-06-30T21:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_08", "homeTeam": "Inglaterra", "awayTeam": "RD Congo", "kickoffTime": "2026-07-01T12:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_09", "homeTeam": "Bélgica", "awayTeam": "Senegal", "kickoffTime": "2026-07-01T16:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_10", "homeTeam": "Estados Unidos", "awayTeam": "Bosnia y Herzegovina", "kickoffTime": "2026-07-01T20:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_11", "homeTeam": "España", "awayTeam": "Austria", "kickoffTime": "2026-07-02T15:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_12", "homeTeam": "Portugal", "awayTeam": "Croacia", "kickoffTime": "2026-07-02T19:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_13", "homeTeam": "Suiza", "awayTeam": "Argelia", "kickoffTime": "2026-07-02T23:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_14", "homeTeam": "Australia", "awayTeam": "Egipto", "kickoffTime": "2026-07-03T14:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_15", "homeTeam": "Argentina", "awayTeam": "Cabo Verde", "kickoffTime": "2026-07-03T18:00:00Z", "status": "pending", "homeGoals": null, "awayGoals": null },
    { "id": "match_32_16", "homeTeam": "Colombia", "awayTeam": "Ghana", "kickoffTime": "2026-07-03T21:30:00Z", "status": "pending", "homeGoals": null, "awayGoals": null }
  ];

  for (const m of matches32avos) {
    const docRef = doc(partidosRef, m.id);
    batch.set(docRef, {
      ...m,
      kickoffTime: new Date(m.kickoffTime),
      phase: '32avos',
      group: null
    });
  }

  await batch.commit();
  console.log("32avos matches seeded successfully!");
};
