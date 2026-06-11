/**
 * Convierte un nombre completo a "Title Case", donde la primera letra de cada palabra
 * se inicia con mayúscula y las demás en minúscula.
 * Soporta caracteres con acentos en español (á, é, í, ó, ú, ñ, etc.).
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
