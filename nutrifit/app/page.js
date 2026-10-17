'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Camera, Dumbbell, User, Check, Utensils, Trash2, Edit2, X } from 'lucide-react';
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

// Motor metabólico basado en Mifflin-St Jeor + directrices ISSN
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
  const [foodLogs, setFoodLogs] = useState([]);
  const [stats, setStats] = useState({
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
  });

  // Estados para el Escáner con IA (Gemini)
  const [scanLoading, setScanLoading] = useState(false);
  const [scanFoodData, setScanFoodData] = useState(null);
  const [customFoodName, setCustomFoodName] = useState('');
  const [scanPreview, setScanPreview] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Estados para Edición de Alimento (Modal)
  const [editingItem, setEditingItem] = useState(null);

  // Cargar Perfil y Registros del Día desde Supabase
  useEffect(() => {
    loadProfile();
    loadTodayFoodLogs();
  }, []);

  const loadProfile = async () => {
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
      console.error('Error cargando perfil:', err);
    }
  };

  const loadTodayFoodLogs = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (data && !error) {
        setFoodLogs(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error('Error cargando registros de comida:', err);
    }
  };

  const calculateStats = (logs) => {
    const totals = logs.reduce(
      (acc, item) => ({
        caloriesConsumed: acc.caloriesConsumed + (item.calories || 0),
        proteinConsumed: acc.proteinConsumed + (item.protein || 0),
        carbsConsumed: acc.carbsConsumed + (item.carbs || 0),
        fatConsumed: acc.fatConsumed + (item.fat || 0),
      }),
      { caloriesConsumed: 0, proteinConsumed: 0, carbsConsumed: 0, fatConsumed: 0 }
    );
    setStats(totals);
  };

  const calorieGoal = parseInt(userProfile.calorieGoal) || 2000;
  const proteinGoal = parseInt(userProfile.proteinGoal) || 145;
  const carbsGoal = parseInt(userProfile.carbsGoal) || 205;
  const fatGoal = parseInt(userProfile.fatGoal) || 53;

  const progress = Math.min((stats.caloriesConsumed / calorieGoal) * 100, 100);

  // Compresor y redimensionador automático de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setScanPreview(compressedBase64);
        analyzeFood(compressedBase64);
      };
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
        setCustomFoodName(result.data.foodName || '');
      } else {
        setScanError(result.error || 'Error al analizar el alimento');
      }
    } catch (err) {
      setScanError('Error de conexión con el servidor.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleRegisterFood = async () => {
    if (!scanFoodData) return;

    const newLog = {
      user_id: 1,
      food_name: customFoodName.trim() || scanFoodData.foodName || 'Alimento sin nombre',
      calories: scanFoodData.calories || 0,
      protein: scanFoodData.protein || 0,
      carbs: scanFoodData.carbs || 0,
      fat: scanFoodData.fat || 0,
    };

    try {
      const { data, error } = await supabase
        .from('food_logs')
        .insert([newLog])
        .select();

      if (error) {
        alert('Error al guardar en base de datos: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        const updatedLogs = [data[0], ...foodLogs];
        setFoodLogs(updatedLogs);
        calculateStats(updatedLogs);
      }

      alert("¡Alimento registrado y guardado con éxito! 🍽️");
      setScanPreview(null);
      setScanFoodData(null);
      setCustomFoodName('');
      setActiveTab('alimentos');
    } catch (err) {
      console.error('Excepción al registrar alimento:', err);
    }
  };

  const handleDeleteFood = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este registro de comida?')) return;

    try {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        const updatedLogs = foodLogs.filter(item => item.id !== id);
        setFoodLogs(updatedLogs);
        calculateStats(updatedLogs);
      }
    } catch (err) {
      console.error('Error borrando comida:', err);
    }
  };

  const handleUpdateFood = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('food_logs')
        .update({
          food_name: editingItem.food_name,
          calories: parseInt(editingItem.calories) || 0,
          protein: parseInt(editingItem.protein) || 0,
          carbs: parseInt(editingItem.carbs) || 0,
          fat: parseInt(editingItem.fat) || 0,
        })
        .eq('id', editingItem.id);

      if (error) {
        alert('Error al actualizar: ' + error.message);
      } else {
        const updatedLogs = foodLogs.map(item => item.id === editingItem.id ? editingItem : item);
        setFoodLogs(updatedLogs);
        calculateStats(updatedLogs);
        setEditingItem(null);
      }
    } catch (err) {
      console.error('Error actualizando comida:', err);
    }
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

            {/* Tarjeta Principal de Calorías */}
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
              <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#FF3B30', padding: '16px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                {scanError}
              </div>
            )}

            {scanFoodData && (
              <div style={{ backgroundColor: '#16181F', border: '1px solid rgba(52, 199, 89, 0.3)', borderRadius: '22px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    Nombre del alimento (puedes personalizarlo):
                  </label>
                  <input 
                    type="text" 
                    value={customFoodName} 
                    onChange={(e) => setCustomFoodName(e.target.value)} 
                    style={{ ...inputStyle, fontSize: '16px', fontWeight: '700', color: '#34C759' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34C759', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>
                    Confianza Gemini: {scanFoodData.confidence}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '28px', fontWeight: '900', color: '#34C759' }}>{scanFoodData.calories}</span>
                    <span style={{ fontSize: '11px', color: '#8E8E93', marginLeft: '4px' }}>kcal</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid #222530', textAlign: 'center' }}>
                  <div style={{ flex: 1, backgroundColor: '#0B0D12', padding: '12px', borderRadius: '14px', border: '1px solid #222530' }}>
                    <span style={{ fontSize: '11px', color: '#8E8E93', display: 'block', marginBottom: '4px' }}>Proteínas</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>{scanFoodData.protein}g</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#0B0D12', padding: '12px', borderRadius: '14px', border: '1px solid #222530' }}>
                    <span style={{ fontSize: '11px', color: '#8E8E93', display: 'block', marginBottom: '4px' }}>Carbs</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>{scanFoodData.carbs}g</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#0B0D12', padding: '12px', borderRadius: '14px', border: '1px solid #222530' }}>
                    <span style={{ fontSize: '11px', color: '#8E8E93', display: 'block', marginBottom: '4px' }}>Grasas</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>{scanFoodData.fat}g</span>
                  </div>
                </div>

                <button 
                  onClick={handleRegisterFood}
                  style={{ width: '100%', marginTop: '20px', backgroundColor: '#34C759', color: '#000000', fontWeight: '800', padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '15px' }}
                >
                  Registrar en mi Diario 🍽️
                </button>
              </div>
            )}
          </div>
        )}

        {/* PANTALLA HISTORIAL ALIMENTOS */}
        {activeTab === 'alimentos' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '34px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>Alimentos de Hoy</h1>
              <p style={{ color: '#8E8E93', fontSize: '14px', marginTop: '4px' }}>
                👉 <span style={{ color: '#34C759' }}>Desliza a la derecha</span> para editar | 👈 <span style={{ color: '#FF3
