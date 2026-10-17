'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Camera, Dumbbell, User, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_USER_PROFILE = {
  gender: 'hombre',
  age: '19',
  height: '170',
  weight: '66',
  activityLevel: 'moderado',
  goal: 'recomposicion',
  mode: 'automatico',
  calorieGoal: '2000',
  proteinGoal: '145',
  carbsGoal: '205',
  fatGoal: '53',
};

function calculateMifflinStJeor(p) {
  const age = Math.max(10, parseFloat(p.age) || 19);
  const weight = Math.max(30, parseFloat(p.weight) || 66);
  const height = Math.max(100, parseFloat(p.height) || 170);

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (p.gender === 'hombre') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  let activityMultiplier = 1.375;
  if (p.activityLevel === 'sedentario') activityMultiplier = 1.2;
  if (p.activityLevel === 'ligero') activityMultiplier = 1.375;
  if (p.activityLevel === 'moderado') activityMultiplier = 1.55;
  if (p.activityLevel === 'intenso') activityMultiplier = 1.725;

  const tdee = bmr * activityMultiplier;

  let targetCalories = tdee;
  let proteinFactor = 2.0; 
  let fatFactor = 0.9;    

  if (p.goal === 'deficit') {
    targetCalories = tdee - 500;
    proteinFactor = 2.4;        
    fatFactor = 0.7;            
  } else if (p.goal === 'recomposicion') {
    targetCalories = tdee * 0.9; 
    proteinFactor = 2.2;        
    fatFactor = 0.8;            
  } else if (p.goal === 'mantenimiento') {
    targetCalories = tdee;
    proteinFactor = 1.9;        
    fatFactor = 0.9;            
  } else if (p.goal === 'volumen') {
    targetCalories = tdee + 350; 
    proteinFactor = 1.8;        
    fatFactor = 1.1;            
  }

  const calories = Math.max(1200, Math.round(targetCalories));
  const protein = Math.round(weight * proteinFactor);
  const fat = Math.round(weight * fatFactor);
  const remainingCalories = calories - ((protein * 4) + (fat * 9));
  const carbs = Math.max(40, Math.round(remainingCalories / 4));

  return {
    ...p,
    calorieGoal: String(calories),
    proteinGoal: String(protein),
    carbsGoal: String(carbs),
    fatGoal: String(fat),
  };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [userProfile, setUserProfile] = useState(DEFAULT_USER_PROFILE);
  const [stats, setStats] = useState({
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
  });

  // Estados para el Escáner con IA (Gemini)
  const [scanLoading, setScanLoading] = useState(false);
  const [scanFoodData, setScanFoodData] = useState(null);
  const [scanPreview, setScanPreview] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Cargar perfil guardado en Supabase al abrir la app
  useEffect(() => {
    async function loadProfile() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', 1)
          .single();

        if (data && !error) {
          setUserProfile({
            gender: data.gender || DEFAULT_USER_PROFILE.gender,
            age: String(data.age || DEFAULT_USER_PROFILE.age),
            height: String(data.height || DEFAULT_USER_PROFILE.height),
            weight: String(data.weight || DEFAULT_USER_PROFILE.weight),
            activityLevel: data.activity_level || DEFAULT_USER_PROFILE.activityLevel,
            goal: data.goal || DEFAULT_USER_PROFILE.goal,
            mode: data.mode || DEFAULT_USER_PROFILE.mode,
            calorieGoal: String(data.calorie_goal || DEFAULT_USER_PROFILE.calorieGoal),
            proteinGoal: String(data.protein_goal || DEFAULT_USER_PROFILE.proteinGoal),
            carbsGoal: String(data.carbs_goal || DEFAULT_USER_PROFILE.carbsGoal),
            fatGoal: String(data.fat_goal || DEFAULT_USER_PROFILE.fatGoal),
          });
        }
      } catch (err) {
        console.error('Error cargando perfil de Supabase:', err);
      }
    }
    loadProfile();
  }, []);

  const calorieGoal = parseInt(userProfile.calorieGoal) || 2000;
  const proteinGoal = parseInt(userProfile.proteinGoal) || 145;
  const carbsGoal = parseInt(userProfile.carbsGoal) || 205;
  const fatGoal = parseInt(userProfile.fatGoal) || 53;

  const progress = Math.min((stats.caloriesConsumed / calorieGoal) * 100, 100);

  // Funciones del Escáner IA
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setScanPreview(base64String);
      analyzeFood(base64String);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFood = async (base64Image) => {
    setScanLoading(true);
    setScanError(null);
    setScanFoodData(null);

    try {
      const res = await fetch('/api/scan-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const result = await res.json();
      if (result.success) {
        setScanFoodData(result.data);
      } else {
        setScanError(result.error || 'Error al analizar el alimento');
      }
    } catch (err) {
      setScanError('Error de conexión con el servidor');
    } finally {
      setScanLoading(false);
    }
  };

  const handleRegisterFood = () => {
    if (!scanFoodData) return;
    setStats(prev => ({
      caloriesConsumed: prev.caloriesConsumed + (scanFoodData.calories || 0),
      proteinConsumed: prev.proteinConsumed + (scanFoodData.protein || 0),
      carbsConsumed: prev.carbsConsumed + (scanFoodData.carbs || 0),
      fatConsumed: prev.fatConsumed + (scanFoodData.fat || 0),
    }));
    alert("¡Alimento registrado con éxito en tu día! 🍽️");
    setScanPreview(null);
    setScanFoodData(null);
    setActiveTab('inicio');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B0D12', color: '#FFFFFF', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px', padding: '20px 16px', flex: 1 }}>
        
        {/* PANTALLA INICIO */}
        {activeTab === 'inicio' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '34px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>Resumen</h1>
            </div>

            {/* Tarjeta Principal */}
            <div style={{ backgroundColor: '#16181F', borderRadius: '22px', padding: '22px', marginBottom: '20px', border: '1px solid #222530' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Flame size={18} color="#34C759" />
                <span style={{ color: '#8E8E93', fontSize: '14px', fontWeight: '600' }}>Calorías consumidas</span>
              </div>
              <div style={{ fontSize: '46px', fontWeight: '800', letterSpacing: '-1px', lineHeight: '52px' }}>{stats.caloriesConsumed}</div>
              <div style={{ color: '#8E8E93', fontSize: '15px', fontWeight: '500', marginTop: '4px', marginBottom: '16px' }}>
                de {calorieGoal} kcal
              </div>
              <div style={{ height: '8px', backgroundColor: '#222530', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: '#34C759', borderRadius: '4px', width: `${progress}%` }} />
              </div>
            </div>

            {/* Tarjetas de Macros */}
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Distribución de Macros</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <div style={{ flex: 1, backgroundColor: '#16181F', borderRadius: '18px', padding: '14px', border: '1px solid #222530' }}>
                <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>Proteínas</div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{stats.proteinConsumed} <span style={{ color: '#636675', fontSize: '11px', fontWeight: '400' }}>/ {proteinGoal}g</span></div>
                <div style={{ height: '3px', borderRadius: '2px', marginTop: '8px', backgroundColor: '#FF3B30', width: `${Math.min((stats.proteinConsumed / proteinGoal) * 100, 100)}%` }} />
              </div>
              <div style={{ flex: 1, backgroundColor: '#16181F', borderRadius: '18px', padding: '14px', border: '1px solid #222530' }}>
                <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>Carbohidratos</div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{stats.carbsConsumed} <span style={{ color: '#636675', fontSize: '11px', fontWeight: '400' }}>/ {carbsGoal}g</span></div>
                <div style={{ height: '3px', borderRadius: '2px', marginTop: '8px', backgroundColor: '#34C759', width: `${Math.min((stats.carbsConsumed / carbsGoal) * 100, 100)}%` }} />
              </div>
              <div style={{ flex: 1, backgroundColor: '#16181F', borderRadius: '18px', padding: '14px', border: '1px solid #222530' }}>
                <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>Grasas</div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{stats.fatConsumed} <span style={{ color: '#636675', fontSize: '11px', fontWeight: '400' }}>/ {fatGoal}g</span></div>
                <div style={{ height: '3px', borderRadius: '2px', marginTop: '8px', backgroundColor: '#30B0C7', width: `${Math.min((stats.fatConsumed / fatGoal) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Balance Energético */}
            <div style={{ backgroundColor: '#16181F', borderRadius: '22px', padding: '20px', border: '1px solid #222530', marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '700' }}>Balance Diario</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{stats.caloriesConsumed}</div>
                  <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '500' }}>Consumidas</div>
                </div>
                <div style={{ color: '#636675', fontSize: '18px', fontWeight: '600' }}>−</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>0</div>
                  <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '500' }}>Quemadas</div>
                </div>
                <div style={{ color: '#636675', fontSize: '18px', fontWeight: '600' }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: '#34C759' }}>{calorieGoal - stats.caloriesConsumed}</div>
                  <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '500' }}>Déficit</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA ESCANEAR (GEMINI IA) */}
        {activeTab === 'escanear' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>📷 Escáner IA</h1>
              <p style={{ color: '#8E8E93', fontSize: '14px', marginTop: '4px' }}>
                Toma una foto a tu plato o elígela de tu galería para calcular macros al instante con Gemini.
              </p>
            </div>

            {!scanPreview && (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(52, 199, 89, 0.4)', backgroundColor: '#16181F', borderRadius: '22px', padding: '36px', cursor: 'pointer', marginBottom: '24px' }}>
                <span style={{ fontSize: '40px', marginBottom: '10px' }}>📸</span>
                <span style={{ color: '#34C759', fontWeight: '700', fontSize: '16px' }}>Tomar foto o Seleccionar imagen</span>
                <span style={{ color: '#8E8E93', fontSize: '12px', marginTop: '4px' }}>Compatible con iPhone, Android y PC</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleImageChange} 
                />
              </label>
            )}

            {scanPreview && (
              <div style={{ position: 'relative', marginBottom: '24px', borderRadius: '22px', overflow: 'hidden', border: '1px solid #222530' }}>
                <img src={scanPreview} alt="Plato a escanear" style={{ width: '100%', height: '260px', objectFit: 'cover' }} />
                <button 
                  onClick={() => { setScanPreview(null); setScanFoodData(null); }}
                  style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}
                >
                  🔄 Cambiar foto
                </button>
              </div>
            )}

            {scanLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', backgroundColor: '#16181F', borderRadius: '22px', border: '1px solid #222530' }}>
                <div style={{ width: '36px', height: '36px', border: '4px solid #34C759', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '12px', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: '#E0E0E0', fontWeight: '600', margin: 0 }}>Gemini está analizando tu plato...</p>
                <p style={{ color: '#8E8E93', fontSize: '12px', marginTop: '4px' }}>Calculando calorías y macronutrientes</p>
              </div>
            )}

            {scanError && (
              <div style={{ backgroundColor: 'rgba(255, 59, 48
