export function getAbbreviatedUserNames(names: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  names.forEach(name => {
    let len = 3;
    let abbrev = name.substring(0, len).toUpperCase().trim();
    while (len < name.length) {
      const isUnique = names.every(other => {
        if (other === name) return true;
        return other.substring(0, len).toUpperCase().trim() !== abbrev;
      });
      if (isUnique) break;
      len++;
      abbrev = name.substring(0, len).toUpperCase().trim();
    }
    result[name] = abbrev;
  });
  return result;
}
