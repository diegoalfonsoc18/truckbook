import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    flex: 0.88,
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 20,
    color: COLORS.primary,
    alignItems: "center",
    justifyContent: "space-between",
    flex: 0,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.primary,
  },

  dateContainer: {
    flex: 0,
    width: "90%",
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 20,
    marginVertical: 12,
    backgroundColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 0,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    textAlignVertical: "center",
    flex: 0,
  },

  placaImage: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    textAlignVertical: "center",
    flex: 0,
    backgroundColor: "#ffe415",
    borderColor: "#000",
    borderRadius: 10, // ← CAMBIO
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10, // ← CAMBIO
  },
  calendarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 100,
  },
  calendarContainer: {
    width: "80%",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  combinedContainer: {
    flex: 3,
    width: "90%",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    justifyContent: "space-around",
    alignItems: "center",
    padding: 20,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 0,
  },

  resumenContainer: {
    width: "90%",
    backgroundColor: "#F2F2F7",
    borderRadius: 10, // ← CAMBIO (era 30)
    padding: 20,
    flex: 1.5,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 0,
  },

  resumenTitle: {
    width: "100%",
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  listContainer: {
    flex: 1,
    width: "100%",
    height: "60%",
    justifyContent: "center",
    alignItems: "center",
  },

  pickerContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  titlePicker: {
    width: "100%",
    textAlign: "left",
    alignSelf: "flex-start",
    paddingInlineStart: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textTertiary,
    marginBottom: 10,
    padding: 10,
  },

  containerPicker: {
    justifyContent: "space-between",
    flex: 1,
    width: "100%",
    borderRadius: 10,
  },

  picker: {
    flex: 2,
    color: COLORS.primary,
    borderRadius: 10,
    padding: 10,
    width: "100%",
  },
  selectedListContainer: {
    flex: 0.5,
    width: "100%",
    borderRadius: 10,
    alignItems: "flex-start",
  },
  resumenItem: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  resumenValue: {
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "right",
  },
  resumenText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "left",
  },
  totalContainer: {
    marginTop: 10,
    alignItems: "flex-end",
    width: "100%",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 10,
  },

  inputContainer: {
    width: "100%",
    marginTop: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10, // ← CAMBIO (era 5)
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
  },
  flatList: {
    flex: 1,
    width: "100%",
  },

  button: {
    width: "90%",
    height: 50,
    backgroundColor: "#007bff",
    borderRadius: 10, // ← CAMBIO (era 50)
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  calendarIcon: {
    width: 60,
    height: 60,
  },
});
