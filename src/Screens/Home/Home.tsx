import React from "react";
import { Text, Image, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./HomeStyles";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { items } from "./Items"; // Importing the items array
import { CamionIcon } from "../../assets/icons/icons";
export default function Home() {
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.containerHeader}>
        <CamionIcon />
        <Text>Agrega tu camión</Text>
        <FontAwesome name="drivers-license" size={24} color="black" />
      </View>
      <View style={styles.containerScroll}>
        <ScrollView
          style={{ width: "100%", flex: 1 }}
          contentContainerStyle={{
            justifyContent: "center", // Centra verticalmente si hay espacio
            alignItems: "center",
            paddingBottom: 10,
          }}
          showsVerticalScrollIndicator={false}>
          <View style={styles.containerAlert}>
            <Text style={styles.textAlert}>Avisos</Text>
          </View>
          <View style={styles.itemsContainer}>
            {items.map((item, idx) => {
              const isComponent = typeof item.icon === "function";
              const Icon = item.icon;

              return (
                <TouchableOpacity
                  style={[
                    styles.itemBox,
                    { backgroundColor: item.backgroundColor || "#FFFFFF" }, // ✅ Color dinámico
                  ]}
                  key={idx}
                  activeOpacity={0.7}>
                  <View style={styles.iconContainer}>
                    {isComponent ? (
                      <Icon width={40} height={40} />
                    ) : (
                      <Image source={item.icon} style={styles.iconItemBox} />
                    )}
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.textTitle}>{item.title}</Text>
                    {item.subtitle && (
                      <Text style={styles.textSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
