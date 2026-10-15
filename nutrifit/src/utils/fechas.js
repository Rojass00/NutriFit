/** Fecha local en formato YYYY-MM-DD (sin desfases por UTC). */
export const fechaLocalISO = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Inicio y fin (hora local) de un día YYYY-MM-DD. */
export const rangoDia = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
};

export const sumarDias = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return fechaLocalISO(d);
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatoFechaLarga = (iso) =>
  cap(
    parseISO(iso).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );

export const formatoFechaCorta = (iso) =>
  cap(
    parseISO(iso).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  );
