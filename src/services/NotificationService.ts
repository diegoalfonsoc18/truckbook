import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

/** Devuelve true si la app corre dentro de Expo Go (no development build) */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Registra el dispositivo y guarda el push token en usuarios */
export async function registrarPushToken(userId: string): Promise<void> {
  try {
    // Remote push tokens no están disponibles en Expo Go desde SDK 53
    if (!Device.isDevice || isExpoGo()) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "TruckBook",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "494c025d-768e-41f8-a040-ee0dd05aaaf0",
    });

    await supabase
      .from("usuarios")
      .update({ push_token: tokenData.data })
      .eq("user_id", userId);
  } catch (err) {
    logger.error("Error registrando push token:", err);
  }
}

/**
 * Envía notificación push a un usuario vía Supabase Edge Function.
 * El push token nunca se expone al cliente — la Edge Function lo obtiene server-side.
 */
export async function enviarPushNotificacion(
  targetUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: { targetUserId, title, body, data },
    });

    if (error) {
      logger.error("Error enviando push:", error);
    }
  } catch (err) {
    logger.error("Error enviando push:", err);
  }
}
