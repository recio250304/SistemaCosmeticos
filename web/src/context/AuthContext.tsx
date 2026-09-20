import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { apiFetch } from "../api/api";

interface Usuario {
  id: string;
  nombre_completo: string;
  usuario: string;
  rol: string;
  estado: string;
  auth_user_id?: string;
}

interface Sesion {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AuthContextType {
  usuario: Usuario | null;
  sesion: Sesion | null;
  cargando: boolean;
  iniciarSesion: (
    email: string,
    password: string
  ) => Promise<{ exito: boolean; mensaje?: string }>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const CLAVE_SESION = "sistema_cosmeticos_sesion";
const CLAVE_USUARIO = "sistema_cosmeticos_usuario";

export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    verificarSesionGuardada();
  }, []);

  async function verificarSesionGuardada() {
    try {
      const sesionGuardada =
        sessionStorage.getItem(CLAVE_SESION);

      if (!sesionGuardada) {
        setCargando(false);
        return;
      }

      const sesionParseada: Sesion =
        JSON.parse(sesionGuardada);

      if (!sesionParseada.access_token) {
        limpiarSesion();
        setCargando(false);
        return;
      }

      const respuesta = await apiFetch(
        "/api/auth/me",
        {
          method: "GET"
        },
        sesionParseada.access_token
      );

      if (!respuesta.ok) {
        limpiarSesion();
        setCargando(false);
        return;
      }

      const datos = await respuesta.json();

      if (
        !datos.usuario ||
        datos.usuario.estado !== "ACTIVO"
      ) {
        limpiarSesion();
        setCargando(false);
        return;
      }

      setSesion(sesionParseada);
      setUsuario(datos.usuario);

      sessionStorage.setItem(
        CLAVE_USUARIO,
        JSON.stringify(datos.usuario)
      );
    } catch (error) {
      console.error(
        "Error verificando la sesión:",
        error
      );

      limpiarSesion();
    } finally {
      setCargando(false);
    }
  }

  async function iniciarSesion(
    email: string,
    password: string
  ): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      setCargando(true);

      const respuesta = await apiFetch(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        return {
          exito: false,
          mensaje:
            datos?.mensaje ||
            "No se pudo iniciar sesión."
        };
      }

      if (!datos.usuario || !datos.session) {
        return {
          exito: false,
          mensaje:
            "El servidor no devolvió una sesión válida."
        };
      }

      if (datos.usuario.estado !== "ACTIVO") {
        return {
          exito: false,
          mensaje:
            "El usuario se encuentra inactivo."
        };
      }

      const nuevaSesion: Sesion = {
        access_token:
          datos.session.access_token,
        refresh_token:
          datos.session.refresh_token,
        expires_at:
          datos.session.expires_at
      };

      setUsuario(datos.usuario);
      setSesion(nuevaSesion);

      sessionStorage.setItem(
        CLAVE_USUARIO,
        JSON.stringify(datos.usuario)
      );

      sessionStorage.setItem(
        CLAVE_SESION,
        JSON.stringify(nuevaSesion)
      );

      return {
        exito: true
      };
    } catch (error) {
      console.error(
        "Error iniciando sesión:",
        error
      );

      return {
        exito: false,
        mensaje:
          "No se pudo conectar con el servidor."
      };
    } finally {
      setCargando(false);
    }
  }

  function limpiarSesion() {
    setUsuario(null);
    setSesion(null);

    sessionStorage.removeItem(CLAVE_USUARIO);
    sessionStorage.removeItem(CLAVE_SESION);
  }

  function cerrarSesion() {
    limpiarSesion();
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        sesion,
        cargando,
        iniciarSesion,
        cerrarSesion
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider."
    );
  }

  return contexto;
}