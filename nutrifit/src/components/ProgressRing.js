import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Anillo de progreso animado. `progress` entre 0 y 1 (se limita a 1). */
export default function ProgressRing({
  size = 190,
  stroke = 16,
  progress = 0,
  color = colors.cal,
  trackColor = colors.cardAlt,
  children,
}) {
  const radio = (size - stroke) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const p = Math.max(0, Math.min(Number.isFinite(progress) ? progress : 0, 1));

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: p, duration: 800, useNativeDriver: false }).start();
  }, [p, anim]);

  const offset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circunferencia, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}
