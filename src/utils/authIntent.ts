// Marca si el SIGNED_OUT que está por llegar viene de una acción deliberada
// del usuario (botón "Salir", eliminar cuenta, reset de contraseña) o si es un
// efecto colateral de que Supabase no pudo refrescar el token.
//
// Sin esta distinción, App.tsx tiene que adivinar mirando la conectividad, y
// esa heurística falla justo en el caso que importa: con señal débil el
// dispositivo sigue "conectado" pero las peticiones no pasan, el refresh falla,
// llega un SIGNED_OUT y el usuario termina en el Login sin haberlo pedido.

let logoutIntencional = false;
let autoLimpieza: ReturnType<typeof setTimeout> | null = null;

/** Llamar SIEMPRE justo antes de `supabase.auth.signOut()`. */
export function marcarLogoutIntencional(): void {
  logoutIntencional = true;
  // Red de seguridad: si el signOut falla y el evento nunca llega, la bandera
  // no puede quedar armada para el próximo SIGNED_OUT (que sí podría ser un
  // fallo de refresh y terminaría deslogueando al usuario sin querer).
  if (autoLimpieza) clearTimeout(autoLimpieza);
  autoLimpieza = setTimeout(() => {
    logoutIntencional = false;
    autoLimpieza = null;
  }, 10000);
}

/** Lee y resetea la bandera. Devuelve true si el logout fue deliberado. */
export function consumirLogoutIntencional(): boolean {
  const era = logoutIntencional;
  logoutIntencional = false;
  if (autoLimpieza) {
    clearTimeout(autoLimpieza);
    autoLimpieza = null;
  }
  return era;
}
