// src/screens/Auth/SelectRole.tsx
import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRoleStore, UserRole } from "../../store/RoleStore";
import styles from "./SelectRoleStyles";
import { PersonIcon, AdminIcon, TruckIcon } from "../../assets/icons/icons"; // Ajusta según tus iconos

type RootStackParamList = {
  SelectRole: undefined;
  Home: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "SelectRole">;

const ROLES = [
  {
    id: "conductor" as UserRole,
    label: "Conductor",
    description: "Maneja los vehículos",
    icon: PersonIcon,
  },
  {
    id: "administrador" as UserRole,
    label: "Administrador",
    description: "Gestiona la empresa",
    icon: AdminIcon,
  },
  {
    id: "dueño" as UserRole,
    label: "Dueño del Camión",
    description: "Propietario del vehículo",
    icon: TruckIcon,
  },
];

export default function SelectRoleScreen({ navigation }: Props) {
  const setRole = useRoleStore((state) => state.setRole);
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setRole(role);
    // Navega a Home después de 300ms
    setTimeout(() => {
      navigation.replace("Home");
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>¿Cuál es tu rol?</Text>
        <Text style={styles.subtitle}>
          Selecciona el rol que mejor te describe
        </Text>
      </View>

      <View style={styles.rolesContainer}>
        {ROLES.map((role) => {
          const IconComponent = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => handleSelectRole(role.id)}
              activeOpacity={0.8}>
              <View
                style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}>
                <IconComponent
                  width={40}
                  height={40}
                  color={isSelected ? "#FFFFFF" : "#2196F3"}
                />
              </View>

              <Text
                style={[
                  styles.roleLabel,
                  isSelected && styles.roleLabelSelected,
                ]}>
                {role.label}
              </Text>

              <Text
                style={[
                  styles.roleDescription,
                  isSelected && styles.roleDescriptionSelected,
                ]}>
                {role.description}
              </Text>

              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.footerText}>
        Puedes cambiar tu rol más tarde en la configuración
      </Text>
    </SafeAreaView>
  );
}
