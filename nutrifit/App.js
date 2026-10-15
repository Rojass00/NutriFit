import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  TextInput, 
  Switch 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// ==========================================
// ESTADO GLOBAL DEL USUARIO
// ==========================================
const DEFAULT_USER_PROFILE = {
  gender: 'hombre', // 'hombre' | 'mujer'
  age: '21',
  height: '170',
  weight: '65',
  activityLevel: 'moderado', // 'sedentario' | 'ligero' | 'moderado' | 'intenso'
  goal: 'recomposicion', // 'deficit' | 'mantenimiento' | 'recomposicion' | 'volumen'
  isManual: false, // Automático por defecto
  calorieGoal: '1980',
  proteinGoal: '143',
  carbsGoal: '202',
  fatGoal: '52',
};

// ==========================================
// FÓRMULA CIENTÍFICA DINÁMICA (Mifflin-St Jeor + ISSN Macros)
// ==========================================
function calculateMifflinStJeor(p) {
  const age = parseFloat(p.age) || 21;
  const weight = parseFloat(p.weight) || 65;
  const height = parseFloat(p.height) || 170;

  // 1. Tasa Metabólica Basal (BMR) - Ecuación Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (p.gender === 'hombre') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 2. Factor de Actividad / Sedentarismo
  let activityMultiplier = 1.375;
  if (p.activityLevel === 'sedentario') activityMultiplier = 1.2;
  if (p.activityLevel === 'ligero') activityMultiplier = 1.375;
  if (p.activityLevel === 'moderado') activityMultiplier = 1.55;
  if (p.activityLevel === 'intenso') activityMultiplier = 1.725;

  const tdee = bmr * activityMultiplier;

  // 3. Ajuste de Calorías y Distribución Fisiológica de Macros según Objetivo
  let targetCalories = tdee;
  let proteinFactor = 2.0; // g/kg
  let fatFactor = 0.9;     // g/kg

  if (p.goal === 'deficit') {
    targetCalories = tdee - 500; // Déficit calórico para pérdida de grasa (~0.5kg/sem)
    proteinFactor = 2.4;         // Proteína MUY ALTA para evitar catabolismo muscular
    fatFactor = 0.7;             // Grasas moderadas-bajas
  } else if (p.goal === 'recomposicion') {
    targetCalories = tdee * 0.9; // Déficit ligero del 10%
    proteinFactor = 2.2;         // Proteína alta para síntesis muscular + quema
    fatFactor = 0.8;             // Grasas equilibradas
  } else if (p.goal === 'mantenimiento') {
    targetCalories = tdee;
    proteinFactor = 1.9;         // Proteína moderada para balance neutro
    fatFactor = 0.9;             // Grasas estándar
  } else if (p.goal === 'volumen') {
    targetCalories = tdee + 350; // Superávit controlado para ganar masa magra
    proteinFactor = 1.8;         // Proteína óptima (ahorrada por las calorías extra)
    fatFactor = 1.1;             // Grasas más altas para facilitar ingesta calórica
  }

  const calories = Math.max(1200, Math.round(targetCalories));

  // 4. Cálculo exacto en gramos de Proteína y Grasas
  const protein = Math.round(weight * proteinFactor);
  const fat = Math.round(weight * fatFactor);

  // 5. Los Carbohidratos cubren el resto del presupuesto calórico (4 kcal/g)
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const remainingCalories = calories - (proteinCalories + fatCalories);
  const carbs = Math.max(40, Math.round(remainingCalories / 4));

  return {
    ...p,
    calorieGoal: String(calories),
    proteinGoal: String(protein),
    carbsGoal: String(carbs),
    fatGoal: String(fat),
  };
}

// ==========================================
// 1. PANTALLAS
// ==========================================

