import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Platform,
  AppState,
  Alert,
  type AppStateStatus,
} from "react-native";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import type { AuthStackParamList } from "./src/navigation/AuthStack";
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
import { useGastosStore } from "./src/store/GastosStore";
import { useIngresosStore } from "./src/store/IngresosStore";
import logger from "./src/utils/logger";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { consumirLogoutIntencional } from "./src/utils/authIntent";

// Un solo splash: el nativo (icono negro + TruckBook, ver app.config.js) queda
// visible mientras carga la sesión; se oculta en AppContent cuando loading=false.
SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * ¿Hay internet REAL, no solo una interfaz de red levantada?
 *
 * `isConnected` solo dice que el dispositivo está asociado a una red: con una
 * barra de señal en zona rural sigue en `true` aunque no pase un solo byte.
 * `isInternetReachable` es el que confirma tráfico; puede ser `null` mientras
 * NetInfo todavía no lo determinó, y en ese caso NO asumimos que hay internet.
 *
 * Se usa para decidir si un evento que implica desloguear al usuario es de fiar.
 * Ante la duda preferimos dejarlo adentro: quedarse con una sesión que quizá
 * expiró es recuperable, echarlo al Login en medio de la carretera no.
 */
const hayInternetConfirmado = (state: NetInfoState): boolean =>
  state.isConnected === true && state.isInternetReachable === true;

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

const authNavigationRef = createNavigationContainerRef<AuthStackParamList>();

