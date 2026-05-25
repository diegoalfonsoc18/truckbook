// src/utils/calendarLocale.ts
// Configura react-native-calendars según el idioma del dispositivo
import { LocaleConfig } from "react-native-calendars";
import * as Localization from "expo-localization";

const LOCALES: Record<string, typeof LocaleConfig.locales[string]> = {
  es: {
    monthNames: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    monthNamesShort: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
    dayNames: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
    dayNamesShort: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],
    today: "Hoy",
  },
  pt: {
    monthNames: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
    monthNamesShort: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
    dayNames: ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"],
    dayNamesShort: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],
    today: "Hoje",
  },
  en: {
    monthNames: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    monthNamesShort: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    dayNames: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    today: "Today",
  },
};

export function setupCalendarLocale() {
  const tag = Localization.getLocales?.()[0]?.languageCode ?? Localization.locale ?? "es";
  const lang = tag.slice(0, 2).toLowerCase();
  const key  = LOCALES[lang] ? lang : "es"; // fallback español

  Object.entries(LOCALES).forEach(([code, config]) => {
    LocaleConfig.locales[code] = config;
  });

  LocaleConfig.defaultLocale = key;
}
