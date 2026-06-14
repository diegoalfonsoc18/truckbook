# TruckBook - Handoff Document

## Current Status
- **Last Updated**: June 14, 2026
- **Branch**: main
- **Latest Commit**: Restored withModularHeaders plugin for iOS

## Completed Work This Session

### 1. Offline Support Audit (✅ Complete)
- Verified OfflineQueueStore, useSyncManager, and conductor hooks work correctly
- **Fixed**: Authorization check was blocking offline registration
  - Solution: Skip check when offline, rely on login-time validation
  - Files: `src/Screens/Ingresos/Ingresos.tsx`, `src/Screens/Gastos/Gastos.tsx`

### 2. Android Icon System (✅ Complete)
- Created adaptive icon with proper safe zone padding
- Organized icons in `assets/Android/` with mipmap structure (hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi)
- Updated app.config.js to use optimized icons

### 3. Dynamic Icons for Ingresos (✅ Complete)

#### Flete Category
- Icon changes based on truck type:
  - Volqueta → volquetaFlete
  - Grúa → gruaFlete
  - Planchón → planchosFlete
  - Estacas → estacaFlete
  - Furgón, Cisterna, Porta → original icons (closed vehicles)

#### Mercancía Category (NEW)
- Independent category with dynamic merchandise icons
- Mapping by truck type:
  - Volqueta → gravel (granular cargo)
  - Grúa, Planchón → carGrua (heavy lifting)
  - Estacas, Furgón, Porta → box (generic cargo)
  - Cisterna → gasStation (liquids)
- Icons registered in ItemIcon.tsx with IconName types

### 4. Enhanced Ingresos Categories (✅ Complete)
All 6 categories (Flete, Mercancía, Anticipo, Reembolso, Otro, Cuenta Cobro) now have:
- **Cliente field** (required, appears first in transaction display)
- **Descripción field** (optional)
- Category-specific fields:
  - Flete: cantidad (quantity multiplier)
  - Mercancía: tipo (merchandise type)
  - Others: just cliente + descripción

**Security**:
- Function `sanitizarInput()` removes XSS payloads (`<>{}[]`)
- 500 character max per field
- Applied to all cliente and descripción fields

### 5. Build Pipeline (Partially Complete)

#### Android (✅ SUCCESS)
```
Build ID: 2b607626-50d5-408a-a204-9d5df4ad0fed
Version: 1.0.0 (versionCode 11)
Status: Submitted to Play Store internal testing track
Download: https://expo.dev/artifacts/eas/T_Nqf-GNcOCyNTywDkqi3Ubg6ZkOhS-2HS_duxMIq2Q.aab
```

#### iOS (🔄 IN PROGRESS)
- Restored `./plugins/withModularHeaders` for Google Sign-In CocoaPods compatibility
- Current retry in progress
- Plan Free limit (builds reset July 1, 2026)

## Key Files Modified

### Core Logic
- `src/Screens/Ingresos/Ingresos.tsx`
  - Added ANTICIPO_CAMPOS, REEMBOLSO_CAMPOS, MERCANCIA_CAMPOS, CUENTA_COBRO_CAMPOS
  - Functions: `getTruckIconName()`, `getMercanciaIcon()`, `sanitizarInput()`
  - Offline auth check, category-specific field handling

- `src/components/TransactionScreen.tsx`
  - Accepts `tipoCamionActual` and `getMercanciaIcon` props
  - Displays dynamic mercancia icon in modal header

- `src/components/ItemIcon.tsx`
  - Registered 4 mercancia icons and 5 flete icons

### Configuration
- `app.config.js`
  - Android: `./assets/Android/play_store_512.png` + adaptive icon paths
  - Plugins: `./plugins/withModularHeaders` (for iOS CocoaPods)

### Assets
- `assets/Android/` - Mipmap structure (multiple densities)
- `src/assets/icons/mercancia/` - box, carGrua, gasStation, gravel (WebP)
- `assets/TruckBook/` - Updated with adaptive-foreground.png

