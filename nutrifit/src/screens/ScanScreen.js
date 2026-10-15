import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { colors, radius, space } from '../theme';
import { Boton, Campo, Card, Chip, Titulo } from '../components/ui';
import { analizarPlato } from '../services/gemini';
import { getGeminiKey } from '../services/storage';
import { insertarComida } from '../services/db';
import { guardarNutricionEnHealth } from '../services/healthkit';
import { fechaLocalISO } from '../utils/fechas';
import { num, redondear } from '../utils/nutricion';

const TIPOS_COMIDA = ['Desayuno', 'Almuerzo', 'Cena', 'Snack'];
const MACROS = ['calorias', 'proteina', 'carbohidratos', 'grasas'];

const tipoSugerido = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Desayuno';
  if (h < 16) return 'Almuerzo';
  if (h < 19) return 'Snack';
  return 'Cena';
};

const fmt = (n) => String(redondear(n));
let contador = 0;
const nuevoId = () => `it-${Date.now()}-${contador++}`;

/** Macros por gramo, calculados a partir de los valores actuales del ítem. */
const derivarPorGramo = (it) => {
  const g = num(it.gramos);
  if (g <= 0) return null;
  return MACROS.reduce((acc, k) => ({ ...acc, [k]: num(it[k]) / g }), {});
};

const itemDesdeIA = (i) => {
  const base = {
    id: nuevoId(),
    nombre: i.nombre,
    gramos: fmt(i.gramos),
    calorias: fmt(i.calorias),
    proteina: fmt(i.proteina),
    carbohidratos: fmt(i.carbohidratos),
    grasas: fmt(i.grasas),
  };
  return { ...base, porGramo: derivarPorGramo(base) };
};

const itemVacio = () => ({
  id: nuevoId(),
  nombre: '',
  gramos: '',
  calorias: '',
  proteina: '',
  carbohidratos: '',
  grasas: '',
  porGramo: null,
});

