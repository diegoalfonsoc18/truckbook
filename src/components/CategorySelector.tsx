// components/CategorySelector.tsx
import React from "react";
import { View, Pressable, Text, ScrollView, StyleSheet } from "react-native";

interface CategoryOption {
  id: string;
  name: string;
  icon: React.ComponentType<{
    width?: number;
    height?: number;
    color?: string;
  }>;
  color?: string;
  iconColor?: string;
}

interface CategorySelectorProps {
  options: CategoryOption[];
  value: string;
  onSelect: (id: string) => void;
  title?: string;
  iconSize?: number;
  defaultBgColor?: string;
  defaultIconColor?: string;
  selectedBgColor?: string;
  selectedIconColor?: string;
}

export function CategorySelector({
  options,
  value,
  onSelect,
  title = "Selecciona una categoría:",
  iconSize = 40,
  defaultBgColor = "#F5F5F5",
  defaultIconColor = "#1F2937",
  selectedBgColor = "#0851e2",
  selectedIconColor = "#FFD700",
}: CategorySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {options.map((option) => (
            <CategoryButton
              key={option.id}
              option={option}
              isSelected={value === option.id}
              onPress={() => onSelect(option.id)}
              iconSize={iconSize}
              defaultBgColor={defaultBgColor}
              defaultIconColor={defaultIconColor}
              selectedBgColor={selectedBgColor}
              selectedIconColor={selectedIconColor}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CategoryButton({
  option,
  isSelected,
  onPress,
  iconSize = 40,
  defaultBgColor,
  defaultIconColor,
  selectedBgColor,
  selectedIconColor,
}: {
  option: CategoryOption;
  isSelected: boolean;
  onPress: () => void;
  iconSize?: number;
  defaultBgColor?: string;
  defaultIconColor?: string;
  selectedBgColor?: string;
  selectedIconColor?: string;
}) {
  const Icon = option.icon;

  const buttonBgColor = isSelected
    ? option.color || selectedBgColor || "#0851e2"
    : defaultBgColor || "#F5F5F5";

  const iconColor = isSelected
    ? option.iconColor || selectedIconColor || "#FFD700"
    : option.iconColor || defaultIconColor || "#1F2937";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: buttonBgColor,
          transform: isSelected ? [{ scale: 1.05 }] : [{ scale: 1 }],
        },
      ]}>
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Icon width={iconSize} height={iconSize} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.buttonText,
              {
                color: isSelected ? "#FFFFFF" : "#1F2937",
                fontWeight: isSelected ? "700" : "600",
              },
            ]}
            numberOfLines={1}>
            {option.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  button: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowOpacity: 0.15,
    elevation: 4,
    padding: 4,
  },
  contentContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 0,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 8,
    backgroundColor: "#cc0",
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 2,
    backgroundColor: "#30cc00",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 4,
  },
});
