// src/Screens/FinanzasGeneral/components/ChipsCategoria.tsx
// Selector horizontal de categoría ("Todas" + las 15 categorías).
//
// Estaba duplicado: una copia en el filtro de la pantalla y otra en el modal
// de exportar, idénticas salvo el tamaño del ícono y unos píxeles de padding.
// Esa es la única diferencia real, así que aquí es la prop `variante`.
import React from "react";
import { ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";
import ItemIcon from "../../../components/ItemIcon";
import { useTheme } from "../../../constants/Themecontext";
import { CATEGORIAS_EXPORT, HORIZONTAL_PADDING } from "../finanzasUtils";

interface Props {
  /** Categoría activa; null = "Todas". */
  value: string | null;
  onChange: (categoria: string | null) => void;
  /** "pantalla" es algo más compacta que la del modal de exportar. */
  variante?: "pantalla" | "export";
}

export default function ChipsCategoria({
  value,
  onChange,
  variante = "pantalla",
}: Props) {
  const { colors: c } = useTheme();
  const esPantalla = variante === "pantalla";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[st.scroll, { marginBottom: esPantalla ? 16 : 20 }]}
      contentContainerStyle={st.content}>
      {[{ tipo: null as string | null }, ...CATEGORIAS_EXPORT].map((cat) => {
        const selected = value === cat.tipo;
        const isTodas = cat.tipo === null;
        return (
          <TouchableOpacity
            key={cat.tipo ?? "__todas"}
            style={[
              st.chip,
              esPantalla ? st.chipPantalla : st.chipExport,
              {
                backgroundColor: c.cardBg,
                borderColor: selected ? c.accent : c.border,
              },
              selected && { borderWidth: 1.5 },
            ]}
            onPress={() => onChange(cat.tipo)}
            activeOpacity={0.7}>
            {!isTodas && (
              <ItemIcon
                name={(cat as (typeof CATEGORIAS_EXPORT)[0]).icon}
                size={esPantalla ? 18 : 20}
              />
            )}
            <Text
              style={[
                esPantalla ? st.textoPantalla : st.textoExport,
                { color: selected ? c.accent : c.textSecondary },
              ]}
              numberOfLines={1}>
              {isTodas ? "Todas" : cat.tipo}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll: { marginHorizontal: -HORIZONTAL_PADDING },
  content: { gap: 8, paddingHorizontal: HORIZONTAL_PADDING },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 8,
  },
  chipPantalla: { paddingRight: 13, paddingVertical: 6 },
  chipExport: { paddingRight: 14, paddingVertical: 7 },
  textoPantalla: { fontSize: 12.5, fontWeight: "600" },
  textoExport: { fontSize: 13, fontWeight: "600" },
});
