import React, { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";
import { useGastosStore, type Gasto } from "../store/GastosStore";
import { useIngresosStore, type Ingreso } from "../store/IngresosStore";
import { useVehiculoStore } from "../store/VehiculoStore";
import logger from "../utils/logger";

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { placa } = useVehiculoStore();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);
  const { setGastosPorPlaca, agregarGasto, editarGasto, eliminarGasto } =
    useGastosStore();
  const {
    setIngresosPorPlaca,
    agregarIngreso,
    editarIngreso,
    eliminarIngreso,
  } = useIngresosStore();

  // ✅ CARGAR GASTOS AL MONTAR
  useEffect(() => {
    if (!placa || !userId) return;

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from("conductor_gastos")
          .select("*")
          .eq("placa", placa)
          .eq("conductor_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          logger.warn("⚠️ DataProvider: sin conexión para gastos, usando caché:", error.message);
          return;
        }
        if (data) setGastosPorPlaca(placa, data);
      } catch (err: any) {
        logger.warn("⚠️ DataProvider: error cargando gastos:", err?.message ?? err);
      }
    };

    cargar();
  }, [placa, userId, setGastosPorPlaca]);

  // ✅ CARGAR INGRESOS AL MONTAR
  useEffect(() => {
    if (!placa || !userId) return;

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from("conductor_ingresos")
          .select("*")
          .eq("placa", placa)
          .eq("conductor_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          logger.warn("⚠️ DataProvider: sin conexión para ingresos, usando caché:", error.message);
          return;
        }
        if (data) setIngresosPorPlaca(placa, data);
      } catch (err: any) {
        logger.warn("⚠️ DataProvider: error cargando ingresos:", err?.message ?? err);
      }
    };

    cargar();
  }, [placa, userId, setIngresosPorPlaca]);

  // ✅ SUSCRIBIRSE A GASTOS
  useEffect(() => {
    if (!placa) return;

    const subscription = supabase
      .channel(`gastos-${placa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_gastos",
          filter: `placa=eq.${placa}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            agregarGasto(payload.new as Gasto);
          } else if (payload.eventType === "UPDATE") {
            editarGasto(payload.new.id, payload.new);
          } else if (payload.eventType === "DELETE") {
            eliminarGasto(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [placa]);

  // ✅ SUSCRIBIRSE A INGRESOS
  useEffect(() => {
    if (!placa) return;

    const subscription = supabase
      .channel(`ingresos-${placa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_ingresos",
          filter: `placa=eq.${placa}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            agregarIngreso(payload.new as Ingreso);
          } else if (payload.eventType === "UPDATE") {
            editarIngreso(payload.new.id, payload.new);
          } else if (payload.eventType === "DELETE") {
            eliminarIngreso(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [placa]);

  return <>{children}</>;
};
