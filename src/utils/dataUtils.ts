export const formatDate = (date: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(date).toLocaleDateString("es-ES", options);
};

export const getCurrentDay = (): string => {
  const today = new Date();
  return today.getDate().toString();
};
