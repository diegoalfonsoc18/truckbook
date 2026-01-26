import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import {
  useTheme,
  ThemeMode,
  BORDER_RADIUS,
  SPACING,
  getShadow,
} from "./themecontext";

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ visible, onClose }) => {
  const { mode, setMode, colors, isDark } = useTheme();

  const options: {
    value: ThemeMode;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      value: "light",
      label: "Claro",
      icon: "☀️",
      description: "Tema claro siempre activo",
    },
    {
      value: "dark",
      label: "Oscuro",
      icon: "🌙",
      description: "Tema oscuro siempre activo",
    },
    {
      value: "system",
      label: "Sistema",
      icon: "📱",
      description: "Seguir configuración del dispositivo",
    },
  ];

  const handleSelect = (newMode: ThemeMode) => {
    setMode(newMode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.centeredView}>
          <Pressable
            style={[
              styles.modalContainer,
              { backgroundColor: colors.modalBg },
              getShadow(isDark, "lg"),
            ]}
            onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.border },
              ]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Apariencia
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Elige cómo se ve TruckBook
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map((option) => {
                const isSelected = mode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected
                          ? colors.accentLight
                          : "transparent",
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: colors.cardBg },
                      ]}>
                      <Text style={styles.optionIconText}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: isSelected ? colors.accent : colors.text },
                        ]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDescription,
                          { color: colors.textSecondary },
                        ]}>
                        {option.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkmark,
                          { backgroundColor: colors.accent },
                        ]}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preview */}
            <View
              style={[
                styles.previewContainer,
                { backgroundColor: colors.surface },
              ]}>
              <Text
                style={[styles.previewTitle, { color: colors.textSecondary }]}>
                Vista previa
              </Text>
              <View style={styles.previewRow}>
                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.previewDot,
                      { backgroundColor: colors.income },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewLine,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewLineShort,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.previewDot,
                      { backgroundColor: colors.expense },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewLine,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewLineShort,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.cardBg }]}
              onPress={onClose}
              activeOpacity={0.7}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  centeredView: {
    width: "90%",
    maxWidth: 400,
  },
  modalContainer: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
  },
  modalHeader: {
    padding: SPACING.xl,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  optionsContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  previewContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  previewCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.xs,
  },
  previewLineShort: {
    height: 6,
    borderRadius: 3,
    width: "60%",
  },
  closeButton: {
    margin: SPACING.lg,
    marginTop: 0,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ThemeSelector;
