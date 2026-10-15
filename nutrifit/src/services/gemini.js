/**
 * Análisis de fotos de comida con la API de Gemini (REST, sin SDK).
 *
 * Nota: `gemini-1.5-flash` ya fue dado de baja por Google. El modelo por
 * defecto es configurable desde Perfil y, si el elegido responde "no
 * encontrado", se prueban automáticamente los de respaldo.
 */
import { getGeminiKey, getGeminiModel } from './storage';
import { num, redondear } from '../utils/nutricion';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELOS_RESPALDO = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash'];

const PROMPT = `Eres un nutricionista experto. Analiza la foto del plato de comida.
1. Identifica cada alimento visible por separado.
2. Estima el peso en gramos de cada porción de forma realista.
3. Estima calorías (kcal), proteína (g), carbohidratos (g) y grasas (g) de cada porción.
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con EXACTAMENTE esta estructura:
{"items":[{"nombre":"...","gramos":0,"calorias":0,"proteina":0,"carbohidratos":0,"grasas":0}],"totales":{"calorias":0,"proteina":0,"carbohidratos":0,"grasas":0}}
Reglas: nombres en español; todos los valores numéricos son números (no texto); "totales" es la suma de "items". Si la imagen no contiene comida, responde {"items":[],"totales":{"calorias":0,"proteina":0,"carbohidratos":0,"grasas":0}}.`;

class ErrorGemini extends Error {
  constructor(message, { status, reintentarConOtroModelo = false } = {}) {
    super(message);
    this.status = status;
    this.reintentarConOtroModelo = reintentarConOtroModelo;
  }
}

function extraerJSON(texto) {
  const limpio = texto
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const i = limpio.indexOf('{');
    const j = limpio.lastIndexOf('}');
    if (i >= 0 && j > i) return JSON.parse(limpio.slice(i, j + 1));
    throw new Error('La IA no devolvió un JSON válido. Intenta de nuevo con otra foto.');
  }
}

function normalizar(json) {
  const items = (Array.isArray(json?.items) ? json.items : []).map((it) => ({
    nombre: String(it?.nombre ?? 'Alimento').trim() || 'Alimento',
    gramos: redondear(num(it?.gramos)),
    calorias: redondear(num(it?.calorias)),
    proteina: redondear(num(it?.proteina)),
    carbohidratos: redondear(num(it?.carbohidratos)),
    grasas: redondear(num(it?.grasas)),
  }));
  // Recalculamos totales desde los ítems para que siempre sean consistentes.
  const sum = (k) => redondear(items.reduce((a, it) => a + it[k], 0));
  return {
    items,
    totales: {
      calorias: sum('calorias'),
      proteina: sum('proteina'),
      carbohidratos: sum('carbohidratos'),
      grasas: sum('grasas'),
    },
  };
}

async function llamarModelo(modelo, apiKey, base64, mimeType) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/${encodeURIComponent(modelo)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }],
          },
        ],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
  } catch {
    throw new ErrorGemini('Sin conexión con Gemini. Revisa tu internet.');
  }

  const cuerpo = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detalle = cuerpo?.error?.message || `HTTP ${res.status}`;
    if (res.status === 404 || /not found|no longer available|deprecated/i.test(detalle)) {
      throw new ErrorGemini(`El modelo "${modelo}" no está disponible.`, {
        status: res.status,
        reintentarConOtroModelo: true,
      });
    }
    if (res.status === 429) {
      throw new ErrorGemini(
        'Se alcanzó el límite gratuito de Gemini (por minuto o por día). Espera un momento e inténtalo de nuevo.',
        { status: 429 }
      );
    }
    if (res.status === 400 && /api key/i.test(detalle)) {
      throw new ErrorGemini('La API key de Gemini no es válida. Revísala en Perfil.', { status: 400 });
    }
    if (res.status === 401 || res.status === 403) {
      throw new ErrorGemini('Gemini rechazó la API key. Revísala en Perfil.', { status: res.status });
    }
    throw new ErrorGemini(`Gemini respondió con error: ${detalle}`, { status: res.status });
  }

  if (cuerpo?.promptFeedback?.blockReason) {
    throw new ErrorGemini('Gemini bloqueó la imagen. Prueba con otra foto.');
  }
  const texto = (cuerpo?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p?.text ?? '')
    .join('')
    .trim();
  if (!texto) throw new ErrorGemini('Gemini no devolvió resultados. Intenta de nuevo.');
  return texto;
}

/**
 * Analiza una foto (base64 sin prefijo data:) y devuelve
 * { items: [...], totales: {...} }.
 */
export async function analizarPlato(base64, mimeType = 'image/jpeg') {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error('Falta la API key de Gemini. Configúrala en la pestaña Perfil.');

  const elegido = await getGeminiModel();
  const candidatos = [elegido, ...MODELOS_RESPALDO.filter((m) => m !== elegido)];

  let ultimoError = null;
  for (const modelo of candidatos) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const texto = await llamarModelo(modelo, apiKey, base64, mimeType);
      return normalizar(extraerJSON(texto));
    } catch (e) {
      ultimoError = e;
      if (!(e instanceof ErrorGemini && e.reintentarConOtroModelo)) throw e;
    }
  }
  throw new Error(
    `${ultimoError?.message ?? 'Ningún modelo respondió.'} Cambia el modelo en Perfil (consulta ai.google.dev/gemini-api/docs/models).`
  );
}
