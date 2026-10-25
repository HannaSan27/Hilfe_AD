const TZ = 'America/Bogota';
const clave = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); // AAAA-MM-DD

export function etiquetaDia(d: Date): string {
  const k = clave(d);
  if (k === clave(new Date())) return 'Hoy';
  if (k === clave(new Date(Date.now() - 864e5))) return 'Ayer';
  const s = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function horaDe(d: Date | string): string {
  return new Date(d).toLocaleTimeString('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

// Espera la lista ya ordenada de más reciente a más antigua
export function agruparPorFecha<T extends { fecha: Date | string }>(items: T[]) {
  const mapa = new Map<string, { etiqueta: string; items: T[] }>();
  for (const it of items) {
    const d = new Date(it.fecha);
    const k = clave(d);
    if (!mapa.has(k)) mapa.set(k, { etiqueta: etiquetaDia(d), items: [] });
    mapa.get(k)!.items.push(it);
  }
  return [...mapa.values()];
}