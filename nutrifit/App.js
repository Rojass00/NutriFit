import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// ==========================================
// 1. PANTALLAS (Screen Components)
// ==========================================

function HomeScreen() {
  const [stats] = useState({
    caloriesConsumed: 0,
    calorieGoal: 2000,
    proteinConsumed: 0,
    proteinGoal: 120,
    carbsConsumed: 0,
    carbsGoal: 220,
    fatConsumed: 0,
    fatGoal: 65,
  });

  const progress = Math.min((stats.caloriesConsumed / stats.calorieGoal) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Encabezado */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerSubtitle}>Jueves, 15 de octubre</Text>
          <Text style={styles.headerTitle}>Resumen</Text>
        </View>

        {/* Tarjeta Principal de Calorías */}
        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>🔥 Calorías consumidas</Text>
          <View style={styles.calorieRow}>
            <Text style={styles.mainValue}>{stats.caloriesConsumed}</Text>
            <Text style={styles.goalValue}> / {stats.calorieGoal} kcal</Text>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Tarjetas de Macros (Grid estilo Finanzas) */}
        <Text style={styles.sectionHeading}>Distribución de Macros</Text>
        <View style={styles.gridContainer}>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Proteínas</Text>
            <Text style={styles.macroValue}>{stats.proteinConsumed} <Text style={styles.macroSub}>/ {stats.proteinGoal}g</Text></Text>
            <View style={[styles.miniBar, { backgroundColor: '#FF3B30', width: `${(stats.proteinConsumed / stats.proteinGoal) * 100}%` }]} />
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Carbohidratos</Text>
            <Text style={styles.macroValue}>{stats.carbsConsumed} <Text style={styles.macroSub}>/ {stats.carbsGoal}g</Text></Text>
            <View style={[styles.miniBar, { backgroundColor: '#FF9F0A', width: `${(stats.carbsConsumed / stats.carbsGoal) * 100}%` }]} />
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Grasas</Text>
            <Text style={styles.macroValue}>{stats.fatConsumed} <Text style={styles.macroSub}>/ {stats.fatGoal}g</Text></Text>
            <View style={[styles.miniBar, { backgroundColor: '#30B0C7', width: `${(stats.fatConsumed / stats.fatGoal) * 100}%` }]} />
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
              <Text style={[styles.balanceNum, { color: '#34C759' }]}>{stats.calorieGoal - stats.caloriesConsumed}</Text>
              <Text style={styles.balanceText}>Déficit</Text>
            </View>
          </View>
        </View>

        {/* Espaciado de seguridad inferior */}
        <View style={{ height: 40 }} />
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
        <Text style={styles.placeholderSubtitle}>Próximamente análisis con Gemini 3.5 Flash</Text>
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

function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.placeholderContainer}>
        <Ionicons name="person" size={48} color="#FF9F0A" />
        <Text style={styles.placeholderTitle}>Perfil</Text>
        <Text style={styles.placeholderSubtitle}>Ajustes de usuario y metas diarias</Text>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 2. NAVEGACIÓN Y CONFIGURACIÓN PRINCIPAL
// ==========================================

const Tab = createBottomTabNavigator();

export default function App() {
  // Ajustes de color de fondo del documento HTML para iOS Safari PWA
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.style.backgroundColor = '#0B0D12';
    document.body.style.backgroundColor = '#0B0D12';
    
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = '#0B0D12';

    let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaAppleStatus) {
      metaAppleStatus = document.createElement('meta');
      metaAppleStatus.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(metaAppleStatus);
    }
    metaAppleStatus.content = 'black-translucent';
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#0B0D12' }}>
      <StatusBar style="light" backgroundColor="#0B0D12" translucent />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: true,
            tabBarStyle: {
              backgroundColor: '#0B0D12',
              borderTopColor: '#1C1E26',
              borderTopWidth: 1,
              height: 70,
              paddingBottom: 12,
              paddingTop: 8,
            },
            tabBarActiveTintColor: '#FF9F0A',
            tabBarInactiveTintColor: '#636675',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginTop: 2,
            },
            tabBarIcon: ({ focused, color }) => {
              let iconName;
              if (route.name === 'Inicio') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Escanear') {
                iconName = focused ? 'camera' : 'camera-outline';
              } else if (route.name === 'Ejercicio') {
                iconName = focused ? 'barbell' : 'barbell-outline';
              } else if (route.name === 'Perfil') {
                iconName = focused ? 'person' : 'person-outline';
              }
              return <Ionicons name={iconName} size={22} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Inicio" component={HomeScreen} />
          <Tab.Screen name="Escanear" component={ScanScreen} />
          <Tab.Screen name="Ejercicio" component={ExerciseScreen} />
          <Tab.Screen name="Perfil" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ==========================================
// 3. ESTILOS OSCUROS ESTILO FINANZAS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D12',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerSubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  mainCard: {
    backgroundColor: '#16181F',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222530',
  },
  cardLabel: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '600',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  mainValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  goalValue: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#222530',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF9F0A',
    borderRadius: 4,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#16181F',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222530',
  },
  macroLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  macroValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  macroSub: {
    color: '#636675',
    fontSize: 11,
    fontWeight: '400',
  },
  miniBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#16181F',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222530',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceNum: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  balanceText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  balanceOperator: {
    color: '#636675',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  placeholderSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
