# NutriFit

App personal (iOS) para controlar nutrición, macros y ejercicio, con sincronización bidireccional con Apple Health.
React Native + Expo (Development Build) · Supabase · Gemini Vision.

## Estructura

```
nutrifit/
├── App.js
├── app.json                     # plugins: HealthKit, image-picker, dev-client
├── eas.json                     # perfiles de build (development / preview)
├── .env.example                 # → copia a .env
├── supabase/schema.sql          # tablas + RLS
└── src/
    ├── theme.js
    ├── navigation/AppNavigator.js
    ├── components/              # ui.js, ProgressRing.js, MacroBar.js
    ├── services/
    │   ├── supabase.js          # cliente Supabase
    │   ├── db.js                # consultas a las 3 tablas
    │   ├── healthkit.js         # Apple Health (leer calorías activas, escribir nutrición/entrenos)
    │   ├── gemini.js            # análisis de fotos con Gemini
    │   └── storage.js           # API key y modelo en AsyncStorage
    ├── utils/                   # fechas.js, nutricion.js (Mifflin-St Jeor), ejercicio.js
    └── screens/                 # HomeScreen, ScanScreen, ExerciseScreen, ProfileScreen
```

## 1. Supabase

1. Crea un proyecto en https://supabase.com (plan gratuito).
2. **SQL Editor → New query**, pega `supabase/schema.sql` y pulsa **Run**.
3. **Project Settings → API**: copia *Project URL* y la clave *anon public*.

## 2. Gemini

1. Crea una API key gratuita en https://aistudio.google.com/apikey.
2. Luego la pegarás en la pestaña **Perfil** de la app (se guarda sólo en el iPhone).
3. `gemini-1.5-flash` ya fue dado de baja por Google. La app usa `gemini-3.5-flash` por defecto, con respaldos automáticos, y el modelo se puede cambiar desde Perfil. Consulta https://ai.google.dev/gemini-api/docs/models para ver los nombres vigentes.

## 3. Crear el proyecto Expo e instalar dependencias

```bash
npx create-expo-app@latest nutrifit --template blank
cd nutrifit

npx expo install @supabase/supabase-js react-native-url-polyfill \
  @react-native-async-storage/async-storage \
  @react-navigation/native @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context react-native-svg \
  expo-image-picker expo-status-bar expo-dev-client

npm install @kingstinct/react-native-healthkit@13.4.0 react-native-nitro-modules
```

Después copia sobre el proyecto: `App.js`, `app.json`, `eas.json`, `.env.example`, `.gitignore`, la carpeta `src/` y `supabase/` (reemplaza los archivos que genera la plantilla). Cambia en `app.json` el `bundleIdentifier` por uno tuyo (`com.tunombre.nutrifit`).

```bash
cp .env.example .env     # y rellena URL + anon key de Supabase
```

## 4. Ejecutar en tu iPhone

HealthKit es un módulo nativo: **no funciona en Expo Go**. Necesitas un Development Build.
(En Expo Go la app abre y puedes ver la interfaz, pero Apple Health no estará disponible.)

### Opción A — Build local con Xcode (requiere Mac)

1. iPhone: *Ajustes › Privacidad y seguridad › Modo de desarrollador* → activar y reiniciar.
2. Conecta el iPhone por cable y ejecuta:
   ```bash
   npx expo run:ios --device
   ```
   Elige tu iPhone. La primera vez Xcode pedirá un *Team* de firma (tu Apple ID basta para pruebas; la firma gratuita caduca a los 7 días).
3. En el iPhone: *Ajustes › General › VPN y gestión de dispositivos* → confiar en tu perfil.
4. Las siguientes veces: `npx expo start --dev-client`.

### Opción B — EAS Build (sin Xcode; requiere cuenta Apple Developer de pago)

```bash
npm install -g eas-cli
eas login
eas device:create                                  # registra tu iPhone
eas build --profile development --platform ios     # instala el build desde el enlace/QR
npx expo start --dev-client
```

## 5. Primer uso

1. **Perfil**: guarda tus metas (automático o manual), pega la API key de Gemini y pulsa **Conectar Apple Health** (concede lectura y escritura).
2. **Escanear**: toma una foto, ajusta gramos/macros y guarda → se escribe en Supabase y en Apple Health.
3. **Ejercicio**: registra entrenos manuales (van a Supabase y a Apple Health) o revisa el historial.
4. **Inicio**: calorías consumidas vs. meta, macros, calorías activas de Apple Health y balance neto.

## Notas

- **Seguridad**: la app no tiene login; las políticas RLS permiten acceso con la anon key. Es aceptable para uso personal si la key no se comparte; para endurecerlo, añade Supabase Auth.
- **Borrar registros**: eliminar una comida/entreno en la app no lo borra de Apple Health (hazlo desde la app Salud).
- **Balance neto**: usa *calorías activas* (no el metabolismo basal). Si Apple Health no está disponible, se usan los entrenos manuales de Supabase.
- **Si HealthKit falla al compilar o ejecutar**: toda la integración está en `src/services/healthkit.js`. Las firmas de `saveWorkoutSample` y de los filtros de consulta pueden variar entre versiones de la librería; ahí es el único lugar a ajustar (ya hay *fallbacks* para ambos casos).
