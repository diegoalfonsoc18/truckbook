import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  AppState,
  type AppStateStatus,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import "react-native-get-random-values";
import { setupCalendarLocale } from "./src/utils/calendarLocale";
setupCalendarLocale();
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider } from "./src/context/DataProvider";
import AppStack from "./src/navigation/AppStack";
import AuthStack from "./src/navigation/AuthStack";
import supabase from "./src/config/SupaBaseConfig";
import { ThemeProvider, useTheme } from "./src/constants/Themecontext";
import { useVehiculoStore } from "./src/store/VehiculoStore";
import logger from "./src/utils/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sincroniza datos del usuario en la tabla `usuarios` (background, no bloquea UI) */
const syncUsuarioDB = async (user: { id: string; email?: string; user_metadata?: any }) => {
  if (!user?.id) return;
  try {
    const meta = user.user_metadata ?? {};
    const nombre = meta.nombre || meta.full_name || meta.name || user.email?.split("@")[0] || "";
    const { error } = await supabase.from("usuarios").upsert(
      [{
        user_id: user.id,
        nombre,
        email: user.email,
        cedula: meta.cedula || "",
      }],
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    if (error) logger.error("❌ syncUsuarioDB:", error.message);
  } catch (e: any) {
    logger.error("❌ syncUsuarioDB catch:", e?.message ?? e);
  }
};

/** Sincroniza usuario + valida placa en background */
const syncBackground = (user: any) => {
  Promise.all([
    syncUsuarioDB(user),
    useVehiculoStore.getState().validarPlacaParaUsuario(user.id),
  ]).catch((err) => logger.error("❌ syncBackground:", err));
};

// ─── AppContent ──────────────────────────────────────────────────────────────

function AppContent() {
  const { colors, isDark } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  // Mantener ref sincronizado para acceder en callbacks sin re-renders
  const updateSession = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSession(s);
  }, []);

  // Tema de navegación dinámico
  const NavigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.primary,
      card: colors.cardBg,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  // ─── Refresh al volver de background ───────────────────────────────────
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === "active" && sessionRef.current) {
        // App vuelve a foreground — refrescar token silenciosamente
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            logger.error("❌ Refresh en foreground:", error.message);
          } else if (data.session) {
            updateSession(data.session);
          }
          // Si no hay sesión, NO limpiar — puede ser transitorio
        } catch (e: any) {
          logger.error("❌ Refresh foreground catch:", e?.message);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [updateSession]);

  // ─── Inicialización de sesión + listener ───────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Timeout de seguridad — solo si SecureStore tarda mucho
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        logger.log("⚠️ Timeout getSession (15s)");
        setLoading(false);
        // NO setSession(null) — si había sesión en SecureStore, se carga después
      }
    }, 15000);

    // Cargar sesión persistida
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      clearTimeout(timeout);
      if (!mounted) return;
      updateSession(s);
      setLoading(false);
      if (s?.user) syncBackground(s.user);
    }).catch((err) => {
      clearTimeout(timeout);
      if (!mounted) return;
      logger.error("❌ getSession error:", err?.message);
      setLoading(false);
      // No limpiar sesión — el usuario podría tener sesión válida en SecureStore
    });

    // Listener de cambios de auth
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        logger.log(`🔑 ${_event} | session: ${!!newSession}`);

        switch (_event) {
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
          case "USER_UPDATED":
            if (newSession?.user) {
              updateSession(newSession);
              syncBackground(newSession.user);
            }
            // Si el evento llega sin sesión, ignorar — transitorio
            break;

          case "SIGNED_OUT":
            // Único caso donde se limpia la sesión
            useVehiculoStore.getState().clearVehiculo();
            updateSession(null);
            break;

          case "INITIAL_SESSION":
            // Solo actualizar si tenemos sesión; si es null y ya tenemos
            // una sesión cargada, no sobreescribir
            if (newSession?.user) {
              updateSession(newSession);
              syncBackground(newSession.user);
            } else if (!sessionRef.current) {
              // Realmente no hay sesión
              updateSession(null);
            }
            break;

          default:
            // Eventos futuros — solo actualizar si hay sesión válida
            if (newSession?.user) {
              updateSession(newSession);
            }
            break;
        }
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [updateSession]);

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.primary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        translucent={Platform.OS === "android"}
        backgroundColor="transparent"
      />
      {session ? (
        <DataProvider>
          <NavigationContainer theme={NavigationTheme}>
            <AppStack />
          </NavigationContainer>
        </DataProvider>
      ) : (
        <NavigationContainer theme={NavigationTheme}>
          <AuthStack />
        </NavigationContainer>
      )}
    </View>
  );
}

// ─── App principal ───────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
