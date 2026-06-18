// src/utils/encryptedStorage.ts
// Storage cifrado para Zustand persist — protege datos financieros en AsyncStorage

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import CryptoJS from "crypto-js";
import type { StateStorage } from "zustand/middleware";
import logger from "./logger";

const ENCRYPTION_KEY_ALIAS = "truckbook_storage_key";

/** Obtiene o genera la clave AES almacenada en SecureStore (keychain del dispositivo) */
async function getEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    if (!key) {
      // Generar clave aleatoria de 256 bits (64 hex chars)
      key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key);
    }
    return key;
  } catch (e: any) {
    logger.error("SecureStore unavailable for encryption key:", e?.message);
    throw new Error("SecureStore no disponible — no se puede cifrar el almacenamiento");
  }
}

/** Cifra un string con AES-256 */
async function encrypt(data: string): Promise<string> {
  const key = await getEncryptionKey();
  return CryptoJS.AES.encrypt(data, key).toString();
}

/** Descifra un string AES-256 */
async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Storage cifrado compatible con Zustand persist.
 * - Escribe: JSON → AES encrypt → AsyncStorage
 * - Lee: AsyncStorage → AES decrypt → JSON
 */
export const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encrypted = await AsyncStorage.getItem(name);
      if (!encrypted) return null;

      // Si el dato no está cifrado (migración), devolverlo tal cual
      // Los datos cifrados con CryptoJS empiezan con "U2Fsd" (base64 de "Salted__")
      if (!encrypted.startsWith("U2Fsd")) {
        return encrypted;
      }

      const decrypted = await decrypt(encrypted);
      if (!decrypted) {
        // Clave cambió o dato corrupto — limpiar para re-sincronizar desde DB
        await AsyncStorage.removeItem(name);
        return null;
      }
      return decrypted;
    } catch (e: any) {
      logger.error("encryptedStorage.getItem error:", e?.message);
      // En caso de error de descifrado, limpiar y dejar que se recargue del DB
      await AsyncStorage.removeItem(name);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const encrypted = await encrypt(value);
      await AsyncStorage.setItem(name, encrypted);
    } catch (e: any) {
      logger.error("encryptedStorage.setItem error:", e?.message);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e: any) {
      logger.error("encryptedStorage.removeItem error:", e?.message);
    }
  },
};
