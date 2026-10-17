'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Camera, Dumbbell, User, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase de forma segura
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
  const [stats] = useState({
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
  });

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

        {/* PANTALLA ESCANEAR */}
        {activeTab === 'escanear' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
            <Camera size={48} color="#34C759" />
            <div style={{ fontSize: '22px', fontWeight: '700', marginTop: '12px' }}>Escáner IA</div>
          </div>
        )}

        {/* PANTALLA EJERCICIO */}
        {activeTab === 'ejercicio' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
            <Dumbbell size={48} color="#34C759" />
            <div style={{ fontSize: '22px', fontWeight: '700', marginTop: '12px' }}>Ejercicio</div>
          </div>
        )}

        {/* PANTALLA PERFIL */}
        {activeTab === 'perfil' && (
          <ProfileSection userProfile={userProfile} setUserProfile={setUserProfile} />
        )}

      </div>

      {/* Barra de Navegación Inferior */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#0B0D12', borderTop: '1px solid #1C1E26', display: 'flex', justifyContent: 'space-around', padding: '12px 0 24px 0', zIndex: 100 }}>
        <button onClick={() => setActiveTab('inicio')} style={navBtnStyle(activeTab === 'inicio')}><Flame size={22} /><span>Inicio</span></button>
        <button onClick={() => setActiveTab('escanear')} style={navBtnStyle(activeTab === 'escanear')}><Camera size={22} /><span>Escanear</span></button>
        <button onClick={() => setActiveTab('ejercicio')} style={navBtnStyle(activeTab === 'ejercicio')}><Dumbbell size={22} /><span>Ejercicio</span></button>
        <button onClick={() => setActiveTab('perfil')} style={navBtnStyle(activeTab === 'perfil')}><User size={22} /><span>Perfil</span></button>
      </nav>
    </div>
  );
}

