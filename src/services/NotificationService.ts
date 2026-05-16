import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

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
    if (!Device.isDevice) return;

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

/** Envía notificación push vía Expo Push API */
export async function enviarPushNotificacion(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: pushToken, title, body, data, sound: "default" }),
    });
  } catch (err) {
    logger.error("Error enviando push:", err);
  }
}

/** Obtiene el push token de un usuario */
export async function getPushTokenDeUsuario(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("usuarios")
    .select("push_token")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.push_token || null;
}
