import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
export const styles = StyleSheet.create({
  container: {
    width: "90%",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
});
