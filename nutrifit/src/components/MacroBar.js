import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { colors, radius } from '../theme';

/** Barra de progreso de un macro: "Proteínas  85 / 150 g". */
export default function MacroBar({ label, actual, meta, color }) {
  const p = meta > 0 ? Math.min(actual / meta, 1) : 0;
  const excedido = meta > 0 && actual > meta;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: p, duration: 700, useNativeDriver: false }).start();
  }, [p, anim]);

  const ancho = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: excedido ? colors.danger : colors.textDim, fontSize: 13 }}>
          {Math.round(actual)} / {Math.round(meta)} g
        </Text>
      </View>
      <View
        style={{
          height: 10,
          backgroundColor: colors.cardAlt,
          borderRadius: radius.pill,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width: ancho,
            height: '100%',
            backgroundColor: excedido ? colors.danger : color,
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
}
