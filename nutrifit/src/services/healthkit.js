/**
 * Integración con Apple Health (HealthKit) usando
 * @kingstinct/react-native-healthkit (v13.x).
 *
 * - Escritura: nutrición (kcal, proteína, carbos, grasas) y entrenamientos.
 * - Lectura: calorías activas del día (Apple Watch / entrenos).
 *
 * El módulo nativo se carga de forma perezosa: en Expo Go (o en Android) no
 * existe, así que el resto de la app sigue funcionando y las funciones de
 * Health fallan con un mensaje claro en lugar de romper la app.
 */
import { Platform } from 'react-native';
import { rangoDia } from '../utils/fechas';

let HK = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line global-require
    HK = require('@kingstinct/react-native-healthkit');
  } catch (e) {
    console.warn('[HealthKit] Módulo nativo no disponible (¿Expo Go?):', e?.message);
  }
}

const ID = {
  energia: 'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  proteina: 'HKQuantityTypeIdentifierDietaryProtein',
  carbos: 'HKQuantityTypeIdentifierDietaryCarbohydrates',
  grasas: 'HKQuantityTypeIdentifierDietaryFatTotal',
  activa: 'HKQuantityTypeIdentifierActiveEnergyBurned',
};
const WORKOUT = 'HKWorkoutTypeIdentifier';

const PERMISOS = {
  toShare: [ID.energia, ID.proteina, ID.carbos, ID.grasas, ID.activa, WORKOUT],
  toRead: [ID.activa, WORKOUT],
};

const MSG_NO_DISPONIBLE =
  'Apple Health no está disponible. Usa un Development Build en un iPhone real (no funciona en Expo Go ni en Android).';

let autorizacion = null;

async function asegurarAutorizacion() {
  if (!HK) throw new Error(MSG_NO_DISPONIBLE);
  const disponible = await HK.isHealthDataAvailable();
  if (!disponible) throw new Error('Apple Health no está disponible en este dispositivo.');
  if (!autorizacion) {
    autorizacion = Promise.resolve(HK.requestAuthorization(PERMISOS)).catch((e) => {
      autorizacion = null;
      throw e;
    });
  }
  await autorizacion;
}

/** ¿Está el módulo nativo cargado? (no implica permisos concedidos) */
export const healthModuloCargado = () => Boolean(HK);

/** Pide permisos de lectura/escritura. Devuelve { ok, mensaje }. */
export async function solicitarPermisosHealth() {
  try {
    await asegurarAutorizacion();
    return {
      ok: true,
      mensaje:
        'Permisos solicitados. Si los denegaste antes, actívalos en Ajustes › Salud › Acceso a datos y dispositivos › NutriFit.',
    };
  } catch (e) {
    return { ok: false, mensaje: e?.message || 'No se pudo conectar con Apple Health.' };
  }
}

/* ------------------------------ ESCRITURA ------------------------------ */

/** Escribe una comida como muestras de nutrición en Apple Health. */
export async function guardarNutricionEnHealth({
  nombre,
  calorias,
  proteina,
  carbohidratos,
  grasas,
  fecha = new Date(),
}) {
  await asegurarAutorizacion();

  const opciones = {
    start: fecha,
    end: fecha,
    metadata: { HKFoodType: nombre || 'Comida' },
  };

  const muestras = [
    [ID.energia, 'kcal', calorias],
    [ID.proteina, 'g', proteina],
    [ID.carbos, 'g', carbohidratos],
    [ID.grasas, 'g', grasas],
  ].filter(([, , valor]) => Number(valor) > 0);

  for (const [id, unidad, valor] of muestras) {
    // eslint-disable-next-line no-await-in-loop
    await HK.saveQuantitySample(id, unidad, Math.round(Number(valor) * 10) / 10, opciones);
  }
}

/**
 * Escribe un entrenamiento manual en Apple Health.
 * Intenta crear un Workout (aparece en Fitness/Salud con sus calorías activas).
 * Si la firma de la librería difiere en tu versión, hace fallback a escribir
 * sólo las calorías activas, para que el balance diario no se pierda.
 * Devuelve 'workout' | 'energia'.
 */
export async function guardarEjercicioEnHealth({ hkTipo, inicio, fin, calorias }) {
  await asegurarAutorizacion();

  const tipos = HK.WorkoutActivityType || {};
  const actividad = tipos[hkTipo] ?? tipos.other;
  const kcal = Math.max(0, Math.round(calorias));

  const muestraEnergia = {
    quantityType: ID.activa,
    unit: 'kcal',
    quantity: kcal,
    startDate: inicio,
    endDate: fin,
  };

  try {
    if (actividad === undefined) throw new Error('Tipo de actividad no soportado');
    await HK.saveWorkoutSample(
      actividad,
      kcal > 0 ? [muestraEnergia] : [],
      inicio,
      fin,
      kcal > 0 ? { energyBurned: kcal } : undefined,
      { HKExternalUUID: `nutrifit-${inicio.getTime()}` }
    );
    return 'workout';
  } catch (e) {
    console.warn('[HealthKit] saveWorkoutSample falló, guardando sólo calorías activas:', e?.message);
    if (kcal > 0) {
      await HK.saveQuantitySample(ID.activa, 'kcal', kcal, { start: inicio, end: fin });
    }
    return 'energia';
  }
}

/* ------------------------------- LECTURA ------------------------------- */

// Compatibilidad entre versiones: la forma del filtro cambió entre releases
// de la librería. Enviamos ambas formas y además filtramos en JS más abajo.
const filtroFechas = (start, end) => ({
  date: { startDate: start, endDate: end },
  startDate: start,
  endDate: end,
});

/**
 * Calorías activas quemadas en un día (YYYY-MM-DD).
 * Devuelve un número, o null si Apple Health no está disponible / sin permiso.
 */
export async function leerCaloriasActivas(fechaISO) {
  if (!HK) return null;
  try {
    await asegurarAutorizacion();
    const { start, end } = rangoDia(fechaISO);
    const filter = filtroFechas(start, end);

    // 1) Estadísticas acumuladas (deduplica fuentes: Watch, iPhone, apps)
    try {
      const stats = await HK.queryStatisticsForQuantity(ID.activa, ['cumulativeSum'], {
        filter,
        unit: 'kcal',
      });
      const suma = stats?.sumQuantity?.quantity;
      if (typeof suma === 'number') return Math.round(suma);
    } catch (e) {
      console.warn('[HealthKit] queryStatisticsForQuantity falló, uso muestras:', e?.message);
    }

    // 2) Fallback: sumar muestras del día
    const res = await HK.queryQuantitySamples(ID.activa, { limit: 5000, unit: 'kcal', filter });
    const lista = Array.isArray(res) ? res : res?.samples ?? [];
    const total = lista.reduce((acc, s) => {
      const t = new Date(s.startDate).getTime();
      if (t < start.getTime() || t > end.getTime()) return acc;
      return acc + (Number(s.quantity) || 0);
    }, 0);
    return Math.round(total);
  } catch (e) {
    console.warn('[HealthKit] No se pudieron leer calorías activas:', e?.message);
    return null;
  }
}