function ProfileSection({ userProfile, setUserProfile }) {
  const [profile, setProfile] = useState(userProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateProfileState = (changes) => {
    let updated = { ...profile, ...changes };
    if (updated.mode === 'automatico') {
      updated = calculateMifflinStJeor(updated);
    }
    setProfile(updated);
  };

  const handleModeChange = (newMode) => {
    let updated = { ...profile, mode: newMode };
    if (newMode === 'automatico') {
      updated = calculateMifflinStJeor(updated);
    }
    setProfile(updated);
  };

  const handleSave = async () => {
    let finalProfile = { ...profile };
    if (finalProfile.mode === 'automatico') {
      finalProfile = calculateMifflinStJeor(finalProfile);
    }
    setUserProfile(finalProfile);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: 1,
          gender: finalProfile.gender,
          age: parseFloat(finalProfile.age),
          height: parseFloat(finalProfile.height),
          weight: parseFloat(finalProfile.weight),
          activity_level: finalProfile.activityLevel,
          goal: finalProfile.goal,
          mode: finalProfile.mode,
          calorie_goal: parseFloat(finalProfile.calorieGoal),
          protein_goal: parseFloat(finalProfile.proteinGoal),
          carbs_goal: parseFloat(finalProfile.carbsGoal),
          fat_goal: parseFloat(finalProfile.fatGoal),
          updated_at: new Date(),
        });

      if (error) {
        console.error('Error al guardar en Supabase:', error.message);
        alert('Error al guardar en base de datos: ' + error.message);
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Excepción al guardar:', err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>Perfil & Metas</h1>
      </div>

      {/* SELECTOR DE MODO */}
      <div style={{ backgroundColor: '#16181F', borderRadius: '22px', padding: '22px', marginBottom: '20px', border: '1px solid #222530' }}>
        <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '12px' }}>Modo de Configuración</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleModeChange('automatico')} style={pillStyle(profile.mode === 'automatico')}>Automático</button>
          <button onClick={() => handleModeChange('personalizado')} style={pillStyle(profile.mode === 'personalizado')}>Personal / Nutriólogo</button>
        </div>
      </div>

      {/* DATOS ANTROPOMÉTRICOS */}
      <div style={{ backgroundColor: '#16181F', borderRadius: '22px', padding: '22px', marginBottom: '20px', border: '1px solid #222530' }}>
        <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>Datos Personales</div>
        
        <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Género Biológico</div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <button onClick={() => updateProfileState({ gender: 'hombre' })} style={pillStyle(profile.gender === 'hombre')}>Hombre</button>
          <button onClick={() => updateProfileState({ gender: 'mujer' })} style={pillStyle(profile.gender === 'mujer')}>Mujer</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Edad</div>
            <input type="number" value={profile.age} onChange={(e) => updateProfileState({ age: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Peso (kg)</div>
            <input type="number" value={profile.weight} onChange={(e) => updateProfileState({ weight: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Altura (cm)</div>
            <input type="number" value={profile.height} onChange={(e) => updateProfileState({ height: e.target.value })} style={inputStyle} />
          </div>
        </div>

        {profile.mode === 'automatico' && (
          <>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px', marginTop: '16px' }}>Nivel de Actividad</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'sedentario', label: 'Sedentario (Oficina / Poco ejercicio)' },
                { id: 'ligero', label: 'Ligero (1-3 días de ejercicio)' },
                { id: 'moderado', label: 'Moderado (3-5 días de ejercicio)' },
                { id: 'intenso', label: 'Intenso (6-7 días de entrenamiento)' },
              ].map((item) => (
                <button key={item.id} onClick={() => updateProfileState({ activityLevel: item.id })} style={pillFullStyle(profile.activityLevel === item.id)}>
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px', marginTop: '16px' }}>Objetivo Nutricional</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'deficit', label: 'Déficit (Pérdida de grasa - Proteína alta)' },
                { id: 'recomposicion', label: 'Recomposición corporal' },
                { id: 'mantenimiento', label: 'Mantenimiento de peso' },
                { id: 'volumen', label: 'Volumen (Ganancia muscular)' },
              ].map((item) => (
                <button key={item.id} onClick={() => updateProfileState({ goal: item.id })} style={pillFullStyle(profile.goal === item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* METAS */}
      <div style={{ backgroundColor: '#16181F', borderRadius: '22px', padding: '20px', border: '1px solid #222530', marginBottom: '20px' }}>
        <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>
          Metas Nutricionales {profile.mode === 'automatico' ? '(Calculadas)' : '(Personalizadas)'}
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Calorías (kcal)</div>
          <input 
            type="number" 
            value={profile.calorieGoal} 
            disabled={profile.mode === 'automatico'}
            onChange={(e) => updateProfileState({ calorieGoal: e.target.value })} 
            style={{ ...inputStyle, opacity: profile.mode === 'automatico' ? 0.7 : 1 }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Proteína (g)</div>
            <input 
              type="number" 
              value={profile.proteinGoal} 
              disabled={profile.mode === 'automatico'}
              onChange={(e) => updateProfileState({ proteinGoal: e.target.value })} 
              style={{ ...inputStyle, opacity: profile.mode === 'automatico' ? 0.7 : 1 }} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Carbs (g)</div>
            <input 
              type="number" 
              value={profile.carbsGoal} 
              disabled={profile.mode === 'automatico'}
              onChange={(e) => updateProfileState({ carbsGoal: e.target.value })} 
              style={{ ...inputStyle, opacity: profile.mode === 'automatico' ? 0.7 : 1 }} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Grasas (g)</div>
            <input 
              type="number" 
              value={profile.fatGoal} 
              disabled={profile.mode === 'automatico'}
              onChange={(e) => updateProfileState({ fatGoal: e.target.value })} 
              style={{ ...inputStyle, opacity: profile.mode === 'automatico' ? 0.7 : 1 }} 
            />
          </div>
        </div>
      </div>

      {/* BOTÓN GUARDAR */}
      <button 
        onClick={handleSave}
        style={{
          width: '100%',
          backgroundColor: '#34C759',
          color: '#000000',
          fontWeight: '700',
          padding: '16px',
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
          marginBottom: '20px'
        }}
      >
        {savedSuccess && <Check size={20} />}
        {savedSuccess ? '¡Metas Guardadas!' : 'Guardar y Actualizar Metas'}
      </button>
    </div>
  );
}

function pillStyle(active) {
  return {
    flex: 1,
    padding: '12px',
    borderRadius: '14px',
    border: active ? '1.5px solid #34C759' : '1px solid #222530',
    backgroundColor: active ? 'rgba(52, 199, 89, 0.1)' : '#0B0D12',
    color: active ? '#34C759' : '#FFFFFF',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center',
  };
}

function pillFullStyle(active) {
  return {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '14px',
    border: active ? '1.5px solid #34C759' : '1px solid #222530',
    backgroundColor: active ? 'rgba(52, 199, 89, 0.1)' : '#0B0D12',
    color: active ? '#34C759' : '#FFFFFF',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
  };
}

const inputStyle = {
  width: '100%',
  backgroundColor: '#0B0D12',
  border: '1px solid #222530',
