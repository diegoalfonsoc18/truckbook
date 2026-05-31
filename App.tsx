import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
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

// Componente interno que usa el tema
function AppContent() {
  const { colors, isDark } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const asegurarUsuarioEnDB = async (user: any) => {
      if (!user?.id) return;
      try {
        const { error: upsertErr } = await supabase.from("usuarios").upsert(
          [{
            user_id: user.id,
            nombre: user.user_metadata?.nombre || user.email?.split("@")[0] || "",
            email: user.email,
            cedula: user.user_metadata?.cedula || "",
          }],
          { onConflict: "user_id", ignoreDuplicates: true }
        );
        if (upsertErr) {
          logger.error("❌ Error en usuario DB:", upsertErr.message, upsertErr.code, upsertErr.details);
        }
      } catch (e: any) {
        logger.error("❌ Error en usuario DB (catch):", e?.message ?? e);
      }
    };

    // Leer sesión local (AsyncStorage) — instantáneo, sin red
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); // mostrar app inmediatamente con datos en caché

      // Sincronizar con DB en background sin bloquear la UI
      if (session?.user) {
        Promise.all([
          asegurarUsuarioEnDB(session.user),
          useVehiculoStore.getState().validarPlacaParaUsuario(session.user.id),
        ]).catch((err) => logger.error("❌ Error en sync background:", err));
      }
    }).catch((err) => {
      logger.error("❌ Error al inicializar sesión:", err);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          try {
            await Promise.all([
              asegurarUsuarioEnDB(session.user),
              useVehiculoStore.getState().validarPlacaParaUsuario(session.user.id),
            ]);
          } catch (err) {
            logger.error("❌ Error en sync auth:", err);
          }
          setSession(session);
        } else {
          useVehiculoStore.getState().clearVehiculo();
          setSession(null);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

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

// App principal con ThemeProvider
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
