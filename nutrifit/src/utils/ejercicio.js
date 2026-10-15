/** `hk` = nombre del miembro de WorkoutActivityType en react-native-healthkit. */
export const TIPOS_EJERCICIO = [
  { key: 'pesas', label: 'Pesas', emoji: '🏋️', met: 5.0, hk: 'traditionalStrengthTraining' },
  { key: 'correr', label: 'Correr', emoji: '🏃', met: 9.8, hk: 'running' },
  { key: 'caminar', label: 'Caminar', emoji: '🚶', met: 3.8, hk: 'walking' },
  { key: 'ciclismo', label: 'Ciclismo', emoji: '🚴', met: 7.5, hk: 'cycling' },
  { key: 'natacion', label: 'Natación', emoji: '🏊', met: 8.0, hk: 'swimming' },
  { key: 'hiit', label: 'HIIT', emoji: '🔥', met: 8.0, hk: 'highIntensityIntervalTraining' },
  { key: 'yoga', label: 'Yoga', emoji: '🧘', met: 2.5, hk: 'yoga' },
  { key: 'futbol', label: 'Fútbol', emoji: '⚽', met: 7.0, hk: 'soccer' },
  { key: 'otro', label: 'Otro', emoji: '💪', met: 5.0, hk: 'other' },
];

export const buscarTipo = (key) =>
  TIPOS_EJERCICIO.find((t) => t.key === key || t.label === key) ||
  TIPOS_EJERCICIO[TIPOS_EJERCICIO.length - 1];

/** kcal ≈ MET × peso(kg) × horas. Es una estimación. */
export const estimarCalorias = (met, pesoKg, minutos) =>
  Math.max(0, Math.round(met * pesoKg * (minutos / 60)));
