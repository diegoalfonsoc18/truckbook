// App.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "./src/constants/colors";
import "react-native-get-random-values";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import AppStack from "./src/navigation/AppStack";
import AuthStack from "./src/navigation/AuthStack";
import supabase from "./src/config/SupaBaseConfig";

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    text: COLORS.text,
  },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.globalContainer} edges={["top", "bottom"]}>
        {/* Solo para Android, evita usar translucent en iOS */}
        {Platform.OS === "android" && (
          <View
            style={{
              height: RNStatusBar.currentHeight,
              backgroundColor: COLORS.primary,
            }}
          />
        )}
        <StatusBar
          style="dark"
          translucent={Platform.OS === "android"}
          backgroundColor={COLORS.primary}
        />
        <NavigationContainer theme={AppTheme}>
          {session ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  globalContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