export default function ScanScreen() {
  const navigation = useNavigation();
  const [imagen, setImagen] = useState(null);
  const [items, setItems] = useState([]);
  const [nombrePlato, setNombrePlato] = useState('');
  const [tipoComida, setTipoComida] = useState(tipoSugerido());
  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const totales = useMemo(
    () =>
      MACROS.reduce(
        (acc, k) => ({ ...acc, [k]: redondear(items.reduce((a, it) => a + num(it[k]), 0)) }),
        {}
      ),
    [items]
  );

  const reiniciar = () => {
    setImagen(null);
    setItems([]);
    setNombrePlato('');
    setTipoComida(tipoSugerido());
  };

  /* ---------------------------- Foto + análisis --------------------------- */
  const analizar = async (img) => {
    const key = await getGeminiKey();
    if (!key) {
      Alert.alert(
        'Falta la API key de Gemini',
        'Configúrala en Perfil o registra el plato manualmente.',
        [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Ir a Perfil', onPress: () => navigation.navigate('Perfil') },
        ]
      );
      return;
    }
    setAnalizando(true);
    try {
      const r = await analizarPlato(img.base64, img.mimeType);
      if (r.items.length === 0) {
        Alert.alert('Sin resultados', 'No detecté comida en la foto. Prueba con otra o agrega los alimentos manualmente.');
      }
      setItems(r.items.map(itemDesdeIA));
      setNombrePlato(r.items.map((i) => i.nombre).join(', ').slice(0, 80));
    } catch (e) {
      Alert.alert('No se pudo analizar la foto', e.message);
    } finally {
      setAnalizando(false);
    }
  };

  const procesarResultado = (res) => {
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (!a.base64) {
      Alert.alert('Error', 'No se pudo leer la imagen. Inténtalo de nuevo.');
      return;
    }
    const img = { uri: a.uri, base64: a.base64, mimeType: a.mimeType || 'image/jpeg' };
    setImagen(img);
    setItems([]);
    analizar(img);
  };

  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso de cámara', 'Activa el acceso a la cámara en Ajustes › NutriFit.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    procesarResultado(res);
  };

  const elegirDeGaleria = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    procesarResultado(res);
  };

  /* ------------------------------- Edición ------------------------------- */
  const actualizarCampo = (id, campo, texto) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, [campo]: texto };
        if (campo === 'gramos') {
          // Escala los macros proporcionalmente a los gramos.
          if (it.porGramo) {
            const g = num(texto);
            MACROS.forEach((k) => {
              next[k] = fmt((it.porGramo[k] || 0) * g);
            });
          } else {
            next.porGramo = derivarPorGramo(next);
          }
        } else if (MACROS.includes(campo)) {
          // Edición manual de un macro: recalcula la proporción por gramo.
          next.porGramo = derivarPorGramo(next);
        }
        return next;
      })
    );
  };

  const quitarItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  /* -------------------------------- Guardar ------------------------------- */
  const guardar = async () => {
    const validos = items.filter((it) => it.nombre.trim() || num(it.calorias) > 0);
    if (validos.length === 0) {
      Alert.alert('Nada que guardar', 'Agrega al menos un alimento.');
      return;
    }
    if (totales.calorias <= 0) {
      Alert.alert('Revisa las calorías', 'El total de calorías es 0.');
      return;
    }

    const nombre =
      nombrePlato.trim() ||
      validos.map((it) => it.nombre.trim()).filter(Boolean).join(', ').slice(0, 120) ||
      'Comida';

    setGuardando(true);

    // a) Supabase
    try {
      await insertarComida({
        fecha: fechaLocalISO(),
        tipo_comida: tipoComida,
        nombre_plato: nombre,
        calorias: totales.calorias,
        proteina: totales.proteina,
        carbohidratos: totales.carbohidratos,
        grasas: totales.grasas,
      });
    } catch (e) {
      setGuardando(false);
      Alert.alert('No se pudo guardar en Supabase', e.message);
      return;
    }

    // b) Apple Health
    let avisoHealth = null;
    try {
      await guardarNutricionEnHealth({
        nombre,
        calorias: totales.calorias,
        proteina: totales.proteina,
        carbohidratos: totales.carbohidratos,
        grasas: totales.grasas,
      });
    } catch (e) {
      avisoHealth = e?.message || 'Error desconocido';
    }

    setGuardando(false);
    Alert.alert(
      avisoHealth ? 'Guardado con un aviso' : 'Comida guardada',
      avisoHealth
        ? `Se guardó en Supabase, pero no en Apple Health:\n${avisoHealth}`
        : 'Registrada en Supabase y en Apple Health.',
      [
        {
          text: 'Ver mi día',
          onPress: () => {
            reiniciar();
            navigation.navigate('Inicio');
          },
        },
      ]
    );
  };

  /* --------------------------------- UI ---------------------------------- */
  const hayResultados = items.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Titulo style={{ marginBottom: space.lg }}>Escanear plato</Titulo>

          {/* Foto */}
          {imagen ? (
            <View style={styles.fotoWrap}>
              <Image source={{ uri: imagen.uri }} style={styles.foto} />
              {analizando ? (
                <View style={styles.fotoOverlay}>
                  <ActivityIndicator color={colors.accent} size="large" />
                  <Text style={{ color: colors.text, marginTop: space.md, fontWeight: '600' }}>
                    Analizando con Gemini…
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Card style={styles.placeholder}>
              <Text style={{ fontSize: 44 }}>📷</Text>
              <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: space.sm }}>
                Fotografía tu plato desde arriba y con buena luz para estimaciones más precisas.
              </Text>
            </Card>
          )}

          <View style={styles.filaBotones}>
            <Boton titulo="Tomar foto" icono="📸" onPress={tomarFoto} disabled={analizando} style={{ flex: 1 }} />
            <View style={{ width: space.md }} />
            <Boton
              titulo="Galería"
              icono="🖼️"
              variante="secundario"
              onPress={elegirDeGaleria}
              disabled={analizando}
              style={{ flex: 1 }}
            />
          </View>

          {imagen && !analizando && !hayResultados ? (
            <Boton
              titulo="Reintentar análisis"
              variante="secundario"
              onPress={() => analizar(imagen)}
              style={{ marginTop: space.md }}
            />
          ) : null}

          {/* Confirmación */}
          {(hayResultados || imagen) && !analizando ? (
            <View style={{ marginTop: space.xl }}>
              <Text style={styles.seccion}>Confirma y ajusta</Text>

              <Campo
                label="Nombre del plato"
                value={nombrePlato}
                onChangeText={setNombrePlato}
                autoCapitalize="sentences"
                placeholder="Ej. Pollo con arroz"
                style={{ flex: 0, marginBottom: space.md }}
              />

              <Text style={styles.etiqueta}>Tipo de comida</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {TIPOS_COMIDA.map((t) => (
                  <Chip key={t} label={t} activo={tipoComida === t} onPress={() => setTipoComida(t)} />
                ))}
              </View>

              {items.map((it) => (
                <Card key={it.id} style={{ marginTop: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Campo
                      label="Alimento"
                      value={it.nombre}
                      onChangeText={(t) => actualizarCampo(it.id, 'nombre', t)}
                      autoCapitalize="sentences"
                      style={{ flex: 1 }}
                    />
                    <Text onPress={() => quitarItem(it.id)} style={styles.quitar}>
                      ✕
                    </Text>
                  </View>
                  <View style={styles.filaCampos}>
                    <Campo label="Gramos" value={it.gramos} onChangeText={(t) => actualizarCampo(it.id, 'gramos', t)} keyboardType="decimal-pad" sufijo="g" />
                    <View style={{ width: space.sm }} />
                    <Campo label="Calorías" value={it.calorias} onChangeText={(t) => actualizarCampo(it.id, 'calorias', t)} keyboardType="decimal-pad" sufijo="kcal" />
                  </View>
                  <View style={styles.filaCampos}>
                    <Campo label="Proteína" value={it.proteina} onChangeText={(t) => actualizarCampo(it.id, 'proteina', t)} keyboardType="decimal-pad" sufijo="g" />
                    <View style={{ width: space.sm }} />
                    <Campo label="Carbos" value={it.carbohidratos} onChangeText={(t) => actualizarCampo(it.id, 'carbohidratos', t)} keyboardType="decimal-pad" sufijo="g" />
                    <View style={{ width: space.sm }} />
                    <Campo label="Grasas" value={it.grasas} onChangeText={(t) => actualizarCampo(it.id, 'grasas', t)} keyboardType="decimal-pad" sufijo="g" />
                  </View>
                </Card>
              ))}

              <Boton
                titulo="Agregar alimento"
                icono="＋"
                variante="secundario"
                onPress={() => setItems((p) => [...p, itemVacio()])}
                style={{ marginTop: space.md }}
              />

              {/* Totales */}
              <Card style={{ marginTop: space.lg, backgroundColor: colors.accentDark, borderColor: colors.accent }}>
                <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: space.sm }}>Total del plato</Text>
                <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>
                  {Math.round(totales.calorias)} <Text style={{ fontSize: 16, color: colors.textDim }}>kcal</Text>
                </Text>
                <Text style={{ color: colors.text, marginTop: 4 }}>
                  Proteína {totales.proteina} g · Carbos {totales.carbohidratos} g · Grasas {totales.grasas} g
                </Text>
              </Card>

              <Boton
                titulo="Guardar"
                onPress={guardar}
                cargando={guardando}
                disabled={items.length === 0}
                style={{ marginTop: space.lg }}
              />
              <Boton titulo="Descartar" variante="peligro" onPress={reiniciar} disabled={guardando} style={{ marginTop: space.sm }} />
            </View>
          ) : (
            <Boton
              titulo="Registrar manualmente sin foto"
              variante="secundario"
              onPress={() => setItems([itemVacio()])}
              style={{ marginTop: space.md }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, paddingBottom: 60 },
  placeholder: { alignItems: 'center', paddingVertical: 40, marginBottom: space.lg },
  fotoWrap: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: space.lg },
  foto: { width: '100%', height: 260, backgroundColor: colors.card },
  fotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,13,18,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaBotones: { flexDirection: 'row' },
  seccion: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: space.md },
  etiqueta: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  filaCampos: { flexDirection: 'row', marginTop: space.md },
  quitar: { color: colors.danger, fontSize: 20, paddingHorizontal: 14, paddingBottom: 12 },
});
