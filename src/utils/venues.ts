export interface Venue {
  country: 'México' | 'Canadá' | 'USA';
  flag: string;
  city: string;
}

export function getMatchVenue(group: string, homeTeam: string): Venue {
  const g = group.trim().toUpperCase();
  if (g === 'A' || homeTeam === 'México') {
    // México host group stage matches
    const cities = ['Ciudad de México', 'Guadalajara', 'Monterrey'];
    const city = cities[homeTeam.charCodeAt(0) % cities.length];
    return { country: 'México', flag: '🇲🇽', city };
  } else if (g === 'B' || homeTeam === 'Canadá') {
    // Canada host group stage matches
    const cities = ['Vancouver', 'Toronto'];
    const city = cities[homeTeam.charCodeAt(0) % cities.length];
    return { country: 'Canadá', flag: '🇨🇦', city };
  } else {
    // USA host the rest
    const cities = [
      'Miami', 
      'Los Ángeles', 
      'Nueva York', 
      'Dallas', 
      'Atlanta', 
      'Seattle', 
      'San Francisco', 
      'Boston', 
      'Filadelfia', 
      'Kansas City', 
      'Houston'
    ];
    const city = cities[homeTeam.charCodeAt(0) % cities.length];
    return { country: 'USA', flag: '🇺🇸', city };
  }
}
