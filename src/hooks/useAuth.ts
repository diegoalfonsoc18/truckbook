import { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    phone?: string;
    avatar_url?: string;
    picture?: string;
    full_name?: string;
  };
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtener usuario desde la SESIÓN persistida (local, sin red).
    // NO usar supabase.auth.getUser(): ese valida el token contra el servidor
    // y falla sin conexión → dejaba al usuario como null offline ("Usuario no
    // identificado" al guardar gastos/ingresos en modo avión).
    const cargarUsuario = async () => {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError) throw authError;

        const authUser = session?.user ?? null;
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email,
            user_metadata: authUser.user_metadata,
          });
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || "Error al obtener usuario");
        // No forzar null en error: el listener de onAuthStateChange puede
        // tener una sesión válida desde caché.
      } finally {
        setLoading(false);
      }
    };

    cargarUsuario();

    // Escuchar cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        });
      } else {
        setUser(null);
      }
    });

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, error };
};
