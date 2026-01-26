import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import "react-native-gesture-handler";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import "react-native-get-random-values";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider } from "./src/context/DataProvider";
import AppStack from "./src/navigation/AppStack";
import AuthStack from "./src/navigation/AuthStack";
import supabase from "./src/config/SupaBaseConfig";
import { ThemeProvider, useTheme } from "./src/constants/Themecontext";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
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
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
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
