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
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#393E46",
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
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/TruckBook/truckbook-iOS-Default-1024x1024@1x.png",
        backgroundColor: "#393E46",
      },
      package: "com.truckbook.app",
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
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
      "expo-secure-store",
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL ?? "https://erinesvycnvmqbsrawlk.supabase.co",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaW5lc3Z5Y252bXFic3Jhd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNzY5NjgsImV4cCI6MjA5Mjc1Mjk2OH0.mPMGwgcrcAfepUFs19PD75XjkPDIKRqzYWXWcAsQ0nM",
      eas: {
        projectId: "494c025d-768e-41f8-a040-ee0dd05aaaf0",
      },
    },
  },
};
