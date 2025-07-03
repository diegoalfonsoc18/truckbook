import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    width: "90%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderRadius: 10,
  },
  containerTitle: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    //marginBottom: 20,
  },
  chartTitle: {
    marginVertical: 8,
    borderRadius: 16,
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
  },
  containerFilter: {
    flex: 1,
    width: "100%",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
  },
  titleCalendar: {
    width: "80%",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.text,
  },
  dateSelect: {
    width: "80%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    //backgroundColor: "#ce2d2d",
  },

  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
});
