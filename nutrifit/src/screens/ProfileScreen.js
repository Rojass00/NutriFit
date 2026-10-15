import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, space } from '../theme';
import { Boton, Campo, Card, Chip, Segmentado, Subtitulo, Titulo } from '../components/ui';
import { guardarMetas, obtenerMetas } from '../services/db';
import {
  getGeminiKey,
  getGeminiModel,
  MODELO_GEMINI_POR_DEFECTO,
  setGeminiKey,
  setGeminiModel,
} from '../services/storage';
import { healthModuloCargado, solicitarPermisosHealth } from '../services/healthkit';
import { ACTIVIDAD, calcularMetas, OBJETIVOS, num } from '../utils/nutricion';

export default function ProfileScreen() {
  const [modo, setModo] = useState('auto');
  const [edad, setEdad] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [sexo, setSexo] = useState('hombre');
  const [actividad, setActividad] = useState('moderado');
  const [objetivo, setObjetivo] = useState('mantenimiento');
  const [manual, setManual] = useState({ cal: '', prot: '', carb: '', gras: '' });

  const [apiKey, setApiKey] = useState('');
  const [modelo, setModelo] = useState(MODELO_GEMINI_POR_DEFECTO);

  const [guardandoMetas, setGuardandoMetas] = useState(false);
  const [guardandoIA, setGuardandoIA] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const m = await obtenerMetas();
          if (m) {
            setModo(m.modo_manual ? 'manual' : 'auto');
            if (m.edad) setEdad(String(m.edad));
            if (m.peso) setPeso(String(Number(m.peso)));
            if (m.altura) setAltura(String(Number(m.altura)));
            if (m.sexo) setSexo(m.sexo);
            if (m.nivel_actividad) setActividad(m.nivel_actividad);
            if (m.objetivo) setObjetivo(m.objetivo);
            setManual({
              cal: m.meta_calorias != null ? String(m.meta_calorias) : '',
              prot: m.meta_proteina != null ? String(m.meta_proteina) : '',
              carb: m.meta_carbos != null ? String(m.meta_carbos) : '',
              gras: m.meta_grasas != null ? String(m.meta_grasas) : '',
            });
          }
        } catch (e) {
          Alert.alert('No se pudieron cargar tus metas', e.message);
        }
        setApiKey(await getGeminiKey());
        setModelo(await getGeminiModel());
      })();
    }, [])
  );

  const calculo = useMemo(
    () =>
      calcularMetas({
        edad: num(edad),
        peso: num(peso),
        altura: num(altura),
        sexo,
        actividad,
        objetivo,
      }),
    [edad, peso, altura, sexo, actividad, objetivo]
  );

  const cambiarModo = (m) => {
    // Al pasar a manual por primera vez, precarga con el cálculo automático.
    if (m === 'manual' && calculo && !manual.cal) {
      setManual({
        cal: String(calculo.calorias),
        prot: String(calculo.proteina),
        carb: String(calculo.carbos),
        gras: String(calculo.grasas),
      });
    }
    setModo(m);
  };

  const guardarPerfil = async () => {
    const datosPersonales = {
      edad: num(edad) > 0 ? Math.round(num(edad)) : null,
      peso: num(peso) > 0 ? num(peso) : null,
      altura: num(altura) > 0 ? num(altura) : null,
      sexo,
      nivel_actividad: actividad,
      objetivo,
    };

    let metas;
    if (modo === 'auto') {
      if (!calculo) {
        Alert.alert('Faltan datos', 'Completa edad, peso y altura para calcular tus metas.');
        return;
      }
      metas = {
        meta_calorias: calculo.calorias,
        meta_proteina: calculo.proteina,
        meta_carbos: calculo.carbos,
        meta_grasas: calculo.grasas,
      };
    } else {
      const v = {
        meta_calorias: Math.round(num(manual.cal)),
        meta_proteina: Math.round(num(manual.prot)),
        meta_carbos: Math.round(num(manual.carb)),
        meta_grasas: Math.round(num(manual.gras)),
      };
      if (v.meta_calorias <= 0) {
        Alert.alert('Calorías', 'Ingresa una meta de calorías mayor a 0.');
        return;
      }
      metas = v;
    }

    setGuardandoMetas(true);
    try {
      await guardarMetas({ ...datosPersonales, ...metas, modo_manual: modo === 'manual' });
      Alert.alert('Metas guardadas', `${metas.meta_calorias} kcal · P ${metas.meta_proteina} g · C ${metas.meta_carbos} g · G ${metas.meta_grasas} g`);
    } catch (e) {
      Alert.alert('No se pudo guardar', e.message);
    } finally {
      setGuardandoMetas(false);
    }
  };

  const guardarIA = async () => {
    setGuardandoIA(true);
    try {
      await setGeminiKey(apiKey);
      await setGeminiModel(modelo);
      setModelo(modelo.trim() || MODELO_GEMINI_POR_DEFECTO);
      Alert.alert('Guardado', 'La configuración de Gemini se guardó en este dispositivo.');
    } finally {
      setGuardandoIA(false);
    }
  };

  const conectarHealth = async () => {
    const r = await solicitarPermisosHealth();
    Alert.alert(r.ok ? 'Apple Health' : 'Apple Health no disponible', r.mensaje);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Titulo style={{ marginBottom: space.lg }}>Perfil y metas</Titulo>

          <Segmentado
            valor={modo}
            onChange={cambiarModo}
            opciones={[
              { key: 'auto', label: 'Automático' },
              { key: 'manual', label: 'Manual' },
            ]}
          />

          {/* ------------ Datos personales (se guardan en ambos modos) ------------ */}
          <Card style={{ marginTop: space.lg }}>
            <Subtitulo>{modo === 'auto' ? 'Tus datos (Mifflin-St Jeor)' : 'Tus datos (opcionales en modo manual)'}</Subtitulo>
            <View style={styles.fila}>
              <Campo label="Edad" value={edad} onChangeText={setEdad} keyboardType="number-pad" sufijo="años" />
              <View style={{ width: space.sm }} />
              <Campo label="Peso" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" sufijo="kg" />
              <View style={{ width: space.sm }} />
              <Campo label="Altura" value={altura} onChangeText={setAltura} keyboardType="decimal-pad" sufijo="cm" />
            </View>

            <Text style={styles.etiqueta}>Sexo</Text>
            <View style={styles.wrap}>
              <Chip label="Hombre" activo={sexo === 'hombre'} onPress={() => setSexo('hombre')} />
              <Chip label="Mujer" activo={sexo === 'mujer'} onPress={() => setSexo('mujer')} />
            </View>

            {modo === 'auto' ? (
              <>
                <Text style={styles.etiqueta}>Nivel de actividad</Text>
                <View style={styles.wrap}>
                  {ACTIVIDAD.map((a) => (
                    <Chip key={a.key} label={a.label} activo={actividad === a.key} onPress={() => setActividad(a.key)} />
                  ))}
                </View>
                <Text style={styles.nota}>{ACTIVIDAD.find((a) => a.key === actividad)?.detalle}</Text>

                <Text style={[styles.etiqueta, { marginTop: space.md }]}>Objetivo</Text>
                <View style={styles.wrap}>
                  {OBJETIVOS.map((o) => (
                    <Chip key={o.key} label={o.label} activo={objetivo === o.key} onPress={() => setObjetivo(o.key)} />
                  ))}
                </View>
              </>
            ) : null}
          </Card>

          {/* ------------------------------ Metas ------------------------------ */}
          {modo === 'auto' ? (
            <Card style={{ marginTop: space.lg, borderColor: colors.accent }}>
              <Subtitulo>Resultado</Subtitulo>
              {calculo ? (
                <>
                  <Text style={styles.nota}>
                    Metabolismo basal {calculo.bmr} kcal · Gasto diario (TDEE) {calculo.tdee} kcal
                  </Text>
                  <Text style={styles.resultadoKcal}>
                    {calculo.calorias} <Text style={{ fontSize: 16, color: colors.textDim }}>kcal / día</Text>
                  </Text>
                  <View style={styles.fila}>
                    <Macro etiqueta="Proteína" valor={calculo.proteina} color={colors.protein} />
                    <Macro etiqueta="Carbos" valor={calculo.carbos} color={colors.carbs} />
                    <Macro etiqueta="Grasas" valor={calculo.grasas} color={colors.fat} />
                  </View>
                  <Text style={styles.nota}>
                    Definición −20 %, volumen +10 % sobre el TDEE. Proteína y grasa por kg de peso; los carbohidratos completan las calorías. Son valores orientativos.
                  </Text>
                </>
              ) : (
                <Text style={styles.nota}>Completa edad, peso y altura para ver tus metas.</Text>
              )}
            </Card>
          ) : (
            <Card style={{ marginTop: space.lg, borderColor: colors.accent }}>
              <Subtitulo>Tus metas diarias</Subtitulo>
              <View style={styles.fila}>
                <Campo label="Calorías" value={manual.cal} onChangeText={(t) => setManual((m) => ({ ...m, cal: t }))} keyboardType="number-pad" sufijo="kcal" />
                <View style={{ width: space.sm }} />
                <Campo label="Proteína" value={manual.prot} onChangeText={(t) => setManual((m) => ({ ...m, prot: t }))} keyboardType="number-pad" sufijo="g" />
              </View>
              <View style={[styles.fila, { marginTop: space.md }]}>
                <Campo label="Carbohidratos" value={manual.carb} onChangeText={(t) => setManual((m) => ({ ...m, carb: t }))} keyboardType="number-pad" sufijo="g" />
                <View style={{ width: space.sm }} />
                <Campo label="Grasas" value={manual.gras} onChangeText={(t) => setManual((m) => ({ ...m, gras: t }))} keyboardType="number-pad" sufijo="g" />
              </View>
            </Card>
          )}

          <Boton titulo="Guardar metas" onPress={guardarPerfil} cargando={guardandoMetas} style={{ marginTop: space.lg }} />

          {/* ------------------------------ Gemini ------------------------------ */}
          <Card style={{ marginTop: space.xl }}>
            <Subtitulo>Gemini (análisis de fotos)</Subtitulo>
            <Campo
              label="API key"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              placeholder="Pega tu clave de Google AI Studio"
              style={{ flex: 0 }}
            />
            <Campo
              label="Modelo"
              value={modelo}
              onChangeText={setModelo}
              placeholder={MODELO_GEMINI_POR_DEFECTO}
              style={{ flex: 0, marginTop: space.md }}
            />
            <Text style={styles.nota}>
              La clave se guarda sólo en este iPhone (AsyncStorage). Obtén una gratis en aistudio.google.com. Los nombres de modelo cambian con frecuencia: si ves "modelo no disponible", cámbialo aquí. En el plan gratuito Google puede usar tus fotos para mejorar sus productos.
            </Text>
            <Boton titulo="Guardar Gemini" variante="secundario" onPress={guardarIA} cargando={guardandoIA} style={{ marginTop: space.md }} />
          </Card>

          {/* ---------------------------- Apple Health ---------------------------- */}
          <Card style={{ marginTop: space.lg }}>
            <Subtitulo>Apple Health</Subtitulo>
            <Text style={styles.nota}>
              {healthModuloCargado()
                ? 'Módulo de HealthKit cargado. Concede permisos de lectura (calorías activas, entrenamientos) y escritura (nutrición, entrenamientos).'
                : 'Módulo de HealthKit no disponible: necesitas un Development Build en un iPhone (no funciona en Expo Go).'}
            </Text>
            <Boton titulo="Conectar Apple Health" variante="secundario" onPress={conectarHealth} style={{ marginTop: space.md }} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Macro({ etiqueta, valor, color }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 24, fontWeight: '800' }}>{valor} g</Text>
      <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, paddingBottom: 60 },
  fila: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  etiqueta: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginTop: space.md, marginBottom: 8 },
  nota: { color: colors.textDim, fontSize: 12, lineHeight: 17 },
  resultadoKcal: { color: colors.text, fontSize: 36, fontWeight: '800', marginVertical: space.md },
});
