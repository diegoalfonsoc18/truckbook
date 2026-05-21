// src/store/DocumentosVigenciaStore.ts
//
// Cache de vigencias de documentos (SOAT, RTM, Licencia) y control de fetch
// de multas. Persiste en AsyncStorage para sobrevivir reinicios de la app.
//
// Estrategia:
//  - SOAT / RTM / Licencia: guardamos la fechaVencimiento devuelta por la API.
//    El hook calcula la vigencia localmente y solo vuelve a llamar a la API
//    cuando: (a) no hay cache, (b) el documento ya venció, o (c) vence en ≤7 días.
//  - Multas: solo registramos si ya se hizo al menos una consulta (fetchedAt).
//    El hook no hace auto-fetch; la pantalla lo hace manualmente.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface VigenciaCache {
  fechaVencimiento: string; // ISO 8601
  fetchedAt: string;        // ISO 8601 — cuándo se hizo la última consulta a la API
}

interface DocumentosVigenciaState {
  soat:     Record<string, VigenciaCache>; // clave: placa (uppercase)
  rtm:      Record<string, VigenciaCache>; // clave: placa (uppercase)
  licencia: Record<string, VigenciaCache>; // clave: documento (número)
  multasFetchedAt: Record<string, string>; // clave: placa → ISO de último fetch

  // ─── Guardar resultados de API ──────────────────────────────────────────
  guardarSOAT:     (placa: string,     fechaVencimiento: string) => void;
  guardarRTM:      (placa: string,     fechaVencimiento: string) => void;
  guardarLicencia: (documento: string, fechaVencimiento: string) => void;
  registrarFetchMultas: (placa: string) => void;

  // ─── Leer cache ────────────────────────────────────────────────────────
  getSOAT:     (placa: string)     => VigenciaCache | null;
  getRTM:      (placa: string)     => VigenciaCache | null;
  getLicencia: (documento: string) => VigenciaCache | null;

  // ─── Decidir si hay que llamar a la API ────────────────────────────────
  //   true  → hay que consultar
  //   false → el cache es válido, calcular localmente
  necesitaFetchSOAT:     (placa: string)     => boolean;
  necesitaFetchRTM:      (placa: string)     => boolean;
  necesitaFetchLicencia: (documento: string) => boolean;
  /** Para multas: true solo si NUNCA se ha consultado esta placa */
  necesitaFetchMultas:   (placa: string)     => boolean;

  // ─── Limpieza ──────────────────────────────────────────────────────────
  limpiarPlaca:     (placa: string)     => void;
  limpiarDocumento: (documento: string) => void;
  limpiarTodo:      () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_UMBRAL_RENOVAR = 7; // re-fetch cuando quedan ≤7 días para vencer

function necesitaRenovar(cache: VigenciaCache | null): boolean {
  if (!cache) return true;

  const vencimiento = new Date(cache.fechaVencimiento);
  const hoy = new Date();

  // Ya venció
  if (vencimiento <= hoy) return true;

  // Vence en ≤ DIAS_UMBRAL_RENOVAR días
  const msDiff = vencimiento.getTime() - hoy.getTime();
  const diasRestantes = msDiff / (1000 * 60 * 60 * 24);
  if (diasRestantes <= DIAS_UMBRAL_RENOVAR) return true;

  return false;
}

function normalizar(s: string): string {
  return s.trim().toUpperCase();
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useDocumentosVigenciaStore = create<DocumentosVigenciaState>()(
  persist(
    (set, get) => ({
      soat: {},
      rtm: {},
      licencia: {},
      multasFetchedAt: {},

      // ── Guardar ──────────────────────────────────────────────────────────

      guardarSOAT: (placa, fechaVencimiento) => {
        const key = normalizar(placa);
        set((s) => ({
          soat: {
            ...s.soat,
            [key]: { fechaVencimiento, fetchedAt: new Date().toISOString() },
          },
        }));
      },

      guardarRTM: (placa, fechaVencimiento) => {
        const key = normalizar(placa);
        set((s) => ({
          rtm: {
            ...s.rtm,
            [key]: { fechaVencimiento, fetchedAt: new Date().toISOString() },
          },
        }));
      },

      guardarLicencia: (documento, fechaVencimiento) => {
        const key = normalizar(documento);
        set((s) => ({
          licencia: {
            ...s.licencia,
            [key]: { fechaVencimiento, fetchedAt: new Date().toISOString() },
          },
        }));
      },

      registrarFetchMultas: (placa) => {
        const key = normalizar(placa);
        set((s) => ({
          multasFetchedAt: {
            ...s.multasFetchedAt,
            [key]: new Date().toISOString(),
          },
        }));
      },

      // ── Leer ─────────────────────────────────────────────────────────────

      getSOAT: (placa) => get().soat[normalizar(placa)] ?? null,
      getRTM:  (placa) => get().rtm[normalizar(placa)]  ?? null,
      getLicencia: (documento) => get().licencia[normalizar(documento)] ?? null,

      // ── Decidir fetch ─────────────────────────────────────────────────────

      necesitaFetchSOAT: (placa) =>
        necesitaRenovar(get().soat[normalizar(placa)] ?? null),

      necesitaFetchRTM: (placa) =>
        necesitaRenovar(get().rtm[normalizar(placa)] ?? null),

      necesitaFetchLicencia: (documento) =>
        necesitaRenovar(get().licencia[normalizar(documento)] ?? null),

      necesitaFetchMultas: (placa) =>
        !get().multasFetchedAt[normalizar(placa)],

      // ── Limpieza ─────────────────────────────────────────────────────────

      limpiarPlaca: (placa) => {
        const key = normalizar(placa);
        set((s) => {
          const soat = { ...s.soat };
          const rtm  = { ...s.rtm };
          const mfa  = { ...s.multasFetchedAt };
          delete soat[key];
          delete rtm[key];
          delete mfa[key];
          return { soat, rtm, multasFetchedAt: mfa };
        });
      },

      limpiarDocumento: (documento) => {
        const key = normalizar(documento);
        set((s) => {
          const licencia = { ...s.licencia };
          delete licencia[key];
          return { licencia };
        });
      },

      limpiarTodo: () =>
        set({ soat: {}, rtm: {}, licencia: {}, multasFetchedAt: {} }),
    }),
    {
      name: "documentos-vigencia-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
