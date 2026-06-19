import React, { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";
import { useSyncManager } from "../hooks/useSyncManager";
import { useGastosStore, type Gasto } from "../store/GastosStore";
import { useIngresosStore, type Ingreso } from "../store/IngresosStore";
import { useVehiculoStore } from "../store/VehiculoStore";
import { useVehiculosListStore } from "../store/VehiculosListStore";
import logger from "../utils/logger";

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { placa } = useVehiculoStore();
  const [userId, setUserId] = useState<string | null>(null);

  // Sincronización automática cuando vuelve internet
  useSyncManager();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // 🔒 Defensa: purgar cualquier fila persistida que no pertenezca al usuario
  // actual (evita fuga de datos entre cuentas si el logout no limpió el store)
  useEffect(() => {
    if (!userId) return;
    const { gastos, setGastos } = useGastosStore.getState();
    const gastosPropios = gastos.filter((g) => g.conductor_id === userId);
    if (gastosPropios.length !== gastos.length) setGastos(gastosPropios);

    const { ingresos, setIngresos } = useIngresosStore.getState();
    const ingresosPropios = ingresos.filter((i) => i.conductor_id === userId);
    if (ingresosPropios.length !== ingresos.length) setIngresos(ingresosPropios);
  }, [userId]);
  const { setGastosPorPlaca, agregarGasto, editarGasto, eliminarGasto } =
    useGastosStore();
  const {
    setIngresosPorPlaca,
    agregarIngreso,
    editarIngreso,
    eliminarIngreso,
  } = useIngresosStore();
  const { cargar: cargarVehiculos } = useVehiculosListStore();

  // ✅ CARGAR VEHÍCULOS AL MONTAR
  useEffect(() => {
    if (!userId) return;
    cargarVehiculos(userId);
  }, [userId]);

  // ✅ SUSCRIBIRSE A CAMBIOS EN VEHÍCULOS (realtime)
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`vehiculos-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehiculo_conductores",
          filter: `conductor_id=eq.${userId}`,
        },
        () => {
          // Re-cargar toda la lista cuando hay cambios (INSERT/UPDATE/DELETE)
          cargarVehiculos(userId);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

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
    if (!placa || !userId) return;

    const subscription = supabase
      .channel(`gastos-${userId}-${placa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_gastos",
          // Filtrar por conductor_id (seguridad): evita recibir filas de otras
          // cuentas que comparten la misma placa. La placa se valida en el handler.
          filter: `conductor_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            if (payload.new.placa !== placa) return;
            agregarGasto(payload.new as Gasto);
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.placa !== placa) return;
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
  }, [placa, userId]);

  // ✅ SUSCRIBIRSE A INGRESOS
  useEffect(() => {
    if (!placa || !userId) return;

    const subscription = supabase
      .channel(`ingresos-${userId}-${placa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_ingresos",
          // Filtrar por conductor_id (seguridad): evita recibir filas de otras
          // cuentas que comparten la misma placa. La placa se valida en el handler.
          filter: `conductor_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            if (payload.new.placa !== placa) return;
            agregarIngreso(payload.new as Ingreso);
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.placa !== placa) return;
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
  }, [placa, userId]);

  return <>{children}</>;
};