## Architecture Notes

### Offline Flow
1. User registers gasto/ingreso while offline
2. Hook checks `NetInfo.fetch()` to skip authorization call
3. Operation queues in OfflineQueueStore with temp ID
4. On reconnect, useSyncManager processes queue
5. Temp IDs replaced with server IDs, stores updated

### Icon Mapping Pattern
```
Truck Type → Flete Icon + Mercancía Icon
- volqueta → volquetaFlete + gravel
- grua → gruaFlete + carGrua
- planchon → planchosFlete + carGrua
- estacas → estacaFlete + box
- furgon → furgon + box
- cisterna → cisterna + gasStation
- porta → portaContenedor + box
```

### Input Sanitization
All text fields use `sanitizarInput(text, maxLength)`:
- Removes: `<>{}[]`
- Trims whitespace
- Limits to 500 chars (default)
- Applied before DB insert

## Known Issues & Workarounds

### iOS CocoaPods Issue
**Problem**: Google Sign-In requires mixing Swift and Objective-C pods
**Solution**: Plugin at `./plugins/withModularHeaders` adds `use_modular_headers!`
**Status**: Restored and retrying build

### Android Asset Paths
**Problem**: Initially tried `./src/assets/Android/` (wrong)
**Solution**: Assets at root level `./assets/Android/`
**Status**: Fixed, assets committed to git

### iOS Plan Free Limit
**Problem**: Free plan allows limited builds per month
**Status**: Limit reached, resets July 1, 2026
**Workaround**: Upgrade plan or wait for reset

## Testing Recommendations

1. **Offline Registration**
   - Kill internet, register expense/income
   - Verify it queues (check store state)
   - Restore internet, verify sync completes

2. **Dynamic Icons**
   - Home screen: Change truck type
   - Ingresos: Switch between Flete → verify icon changes
   - Ingresos: Switch to Mercancía → verify icon changes

3. **Input Security**
   - Try XSS in cliente field: `<script>alert(1)</script>`
   - Try in descripción: `{alert('xss')}`
   - Verify they're sanitized, app still works

4. **Category Fields**
   - Mercancía: Verify "tipo" field appears and is required
   - Flete: Verify "cantidad" field works
   - Others: Verify cliente + descripción only

## Next Steps

1. **Monitor iOS Build** (in progress)
   - Check: https://expo.dev/accounts/diegoalfonsoc18/projects/TruckBook/builds
   - If success → appears in Submissions tab, TestFlight queue
   - If fail → review "Install pods" logs for CocoaPods issues

2. **Verify Android Release**
   - Check Play Store internal testing track
   - Test installation on device/emulator
   - Verify all Ingresos categories work (especially Mercancía)

3. **Production Readiness**
   - [ ] iOS TestFlight build (if build succeeds)
   - [ ] Android internal track tested
   - [ ] Move to production track
   - [ ] Version bump for release

4. **Post-Release**
   - Monitor crash reports
   - Verify offline sync works in production builds (not just Expo Go)
   - Consider dark mode for v2

## Quirks & Reminders

- Files with trailing spaces (do NOT rename):
  - `src/Screens/propietario/PropietarioHome .tsx`
  - `src/Screens/propietario/PropietarioStyles .tsx`
  - `src/Screens/conductor/ConductorStyles .tsx`

- Offline vs. Expo Go:
  - `expo-print` (PDF generation) hangs in Expo Go
  - Offline queue works in both, but production builds are more reliable
  - Push notifications don't work in Expo Go (SDK 54+) — works in production

## Contact & Escalation

- Last worked by: Claude Code session
- Last update: June 14, 2026, 12:32 PM
- Critical blocker: iOS builds on Free plan (limit reset July 1)
- Active investigation: iOS CocoaPods / withModularHeaders plugin
