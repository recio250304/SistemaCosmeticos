import {
  FormEvent,
  useEffect,
  useState
} from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Operador {
  id: string;
  nombre_completo: string;
  usuario: string;
  rol: string;
  estado: string;
  telefono: string | null;
}

function Operadores() {
  const { sesion } = useAuth();

  const [operadores, setOperadores] =
    useState<Operador[]>([]);

  const [cargandoOperadores, setCargandoOperadores] =
    useState(true);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [nombreCompleto, setNombreCompleto] =
    useState("");

  const [usuario, setUsuario] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [telefono, setTelefono] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const [operadorProcesando, setOperadorProcesando] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  async function cargarOperadores() {
    const accessToken =
      sesion?.access_token;

    console.log(
      "TOKEN DISPONIBLE PARA OPERADORES:",
      accessToken ? "SI" : "NO"
    );

    if (!accessToken) {
      setCargandoOperadores(false);
      setError(
        "No hay una sesión válida para consultar los operadores."
      );
      return;
    }

    try {
      setCargandoOperadores(true);
      setError("");

      console.log(
        "CONSULTANDO /api/operadores..."
      );

      const respuesta = await apiFetch(
        "/api/operadores",
        {
          method: "GET",
          cache: "no-store"
        },
        accessToken
      );

      console.log(
        "RESPUESTA /api/operadores:",
        respuesta.status
      );

      const datos = await respuesta.json();

      console.log(
        "DATOS DE OPERADORES:",
        datos
      );

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudieron cargar los operadores."
        );
        return;
      }

      setOperadores(
        Array.isArray(datos.operadores)
          ? datos.operadores
          : []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO OPERADORES:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setCargandoOperadores(false);
    }
  }

  useEffect(() => {
    cargarOperadores();
  }, [sesion?.access_token]);

  function abrirFormulario() {
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (cargando) {
      return;
    }

    setMostrarFormulario(false);

    setNombreCompleto("");
    setUsuario("");
    setEmail("");
    setPassword("");
    setTelefono("");
    setMensaje("");
    setError("");
  }

  async function crearOperador(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    const accessToken =
      sesion?.access_token;

    if (!accessToken) {
      setError(
        "No hay una sesión administrativa válida."
      );
      return;
    }

    setCargando(true);

    try {
      const respuesta = await apiFetch(
        "/api/operadores",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            nombre_completo: nombreCompleto,
            usuario,
            email,
            password,
            telefono
          })
        },
        accessToken
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo crear el operador."
        );
        return;
      }

      setMensaje(
        "Operador creado correctamente."
      );

      setNombreCompleto("");
      setUsuario("");
      setEmail("");
      setPassword("");
      setTelefono("");

      await cargarOperadores();

      setTimeout(() => {
        setMostrarFormulario(false);
        setMensaje("");
      }, 1200);
    } catch (error) {
      console.error(
        "ERROR CREANDO OPERADOR:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cambiarEstado(
    operador: Operador
  ) {
    const accessToken =
      sesion?.access_token;

    if (!accessToken) {
      setError(
        "No hay una sesión administrativa válida."
      );
      return;
    }

    const nuevoEstado =
      operador.estado === "ACTIVO"
        ? "INACTIVO"
        : "ACTIVO";

    const accion =
      nuevoEstado === "ACTIVO"
        ? "activar"
        : "desactivar";

    const confirmado = window.confirm(
      `¿Seguro que deseas ${accion} al operador "${operador.nombre_completo}"?`
    );

    if (!confirmado) {
      return;
    }

    try {
      setError("");
      setMensaje("");
      setOperadorProcesando(operador.id);

      const respuesta = await apiFetch(
        `/api/operadores/${operador.id}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            estado: nuevoEstado
          })
        },
        accessToken
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo cambiar el estado del operador."
        );
        return;
      }

      setOperadores(
        (operadoresActuales) =>
          operadoresActuales.map(
            (operadorActual) =>
              operadorActual.id === operador.id
                ? {
                    ...operadorActual,
                    estado:
                      datos.operador.estado
                  }
                : operadorActual
          )
      );

      setMensaje(
        datos.mensaje ||
          "Estado actualizado correctamente."
      );
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO DEL OPERADOR:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setOperadorProcesando(null);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Operadores</h1>

          <p>
            Gestiona los operadores de las rutas.
          </p>
        </div>

        {!mostrarFormulario && (
          <button
            className="primary-button"
            onClick={abrirFormulario}
            disabled={!sesion}
          >
            + Nuevo operador
          </button>
        )}
      </header>

      {mostrarFormulario ? (
        <section className="operator-form-card">
          <div className="operator-form-header">
            <div>
              <h2>Nuevo operador</h2>

              <p>
                Registra un nuevo operador para las
                rutas.
              </p>
            </div>
          </div>

          <form onSubmit={crearOperador}>
            <div className="operator-form-grid">
              <div className="form-group">
                <label htmlFor="nombreCompleto">
                  Nombre completo
                </label>

                <input
                  id="nombreCompleto"
                  type="text"
                  value={nombreCompleto}
                  onChange={(event) =>
                    setNombreCompleto(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="usuario">
                  Nombre de usuario
                </label>

                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(event) =>
                    setUsuario(
                      event.target.value
                    )
                  }
                  placeholder="Ej. juanperez"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  Correo electrónico
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="correo@ejemplo.com"
                  required
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
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">
                  Teléfono
                </label>

                <input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(event) =>
                    setTelefono(
                      event.target.value
                    )
                  }
                  placeholder="Ej. 809-000-0000"
                />
              </div>
            </div>

            {error && (
              <div className="form-message form-message-error">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="form-message form-message-success">
                {mensaje}
              </div>
            )}

            <div className="operator-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={cerrarFormulario}
                disabled={cargando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={cargando}
              >
                {cargando
                  ? "Creando operador..."
                  : "Crear operador"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="admin-table-card">
          <div className="table-header">
            <h2>Lista de operadores</h2>

            <span>
              {cargandoOperadores
                ? "Cargando..."
                : `${operadores.length} operador${
                    operadores.length !== 1
                      ? "es"
                      : ""
                  }`}
            </span>
          </div>

          {error && (
            <div className="form-message form-message-error">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="form-message form-message-success">
              {mensaje}
            </div>
          )}

          {cargandoOperadores ? (
            <div className="empty-state">
              <h3>
                Cargando operadores...
              </h3>
            </div>
          ) : operadores.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                👥
              </div>

              <h3>
                No hay operadores registrados
              </h3>

              <p>
                Cuando agregues un operador,
                aparecerá aquí.
              </p>

              <button
                className="primary-button"
                onClick={abrirFormulario}
                disabled={!sesion}
              >
                + Crear primer operador
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {operadores.map(
                    (operador) => {
                      const activo =
                        operador.estado ===
                        "ACTIVO";

                      const procesando =
                        operadorProcesando ===
                        operador.id;

                      return (
                        <tr key={operador.id}>
                          <td>
                            {operador.nombre_completo}
                          </td>

                          <td>
                            {operador.usuario}
                          </td>

                          <td>
                            {operador.telefono ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                activo
                                  ? "status-active"
                                  : "status-inactive"
                              }`}
                            >
                              {operador.estado}
                            </span>
                          </td>

                          <td>
                            <button
                              className={
                                activo
                                  ? "secondary-button"
                                  : "primary-button"
                              }
                              onClick={() =>
                                cambiarEstado(
                                  operador
                                )
                              }
                              disabled={
                                procesando
                              }
                            >
                              {procesando
                                ? "Procesando..."
                                : activo
                                ? "Desactivar"
                                : "Activar"}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default Operadores;