function AppContent() {
  const { colors, isDark } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const pendingRecovery = useRef(false);

  // Ocultar el splash nativo cuando la sesión terminó de cargar
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);
  const recoveryModeRef = useRef(false);

  // Mantener ref de recoveryMode sincronizado para leerlo en callbacks con
  // closure stale (listener de onAuthStateChange)
  const enterRecoveryMode = useCallback(() => {
    recoveryModeRef.current = true;
    setRecoveryMode(true);
  }, []);

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

  // ─── Navegar a ResetPassword cuando recovery mode se activa ──────────
  useEffect(() => {
    if (!recoveryMode) return;
    if (authNavigationRef.isReady()) {
      // Navigator ya montado (usuario no tenía sesión activa)
      authNavigationRef.navigate("ResetPassword");
    } else {
      // Navigator recién montando (venía de AppStack) — onReady lo manejará
      pendingRecovery.current = true;
    }
  }, [recoveryMode]);

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

  // ─── Deep link handler (password recovery) ────────────────────────────
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("auth/callback")) return;
      logger.log("🔗 Deep link recibido:", url);
      try {
        // Unir params de query (?a=b) y de hash (#a=b) en un solo objeto
        const params: Record<string, string> = {};
        const collect = (segment?: string) => {
          if (!segment) return;
          segment.split("&").forEach((pair) => {
            const [k, v] = pair.split("=");
            if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
          });
        };
        const [beforeHash, afterHash] = url.split("#");
        collect(beforeHash.split("?")[1]); // query params
        collect(afterHash);                // hash params

        const code         = params["code"];
        const tokenHash    = params["token_hash"];
        const accessToken  = params["access_token"];
        const refreshToken = params["refresh_token"];
        const type         = params["type"];

        // El link de recuperación es de un solo uso: si expiró o ya fue
        // consumido (prefetch del correo), llega con error en vez de code/token
        if (params["error"] || params["error_code"]) {
          Alert.alert(
            "Enlace expirado",
            "El enlace de recuperación no es válido o ya fue usado. Solicita uno nuevo.",
          );
          return;
        }

        // Flujo stateless (preferido): ?token_hash=xxx&type=recovery
        // verifyOtp NO necesita code-verifier guardado en el dispositivo, así
        // que funciona sin importar desde qué instalación se pidió el reset.
        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as any) || "recovery",
          });
          if (error) {
            logger.error("❌ verifyOtp:", error.message);
            Alert.alert(
              "Enlace inválido",
              "El enlace de recuperación no es válido o ya fue usado. Solicita uno nuevo.",
            );
            return;
          }
          logger.log("✅ verifyOtp OK, type:", type);
          if (data.session) updateSession(data.session);
          if ((type || "recovery") === "recovery") enterRecoveryMode();
          return;
        }

        // Flujo PKCE: ?code=xxx — pasar SOLO el código, no la URL completa
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            logger.error("❌ exchangeCodeForSession:", error.message);
            return;
          }
          logger.log("✅ PKCE exchange OK");
          if (data.session) updateSession(data.session);
          enterRecoveryMode();
          return;
        }

        // Flujo implícito: #access_token=xxx&refresh_token=yyy&type=recovery
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            logger.error("❌ setSession:", error.message);
            return;
          }
          logger.log("✅ setSession OK, type:", type);
          if (data.session) updateSession(data.session);
          if (type === "recovery") enterRecoveryMode();
          return;
        }

        logger.error("❌ Deep link sin tokens ni code:", url);
      } catch (e: any) {
        logger.error("❌ deep link handler:", e?.message);
      }
    };

    // App abierta desde cold start con el link
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // App ya abierta, llega el link
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [updateSession, enterRecoveryMode]);

  // ─── Inicialización de sesión + listener ───────────────────────────────
  useEffect(() => {
    let mounted = true;
    let offlineTimeout: ReturnType<typeof setTimeout> | null = null;

    // Timeout de seguridad — solo si SecureStore tarda mucho
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        logger.log("⚠️ Timeout getSession (15s)");
        setLoading(false);
      }
    }, 15000);

    // Cargar sesión persistida
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      clearTimeout(timeout);
      if (!mounted) return;
      if (s) {
        updateSession(s);
        setLoading(false);
        syncBackground(s.user);
      } else {
        NetInfo.fetch().then((state) => {
          if (!mounted) return;
          if (!hayInternetConfirmado(state)) {
            // Sin red: mantener loading=true y esperar a que vuelva la conexión.
            // El listener de NetInfo reintentará getSession automáticamente.
            // Fallback: si sigue offline tras 30s, mostrar login.
            logger.log("⚠️ getSession null + offline — esperando conexión");
            offlineTimeout = setTimeout(() => {
              if (mounted && !sessionRef.current) {
                logger.log("⚠️ Timeout offline (30s) — mostrando login");
                setLoading(false);
              }
            }, 30000);
          } else {
            updateSession(null);
            setLoading(false);
          }
        });
      }
    }).catch((err) => {
      clearTimeout(timeout);
      if (!mounted) return;
      logger.error("❌ getSession error:", err?.message);
      setLoading(false);
    });

    // Listener de cambios de auth
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        logger.log(`🔑 ${_event} | session: ${!!newSession}`);

        switch (_event) {
          case "PASSWORD_RECOVERY":
            if (newSession?.user) {
              updateSession(newSession);
              enterRecoveryMode();
            }
            break;

          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
          case "USER_UPDATED":
            if (newSession?.user) {
              updateSession(newSession);
              if (!recoveryModeRef.current) syncBackground(newSession.user);
            }
            break;

          case "SIGNED_OUT": {
            const cerrarSesion = () => {
              useVehiculoStore.getState().clearVehiculo();
              useGastosStore.getState().limpiarGastos();
              useIngresosStore.getState().limpiarIngresos();
              updateSession(null);
              recoveryModeRef.current = false;
              setRecoveryMode(false);
            };

            // Si el usuario pidió salir (botón Salir, eliminar cuenta, reset de
            // contraseña), cerrar siempre — sin mirar la red.
            if (consumirLogoutIntencional()) {
              cerrarSesion();
              break;
            }

            // Si no fue deliberado, es un fallo de refresh de token. Solo
            // cerrar si hay internet CONFIRMADO: con señal débil el dispositivo
            // reporta isConnected=true aunque no pase tráfico, y ese era el
            // caso que deslogueaba al usuario sin motivo.
            NetInfo.fetch().then((state) => {
              if (hayInternetConfirmado(state)) {
                cerrarSesion();
              } else {
                logger.log(
                  `⚠️ SIGNED_OUT ignorado — sin internet confirmado (isConnected=${state.isConnected}, reachable=${state.isInternetReachable})`,
                );
              }
            });
            break;
          }

          case "INITIAL_SESSION":
            if (newSession?.user) {
              updateSession(newSession);
              syncBackground(newSession.user);
            } else if (!sessionRef.current) {
              NetInfo.fetch().then((state) => {
                if (!mounted) return;
                if (hayInternetConfirmado(state)) {
                  updateSession(null);
                  setLoading(false);
                } else {
                  logger.log("⚠️ INITIAL_SESSION null + offline — ignorado");
                }
              });
            }
            break;

          default:
            if (newSession?.user) {
              updateSession(newSession);
            }
            break;
        }
      },
    );

    // Reintentar sesión cuando vuelve la conexión
    const unsubNetInfo = NetInfo.addEventListener((state) => {
      if (!mounted || sessionRef.current) return;
      if (state.isConnected) {
        logger.log("🌐 Conexión restaurada — reintentando getSession");
        if (offlineTimeout) {
          clearTimeout(offlineTimeout);
          offlineTimeout = null;
        }
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (!mounted) return;
          updateSession(s);
          setLoading(false);
          if (s?.user) syncBackground(s.user);
        }).catch(() => {
          if (!mounted) return;
          updateSession(null);
          setLoading(false);
        });
      }
    });

    return () => {
      mounted = false;
      if (offlineTimeout) clearTimeout(offlineTimeout);
      unsubNetInfo();
      listener.subscription.unsubscribe();
    };
  }, [updateSession]);

  // Mientras carga, el splash nativo (idéntico: grille negro + TruckBook)
  // sigue visible — no renderizar un segundo splash en JS.
  if (loading) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        translucent={Platform.OS === "android"}
        backgroundColor="transparent"
      />
      {session && !recoveryMode ? (
        <DataProvider>
          <NavigationContainer theme={NavigationTheme}>
            <AppStack />
          </NavigationContainer>
        </DataProvider>
      ) : (
        <NavigationContainer
          ref={authNavigationRef}
          theme={NavigationTheme}
          onReady={() => {
            if (pendingRecovery.current) {
              pendingRecovery.current = false;
              authNavigationRef.navigate("ResetPassword");
            }
          }}>
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
});
