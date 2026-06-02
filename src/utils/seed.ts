import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

export const seedMockMatches = async () => {
  const batch = writeBatch(db);
  const partidosRef = collection(db, "partidos");

  const rawMatches = [
    { "id": 1, "grupo": "A", "equipo_local": "México", "equipo_visitante": "Sudáfrica", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-11T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 2, "grupo": "A", "equipo_local": "Corea del Sur", "equipo_visitante": "Chequia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-11T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 3, "grupo": "A", "equipo_local": "México", "equipo_visitante": "Corea del Sur", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-15T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 4, "grupo": "A", "equipo_local": "Sudáfrica", "equipo_visitante": "Chequia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-15T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 5, "grupo": "A", "equipo_local": "Chequia", "equipo_visitante": "México", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-20T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 6, "grupo": "A", "equipo_local": "Sudáfrica", "equipo_visitante": "Corea del Sur", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-20T19:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 7, "grupo": "B", "equipo_local": "Canadá", "equipo_visitante": "Bosnia y Herzegovina", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-12T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 8, "grupo": "B", "equipo_local": "Catar", "equipo_visitante": "Suiza", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-12T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 9, "grupo": "B", "equipo_local": "Canadá", "equipo_visitante": "Catar", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 10, "grupo": "B", "equipo_local": "Bosnia y Herzegovina", "equipo_visitante": "Suiza", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 11, "grupo": "B", "equipo_local": "Suiza", "equipo_visitante": "Canadá", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-21T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 12, "grupo": "B", "equipo_local": "Bosnia y Herzegovina", "equipo_visitante": "Catar", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-21T16:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 13, "grupo": "C", "equipo_local": "Brasil", "equipo_visitante": "Marruecos", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-12T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 14, "grupo": "C", "equipo_local": "Haití", "equipo_visitante": "Escocia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-13T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 15, "grupo": "C", "equipo_local": "Brasil", "equipo_visitante": "Haití", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 16, "grupo": "C", "equipo_local": "Marruecos", "equipo_visitante": "Escocia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-17T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 17, "grupo": "C", "equipo_local": "Escocia", "equipo_visitante": "Brasil", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-21T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 18, "grupo": "C", "equipo_local": "Marruecos", "equipo_visitante": "Haití", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-22T13:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 19, "grupo": "D", "equipo_local": "Estados Unidos", "equipo_visitante": "Paraguay", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-13T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 20, "grupo": "D", "equipo_local": "Australia", "equipo_visitante": "Turquía", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-13T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 21, "grupo": "D", "equipo_local": "Estados Unidos", "equipo_visitante": "Australia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-17T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 22, "grupo": "D", "equipo_local": "Paraguay", "equipo_visitante": "Turquía", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-17T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 23, "grupo": "D", "equipo_local": "Turquía", "equipo_visitante": "Estados Unidos", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-22T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 24, "grupo": "D", "equipo_local": "Paraguay", "equipo_visitante": "Australia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-22T19:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 25, "grupo": "E", "equipo_local": "Alemania", "equipo_visitante": "Curazao", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-14T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 26, "grupo": "E", "equipo_local": "Costa de Marfil", "equipo_visitante": "Ecuador", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-14T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 27, "grupo": "E", "equipo_local": "Alemania", "equipo_visitante": "Costa de Marfil", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-18T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 28, "grupo": "E", "equipo_local": "Curazao", "equipo_visitante": "Ecuador", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-18T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 29, "grupo": "E", "equipo_local": "Ecuador", "equipo_visitante": "Alemania", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-23T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 30, "grupo": "E", "equipo_local": "Curazao", "equipo_visitante": "Costa de Marfil", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-23T16:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 31, "grupo": "F", "equipo_local": "Países Bajos", "equipo_visitante": "Japón", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-14T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 32, "grupo": "F", "equipo_local": "Suecia", "equipo_visitante": "Túnez", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-15T10:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 33, "grupo": "F", "equipo_local": "Países Bajos", "equipo_visitante": "Suecia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-18T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 34, "grupo": "F", "equipo_local": "Japón", "equipo_visitante": "Túnez", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-19T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 35, "grupo": "F", "equipo_local": "Túnez", "equipo_visitante": "Países Bajos", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-23T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 36, "grupo": "F", "equipo_local": "Japón", "equipo_visitante": "Suecia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-24T13:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 37, "grupo": "G", "equipo_local": "Bélgica", "equipo_visitante": "Egipto", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-15T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 38, "grupo": "G", "equipo_local": "Irán", "equipo_visitante": "Nueva Zelanda", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-15T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 39, "grupo": "G", "equipo_local": "Bélgica", "equipo_visitante": "Irán", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-19T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 40, "grupo": "G", "equipo_local": "Egipto", "equipo_visitante": "Nueva Zelanda", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-19T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 41, "grupo": "G", "equipo_local": "Nueva Zelanda", "equipo_visitante": "Bélgica", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-24T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 42, "grupo": "G", "equipo_local": "Egipto", "equipo_visitante": "Irán", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-24T19:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 43, "grupo": "H", "equipo_local": "España", "equipo_visitante": "Cabo Verde", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-15T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 44, "grupo": "H", "equipo_local": "Arabia Saudita", "equipo_visitante": "Uruguay", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T10:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 45, "grupo": "H", "equipo_local": "España", "equipo_visitante": "Arabia Saudita", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-20T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 46, "grupo": "H", "equipo_local": "Cabo Verde", "equipo_visitante": "Uruguay", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-20T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 47, "grupo": "H", "equipo_local": "Uruguay", "equipo_visitante": "España", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-25T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 48, "grupo": "H", "equipo_local": "Cabo Verde", "equipo_visitante": "Arabia Saudita", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-25T16:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 49, "grupo": "I", "equipo_local": "Francia", "equipo_visitante": "Senegal", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 50, "grupo": "I", "equipo_local": "Irak", "equipo_visitante": "Noruega", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 51, "grupo": "I", "equipo_local": "Francia", "equipo_visitante": "Irak", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-21T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 52, "grupo": "I", "equipo_local": "Senegal", "equipo_visitante": "Noruega", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-21T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 53, "grupo": "I", "equipo_local": "Noruega", "equipo_visitante": "Francia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-26T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 54, "grupo": "I", "equipo_local": "Senegal", "equipo_visitante": "Irak", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-26T16:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 55, "grupo": "J", "equipo_local": "Argentina", "equipo_visitante": "Argelia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-16T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 56, "grupo": "J", "equipo_local": "Austria", "equipo_visitante": "Jordania", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-17T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 57, "grupo": "J", "equipo_local": "Argentina", "equipo_visitante": "Austria", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-21T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 58, "grupo": "J", "equipo_local": "Argelia", "equipo_visitante": "Jordania", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-22T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 59, "grupo": "J", "equipo_local": "Jordania", "equipo_visitante": "Argentina", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-26T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 60, "grupo": "J", "equipo_local": "Argelia", "equipo_visitante": "Austria", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-27T13:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 61, "grupo": "K", "equipo_local": "Portugal", "equipo_visitante": "Congo (Rep. Dem.)", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-17T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 62, "grupo": "K", "equipo_local": "Uzbekistán", "equipo_visitante": "Colombia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-17T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 63, "grupo": "K", "equipo_local": "Portugal", "equipo_visitante": "Uzbekistán", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-22T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 64, "grupo": "K", "equipo_local": "Congo (Rep. Dem.)", "equipo_visitante": "Colombia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-22T19:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 65, "grupo": "K", "equipo_local": "Colombia", "equipo_visitante": "Portugal", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-27T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 66, "grupo": "K", "equipo_local": "Congo (Rep. Dem.)", "equipo_visitante": "Uzbekistán", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-27T19:00:00Z", "iniciado": false, "finalizado": false },

    { "id": 67, "grupo": "L", "equipo_local": "Inglaterra", "equipo_visitante": "Croacia", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-18T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 68, "grupo": "L", "equipo_local": "Ghana", "equipo_visitante": "Panamá", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-18T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 69, "grupo": "L", "equipo_local": "Inglaterra", "equipo_visitante": "Ghana", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-23T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 70, "grupo": "L", "equipo_local": "Croacia", "equipo_visitante": "Panamá", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-23T16:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 71, "grupo": "L", "equipo_local": "Panamá", "equipo_visitante": "Inglaterra", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-28T13:00:00Z", "iniciado": false, "finalizado": false },
    { "id": 72, "grupo": "L", "equipo_local": "Croacia", "equipo_visitante": "Ghana", "goles_local": null, "goles_visitante": null, "fecha": "2026-06-28T16:00:00Z", "iniciado": false, "finalizado": false }
  ];

  const getStatus = (iniciado: boolean, finalizado: boolean): 'pending' | 'in_progress' | 'finished' => {
    if (finalizado) return 'finished';
    if (iniciado) return 'in_progress';
    return 'pending';
  };

  for (const m of rawMatches) {
    const matchId = `match_${m.id}`;
    const docRef = doc(partidosRef, matchId);
    
    batch.set(docRef, {
      id: matchId,
      homeTeam: m.equipo_local,
      awayTeam: m.equipo_visitante,
      kickoffTime: new Date(m.fecha),
      status: getStatus(m.iniciado, m.finalizado),
      homeGoals: m.goles_local,
      awayGoals: m.goles_visitante,
      group: m.grupo
    });
  }

  await batch.commit();
  console.log("All 72 World Cup group stage matches seeded successfully!");
};

export const simulateRealScores = async () => {
  const batch = writeBatch(db);
  const partidosRef = collection(db, "partidos");
  const usuariosRef = collection(db, "usuarios");
  const predRef = collection(db, "predicciones");

  // 1. Simular Resultados Reales del Mundial (Fixture)
  const simulatedData = [
    { id: "match_1", homeGoals: 1, awayGoals: 2, status: "finished" },
    { id: "match_2", homeGoals: 0, awayGoals: 2, status: "finished" },
    { id: "match_3", homeGoals: 6, awayGoals: 2, status: "finished" },
    { id: "match_4", homeGoals: 1, awayGoals: 1, status: "finished" },
    { id: "match_5", homeGoals: 1, awayGoals: 2, status: "finished" },
    { id: "match_6", homeGoals: 0, awayGoals: 0, status: "finished" },
    { id: "match_7", homeGoals: 0, awayGoals: 0, status: "finished" },
    { id: "match_8", homeGoals: 4, awayGoals: 1, status: "finished" },
    { id: "match_9", homeGoals: 1, awayGoals: 2, status: "in_progress" },
    { id: "match_10", homeGoals: 7, awayGoals: 0, status: "in_progress" }
  ];

  for (const s of simulatedData) {
    const docRef = doc(partidosRef, s.id);
    batch.update(docRef, {
      homeGoals: s.homeGoals,
      awayGoals: s.awayGoals,
      status: s.status
    });
  }

  // 2. Crear los usuarios ficticios de la foto
  const mockUsers = [
    {
      uid: "user_alejandro",
      displayName: "Alejandro",
      email: "alejandro@quiniela.com",
      totalPoints: 12,
      role: "user"
    },
    {
      uid: "user_cesar",
      displayName: "Cesar",
      email: "cesar@quiniela.com",
      totalPoints: 9,
      role: "user"
    }
  ];

  for (const u of mockUsers) {
    const userDocRef = doc(usuariosRef, u.uid);
    batch.set(userDocRef, u);
  }

  // 3. Crear predicciones específicas para Alejandro y Cesar (como en la foto y para lucir colores)
  const mockPredictions = [
    // --- ALEJANDRO ---
    // Match 1: México vs Sudáfrica (Real 1-2). Pred: 1-2. Puntos: 3 (Dorado)
    { id: "pred_alejandro_m1", usuarioId: "user_alejandro", partidoId: "match_1", homeGoals: 1, awayGoals: 2 },
    // Match 2: Corea del Sur vs Chequia (Real 0-2). Pred: 2-3. Puntos: 0 (pero visitante 2 es igual a real 2 -> 1 punto -> 2 en verde)
    { id: "pred_alejandro_m2", usuarioId: "user_alejandro", partidoId: "match_2", homeGoals: 2, awayGoals: 3 },
    // Match 3: México vs Corea del Sur (Real 6-2). Pred: 3-1. Puntos: 2 (Ganador -> Verde)
    { id: "pred_alejandro_m3", usuarioId: "user_alejandro", partidoId: "match_3", homeGoals: 3, awayGoals: 1 },
    // Match 4: Sudáfrica vs Chequia (Real 1-1). Pred: 1-1. Puntos: 3 (Exacto -> Dorado)
    { id: "pred_alejandro_m4", usuarioId: "user_alejandro", partidoId: "match_4", homeGoals: 1, awayGoals: 1 },
    // Match 5: Chequia vs México (Real 1-2). Pred: 0-0. Puntos: 0 (Neutro)
    { id: "pred_alejandro_m5", usuarioId: "user_alejandro", partidoId: "match_5", homeGoals: 0, awayGoals: 0 },

    // --- CESAR ---
    // Match 1: México vs Sudáfrica (Real 1-2). Pred: 2-1. Puntos: 0 (Neutro)
    { id: "pred_cesar_m1", usuarioId: "user_cesar", partidoId: "match_1", homeGoals: 2, awayGoals: 1 },
    // Match 2: Corea del Sur vs Chequia (Real 0-2). Pred: 4-5. Puntos: 0 (Neutro)
    { id: "pred_cesar_m2", usuarioId: "user_cesar", partidoId: "match_2", homeGoals: 4, awayGoals: 5 },
    // Match 3: México vs Corea del Sur (Real 6-2). Pred: 6-2. Puntos: 3 (Exacto -> Dorado)
    { id: "pred_cesar_m3", usuarioId: "user_cesar", partidoId: "match_3", homeGoals: 6, awayGoals: 2 },
    // Match 4: Sudáfrica vs Chequia (Real 1-1). Pred: 0-0. Puntos: 2 (Empate -> Verde)
    { id: "pred_cesar_m4", usuarioId: "user_cesar", partidoId: "match_4", homeGoals: 0, awayGoals: 0 },
    // Match 5: Chequia vs México (Real 1-2). Pred: 1-0. Puntos: 1 (Goles local 1 -> Número 1 en verde)
    { id: "pred_cesar_m5", usuarioId: "user_cesar", partidoId: "match_5", homeGoals: 1, awayGoals: 0 }
  ];

  for (const p of mockPredictions) {
    const predDocRef = doc(predRef, p.id);
    batch.set(predDocRef, p);
  }

  await batch.commit();
  console.log("Real scores and Excel grid mock data loaded successfully!");
};
