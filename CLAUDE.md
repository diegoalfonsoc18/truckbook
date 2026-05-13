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

On login, the app:
1. Upserts the user into the `usuarios` table
2. Loads the user's role from the DB via `useRoleStore.getState().cargarRolDesdeDB()`
3. Validates the cached vehicle plate belongs to the user via `useVehiculoStore.getState().validarPlacaParaUsuario()`

### Role-based navigation

`AppStack` (`src/navigation/AppStack.tsx`) is a bottom tab navigator that renders different screen sets depending on the role stored in `useRoleStore`:

| Role | Home Stack | Extra tabs |
|---|---|---|
| `conductor` | `ConductorNavigation` | Gastos, Ingresos, Reportes |
| `propietario` | `PropietarioNavigation` | Reportes, Gastos, Ingresos |
| `administrador` | `AdministradorNavigation` | Gastos, Reportes |
| `null` | — | Cuenta only |

All headers are hidden (`headerShown: false`) — each screen implements its own header UI.

### State management

Four Zustand stores in `src/store/`:

- **`RoleStore`** — user role (`conductor | propietario | administrador`), persisted to AsyncStorage. Load via `cargarRolDesdeDB`, save via `guardarRolEnDB`.
- **`VehiculoStore`** — active vehicle plate and truck type, persisted to AsyncStorage. `validarPlacaParaUsuario` clears the plate if the user no longer has an authorized relation.
- **`GastosStore`** — in-memory list of expenses (not persisted). Loaded and updated in real time by `DataProvider`.
- **`IngresosStore`** — same pattern as GastosStore but for income.

### Realtime data layer

`DataProvider` (`src/context/DataProvider.tsx`) subscribes to Supabase realtime channels for the active vehicle plate:
- `conductor_gastos` → feeds `GastosStore`
- `conductor_ingresos` → feeds `IngresosStore`

This context is only mounted when the user is authenticated (`App.tsx` wraps `AppStack` with it).

### Vehicle-driver authorization flow

`src/services/vehiculoAutorizacionService.ts` manages the `vehiculo_conductores` junction table:
- Propietario registers a vehicle → auto-authorized relation with `rol: "propietario"`
- Conductor requests access → `estado: "pendiente"`
- Propietario/admin approves or rejects → `estado: "autorizado" | "rechazado"`
- Push notifications fire on both sides of each state change

### Push notifications

`src/services/NotificationService.ts` handles Expo push tokens. Tokens are stored in `usuarios.push_token` in Supabase. Notifications are sent server-side via `https://exp.host/--/api/v2/push/send` (no backend server — the client calls Expo's API directly). Expo project ID: `494c025d-768e-41f8-a040-ee0dd05aaaf0`.

### Theming

`src/constants/Themecontext.tsx` exports:
- `LIGHT_COLORS` / `DARK_COLORS` — full color palettes
- `SPACING`, `BORDER_RADIUS`, `TYPOGRAPHY`, `getShadow()` — shared design tokens
- `useTheme()` hook — returns `{ colors, isDark, mode, setMode, toggleTheme }`

All UI components consume colors via `useTheme()`. Theme preference (`light | dark | system`) is persisted to AsyncStorage under `@truckbook_theme_mode`.

Style files are co-located with screens (e.g., `HomeStyles.ts` next to `Home.tsx`). Style factories that need theme values accept `(colors, isDark)` as arguments.

### Supabase tables

Key tables:
- `usuarios` — user profile, role (`conductor | propietario | administrador`), push token
- `vehiculos` — vehicles by plate (`placa`), truck type
- `vehiculo_conductores` — junction: user ↔ vehicle, with `rol`, `estado`, authorization metadata
- `conductor_gastos` — expenses keyed by `placa` and `conductor_id`
- `conductor_ingresos` — income keyed by `placa` and `conductor_id`

Supabase config is in `src/config/SupaBaseConfig.ts` (anon key hardcoded).

### Quirk: filenames with trailing spaces

Several files have literal trailing spaces in their names:
- `src/Screens/propietario/PropietarioHome .tsx`
- `src/Screens/propietario/PropietarioStyles .tsx`
- `src/Screens/conductor/ConductorStyles .tsx`

Import statements reference them with the space included. Do not rename them.

### Services

- `src/services/Soatservice.ts`, `licenciaService.ts`, `rtmService.ts`, `simitService.ts` — fetch Colombian vehicle compliance documents (SOAT insurance, RTM/technomechanical inspection, SIMIT fines) using external APIs (via `axios`).
- External API calls use hooks in `src/hooks/` (e.g., `UseSoat.ts`, `useLicencia.ts`, `useMultas.ts`).
