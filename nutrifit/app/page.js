'use client'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Home, Camera, Dumbbell, User, Check, Utensils, Trash2, Pencil, X, Flame, Plus, Minus, History } from 'lucide-react'

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
}

// Motor metabólico basado en Mifflin-St Jeor + directrices ISSN
function calculateMifflinStJeor(p) {
  const age = Math.max(10, parseFloat(p.age) || 19);
  const weight = Math.max(30, parseFloat(p.weight) || 66);
  const height = Math.max(100, parseFloat(p.height) || 170);

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (p.gender === 'hombre') bmr += 5;
  else bmr -= 161;

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

// Componente SwipeItem exactamente igual al que pasaste
function SwipeItem({ onEdit, onDelete, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = 80
  }, [])

  return (
    <div ref={ref} className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl bg-zinc-900/85 border border-zinc-800/80 select-none [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {onEdit && (
        <button onClick={onEdit} className="snap-start w-20 shrink-0 bg-blue-600/90 hover:bg-blue-600 text-white font-medium flex flex-col items-center justify-center transition-colors active:bg-blue-800 rounded-l-2xl">
          <Pencil size={18} /><span className="text-[10px] font-semibold mt-1">Editar</span>
        </button>
      )}
      <div className="w-full shrink-0 snap-center">{children}</div>
      {onDelete && (
        <button onClick={onDelete} className="snap-end w-20 shrink-0 bg-red-600/90 hover:bg-red-600 text-white font-medium flex flex-col items-center justify-center transition-colors active:bg-red-800 rounded-r-2xl">
          <Trash2 size={18} /><span className="text-[10px] font-semibold mt-1">Eliminar</span>
        </button>
      )}
    </div>
  )
}

// Componente TxRow adaptado a alimentos para mantener exactamente la misma estética
function FoodRow({ item }) {
  const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-[#34C759]">
        <Utensils size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{item.food_name || 'Alimento sin nombre'}</p>
        <p className="text-xs text-zinc-500">{timeStr} · P: {item.protein}g · C: {item.carbs}g · G: {item.fat}g</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#34C759]">{item.calories} <span className="text-xs font-normal text-zinc-400">kcal</span></p>
        <span className="rounded-full px-2 py-0.5 text-[10px] bg-emerald-500/15 text-[#34C759]">Registrado</span>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('inicio')
  const [userProfile, setUserProfile] = useState(DEFAULT_USER_PROFILE)
  const [foodLogs, setFoodLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados para el Escáner con IA (Gemini)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanFoodData, setScanFoodData] = useState(null)
  const [customFoodName, setCustomFoodName] = useState('')
  const [scanPreview, setScanPreview] = useState(null)
  const [scanError, setScanError] = useState(null)

  // Estado para Edición de Alimento (Modal)
  const [editingItem, setEditingItem] = useState(null)

  const load = useCallback(async () => {
    try {
      const { data: profileData } = await supabase.from('user_profiles').select('*').eq('id', 1).single()
      if (profileData) {
        setUserProfile({
          gender: profileData.gender || DEFAULT_USER_PROFILE.gender,
          age: String(profileData.age || DEFAULT_USER_PROFILE.age),
          height: String(profileData.height || DEFAULT_USER_PROFILE.height),
          weight: String(profileData.weight || DEFAULT_USER_PROFILE.weight),
          activityLevel: profileData.activity_level || DEFAULT_USER_PROFILE.activityLevel,
          goal: profileData.goal || DEFAULT_USER_PROFILE.goal,
          mode: profileData.mode || DEFAULT_USER_PROFILE.mode,
          calorieGoal: String(profileData.calorie_goal || DEFAULT_USER_PROFILE.calorieGoal),
          proteinGoal: String(profileData.protein_goal || DEFAULT_USER_PROFILE.proteinGoal),
          carbsGoal: String(profileData.carbs_goal || DEFAULT_USER_PROFILE.carbsGoal),
          fatGoal: String(profileData.fat_goal || DEFAULT_USER_PROFILE.fatGoal),
        })
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: logsData } = await supabase
        .from('food_logs')
        .select('*')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      if (logsData) setFoodLogs(logsData)
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    return foodLogs.reduce(
      (acc, item) => ({
        caloriesConsumed: acc.caloriesConsumed + (item.calories || 0),
        proteinConsumed: acc.proteinConsumed + (item.protein || 0),
        carbsConsumed: acc.carbsConsumed + (item.carbs || 0),
        fatConsumed: acc.fatConsumed + (item.fat || 0),
      }),
      { caloriesConsumed: 0, proteinConsumed: 0, carbsConsumed: 0, fatConsumed: 0 }
    )
  }, [foodLogs])

  const calorieGoal = parseInt(userProfile.calorieGoal) || 2000
  const proteinGoal = parseInt(userProfile.proteinGoal) || 145
  const carbsGoal = parseInt(userProfile.carbsGoal) || 205
  const fatGoal = parseInt(userProfile.fatGoal) || 53
  const progress = Math.min((stats.caloriesConsumed / calorieGoal) * 100, 100)

  // Compresor de imagen en cliente
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75)
        setScanPreview(compressedBase64)
        analyzeFood(compressedBase64)
      }
    }
    reader.readAsDataURL(file)
  }

  const analyzeFood = async (base64Image) => {
    setScanLoading(true)
    setScanError(null)
    setScanFoodData(null)

    try {
      const res = await fetch('/api/scan-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      })

      const result = await res.json()
      if (result.success) {
        setScanFoodData(result.data)
        setCustomFoodName(result.data.foodName || '')
      } else {
        setScanError(result.error || 'Error al analizar el alimento')
      }
    } catch (err) {
      setScanError('Error de conexión con el servidor.')
    } finally {
      setScanLoading(false)
    }
  }

  const handleRegisterFood = async () => {
    if (!scanFoodData) return

    const newLog = {
      user_id: 1,
      food_name: customFoodName.trim() || scanFoodData.foodName || 'Alimento sin nombre',
      calories: scanFoodData.calories || 0,
      protein: scanFoodData.protein || 0,
      carbs: scanFoodData.carbs || 0,
      fat: scanFoodData.fat || 0,
    }

    try {
      const { data, error } = await supabase.from('food_logs').insert([newLog]).select()
      if (error) { alert('Error al guardar: ' + error.message); return }

      if (data && data.length > 0) {
        setFoodLogs([data[0], ...foodLogs])
      }

      alert("¡Alimento registrado con éxito! 🍽️")
      setScanPreview(null)
      setScanFoodData(null)
      setCustomFoodName('')
      setTab('alimentos')
    } catch (err) {
      console.error('Excepción:', err)
    }
  }

  const deleteFood = async (id) => {
    if (!confirm('¿Eliminar este registro de comida?')) return
    setFoodLogs((p) => p.filter((t) => t.id !== id))
    await supabase.from('food_logs').delete().eq('id', id)
  }

  const handleUpdateFood = async (e) => {
    e.preventDefault()
    if (!editingItem) return

    const { error } = await supabase
      .from('food_logs')
      .update({
        food_name: editingItem.food_name,
        calories: parseInt(editingItem.calories) || 0,
        protein: parseInt(editingItem.protein) || 0,
        carbs: parseInt(editingItem.carbs) || 0,
        fat: parseInt(editingItem.fat) || 0,
      })
      .eq('id', editingItem.id)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      setFoodLogs((p) => p.map((item) => (item.id === editingItem.id ? editingItem : item)))
      setEditingItem(null)
    }
  }

  const Head = ({ t, onAdd, label }) => (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">{t}</h1>
      {onAdd && <button onClick={onAdd} className="flex items-center gap-1 rounded-full bg-[#34C759] px-4 py-2 text-sm font-semibold text-black"><Plus size={16} />{label}</button>}
    </div>
  )

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-32 pt-6 text-white bg-[#0B0D12]">
      {loading ? <p className="mt-20 text-center text-zinc-500">Cargando NutriFit…</p> : (<>
        
        {/* PESTAÑA INICIO */}
        {tab === 'inicio' && (<>
          <Head t="Resumen" />
          
          <div className="mb-4 rounded-2xl bg-[#16181F] p-5 border border-zinc-800/80">
            <p className="flex items-center gap-2 text-sm text-zinc-400"><Flame size={18} className="text-[#34C759]" />Calorías consumidas</p>
            <p className="mt-1 text-4xl font-bold">{stats.caloriesConsumed} <span className="text-sm font-normal text-zinc-500">/ {calorieGoal} kcal</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-[#34C759] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#16181F] p-3 border border-zinc-800/80">
              <p className="text-xs text-zinc-400">Proteínas</p>
              <p className="mt-1 text-sm font-bold text-red-400">{stats.proteinConsumed}g <span className="text-[10px] text-zinc-500">/ {proteinGoal}g</span></p>
            </div>
            <div className="rounded-2xl bg-[#16181F] p-3 border border-zinc-800/80">
              <p className="text-xs text-zinc-400">Carbs</p>
              <p className="mt-1 text-sm font-bold text-[#34C759]">{stats.carbsConsumed}g <span className="text-[10px] text-zinc-500">/ {carbsGoal}g</span></p>
            </div>
            <div className="rounded-2xl bg-[#16181F] p-3 border border-zinc-800/80">
              <p className="text-xs text-zinc-400">Grasas</p>
              <p className="mt-1 text-sm font-bold text-blue-400">{stats.fatConsumed}g <span className="text-[10px] text-zinc-500">/ {fatGoal}g</span></p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#16181F] p-4 border border-zinc-800/80">
            <h2 className="mb-3 font-semibold">Alimentos recientes</h2>
            {foodLogs.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">Sin registros todavía hoy.</p> : (
              <div className="space-y-2">
                {foodLogs.slice(0, 4).map((item) => (
                  <SwipeItem key={item.id} onEdit={() => setEditingItem(item)} onDelete={() => deleteFood(item.id)}>
                    <FoodRow item={item} />
                  </SwipeItem>
                ))}
              </div>
            )}
          </div>
        </>)}

        {/* PESTAÑA ESCANEAR */}
        {tab === 'escanear' && (<>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">📷 Escáner IA</h1>
            <p className="text-xs text-zinc-400 mt-1">Saca una foto o sube imagen de tu plato para calcular macros.</p>
          </div>

          {!scanPreview && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#34C759]/40 bg-[#16181F] rounded-2xl p-8 cursor-pointer mb-6">
              <span className="text-3xl mb-2">📸</span>
              <span className="text-[#34C759] font-bold text-sm">Tomar foto o Seleccionar imagen</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}

          {scanPreview && (
            <div className="relative mb-6 rounded-2xl overflow-hidden border border-zinc-800">
              <img src={scanPreview} alt="Preview" className="w-full h-56 object-cover" />
              <button onClick={() => { setScanPreview(null); setScanFoodData(null) }} className="absolute top-3 right-3 bg-black/70 px-3 py-1 rounded-full text-xs">🔄 Cambiar</button>
            </div>
          )}

          {scanLoading && (
            <div className="text-center py-12 bg-[#16181F] rounded-2xl border border-zinc-800">
              <div className="w-8 h-8 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold">Gemini analizando plato...</p>
            </div>
          )}

          {scanError && <p className="text-red-400 text-sm text-center mb-4">{scanError}</p>}

          {scanFoodData && (
            <div className="bg-[#16181F] border border-[#34C759]/30 rounded-2xl p-5">
              <label className="text-xs text-zinc-400 block mb-1">Nombre del alimento:</label>
              <input type="text" value={customFoodName} onChange={(e) => setCustomFoodName(e.target.value)} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-3 text-sm font-bold text-[#34C759] mb-4 outline-none" />
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs bg-[#34C759]/15 text-[#34C759] px-2.5 py-1 rounded-full font-semibold">Confianza: {scanFoodData.confidence}</span>
                <span className="text-2xl font-black text-[#34C759]">{scanFoodData.calories} <span className="text-xs text-zinc-400 font-normal">kcal</span></span>
              </div>

              <div className="flex gap-2 mb-5 text-center">
                <div className="flex-1 bg-[#0B0D12] p-2.5 rounded-xl border border-zinc-800"><span className="text-[10px] text-zinc-400 block">Protos</span><span className="text-xs font-bold">{scanFoodData.protein}g</span></div>
                <div className="flex-1 bg-[#0B0D12] p-2.5 rounded-xl border border-zinc-800"><span className="text-[10px] text-zinc-400 block">Carbs</span><span className="text-xs font-bold">{scanFoodData.carbs}g</span></div>
                <div className="flex-1 bg-[#0B0D12] p-2.5 rounded-xl border border-zinc-800"><span className="text-[10px] text-zinc-400 block">Grasas</span><span className="text-xs font-bold">{scanFoodData.fat}g</span></div>
              </div>

              <button onClick={handleRegisterFood} className="w-full bg-[#34C759] text-black font-bold py-3.5 rounded-xl text-sm">Registrar en mi Diario 🍽️</button>
            </div>
          )}
        </>)}

        {/* PESTAÑA ALIMENTOS (CON SWIPE ITEM IDÉNTICO) */}
        {tab === 'alimentos' && (<>
          <Head t="Alimentos de Hoy" label="Escanear" onAdd={() => setTab('escanear')} />
          <p className="text-xs text-zinc-400 mb-4">👉 <span className="text-blue-400">Desliza a la derecha</span> para editar | 👈 <span className="text-red-400">Desliza a la izquierda</span> para eliminar</p>

          {foodLogs.length === 0 ? (
            <div className="text-center py-12 bg-[#16181F] rounded-2xl border border-zinc-800">
              <Utensils size={36} className="mx-auto text-zinc-500 mb-2" />
              <p className="text-sm font-semibold">No hay alimentos registrados hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {foodLogs.map((item) => (
                <SwipeItem key={item.id} onEdit={() => setEditingItem(item)} onDelete={() => deleteFood(item.id)}>
                  <FoodRow item={item} />
                </SwipeItem>
              ))}
            </div>
          )}
        </>)}

        {/* PESTAÑA EJERCICIO */}
        {tab === 'ejercicio' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Dumbbell size={42} className="text-[#34C759] mb-3" />
            <h2 className="text-xl font-bold">Ejercicio</h2>
            <p className="text-xs text-zinc-400 mt-1">Próximamente rutinas y quema activa.</p>
          </div>
        )}

        {/* PESTAÑA PERFIL */}
        {tab === 'perfil' && (
          <ProfileSection userProfile={userProfile} setUserProfile={setUserProfile} />
        )}

      </>)}

      {/* MODAL DE EDICIÓN */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}>
          <div className="mx-auto w-full max-w-lg rounded-t-3xl bg-[#16181F] border border-zinc-800 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar Alimento</h3>
              <button onClick={() => setEditingItem(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateFood} className="space-y-3">
              <label className="block text-xs text-zinc-400">Nombre
                <input type="text" value={editingItem.food_name} onChange={(e) => setEditingItem({ ...editingItem, food_name: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-3 text-sm text-white mt-1 outline-none font-semibold" required />
              </label>
              <label className="block text-xs text-zinc-400">Calorías (kcal)
                <input type="number" value={editingItem.calories} onChange={(e) => setEditingItem({ ...editingItem, calories: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-3 text-sm text-white mt-1 outline-none font-semibold" required />
              </label>
              <div className="flex gap-2">
                <label className="flex-1 block text-xs text-zinc-400">Proteína (g)
                  <input type="number" value={editingItem.protein} onChange={(e) => setEditingItem({ ...editingItem, protein: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-3 text-sm text-white mt-1 outline-none font-semibold" required />
                </label>
                <label className="flex-1 block text-xs text-zinc-400">Carbs (g)
                  <input type="number" value={editingItem.carbs} onChange={(e) => setEditingItem({ ...editingItem, carbs: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-3 text-sm text-white mt-1 outline-none font-semibold" required />
                </label>
                <label className="flex-1 block text-xs text-zinc-400">Grasas (g)
                  <input type="number" value={editingItem.fat} onChange={(e) => setEditingItem({ ...editingItem, fat: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-3 text-sm text-white mt-1 outline-none font-semibold" required />
                </label>
              </div>
              <button type="submit" className="w-full mt-4 rounded-xl bg-[#34C759] text-black py-3 font-bold text-sm">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0B0D12] border-t border-zinc-900 flex justify-around py-3 z-40">
        {[
          ['inicio', Home, 'Inicio'],
          ['escanear', Camera, 'Escanear'],
          ['alimentos', Utensils, 'Alimentos'],
          ['ejercicio', Dumbbell, 'Ejercicio'],
          ['perfil', User, 'Perfil']
        ].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${tab === id ? 'text-[#34C759]' : 'text-zinc-500'}`}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function ProfileSection({ userProfile, setUserProfile }) {
  const [profile, setProfile] = useState(userProfile)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const updateProfileState = (changes) => {
    let updated = { ...profile, ...changes }
    if (updated.mode === 'automatico') updated = calculateMifflinStJeor(updated)
    setProfile(updated)
  }

  const handleSave = async () => {
    let finalProfile = { ...profile }
    if (finalProfile.mode === 'automatico') finalProfile = calculateMifflinStJeor(finalProfile)
    setUserProfile(finalProfile)

    const { error } = await supabase.from('user_profiles').upsert({
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
    })

    if (!error) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Perfil & Metas</h1>
      
      <div className="bg-[#16181F] p-4 rounded-2xl border border-zinc-800 mb-4">
        <p className="text-sm font-semibold mb-2">Modo de Configuración</p>
        <div className="flex gap-2">
          {['automatico', 'personalizado'].map((m) => (
            <button key={m} onClick={() => updateProfileState({ mode: m })} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${profile.mode === m ? 'border-[#34C759] bg-[#34C759]/10 text-[#34C759]' : 'border-zinc-800 bg-[#0B0D12] text-zinc-400'}`}>
              {m === 'automatico' ? 'Automático' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#16181F] p-4 rounded-2xl border border-zinc-800 mb-4 space-y-3">
        <p className="text-sm font-semibold">Datos Personales</p>
        <div className="flex gap-2">
          {['hombre', 'mujer'].map((g) => (
            <button key={g} onClick={() => updateProfileState({ gender: g })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${profile.gender === g ? 'border-[#34C759] bg-[#34C759]/10 text-[#34C759]' : 'border-zinc-800 bg-[#0B0D12] text-zinc-400'}`}>
              {g.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-zinc-400">Edad<input type="number" value={profile.age} onChange={(e) => updateProfileState({ age: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-2.5 text-white mt-1 text-sm font-semibold outline-none" /></label>
          <label className="flex-1 text-xs text-zinc-400">Peso (kg)<input type="number" value={profile.weight} onChange={(e) => updateProfileState({ weight: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-2.5 text-white mt-1 text-sm font-semibold outline-none" /></label>
          <label className="flex-1 text-xs text-zinc-400">Altura (cm)<input type="number" value={profile.height} onChange={(e) => updateProfileState({ height: e.target.value })} className="w-full bg-[#0B0D12] border border-zinc-800 rounded-xl p-2.5 text-white mt-1 text-sm font-semibold outline-none" /></label>
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-[#34C759] text-black font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
        {savedSuccess && <Check size={18} />} {savedSuccess ? '¡Metas Guardadas!' : 'Guardar y Actualizar Metas'}
      </button>
    </div>
  )
}
