import React, { useState, useEffect } from 'react';
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
// ESTADO GLOBAL COMPARTIDO
// ==========================================
const DEFAULT_USER_PROFILE = {
  age: '19',
  height: '170',
  weight: '66',
  activityLevel: 'moderado', // sedentario, ligero, moderado, intenso
  goal: 'recomposicion',
  isManual: true,
  calorieGoal: '2000',
  proteinGoal: '120',
  carbsGoal: '220',
  fatGoal: '65',
};

// ==========================================
// 1. PANTALLAS (Screen Components)
// ==========================================

function HomeScreen({ userProfile }) {
  const [stats] = useState({
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
  });

  const calorieGoal = parseInt(userProfile.calorieGoal) || 2000;
  const proteinGoal = parseInt(userProfile.proteinGoal) || 120;
  const carbsGoal = parseInt(userProfile.carbsGoal) || 220;
  const fatGoal = parseInt(userProfile.fatGoal) || 65;

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
        <Text style={styles.placeholderSubtitle}>Análisis automático de fotos con Gemini 3.5 Flash</Text>
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

  // Recalcular metabólicamente si está en modo automático
  const handleAutoCalculate = (updatedProfile) => {
    const age = parseFloat(updatedProfile.age) || 19;
    const weight = parseFloat(updatedProfile.weight) || 66;
    const height = parseFloat(updatedProfile.height) || 170;

    // BMR (Mifflin-St Jeor para hombres)
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    let factor = 1.375; // moderado
    if (updatedProfile.activityLevel === 'sedentario') factor = 1.2;
    if (updatedProfile.activityLevel === 'ligero') factor = 1.375;
    if (updatedProfile.activityLevel === 'moderado') factor = 1.55;
    if (updatedProfile.activityLevel === 'intenso') factor = 1.725;

    const tdee = Math.round(bmr * factor);
    // Recomposición corporal (~2000 kcal)
    const targetCalories = Math.round(tdee * 0.9); 

    // Macros estimados: Proteína (2g/kg), Grasas (0.9g/kg), resto Carbs
    const protein = Math.round(weight * 2);
    const fat = Math.round(weight * 0.95);
    const carbs = Math.round((targetCalories - (protein * 4 + fat * 9)) / 4);

    return {
      ...updatedProfile,
      calorieGoal: String(targetCalories),
      proteinGoal: String(protein),
      carbsGoal: String(carbs),
      fatGoal: String(fat),
    };
  };

  const handleToggleManual = (value) => {
    let newProfile = { ...profile, isManual: !value };
    if (!newProfile.isManual) {
      newProfile = handleAutoCalculate(newProfile);
    }
    setProfile(newProfile);
  };

  const handleSave = () => {
    let updated = { ...profile };
    if (!profile.isManual) {
      updated = handleAutoCalculate(updated);
    }
    setUserProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Perfil & Datos</Text>
          <Text style={styles.headerSubtitle}>Ajustes de usuario y metas nutricionales</Text>
        </View>

        {/* Tarjeta Usuario */}
        <View style={styles.mainCard}>
          <Text style={styles.sectionTitle}>Datos Antropométricos</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Edad</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={profile.age}
                onChangeText={(val) => setProfile({ ...profile, age: val })}
                placeholderTextColor="#636675"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={profile.weight}
                onChangeText={(val) => setProfile({ ...profile, weight: val })}
                placeholderTextColor="#636675"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Altura (cm)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={profile.height}
                onChangeText={(val) => setProfile({ ...profile, height: val })}
                placeholderTextColor="#636675"
              />
            </View>
          </View>
        </View>

        {/* Tarjeta de Metas */}
        <View style={styles.sectionCard}>
          <View style={styles.switchHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Ingreso Manual de Metas</Text>
              <Text style={styles.switchSubtext}>
                {profile.isManual ? 'Defines tus propias metas' : 'Cálculo automático según tu cuerpo'}
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#222530', true: '#FF9F0A' }}
              thumbColor={profile.isManual ? '#ffffff' : '#8E8E93'}
              onValueChange={handleToggleManual}
              value={profile.isManual}
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.inputLabel}>Calorías Objetivo (kcal)</Text>
            <TextInput
              style={[styles.textInputFull, !profile.isManual && styles.disabledInput]}
              keyboardType="numeric"
              editable={profile.isManual}
              value={profile.calorieGoal}
              onChangeText={(val) => setProfile({ ...profile, calorieGoal: val })}
            />
          </View>

          <View style={[styles.inputRow, { marginTop: 14 }]}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Proteína (g)</Text>
              <TextInput
                style={[styles.textInput, !profile.isManual && styles.disabledInput]}
                keyboardType="numeric"
                editable={profile.isManual}
                value={profile.proteinGoal}
                onChangeText={(val) => setProfile({ ...profile, proteinGoal: val })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={[styles.textInput, !profile.isManual && styles.disabledInput]}
                keyboardType="numeric"
                editable={profile.isManual}
                value={profile.carbsGoal}
                onChangeText={(val) => setProfile({ ...profile, carbsGoal: val })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Grasas (g)</Text>
              <TextInput
                style={[styles.textInput, !profile.isManual && styles.disabledInput]}
                keyboardType="numeric"
                editable={profile.isManual}
                value={profile.fatGoal}
                onChangeText={(val) => setProfile({ ...profile, fatGoal: val })}
              />
            </View>
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {savedSuccess ? '✓ Metas Actualizadas' : 'Guardar Cambios'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// 2. NAVEGACIÓN Y CONFIGURACIÓN PRINCIPAL
// ==========================================

const Tab = createBottomTabNavigator();

export default function App() {
  const [userProfile, setUserProfile] = useState(DEFAULT_USER_PROFILE);

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
              height: 84,
              paddingBottom: 24,
              paddingTop: 10,
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
          <Tab.Screen name="Inicio">
            {(props) => <HomeScreen {...props} userProfile={userProfile} />}
          </Tab.Screen>
          <Tab.Screen name="Escanear" component={ScanScreen} />
          <Tab.Screen name="Ejercicio" component={ExerciseScreen} />
          <Tab.Screen name="Perfil">
            {(props) => <ProfileScreen {...props} userProfile={userProfile} setUserProfile={setUserProfile} />}
          </Tab.Screen>
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
    marginBottom: 18,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#636675',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  mainCard: {
    backgroundColor: '#16181F',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222530',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  mainValue: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
  },
  goalSubtext: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
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
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0B0D12',
    borderWidth: 1,
    borderColor: '#222530',
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  textInputFull: {
    backgroundColor: '#0B0D12',
    borderWidth: 1,
    borderColor: '#222530',
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledInput: {
    opacity: 0.5,
  },
  switchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchSubtext: {
    color: '#636675',
    fontSize: 12,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#FF9F0A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0B0D12',
    fontSize: 16,
    fontWeight: '800',
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
