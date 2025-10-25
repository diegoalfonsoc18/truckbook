import React from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import Svg, { G, Path } from "react-native-svg";

interface StopIconProps {
  width?: number;
  height?: number;
  color?: string;
}
// Gastos: outline y filled
export const renderGastos = (color: string, size: number, focused: boolean) => (
  <MaterialCommunityIcons
    name={focused ? "gas-station" : "gas-station-outline"}
    size={size}
    color={color}
  />
);

// Ingresos: Fontisto no tiene "filled", puedes usar otro icono si quieres
export const renderIngresos = (
  color: string,
  size: number,
  focused: boolean
) => (
  <Fontisto
    name="dollar"
    size={size}
    color={color}
    // Puedes cambiar de librería si quieres un efecto filled
  />
);

// Home: outline y filled
export const renderHome = (color: string, size: number, focused: boolean) =>
  focused ? (
    <StopIconOutline width={34} height={34} color={color} /> // ← Cambiado
  ) : (
    <StopIcon width={32} height={32} color={color} /> // ← Cambiado
  );

// Finanzas: SimpleLineIcons no tiene "filled", puedes buscar otro icono si quieres
export const renderFinanzas = (
  color: string,
  size: number,
  focused: boolean
) => <SimpleLineIcons name="graph" size={size} color={color} />;

// Account: FontAwesome ejemplo con dos iconos distintos
export const renderAccount = (
  color: string,
  size: number,
  focused: boolean
) => (
  <FontAwesome name={focused ? "user" : "user-o"} size={size} color={color} />
);

// Versión OUTLINE (sin relleno)
export const StopIconOutline = ({
  width = 24,
  height = 24,
  color = "currentColor",
  ...props
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 512 512" {...props}>
      <G fill={color}>
        <Path d="m30 256c0-52.572 18.447-103.771 51.944-144.164 5.288-6.377 4.405-15.834-1.972-21.122-6.377-5.286-15.832-4.404-21.122 1.972-37.95 45.764-58.85 103.764-58.85 163.314 0 59.33 20.763 117.163 58.463 162.847 2.967 3.594 7.255 5.452 11.578 5.452 3.361 0 6.744-1.124 9.539-3.431 6.389-5.273 7.294-14.728 2.021-21.117-33.276-40.321-51.601-91.373-51.601-143.751z"></Path>
        <Path d="m453.15 92.687c-5.29-6.379-14.746-7.259-21.122-1.972-6.377 5.288-7.26 14.745-1.972 21.122 33.497 40.393 51.944 91.592 51.944 144.163 0 52.378-18.326 103.43-51.602 143.751-5.272 6.39-4.368 15.844 2.021 21.117 2.796 2.307 6.178 3.431 9.539 3.431 4.322 0 8.612-1.858 11.578-5.452 37.701-45.684 58.464-103.517 58.464-162.847 0-59.549-20.9-117.548-58.85-163.313z"></Path>
        <Path d="m256 57c-109.729 0-199 89.271-199 199s89.271 199 199 199 199-89.271 199-199-89.271-199-199-199zm15 294.468c0 8.284-6.716 15-15 15s-15-6.716-15-15v-.686c0-8.284 6.716-15 15-15s15 6.716 15 15zm0-55.362c0 8.284-6.716 15-15 15s-15-6.716-15-15v-135.574c0-8.284 6.716-15 15-15s15 6.716 15 15z"></Path>
      </G>
    </Svg>
  );
};

// Versión FILLED (con relleno completo)
export const StopIcon = ({
  width = 24,
  height = 24,
  color = "currentColor",
  ...props
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 512 512" {...props}>
      <G fill={color}>
        <Path d="m30 256c0-52.572 18.447-103.771 51.944-144.164 5.288-6.377 4.405-15.834-1.972-21.122-6.377-5.286-15.832-4.404-21.122 1.972-37.95 45.764-58.85 103.764-58.85 163.314 0 59.33 20.763 117.163 58.463 162.847 2.967 3.594 7.255 5.452 11.578 5.452 3.361 0 6.744-1.124 9.539-3.431 6.389-5.273 7.294-14.728 2.021-21.117-33.276-40.321-51.601-91.373-51.601-143.751z"></Path>
        <Path d="m453.15 92.687c-5.29-6.379-14.746-7.259-21.122-1.972-6.377 5.288-7.26 14.745-1.972 21.122 33.497 40.393 51.944 91.592 51.944 144.163 0 52.378-18.326 103.43-51.602 143.751-5.272 6.39-4.368 15.844 2.021 21.117 2.796 2.307 6.178 3.431 9.539 3.431 4.322 0 8.612-1.858 11.578-5.452 37.701-45.684 58.464-103.517 58.464-162.847 0-59.549-20.9-117.548-58.85-163.313z"></Path>
        <Path d="m256 57c-109.729 0-199 89.271-199 199s89.271 199 199 199 199-89.271 199-199-89.271-199-199-199zm0 368c-93.187 0-169-75.813-169-169s75.813-169 169-169 169 75.813 169 169-75.813 169-169 169z"></Path>
        <Path d="m256 145.532c-8.284 0-15 6.716-15 15v135.574c0 8.284 6.716 15 15 15s15-6.716 15-15v-135.574c0-8.284-6.716-15-15-15z"></Path>
        <Path d="m256 335.782c-8.284 0-15 6.716-15 15v.686c0 8.284 6.716 15 15 15s15-6.716 15-15v-.686c0-8.284-6.716-15-15-15z"></Path>
      </G>
    </Svg>
  );
};
