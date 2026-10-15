/** Convierte texto ("12,5" o "12.5") a número; vacío/inválido → 0. */
export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const redondear = (n, dec = 1) => {
  const f = 10 ** dec;
  return Math.round((Number(n) || 0) * f) / f;
};

export const ACTIVIDAD = [
  { key: 'sedentario', label: 'Sedentario', detalle: 'Poco o nada de ejercicio', factor: 1.2 },
  { key: 'ligero', label: 'Ligero', detalle: '1–3 días por semana', factor: 1.375 },
  { key: 'moderado', label: 'Moderado', detalle: '3–5 días por semana', factor: 1.55 },
  { key: 'alto', label: 'Alto', detalle: '6–7 días por semana', factor: 1.725 },
  { key: 'muy_alto', label: 'Muy alto', detalle: 'Entreno intenso / doble sesión', factor: 1.9 },
];

export const OBJETIVOS = [
  { key: 'definicion', label: 'Definición', ajuste: -0.2, proteinaKg: 2.2, grasaKg: 0.8 },
  { key: 'mantenimiento', label: 'Mantenimiento', ajuste: 0, proteinaKg: 1.8, grasaKg: 0.9 },
  { key: 'volumen', label: 'Volumen', ajuste: 0.1, proteinaKg: 2.0, grasaKg: 1.0 },
];

/** Mifflin-St Jeor: tasa metabólica basal (kcal/día). */
export function calcularBMR({ sexo, peso, altura, edad }) {
  const base = 10 * peso + 6.25 * altura - 5 * edad;
  return sexo === 'mujer' ? base - 161 : base + 5;
}

/**
 * Calcula TDEE y metas de macros. Devuelve null si faltan datos válidos.
 * Proteína y grasa por kg de peso; los carbohidratos completan las calorías.
 */
export function calcularMetas({ edad, peso, altura, sexo, actividad, objetivo }) {
  if (!(edad > 0 && peso > 0 && altura > 0) || !sexo) return null;
  const act = ACTIVIDAD.find((a) => a.key === actividad);
  const obj = OBJETIVOS.find((o) => o.key === objetivo);
  if (!act || !obj) return null;

  const bmr = calcularBMR({ sexo, peso, altura, edad });
  const tdee = bmr * act.factor;
  const calorias = Math.round(tdee * (1 + obj.ajuste));

  const proteina = Math.round(peso * obj.proteinaKg);
  const grasas = Math.round(peso * obj.grasaKg);
  const kcalRestantes = calorias - proteina * 4 - grasas * 9;
  const carbos = Math.max(50, Math.round(kcalRestantes / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorias,
    proteina,
    carbos,
    grasas,
  };
}

export const METAS_POR_DEFECTO = {
  meta_calorias: 2000,
  meta_proteina: 120,
  meta_carbos: 220,
  meta_grasas: 65,
};
