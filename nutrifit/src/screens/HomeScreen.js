import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { colors, radius, space } from '../theme';
import { Boton, Card, Titulo, Vacio } from '../components/ui';
import ProgressRing from '../components/ProgressRing';
import MacroBar from '../components/MacroBar';
import { eliminarComida, obtenerComidas, obtenerEjercicios, obtenerMetas } from '../services/db';
import { leerCaloriasActivas } from '../services/healthkit';
import { fechaLocalISO, formatoFechaLarga } from '../utils/fechas';
import { METAS_POR_DEFECTO } from '../utils/nutricion';

const EMOJI_COMIDA = { Desayuno: '🍳', Almuerzo: '🍛', Cena: '🌙', Snack: '🍎' };

const suma = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);

export default function HomeScreen() {
  const navigation = useNavigation();
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [metas, setMetas] = useState(null);
  const [comidas, setComidas] = useState([]);
  const [quemadas, setQuemadas] = useState({ valor: 0, origen: 'ninguno' });
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [verRestante, setVerRestante] = useState(false);

  const cargar = useCallback(async () => {
    const hoy = fechaLocalISO();
    setFecha(hoy);
    try {
      setError(null);
      const [m, c, e] = await Promise.all([
        obtenerMetas(),
        obtenerComidas(hoy),
        obtenerEjercicios(hoy),
      ]);
      setMetas(m);
      setComidas(c);

      const manual = suma(e, 'calorias_quemadas');
      const hk = await leerCaloriasActivas(hoy); // null si Health no está disponible
      setQuemadas(
        hk !== null
          ? { valor: Math.max(hk, manual), origen: 'Apple Health' }
          : { valor: manual, origen: 'Registro manual' }
      );
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const meta = useMemo(
    () => ({
      cal: metas?.meta_calorias ?? METAS_POR_DEFECTO.meta_calorias,
      prot: metas?.meta_proteina ?? METAS_POR_DEFECTO.meta_proteina,
      carb: metas?.meta_carbos ?? METAS_POR_DEFECTO.meta_carbos,
      gras: metas?.meta_grasas ?? METAS_POR_DEFECTO.meta_grasas,
    }),
    [metas]
  );

  const total = useMemo(
    () => ({
      cal: suma(comidas, 'calorias'),
      prot: suma(comidas, 'proteina'),
      carb: suma(comidas, 'carbohidratos'),
      gras: suma(comidas, 'grasas'),
    }),
    [comidas]
  );

  const neto = Math.round(total.cal - quemadas.valor);
  const restante = Math.round(meta.cal - total.cal);
  const excedido = total.cal > meta.cal;

  const confirmarBorrado = (c) => {
    Alert.alert(
      'Eliminar comida',
      `¿Eliminar "${c.nombre_plato}"?\nSe borrará de la app; el registro en Apple Health se conserva y puedes quitarlo desde la app Salud.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarComida(c.id);
              cargar();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.centro} edges={['top']}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
        <Text style={styles.fecha}>{formatoFechaLarga(fecha)}</Text>
        <Titulo style={{ marginBottom: space.lg }}>Tu día</Titulo>

        {error ? (
          <Card style={{ borderColor: colors.danger, marginBottom: space.lg }}>
            <Text style={{ color: colors.danger, fontWeight: '700', marginBottom: 4 }}>
              No se pudo conectar con Supabase
            </Text>
            <Text style={{ color: colors.textDim, marginBottom: space.md }}>{error}</Text>
            <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
          </Card>
        ) : null}

        {!metas && !error ? (
          <Card style={{ marginBottom: space.lg }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 4 }}>
              Aún no configuras tus metas
            </Text>
            <Text style={{ color: colors.textDim, marginBottom: space.md }}>
              Estás viendo metas de ejemplo. Ajústalas en Perfil.
            </Text>
            <Boton titulo="Ir a Perfil" variante="secundario" onPress={() => navigation.navigate('Perfil')} />
          </Card>
        ) : null}

        {/* Calorías */}
        <Card style={{ alignItems: 'center', marginBottom: space.lg }}>
          <Pressable onPress={() => setVerRestante((v) => !v)}>
            <ProgressRing
              progress={meta.cal > 0 ? total.cal / meta.cal : 0}
              color={excedido ? colors.danger : colors.cal}
            >
              <Text style={styles.ringNumero}>
                {verRestante ? Math.abs(restante) : Math.round(total.cal)}
              </Text>
              <Text style={styles.ringLabel}>
                {verRestante
                  ? restante >= 0
                    ? 'kcal restantes'
                    : 'kcal de más'
                  : `de ${Math.round(meta.cal)} kcal`}
              </Text>
              <Text style={styles.ringHint}>toca para cambiar</Text>
            </ProgressRing>
          </Pressable>
        </Card>

        {/* Macros */}
        <Card style={{ marginBottom: space.lg }}>
          <MacroBar label="Proteínas" actual={total.prot} meta={meta.prot} color={colors.protein} />
          <MacroBar label="Carbohidratos" actual={total.carb} meta={meta.carb} color={colors.carbs} />
          <MacroBar label="Grasas" actual={total.gras} meta={meta.gras} color={colors.fat} />
        </Card>

        {/* Apple Health */}
        <Card style={{ marginBottom: space.lg }}>
          <View style={styles.filaTitulo}>
            <Text style={styles.cardTitulo}>Balance con actividad</Text>
            <Text style={styles.origen}>{quemadas.origen}</Text>
          </View>
          <View style={styles.fila}>
            <Dato etiqueta="Consumidas" valor={Math.round(total.cal)} color={colors.cal} />
            <Text style={styles.operador}>−</Text>
            <Dato etiqueta="Quemadas" valor={Math.round(quemadas.valor)} color={colors.burn} />
            <Text style={styles.operador}>=</Text>
            <Dato
              etiqueta={neto <= 0 ? 'Déficit' : 'Superávit'}
              valor={`${neto > 0 ? '+' : ''}${neto}`}
              color={neto <= 0 ? colors.accent : colors.cal}
            />
          </View>
          <Text style={styles.nota}>Calorías activas (no incluye metabolismo basal), en kcal.</Text>
        </Card>

        {/* Comidas */}
        <Text style={styles.seccion}>Comidas de hoy</Text>
        {comidas.length === 0 ? (
          <Card>
            <Vacio texto="Todavía no registras comidas hoy.\nToma una foto de tu plato en la pestaña Escanear." />
          </Card>
        ) : (
          comidas.map((c) => (
            <Pressable key={c.id} onLongPress={() => confirmarBorrado(c)} delayLongPress={350}>
              <Card style={styles.comida}>
                <Text style={{ fontSize: 26, marginRight: space.md }}>
                  {EMOJI_COMIDA[c.tipo_comida] || '🍽️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.comidaNombre} numberOfLines={2}>
                    {c.nombre_plato}
                  </Text>
                  <Text style={styles.comidaMacros}>
                    {c.tipo_comida ? `${c.tipo_comida} · ` : ''}P {Math.round(c.proteina)} · C{' '}
                    {Math.round(c.carbohidratos)} · G {Math.round(c.grasas)}
                  </Text>
                </View>
                <Text style={styles.comidaKcal}>{Math.round(c.calorias)}</Text>
                <Text style={styles.comidaKcalU}> kcal</Text>
              </Card>
            </Pressable>
          ))
        )}
        {comidas.length > 0 ? (
          <Text style={[styles.nota, { textAlign: 'center' }]}>Mantén presionada una comida para eliminarla.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Dato({ etiqueta, valor, color }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontSize: 24, fontWeight: '800' }}>{valor}</Text>
      <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centro: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: space.lg, paddingBottom: 40 },
  fecha: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  ringNumero: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  ringLabel: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  ringHint: { color: colors.border, fontSize: 10, marginTop: 6 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  cardTitulo: { color: colors.text, fontSize: 16, fontWeight: '700' },
  origen: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fila: { flexDirection: 'row', alignItems: 'center' },
  operador: { color: colors.textDim, fontSize: 20, fontWeight: '300' },
  nota: { color: colors.textDim, fontSize: 11, marginTop: space.md },
  seccion: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: space.md },
  comida: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm, padding: space.md },
  comidaNombre: { color: colors.text, fontSize: 15, fontWeight: '600' },
  comidaMacros: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  comidaKcal: { color: colors.cal, fontSize: 18, fontWeight: '800' },
  comidaKcalU: { color: colors.textDim, fontSize: 11, marginTop: 5 },
});
