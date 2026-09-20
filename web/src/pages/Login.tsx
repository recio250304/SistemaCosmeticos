import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { iniciarSesion } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function manejarLogin(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setError("");
    setCargando(true);

    const resultado = await iniciarSesion(
      email,
      password
    );

    if (!resultado.exito) {
      setError(
        resultado.mensaje ||
          "No se pudo iniciar sesión."
      );
    }

    setCargando(false);
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Sistema de Cosméticos</h1>

        <p className="login-subtitle">
          Panel administrativo
        </p>

        <form onSubmit={manejarLogin}>
          <div className="form-group">
            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="admin@ejemplo.com"
              autoComplete="email"
              required
              disabled={cargando}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              disabled={cargando}
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
          >
            {cargando
              ? "Iniciando sesión..."
              : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}