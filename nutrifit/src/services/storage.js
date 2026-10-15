import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_API = '@nutrifit/gemini_api_key';
const KEY_MODEL = '@nutrifit/gemini_model';

export const MODELO_GEMINI_POR_DEFECTO = 'gemini-3.5-flash';

export const getGeminiKey = async () => (await AsyncStorage.getItem(KEY_API)) || '';
export const setGeminiKey = (k) => AsyncStorage.setItem(KEY_API, (k || '').trim());

export const getGeminiModel = async () =>
  (await AsyncStorage.getItem(KEY_MODEL)) || MODELO_GEMINI_POR_DEFECTO;
export const setGeminiModel = (m) =>
  AsyncStorage.setItem(KEY_MODEL, (m || '').trim() || MODELO_GEMINI_POR_DEFECTO);
