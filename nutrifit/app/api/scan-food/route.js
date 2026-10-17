import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No se proporcionó ninguna imagen' }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/jpeg',
          },
        },
        {
          text: `Analiza esta foto de comida y devuelve EXCLUSIVAMENTE un objeto JSON válido (sin bloques de código markdown ni texto adicional) con la siguiente estructura exacta:
          {
            "foodName": "Nombre descriptivo del plato en español",
            "calories": número estimado de calorías (kcal),
            "protein": gramos de proteína (número),
            "carbs": gramos de carbohidratos (número),
            "fat": gramos de grasas (número),
            "confidence": "alta", "media" o "baja"
          }`,
        },
      ],
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error('Gemini no devolvió ninguna respuesta');
    }

    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const nutritionData = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, data: nutritionData });
  } catch (error) {
    console.error('Error al procesar la imagen con Gemini:', error);
    return NextResponse.json({ error: error.message || 'Error interno al analizar el alimento' }, { status: 500 });
  }
}