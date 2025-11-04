import { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    phone?: string;
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
    // Obtener usuario autenticado
    const getUser = async () => {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        setUser(
          authUser
            ? {
                id: authUser.id,
                email: authUser.email,
                user_metadata: authUser.user_metadata,
              }
            : null
        );
        setError(null);
      } catch (err: any) {
        setError(err.message || "Error al obtener usuario");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

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
