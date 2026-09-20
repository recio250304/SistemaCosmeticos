import {
  FormEvent,
  useEffect,
  useState
} from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Cliente {
  id: string;
  nombre_negocio: string;
  tipo: string;
  nombre_contacto: string;
  telefono: string;
  telefono_secundario: string | null;
  direccion: string;
  sector: string;
  ciudad: string;
  activo: boolean;
  creado_en: string;
  autorizado_en: string | null;
}

const clienteInicial = {
  nombre_negocio: "",
  tipo: "BARBERIA",
  nombre_contacto: "",
  telefono: "",
  telefono_secundario: "",
  direccion: "",
  sector: "",
  ciudad: ""
};

function Clientes() {
  const { sesion } = useAuth();

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [cargandoClientes, setCargandoClientes] =
    useState(true);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  const [nombreNegocio, setNombreNegocio] =
    useState("");

  const [tipo, setTipo] =
    useState("BARBERIA");

  const [nombreContacto, setNombreContacto] =
    useState("");

  const [telefono, setTelefono] =
    useState("");

  const [telefonoSecundario, setTelefonoSecundario] =
    useState("");

  const [direccion, setDireccion] =
    useState("");

  const [sector, setSector] =
    useState("");

  const [ciudad, setCiudad] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const [clienteProcesando, setClienteProcesando] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  async function cargarClientes() {
    const accessToken =
      sesion?.access_token;

    if (!accessToken) {
      setCargandoClientes(false);
      setError(
        "No hay una sesión válida para consultar los clientes."
      );
      return;
    }

    try {
      setCargandoClientes(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/clientes",
        {
          method: "GET",
          cache: "no-store"
        },
        accessToken
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudieron cargar los clientes."
        );
        return;
      }

      setClientes(
        Array.isArray(datos.clientes)
          ? datos.clientes
          : []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO CLIENTES:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setCargandoClientes(false);
    }
  }

  useEffect(() => {
    cargarClientes();
  }, [sesion?.access_token]);

  function limpiarFormulario() {
    setNombreNegocio(
      clienteInicial.nombre_negocio
    );
    setTipo(clienteInicial.tipo);
    setNombreContacto(
      clienteInicial.nombre_contacto
    );
    setTelefono(
      clienteInicial.telefono
    );
    setTelefonoSecundario(
      clienteInicial.telefono_secundario
    );
    setDireccion(
      clienteInicial.direccion
    );
    setSector(
      clienteInicial.sector
    );
    setCiudad(
      clienteInicial.ciudad
    );
  }

  function abrirFormulario() {
    limpiarFormulario();
    setEditandoId(null);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(cliente: Cliente) {
    setEditandoId(cliente.id);

    setNombreNegocio(
      cliente.nombre_negocio
    );

    setTipo(
      cliente.tipo
    );

    setNombreContacto(
      cliente.nombre_contacto
    );

    setTelefono(
      cliente.telefono
    );

    setTelefonoSecundario(
      cliente.telefono_secundario || ""
    );

    setDireccion(
      cliente.direccion
    );

    setSector(
      cliente.sector
    );

    setCiudad(
      cliente.ciudad
    );

    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (cargando) {
      return;
    }

    setMostrarFormulario(false);
    setEditandoId(null);
    limpiarFormulario();
    setMensaje("");
    setError("");
  }

  async function guardarCliente(
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

    const datosCliente = {
      nombre_negocio:
        nombreNegocio.trim(),
      tipo,
      nombre_contacto:
        nombreContacto.trim(),
      telefono:
        telefono.trim(),
      telefono_secundario:
        telefonoSecundario.trim(),
      direccion:
        direccion.trim(),
      sector:
        sector.trim(),
      ciudad:
        ciudad.trim()
    };

    try {
      const url = editandoId
        ? `/api/clientes/${editandoId}`
        : "/api/clientes";

      const respuesta = await apiFetch(
        url,
        {
          method: editandoId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            datosCliente
          )
        },
        accessToken
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo guardar el cliente."
        );
        return;
      }

      setMensaje(
        editandoId
          ? "Cliente actualizado correctamente."
          : "Cliente creado correctamente."
      );

      await cargarClientes();

      setTimeout(() => {
        setMostrarFormulario(false);
        setEditandoId(null);
        limpiarFormulario();
        setMensaje("");
      }, 1000);
    } catch (error) {
      console.error(
        "ERROR GUARDANDO CLIENTE:",
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
    cliente: Cliente
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
      !cliente.activo;

    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";

    const confirmado =
      window.confirm(
        `¿Seguro que deseas ${accion} al cliente "${cliente.nombre_negocio}"?`
      );

    if (!confirmado) {
      return;
    }

    try {
      setError("");
      setMensaje("");
      setClienteProcesando(
        cliente.id
      );

      const respuesta = await apiFetch(
        `/api/clientes/${cliente.id}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            activo: nuevoEstado
          })
        },
        accessToken
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo cambiar el estado del cliente."
        );
        return;
      }

      setClientes(
        (clientesActuales) =>
          clientesActuales.map(
            (clienteActual) =>
              clienteActual.id ===
              cliente.id
                ? {
                    ...clienteActual,
                    activo:
                      datos.cliente.activo
                  }
                : clienteActual
          )
      );

      setMensaje(
        datos.mensaje ||
          "Estado actualizado correctamente."
      );
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO DEL CLIENTE:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setClienteProcesando(null);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Clientes</h1>

          <p>
            Gestiona las barberías y salones
            registrados.
          </p>
        </div>

        {!mostrarFormulario && (
          <button
            className="primary-button"
            onClick={abrirFormulario}
            disabled={!sesion}
          >
            + Nuevo cliente
          </button>
        )}
      </header>

      {mostrarFormulario ? (
        <section className="operator-form-card">
          <div className="operator-form-header">
            <div>
              <h2>
                {editandoId
                  ? "Editar cliente"
                  : "Nuevo cliente"}
              </h2>

              <p>
                {editandoId
                  ? "Actualiza los datos del cliente."
                  : "Registra una nueva barbería o salón."}
              </p>
            </div>
          </div>

          <form
            onSubmit={guardarCliente}
          >
            <div className="operator-form-grid">
              <div className="form-group">
                <label htmlFor="nombreNegocio">
                  Nombre del negocio
                </label>

                <input
                  id="nombreNegocio"
                  type="text"
                  value={nombreNegocio}
                  onChange={(event) =>
                    setNombreNegocio(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Barbería El Estilo"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tipo">
                  Tipo de negocio
                </label>

                <select
                  id="tipo"
                  value={tipo}
                  onChange={(event) =>
                    setTipo(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="BARBERIA">
                    Barbería
                  </option>

                  <option value="SALON">
                    Salón
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="nombreContacto">
                  Nombre del contacto
                </label>

                <input
                  id="nombreContacto"
                  type="text"
                  value={nombreContacto}
                  onChange={(event) =>
                    setNombreContacto(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Juan Pérez"
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
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefonoSecundario">
                  Teléfono secundario
                </label>

                <input
                  id="telefonoSecundario"
                  type="tel"
                  value={
                    telefonoSecundario
                  }
                  onChange={(event) =>
                    setTelefonoSecundario(
                      event.target.value
                    )
                  }
                  placeholder="Opcional"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ciudad">
                  Ciudad
                </label>

                <input
                  id="ciudad"
                  type="text"
                  value={ciudad}
                  onChange={(event) =>
                    setCiudad(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Santo Domingo"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sector">
                  Sector
                </label>

                <input
                  id="sector"
                  type="text"
                  value={sector}
                  onChange={(event) =>
                    setSector(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Herrera"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="direccion">
                  Dirección
                </label>

                <input
                  id="direccion"
                  type="text"
                  value={direccion}
                  onChange={(event) =>
                    setDireccion(
                      event.target.value
                    )
                  }
                  placeholder="Dirección del negocio"
                  required
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
                onClick={
                  cerrarFormulario
                }
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
                  ? "Guardando..."
                  : editandoId
                  ? "Guardar cambios"
                  : "Crear cliente"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="admin-table-card">
          <div className="table-header">
            <h2>Lista de clientes</h2>

            <span>
              {cargandoClientes
                ? "Cargando..."
                : `${clientes.length} cliente${
                    clientes.length !== 1
                      ? "s"
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

          {cargandoClientes ? (
            <div className="empty-state">
              <h3>
                Cargando clientes...
              </h3>
            </div>
          ) : clientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                👥
              </div>

              <h3>
                No hay clientes registrados
              </h3>

              <p>
                Cuando agregues un cliente,
                aparecerá aquí.
              </p>

              <button
                className="primary-button"
                onClick={
                  abrirFormulario
                }
                disabled={!sesion}
              >
                + Crear primer cliente
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Negocio</th>
                    <th>Tipo</th>
                    <th>Contacto</th>
                    <th>Teléfono</th>
                    <th>Sector</th>
                    <th>Ciudad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {clientes.map(
                    (cliente) => {
                      const procesando =
                        clienteProcesando ===
                        cliente.id;

                      return (
                        <tr
                          key={
                            cliente.id
                          }
                        >
                          <td>
                            {
                              cliente.nombre_negocio
                            }
                          </td>

                          <td>
                            {cliente.tipo ===
                            "BARBERIA"
                              ? "Barbería"
                              : "Salón"}
                          </td>

                          <td>
                            {
                              cliente.nombre_contacto
                            }
                          </td>

                          <td>
                            {
                              cliente.telefono
                            }
                          </td>

                          <td>
                            {
                              cliente.sector
                            }
                          </td>

                          <td>
                            {
                              cliente.ciudad
                            }
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                cliente.activo
                                  ? "status-active"
                                  : "status-inactive"
                              }`}
                            >
                              {cliente.activo
                                ? "ACTIVO"
                                : "INACTIVO"}
                            </span>
                          </td>

                          <td>
                            <div
                              style={{
                                display:
                                  "flex",
                                gap:
                                  "8px",
                                flexWrap:
                                  "wrap"
                              }}
                            >
                              <button
                                className="secondary-button"
                                onClick={() =>
                                  abrirEdicion(
                                    cliente
                                  )
                                }
                                disabled={
                                  procesando
                                }
                              >
                                Editar
                              </button>

                              <button
                                className={
                                  cliente.activo
                                    ? "secondary-button"
                                    : "primary-button"
                                }
                                onClick={() =>
                                  cambiarEstado(
                                    cliente
                                  )
                                }
                                disabled={
                                  procesando
                                }
                              >
                                {procesando
                                  ? "Procesando..."
                                  : cliente.activo
                                  ? "Desactivar"
                                  : "Activar"}
                              </button>
                            </div>
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

export default Clientes;