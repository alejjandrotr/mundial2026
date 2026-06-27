import type { Partido, Usuario } from '../models/types';
import { calculateMatchPoints } from './scoring';
import { toTitleCase } from './format';

export function generateBarChartRaceCSV(
  users: Usuario[],
  matches: Partido[],
  predictions: Record<string, Record<string, { homeGoals: number | null; awayGoals: number | null }>>
) {
  // 1. Filtrar y ordenar partidos finalizados cronológicamente
  const finishedMatches = [...matches]
    .filter(m => m.status === 'finished' && m.homeGoals !== null && m.awayGoals !== null)
    .sort((a, b) => {
      const timeA = a.kickoffTime?.toDate ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime).getTime();
      const timeB = b.kickoffTime?.toDate ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime).getTime();
      return timeA - timeB;
    });

  if (finishedMatches.length === 0) {
    alert("No hay partidos finalizados para generar el historial.");
    return;
  }

  // 2. Crear las columnas del CSV (Nombre, Imagen, P1, P2, ...) con detalles del partido y resultado
  let csvContent = "Nombre,ImagenURL";
  finishedMatches.forEach((match) => {
    const label = `${match.homeTeam} vs ${match.awayTeam} (${match.homeGoals}-${match.awayGoals})`;
    csvContent += `,"${label}"`;
  });
  csvContent += "\n";

  // 3. Iterar por cada usuario y calcular sus puntos acumulados
  users.forEach(user => {
    const userName = toTitleCase(user.displayName || "Desconocido").replace(/,/g, ''); // Evitar comas que rompan el CSV
    const imageUrl = (user as any).photoURL || ""; 
    
    let userRow = `"${userName}","${imageUrl}"`;
    let currentTotal = 0;
    
    const userPreds = predictions[user.uid] || {};

    finishedMatches.forEach(match => {
      const pred = userPreds[match.id];
      if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
        const { points, matchedHome, matchedAway } = calculateMatchPoints(
          pred.homeGoals, pred.awayGoals,
          match.homeGoals, match.awayGoals
        );
        
        let matchPoints = points;
        if (matchedHome) matchPoints += 0.001;
        if (matchedAway) matchPoints += 0.001;

        currentTotal += matchPoints;
      }
      
      // Añadir el total acumulado hasta este partido (redondeado a 3 decimales)
      userRow += `,${currentTotal.toFixed(3)}`;
    });

    csvContent += userRow + "\n";
  });

  // 4. Descargar el archivo CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "barchart_race.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
