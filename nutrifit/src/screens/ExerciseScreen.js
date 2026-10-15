import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, radius, space } from '../theme';
import { Boton, Campo, Card, Chip, Segmentado, Titulo, Vacio } from '../components/ui';
import {
  eliminarComida,
  eliminarEjercicio,
  insertarEjercicio,
  obtenerComidasRango,
  obtenerEjerciciosRango,
  obtenerMetas,
} from '../services/db';
import { guardarEjercicioEnHealth } from '../services/healthkit';
import { buscarTipo, estimarCalorias, TIPOS_EJERCICIO } from '../utils/ejercicio';
import { fechaLocalISO, formatoFechaCorta, sumarDias } from '../utils/fechas';
import { num } from '../utils/nutricion';

export default function ExerciseScreen() {
  const [vista, setVista] = useState('registrar');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Titulo style={{ marginBottom: space.md }}>Ejercicio</Titulo>
        <Segmentado
          valor={vista}
          onChange={setVista}
          opciones={[
            { key: 'registrar', label: 'Registrar' },
            { key: 'historial', label: 'Historial' },
          ]}
        />
      </View>
      {vista === 'registrar' ? <Registrar /> : <Historial />}
    </SafeAreaView>
  );
}

/* ============================== REGISTRAR =============================== */
function Registrar() {
  const [tipoKey, setTipoKey] = useState('pesas');
  const [duracion, setDuracion] = useState('45');
  const [calorias, setCalorias] = useState('');
  const [dia, setDia] = useState(0); // 0 = hoy, 1 = ayer
  const [pesoKg, setPesoKg] = useState(70);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      obtenerMetas()
        .then((m) => m?.peso && setPesoKg(Number(m.peso)))
        .catch(() => {});
    }, [])
  );

  const tipo = buscarTipo(tipoKey);

  const estimar = () => {
    const min = num(duracion);
    if (min <= 0) {
      Alert.alert('Duración', 'Ingresa primero la duración en minutos.');
      return;
    }
    setCalorias(String(estimarCalorias(tipo.met, pesoKg, min)));
  };

  const guardar = async () => {
    const min = Math.round(num(duracion));
    const kcal = Math.round(num(calorias));
    if (min <= 0) {
      Alert.alert('Duración inválida', 'Ingresa los minutos de entrenamiento.');
      return;
    }
    if (kcal <= 0) {
      Alert.alert('Calorías', 'Ingresa las calorías o pulsa "Estimar".');
      return;
    }

    // El entrenamiento se registra como terminado "ahora" (o ayer a esta hora).
    const fin = new Date();
    fin.setDate(fin.getDate() - dia);
    const inicio = new Date(fin.getTime() - min * 60000);

    setGuardando(true);
    try {
      await insertarEjercicio({
        fecha: fechaLocalISO(fin),
        tipo_ejercicio: tipo.label,
        duracion_min: min,
        calorias_quemadas: kcal,
      });
    } catch (e) {
      setGuardando(false);
      Alert.alert('No se pudo guardar en Supabase', e.message);
      return;
    }

    let aviso = null;
    let modo = null;
    try {
      modo = await guardarEjercicioEnHealth({ hkTipo: tipo.hk, inicio, fin, calorias: kcal });
    } catch (e) {
      aviso = e?.message || 'Error desconocido';
    }
    setGuardando(false);

    Alert.alert(
      aviso ? 'Guardado con un aviso' : 'Entrenamiento guardado',
      aviso
        ? `Se guardó en Supabase, pero no en Apple Health:\n${aviso}`
        : modo === 'workout'
        ? 'Registrado en Supabase y como entrenamiento en Apple Health.'
        : 'Registrado en Supabase. En Apple Health se guardaron las calorías activas (no el entrenamiento completo).'
    );
    if (!aviso) setCalorias('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.etiqueta}>Tipo de ejercicio</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TIPOS_EJERCICIO.map((t) => (
              <Chip
                key={t.key}
                label={`${t.emoji} ${t.label}`}
                activo={tipoKey === t.key}
                onPress={() => setTipoKey(t.key)}
              />
            ))}
          </View>

          <Text style={[styles.etiqueta, { marginTop: space.sm }]}>¿Cuándo?</Text>
          <View style={{ flexDirection: 'row' }}>
            <Chip label="Hoy" activo={dia === 0} onPress={() => setDia(0)} />
            <Chip label="Ayer" activo={dia === 1} onPress={() => setDia(1)} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: space.sm }}>
            <Campo label="Duración" value={duracion} onChangeText={setDuracion} keyboardType="number-pad" sufijo="min" />
            <View style={{ width: space.md }} />
            <Campo label="Calorías quemadas" value={calorias} onChangeText={setCalorias} keyboardType="number-pad" sufijo="kcal" />
          </View>

          <Boton
            titulo={`Estimar (${tipo.met} MET · ${Math.round(pesoKg)} kg)`}
            variante="secundario"
            onPress={estimar}
            style={{ marginTop: space.md }}
          />
          <Text style={styles.nota}>
            La estimación usa MET × peso × horas. Es aproximada; si tu reloj midió el entrenamiento, usa su valor.
          </Text>
        </Card>

        <Boton titulo="Guardar entrenamiento" onPress={guardar} cargando={guardando} style={{ marginTop: space.lg }} />
        <Text style={[styles.nota, { textAlign: 'center' }]}>
          Se guarda en Supabase y se escribe en Apple Health.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============================== HISTORIAL =============================== */
