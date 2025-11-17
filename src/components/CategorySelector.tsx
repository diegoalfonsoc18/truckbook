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
  color: string;
}

interface CategorySelectorProps {
  options: CategoryOption[];
  value: string;
  onSelect: (id: string) => void;
  title?: string;
  iconSize?: number;
}

export function CategorySelector({
  options,
  value,
  onSelect,
  title = "Selecciona una categoría:",
  iconSize = 28,
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
  iconSize = 28,
}: {
  option: CategoryOption;
  isSelected: boolean;
  onPress: () => void;
  iconSize?: number;
}) {
  const Icon = option.icon;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: isSelected ? option.color : "#F3F4F6",
          opacity: isSelected ? 1 : 0.7,
          shadowOpacity: isSelected ? 0.3 : 0.1,
        },
      ]}>
      <Icon
        width={iconSize}
        height={iconSize}
        color={isSelected ? "#FFFFFF" : "#666666"}
      />
      <Text
        style={[
          styles.buttonText,
          {
            color: isSelected ? "#FFFFFF" : "#374151",
          },
        ]}
        numberOfLines={2}>
        {option.name}
      </Text>
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
    gap: 12,
    justifyContent: "space-around",
  },
  button: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 4,
  },
});
