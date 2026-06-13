import "dotenv/config";

export default {
  expo: {
    name: "TruckBook",
    slug: "TruckBook",
    scheme: "truckbook",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/TruckBook/truckbook-iOS-Default-1024x1024@1x.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/TruckBook/truckbook-iOS-Default-1024x1024@1x.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.truckbook.app",
      icon: {
        light: "./assets/TruckBook/truckbook-iOS-Default-1024x1024@1x.png",
        dark: "./assets/TruckBook/truckbook-iOS-Dark-1024x1024@1x.png",
        tinted: "./assets/TruckBook/truckbook-iOS-TintedDark-1024x1024@1x.png",
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          "TruckBook usa tu ubicación para mostrarte el clima actual en tu ruta.",
        NSCameraUsageDescription:
          "TruckBook necesita acceso a la cámara para escanear facturas y recibos.",
        NSPhotoLibraryUsageDescription:
          "TruckBook necesita acceso a tus fotos para seleccionar facturas y recibos.",
        NSContactsUsageDescription:
          "TruckBook necesita acceso a tus contactos para agregar clientes a los registros de flete.",
      },
    },
    android: {
      icon: "./assets/TruckBook/grilleWhite.png",
      adaptiveIcon: {
        foregroundImage: "./assets/TruckBook/adaptive-foreground.png",
        backgroundColor: "#1A1A2E",
      },
      package: "com.truckbook.app",
      // Los permisos los gestionan los plugins (expo-location, expo-contacts, etc.)
    },
    plugins: [
      "./plugins/withModularHeaders",
      "expo-localization",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "TruckBook usa tu ubicación para mostrarte el clima actual en tu ruta.",
        },
      ],
      "expo-web-browser",
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/TruckBook/truckbook-iOS-Default-1024x1024@1x.png",
          color: "#00D9A5",
        },
      ],
      [
        "expo-contacts",
        {
          contactsPermission:
            "TruckBook necesita acceso a tus contactos para agregar clientes a la cuenta de cobro.",
        },
      ],
      "expo-apple-authentication",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            "com.googleusercontent.apps.48411599186-o45n7euch24bvbl0e1rb5fcul8kojgso",
        },
      ],
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission:
            "TruckBook necesita acceso a tus fotos para seleccionar facturas y recibos.",
          cameraPermission:
            "TruckBook necesita acceso a la cámara para escanear facturas y recibos.",
        },
      ],
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
      eas: {
        projectId: "494c025d-768e-41f8-a040-ee0dd05aaaf0",
      },
    },
  },
};