const RANGOS = [
  { key: 7, label: '7 días' },
  { key: 14, label: '14 días' },
  { key: 30, label: '30 días' },
];

const suma = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);

function Historial() {
  const [rango, setRango] = useState(7);
  const [comidas, setComidas] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);

  const cargar = useCallback(async () => {
    const hasta = fechaLocalISO();
    const desde = sumarDias(hasta, -(rango - 1));
    try {
      setError(null);
      const [c, e] = await Promise.all([
        obtenerComidasRango(desde, hasta),
        obtenerEjerciciosRango(desde, hasta),
      ]);
      setComidas(c);
      setEjercicios(e);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [rango]);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      cargar();
    }, [cargar])
  );

  const dias = useMemo(() => {
    const mapa = {};
    const get = (f) => (mapa[f] ||= { fecha: f, comidas: [], ejercicios: [] });
    comidas.forEach((c) => get(c.fecha).comidas.push(c));
    ejercicios.forEach((e) => get(e.fecha).ejercicios.push(e));
    return Object.keys(mapa)
      .sort()
      .reverse()
      .map((f) => ({
        ...mapa[f],
        kcal: suma(mapa[f].comidas, 'calorias'),
        prot: suma(mapa[f].comidas, 'proteina'),
        carb: suma(mapa[f].comidas, 'carbohidratos'),
        gras: suma(mapa[f].comidas, 'grasas'),
        quemadas: suma(mapa[f].ejercicios, 'calorias_quemadas'),
        minutos: suma(mapa[f].ejercicios, 'duracion_min'),
      }));
  }, [comidas, ejercicios]);

  const diasConComida = dias.filter((d) => d.comidas.length > 0);
  const promedio = diasConComida.length
    ? Math.round(diasConComida.reduce((a, d) => a + d.kcal, 0) / diasConComida.length)
    : 0;

  const borrar = (titulo, fn) =>
    Alert.alert('Eliminar registro', `¿Eliminar "${titulo}"? Se borra de la app, no de Apple Health.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await fn();
            cargar();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={() => {
            setRefrescando(true);
            cargar();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <View style={{ flexDirection: 'row', marginBottom: space.sm }}>
        {RANGOS.map((r) => (
          <Chip key={r.key} label={r.label} activo={rango === r.key} onPress={() => setRango(r.key)} />
        ))}
      </View>

      {error ? (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </Card>
      ) : cargando ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
      ) : dias.length === 0 ? (
        <Card>
          <Vacio emoji="📅" texto="No hay registros en este periodo." />
        </Card>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', marginBottom: space.md }}>
            <Resumen valor={promedio} etiqueta="kcal / día (promedio)" color={colors.cal} />
            <Resumen valor={ejercicios.length} etiqueta="entrenamientos" color={colors.burn} />
            <Resumen valor={diasConComida.length} etiqueta={`días con registro`} color={colors.accent} />
          </Card>

          {dias.map((d) => {
            const expandido = abierto === d.fecha;
            return (
              <Pressable key={d.fecha} onPress={() => setAbierto(expandido ? null : d.fecha)}>
                <Card style={{ marginBottom: space.sm }}>
                  <View style={styles.diaCabecera}>
                    <Text style={styles.diaFecha}>{formatoFechaCorta(d.fecha)}</Text>
                    <Text style={styles.diaKcal}>
                      {Math.round(d.kcal)} <Text style={styles.diaKcalU}>kcal</Text>
                    </Text>
                  </View>
                  <Text style={styles.diaMacros}>
                    P {Math.round(d.prot)} g · C {Math.round(d.carb)} g · G {Math.round(d.gras)} g
                  </Text>
                  {d.ejercicios.length > 0 ? (
                    <Text style={[styles.diaMacros, { color: colors.burn }]}>
                      🔥 {Math.round(d.quemadas)} kcal en {d.minutos} min de ejercicio
                      {d.kcal > 0 ? ` · neto ${Math.round(d.kcal - d.quemadas)}` : ''}
                    </Text>
                  ) : null}

                  {expandido ? (
                    <View style={styles.detalle}>
                      {d.comidas.map((c) => (
                        <Fila
                          key={c.id}
                          emoji="🍽️"
                          titulo={c.nombre_plato}
                          detalle={`${c.tipo_comida ? c.tipo_comida + ' · ' : ''}P ${Math.round(c.proteina)} · C ${Math.round(c.carbohidratos)} · G ${Math.round(c.grasas)}`}
                          valor={`${Math.round(c.calorias)} kcal`}
                          onLongPress={() => borrar(c.nombre_plato, () => eliminarComida(c.id))}
                        />
                      ))}
                      {d.ejercicios.map((e) => (
                        <Fila
                          key={e.id}
                          emoji="🏋️"
                          titulo={e.tipo_ejercicio}
                          detalle={`${e.duracion_min} min`}
                          valor={`−${Math.round(e.calorias_quemadas)} kcal`}
                          color={colors.burn}
                          onLongPress={() => borrar(e.tipo_ejercicio, () => eliminarEjercicio(e.id))}
                        />
                      ))}
                      <Text style={styles.nota}>Mantén presionado un registro para eliminarlo.</Text>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function Resumen({ valor, etiqueta, color }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{valor}</Text>
      <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2, textAlign: 'center' }}>{etiqueta}</Text>
    </View>
  );
}

function Fila({ emoji, titulo, detalle, valor, color = colors.cal, onLongPress }) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={350} style={styles.fila}>
      <Text style={{ fontSize: 20, marginRight: space.md }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
          {titulo}
        </Text>
        <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{detalle}</Text>
      </View>
      <Text style={{ color, fontWeight: '700', fontSize: 14 }}>{valor}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, paddingTop: space.sm, paddingBottom: 60 },
  etiqueta: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  nota: { color: colors.textDim, fontSize: 11, marginTop: space.md, lineHeight: 16 },
  diaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  diaFecha: { color: colors.text, fontSize: 16, fontWeight: '700' },
  diaKcal: { color: colors.cal, fontSize: 20, fontWeight: '800' },
  diaKcalU: { color: colors.textDim, fontSize: 12, fontWeight: '500' },
  diaMacros: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  detalle: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
});