function HomeScreen({ userProfile }) {
  const [stats] = useState({
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
  });

  const calorieGoal = parseInt(userProfile.calorieGoal) || 2000;
  const proteinGoal = parseInt(userProfile.proteinGoal) || 130;
  const carbsGoal = parseInt(userProfile.carbsGoal) || 220;
  const fatGoal = parseInt(userProfile.fatGoal) || 60;

  const progress = Math.min((stats.caloriesConsumed / calorieGoal) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header estilo Finanzas */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Resumen</Text>
          <Text style={styles.headerSubtitle}>Jueves, 15 de Octubre</Text>
        </View>

        {/* Tarjeta Principal */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="flame" size={18} color="#FF9F0A" />
            <Text style={styles.cardLabel}>Calorías consumidas</Text>
          </View>

          <Text style={styles.mainValue}>{stats.caloriesConsumed}</Text>
          
          <Text style={styles.goalSubtext}>
            de {calorieGoal} kcal
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Tarjetas de Macros */}
        <Text style={styles.sectionHeading}>Distribución de Macros</Text>
        <View style={styles.gridContainer}>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Proteínas</Text>
            <Text style={styles.macroValue}>{stats.proteinConsumed} <Text style={styles.macroSub}>/ {proteinGoal}g</Text></Text>
            <View style={[styles.miniBar, { backgroundColor: '#FF3B30', width: `${(stats.proteinConsumed / proteinGoal) * 100}%` }]} />
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Carbohidratos</Text>
            <Text style={styles.macroValue}>{stats.carbsConsumed} <Text style={styles.macroSub}>/ {carbsGoal}g</Text></Text>
            <View style={[styles.miniBar, { backgroundColor: '#FF9F0A', width: `${(stats.carbsConsumed / carbsGoal) * 100}%` }]} />
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Grasas</Text>
            <Text style={styles.macroValue}>{stats.fatConsumed} <Text style={styles.macroSub}>/ {fatGoal}g</Text></Text>
            <View style={[styles.miniBar, { backgroundColor: '#30B0C7', width: `${(stats.fatConsumed / fatGoal) * 100}%` }]} />
          </View>
        </View>

        {/* Balance Energético */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Balance Diario</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceNum}>{stats.caloriesConsumed}</Text>
              <Text style={styles.balanceText}>Consumidas</Text>
            </View>
            <Text style={styles.balanceOperator}>−</Text>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceNum}>0</Text>
              <Text style={styles.balanceText}>Quemadas</Text>
            </View>
            <Text style={styles.balanceOperator}>=</Text>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceNum, { color: '#34C759' }]}>{calorieGoal - stats.caloriesConsumed}</Text>
              <Text style={styles.balanceText}>Déficit</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ScanScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.placeholderContainer}>
        <Ionicons name="camera" size={48} color="#FF9F0A" />
        <Text style={styles.placeholderTitle}>Escáner IA</Text>
        <Text style={styles.placeholderSubtitle}>Análisis automático con Gemini 3.5 Flash</Text>
      </View>
    </SafeAreaView>
  );
}

function ExerciseScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.placeholderContainer}>
        <Ionicons name="barbell" size={48} color="#FF9F0A" />
        <Text style={styles.placeholderTitle}>Ejercicio</Text>
        <Text style={styles.placeholderSubtitle}>Registro de entrenamientos y gasto calórico</Text>
      </View>
    </SafeAreaView>
  );
}

function ProfileScreen({ userProfile, setUserProfile }) {
  const [profile, setProfile] = useState(userProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateProfileState = (changes) => {
    let updated = { ...profile, ...changes };
    if (!updated.isManual) {
      updated = calculateMifflinStJeor(updated);
    }
    setProfile(updated);
  };

  const handleToggleManual = (value) => {
    let updated = { ...profile, isManual: value };
    if (!value) {
      updated = calculateMifflinStJeor(updated);
    }
    setProfile(updated);
  };

  const handleSave = () => {
    let finalProfile = { ...profile };
    if (!finalProfile.isManual) {
      finalProfile = calculateMifflinStJeor(finalProfile);
    }
    setUserProfile(finalProfile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
