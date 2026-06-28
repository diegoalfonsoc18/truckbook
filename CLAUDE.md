# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start           # Start Expo dev server (opens Expo Go or dev client)
npm run android     # Build and run on Android device/emulator
npm run ios         # Build and run on iOS simulator/device
npm run web         # Run in browser
```

There is no test suite. TypeScript type checking runs via the compiler (`npx tsc --noEmit`).

For EAS (production/preview builds):
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Architecture

**Stack**: React Native + Expo SDK 54, TypeScript, Supabase (auth + database + realtime), Zustand, React Navigation v7.

### Auth and session flow

`App.tsx` wraps everything in `ThemeProvider` → `GestureHandlerRootView` → `SafeAreaProvider`. Inside `AppContent`, a Supabase session listener decides whether to render `AuthStack` (unauthenticated) or `AppStack` (authenticated, wrapped in `DataProvider`).

On login, the app (`syncBackground` in `App.tsx`):
1. Upserts the user into the `usuarios` table (`syncUsuarioDB`)
2. Validates the cached vehicle plate still belongs to the user via `useVehiculoStore.getState().validarPlacaParaUsuario()`

> **Note:** The role system was removed (commits `f6b0073`, `9905ed0`). There is no `RoleStore` and no role-based branching — all users are drivers.

### Navigation

`AppStack` (`src/navigation/AppStack.tsx`) is a single bottom tab navigator, identical for every user:

| Tab | Component |
|---|---|
| Home | `ConductorNavigation` |
| Gastos | `GastosNavigation` (`Screens/Gastos/Gastos`) |
| Ingresos | `IngresosNavigation` |
| Reportes | `FinanzasNavigation` (`Screens/FinanzasGeneral/FinanzasGenerales`) |

There is also a Cuenta screen. All headers are hidden (`headerShown: false`) — each screen implements its own header UI.

### State management

Five Zustand stores in `src/store/`, all persisted to `encryptedStorage` (SecureStore-backed):

- **`VehiculoStore`** — active vehicle plate and truck type. `validarPlacaParaUsuario` clears the plate if the user is no longer linked to it in `vehiculo_conductores`.
- **`VehiculosListStore`** — the user's list of vehicles (joins `vehiculo_conductores` → `vehiculos` for `tipo_camion`).
- **`GastosStore`** — list of expenses. Loaded and updated in real time by `DataProvider`; persisted under the global key `gastos-storage`.
- **`IngresosStore`** — same pattern as GastosStore but for income (`ingresos-storage`).
- **`OfflineQueueStore`** — queue of offline insert/update/delete operations, drained by `useSyncManager` when connectivity returns.

> Persistence keys are **global**, not per-user. `App.tsx` (SIGNED_OUT) and `DataProvider` purge rows whose `conductor_id` ≠ current user to prevent cross-account cache leaks.

### Realtime data layer

`DataProvider` (`src/context/DataProvider.tsx`) is mounted only when authenticated (`App.tsx` wraps `AppStack` with it). It subscribes to Supabase realtime for the active plate, **filtered by `conductor_id` for isolation**:
- `conductor_gastos` + `conductor_ingresos` share **one** channel (`data-${userId}-${placa}`, two `.on()` handlers) — consolidated to reduce realtime connections at scale
- `vehiculo_conductores` has its own channel (`vehiculos-${userId}`)

`useSyncManager` (mounted here) drains `OfflineQueueStore` on reconnect and on mount if already online.

### Vehicles

`vehiculo_conductores` is a **pure junction** (`id`, `vehiculo_placa`, `conductor_id`, `created_at`) — a user is simply linked to a plate. The old role/approval/invitation flow and its columns (`rol`, `estado`, `autorizado_por`) were removed. `src/services/vehiculoAutorizacionService.ts` now exposes only two live functions: `registrarVehiculoPropietario` (register/link a vehicle) and `removerConductorDeVehiculo` (unlink). `tipo_camion` lives on `vehiculos`, keyed by `placa`.

### Push notifications

`src/services/NotificationService.ts` handles Expo push tokens, stored in `usuarios.push_token`. Notifications are sent server-side via the Supabase Edge Function `send-push-notification` (`supabase.functions.invoke`), which runs with the service role — the client never reads other users' tokens. Expo project ID: `494c025d-768e-41f8-a040-ee0dd05aaaf0`.

### Theming

`src/constants/Themecontext.tsx` exports:
- `LIGHT_COLORS` / `DARK_COLORS` — full color palettes
- `SPACING`, `BORDER_RADIUS`, `TYPOGRAPHY`, `getShadow()` — shared design tokens
- `useTheme()` hook — returns `{ colors, isDark, mode, setMode, toggleTheme }`

All UI components consume colors via `useTheme()`. Theme preference (`light | dark | system`) is persisted to AsyncStorage under `@truckbook_theme_mode`.

Style files are co-located with screens (e.g., `HomeStyles.ts` next to `Home.tsx`). Style factories that need theme values accept `(colors, isDark)` as arguments.

### Supabase tables

Key tables (verified schema, 2026-06-28):
- `usuarios` — `id`, `user_id`, `nombre`, `email`, `cedula`, `push_token`, `deleted`, `deleted_at`, `created_at`. **No `rol` column.**
- `vehiculos` — vehicles by plate (`placa`), `tipo_camion`
- `vehiculo_conductores` — pure junction: `id`, `vehiculo_placa`, `conductor_id`, `created_at`. **No `rol`/`estado`/authorization columns.**
- `conductor_gastos` — expenses keyed by `placa` and `conductor_id` (has `estado`, `fecha`, `monto`, …)
- `conductor_ingresos` — income keyed by `placa` and `conductor_id`

**RLS & scalability:** All tables have RLS with strict per-`conductor_id` (or per-`user_id`) isolation; `auth.uid()` is wrapped as `(SELECT auth.uid())` for per-query evaluation. Policies live in `supabase/rls_policies.sql`; performance indexes in `supabase/migrations/indexes_scalability.sql`. Run both in the Supabase SQL Editor after schema changes.

Supabase config is in `src/config/SupaBaseConfig.ts` (URL/anon key from EAS Secrets via `Constants.expoConfig.extra`).

### Quirk: filenames with trailing spaces

`src/Screens/conductor/ConductorStyles .tsx` has a literal trailing space in its name. Import statements reference it with the space included. Do not rename it.

### Services

- `vehiculoAutorizacionService.ts` — vehicle register/unlink against the junction table (slimmed; see Vehicles above).
- `mercanciaService.ts` — cargo/merchandise types per truck type.
- `pendientesService.ts` / `pendientesNotificacionService.ts` — pending items and their notifications.
- `geminiService.ts` / `visionService.ts` — AI (invoice OCR / image analysis via Gemini).
- `insightsService.ts` — financial insights. `fleteNotifications.ts` — freight notifications.
- External data hooks live in `src/hooks/` (e.g., `useClima.ts` weather, `useGasolineras.ts` gas stations, `usePicoYPlaca.ts`, `usePrecioDiesel.ts`, `useEscanearFactura.ts` invoice scanning).
