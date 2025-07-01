import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: "#2E4156",
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
  },
  input: {
    height: 40,
    borderColor: "#cc0000",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: "#cc0",
  },
});
