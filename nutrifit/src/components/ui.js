import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, space } from '../theme';

export function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Titulo({ children, style }) {
  return <Text style={[styles.titulo, style]}>{children}</Text>;
}

export function Subtitulo({ children, style }) {
  return <Text style={[styles.subtitulo, style]}>{children}</Text>;
}

export function Boton({ titulo, onPress, variante = 'primario', cargando, disabled, icono, style }) {
  const secundario = variante === 'secundario';
  const peligro = variante === 'peligro';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || cargando}
      style={({ pressed }) => [
        styles.boton,
        secundario && styles.botonSecundario,
        peligro && styles.botonPeligro,
        (disabled || cargando) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={secundario || peligro ? colors.text : '#06210F'} />
      ) : (
        <Text
          style={[
            styles.botonTexto,
            (secundario || peligro) && { color: peligro ? colors.danger : colors.text },
          ]}
        >
          {icono ? `${icono}  ` : ''}
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, activo, onPress, color = colors.accent }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        activo && { backgroundColor: color, borderColor: color },
      ]}
    >
      <Text style={[styles.chipTexto, activo && { color: '#0B0D12', fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmentado({ opciones, valor, onChange }) {
  return (
    <View style={styles.segmentado}>
      {opciones.map((o) => {
        const activo = o.key === valor;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.segmento, activo && styles.segmentoActivo]}
          >
            <Text style={[styles.segmentoTexto, activo && { color: colors.text, fontWeight: '700' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Campo({
  label,
  value,
  onChangeText,
  sufijo,
  keyboardType = 'default',
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  style,
  compacto,
}) {
  return (
    <View style={[{ flex: 1 }, style]}>
      {label ? <Text style={styles.campoLabel}>{label}</Text> : null}
      <View style={[styles.campoWrap, compacto && { paddingVertical: 0 }]}>
        <TextInput
          style={styles.campoInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectTextOnFocus
        />
        {sufijo ? <Text style={styles.campoSufijo}>{sufijo}</Text> : null}
      </View>
    </View>
  );
}

export function Vacio({ emoji = '🍽️', texto }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
      <Text style={{ fontSize: 34, marginBottom: space.sm }}>{emoji}</Text>
      <Text style={{ color: colors.textDim, textAlign: 'center', lineHeight: 20 }}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titulo: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitulo: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: space.sm },
  boton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  botonSecundario: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  botonPeligro: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  botonTexto: { color: '#06210F', fontSize: 16, fontWeight: '700' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    marginRight: space.sm,
    marginBottom: space.sm,
  },
  chipTexto: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  segmentado: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmento: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  segmentoActivo: { backgroundColor: colors.cardAlt },
  segmentoTexto: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  campoLabel: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  campoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  campoInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 11 },
  campoSufijo: { color: colors.textDim, fontSize: 13, marginLeft: 6 },
});
