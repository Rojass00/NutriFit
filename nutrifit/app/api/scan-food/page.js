'use client';
import { useState } from 'react';

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [foodData, setFoodData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  // Función para comprimir y convertir la imagen a Base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setPreview(base64String);
      analyzeFood(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Enviar imagen al endpoint de Gemini
  const analyzeFood = async (base64Image) => {
    setLoading(true);
    setError(null);
    setFoodData(null);

    try {
      const res = await fetch('/api/scan-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const result = await res.json();
      if (result.success) {
        setFoodData(result.data);
      } else {
        setError(result.error || 'Error al analizar el alimento');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white p-6 pb-24 flex flex-col items-center">
      <div className="w-full max-w-md">
        
        {/* Cabecera */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            📷 Escáner IA
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Toma una foto a tu plato o súbela para calcular macros al instante.
          </p>
        </div>

        {/* Botón / Selector de Cámara */}
        {!preview && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#34C759]/40 bg-[#16181F] hover:bg-[#1f222b] transition-all rounded-2xl p-8 cursor-pointer shadow-lg mb-6">
            <span className="text-4xl mb-2">📸</span>
            <span className="text-[#34C759] font-semibold text-lg">Tomar foto o Subir imagen</span>
            <span className="text-xs text-gray-400 mt-1">Compatible con iPhone, Android y PC</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleImageChange} 
            />
          </label>
        )}

        {/* Vista previa de la imagen */}
        {preview && (
          <div className="relative mb-6 rounded-2xl overflow-hidden border border-[#16181F] shadow-lg">
            <img src={preview} alt="Plato a escanear" className="w-full h-64 object-cover" />
            <button 
              onClick={() => { setPreview(null); setFoodData(null); }}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
            >
              🔄 Cambiar foto
            </button>
          </div>
        )}

        {/* Estado de Carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 bg-[#16181F] rounded-2xl border border-gray-800">
            <div className="w-10 h-10 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-300 font-medium">Gemini está analizando tu plato...</p>
            <p className="text-xs text-gray-500 mt-1">Calculando calorías y macronutrientes</p>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-300 p-4 rounded-xl text-center mb-6">
            {error}
          </div>
        )}

        {/* Resultados del Análisis */}
        {foodData && (
          <div className="bg-[#16181F] border border-[#34C759]/30 rounded-2xl p-6 shadow-xl animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{foodData.foodName}</h2>
                <span className="text-xs bg-[#34C759]/20 text-[#34C759] px-2.5 py-1 rounded-full font-medium inline-block mt-1">
                  Confianza: {foodData.confidence}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#34C759]">{foodData.calories}</span>
                <span className="text-xs text-gray-400 block">kcal</span>
              </div>
            </div>

            {/* Macronutrientes */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800 text-center">
              <div className="bg-[#0B0D12] p-3 rounded-xl">
                <span className="text-xs text-gray-400 block">Proteínas</span>
                <span className="text-lg font-bold text-white">{foodData.protein}g</span>
              </div>
              <div className="bg-[#0B0D12] p-3 rounded-xl">
                <span className="text-xs text-gray-400 block">Carbs</span>
                <span className="text-lg font-bold text-white">{foodData.carbs}g</span>
              </div>
              <div className="bg-[#0B0D12] p-3 rounded-xl">
                <span className="text-xs text-gray-400 block">Grasas</span>
                <span className="text-lg font-bold text-white">{foodData.fat}g</span>
              </div>
            </div>

            {/* Botón de acción */}
            <button 
              onClick={() => alert("¡Alimento registrado con éxito en tu día!")}
              className="w-full mt-6 bg-[#34C759] hover:bg-[#2eb04f] text-black font-bold py-3 rounded-xl transition-all shadow-lg"
            >
              Registrar en mi Diario 🍽️
            </button>
          </div>
        )}

      </div>
    </div>
  );
}