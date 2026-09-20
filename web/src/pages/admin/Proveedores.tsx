import {
  FormEvent,
  useEffect,
  useState
} from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Proveedor {
  id: string;
  nombre: string;
  nombre_contacto: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  rnc: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

interface ProveedorFormulario {
  nombre: string;
  nombre_contacto: string;
  telefono: string;
  telefono_secundario: string;
  correo: string;
  direccion: string;
  ciudad: string;
  rnc: string;
}

const formularioInicial: ProveedorFormulario = {
  nombre: "",
  nombre_contacto: "",
  telefono: "",
  telefono_secundario: "",
  correo: "",
  direccion: "",
  ciudad: "",
  rnc: ""
};

function Proveedores() {
  const { sesion } = useAuth();

  const [proveedores, setProveedores] =
    useState<Proveedor[]>([]);

  const [formulario, setFormulario] =
    useState<ProveedorFormulario>(
      formularioInicial
    );

  const [proveedorEditando, setProveedorEditando] =
    useState<string | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  async function cargarProveedores() {
    if (!sesion?.access_token) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/proveedores",
        {
          method: "GET"
        },
        sesion.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudieron cargar los proveedores."
        );
        return;
      }

      setProveedores(
        datos.proveedores || []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO PROVEEDORES:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProveedores();
  }, [sesion]);

  function actualizarCampo(
    campo: keyof ProveedorFormulario,
    valor: string
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor
    }));
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial);
    setProveedorEditando(null);
  }

  function editarProveedor(
    proveedor: Proveedor
  ) {
    setMensaje("");
    setError("");

    setProveedorEditando(
      proveedor.id
    );

    setFormulario({
      nombre:
        proveedor.nombre || "",

      nombre_contacto:
        proveedor.nombre_contacto || "",

      telefono:
        proveedor.telefono || "",

      telefono_secundario:
        proveedor.telefono_secundario || "",

      correo:
        proveedor.correo || "",

      direccion:
        proveedor.direccion || "",

      ciudad:
        proveedor.ciudad || "",

      rnc:
        proveedor.rnc || ""
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function manejarGuardar(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!sesion?.access_token) {
      setError(
        "La sesión no está disponible."
      );
      return;
    }

    setError("");
    setMensaje("");
    setGuardando(true);

    try {
      const esEdicion =
        proveedorEditando !== null;

      const ruta = esEdicion
        ? `/api/proveedores/${proveedorEditando}`
        : "/api/proveedores";

      const respuesta = await apiFetch(
        ruta,
        {
          method: esEdicion
            ? "PATCH"
            : "POST",

          body: JSON.stringify({
            nombre:
              formulario.nombre.trim(),

            nombre_contacto:
              formulario.nombre_contacto.trim(),

            telefono:
              formulario.telefono.trim(),

            telefono_secundario:
              formulario.telefono_secundario.trim(),

            correo:
              formulario.correo.trim(),

            direccion:
              formulario.direccion.trim(),

            ciudad:
              formulario.ciudad.trim(),

            rnc:
              formulario.rnc.trim()
          })
        },
        sesion.access_token
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo guardar el proveedor."
        );
        return;
      }

      setMensaje(
        esEdicion
          ? "Proveedor actualizado correctamente."
          : "Proveedor creado correctamente."
      );

      limpiarFormulario();

      await cargarProveedores();
    } catch (error) {
      console.error(
        "ERROR GUARDANDO PROVEEDOR:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(
    proveedor: Proveedor
  ) {
    if (!sesion?.access_token) {
      setError(
        "La sesión no está disponible."
      );
      return;
    }

    setError("");
    setMensaje("");

    try {
      const respuesta = await apiFetch(
        `/api/proveedores/${proveedor.id}/estado`,
        {
          method: "PATCH",

          body: JSON.stringify({
            activo:
              !proveedor.activo
          })
        },
        sesion.access_token
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo cambiar el estado del proveedor."
        );
        return;
      }

      setMensaje(
        proveedor.activo
          ? "Proveedor desactivado correctamente."
          : "Proveedor activado correctamente."
      );

      await cargarProveedores();
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO DEL PROVEEDOR:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    }
  }

  const proveedoresFiltrados =
    proveedores.filter(
      (proveedor) => {
        const texto =
          busqueda
            .trim()
            .toLowerCase();

        if (!texto) {
          return true;
        }

        return (
          proveedor.nombre
            .toLowerCase()
            .includes(texto) ||

          (proveedor.nombre_contacto ||
            "")
            .toLowerCase()
            .includes(texto) ||

          (proveedor.telefono ||
            "")
            .toLowerCase()
            .includes(texto) ||

          (proveedor.correo ||
            "")
            .toLowerCase()
            .includes(texto) ||

          (proveedor.ciudad ||
            "")
            .toLowerCase()
            .includes(texto) ||

          (proveedor.rnc ||
            "")
            .toLowerCase()
            .includes(texto)
        );
      }
    );

  if (cargando) {
    return (
      <section className="admin-section">
        <p>
          Cargando proveedores...
        </p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Proveedores</h2>

          <p>
            Gestiona los proveedores de la empresa.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="admin-success">
          {mensaje}
        </div>
      )}

      <form
        className="admin-form"
        onSubmit={manejarGuardar}
      >
        <h3>
          {proveedorEditando
            ? "Editar proveedor"
            : "Nuevo proveedor"}
        </h3>

        <div className="admin-form-grid">
          <div className="form-group">
            <label htmlFor="nombre">
              Nombre del proveedor
            </label>

            <input
              id="nombre"
              type="text"
              value={formulario.nombre}
              onChange={(event) =>
                actualizarCampo(
                  "nombre",
                  event.target.value
                )
              }
              placeholder="Ej. Distribuidora Dominicana"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre_contacto">
              Nombre del contacto
            </label>

            <input
              id="nombre_contacto"
              type="text"
              value={
                formulario.nombre_contacto
              }
              onChange={(event) =>
                actualizarCampo(
                  "nombre_contacto",
                  event.target.value
                )
              }
              placeholder="Nombre de la persona de contacto"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">
              Teléfono
            </label>

            <input
              id="telefono"
              type="text"
              value={formulario.telefono}
              onChange={(event) =>
                actualizarCampo(
                  "telefono",
                  event.target.value
                )
              }
              placeholder="Ej. 809-555-5555"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono_secundario">
              Teléfono secundario
            </label>

            <input
              id="telefono_secundario"
              type="text"
              value={
                formulario.telefono_secundario
              }
              onChange={(event) =>
                actualizarCampo(
                  "telefono_secundario",
                  event.target.value
                )
              }
              placeholder="Teléfono alternativo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="correo">
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              value={formulario.correo}
              onChange={(event) =>
                actualizarCampo(
                  "correo",
                  event.target.value
                )
              }
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="rnc">
              RNC
            </label>

            <input
              id="rnc"
              type="text"
              value={formulario.rnc}
              onChange={(event) =>
                actualizarCampo(
                  "rnc",
                  event.target.value
                )
              }
              placeholder="RNC del proveedor"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ciudad">
              Ciudad
            </label>

            <input
              id="ciudad"
              type="text"
              value={formulario.ciudad}
              onChange={(event) =>
                actualizarCampo(
                  "ciudad",
                  event.target.value
                )
              }
              placeholder="Ej. Santo Domingo"
              required
            />
          </div>

          <div className="form-group form-group-full">
            <label htmlFor="direccion">
              Dirección
            </label>

            <input
              id="direccion"
              type="text"
              value={formulario.direccion}
              onChange={(event) =>
                actualizarCampo(
                  "direccion",
                  event.target.value
                )
              }
              placeholder="Dirección del proveedor"
              required
            />
          </div>
        </div>

        <div className="admin-form-actions">
          <button
            type="submit"
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : proveedorEditando
                ? "Guardar cambios"
                : "Crear proveedor"}
          </button>

          {proveedorEditando && (
            <button
              type="button"
              onClick={
                limpiarFormulario
              }
              disabled={guardando}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <div className="admin-table-container">
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "15px",
            flexWrap: "wrap"
          }}
        >
          <h3>
            Proveedores registrados
          </h3>

          <input
            type="search"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            placeholder="Buscar proveedor..."
            style={{
              minWidth: "250px"
            }}
          />
        </div>

        {proveedoresFiltrados.length ===
        0 ? (
          <p>
            {busqueda
              ? "No se encontraron proveedores con esa búsqueda."
              : "Todavía no hay proveedores registrados."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  Proveedor
                </th>

                <th>
                  Contacto
                </th>

                <th>
                  Teléfono
                </th>

                <th>
                  Ciudad
                </th>

                <th>
                  RNC
                </th>

                <th>
                  Estado
                </th>

                <th>
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {proveedoresFiltrados.map(
                (proveedor) => (
                  <tr
                    key={proveedor.id}
                  >
                    <td>
                      <strong>
                        {
                          proveedor.nombre
                        }
                      </strong>

                      {proveedor.correo && (
                        <small>
                          {
                            proveedor.correo
                          }
                        </small>
                      )}
                    </td>

                    <td>
                      {
                        proveedor.nombre_contacto ||
                        "-"
                      }
                    </td>

                    <td>
                      <div>
                        {
                          proveedor.telefono ||
                          "-"
                        }
                      </div>

                      {proveedor.telefono_secundario && (
                        <small>
                          {
                            proveedor.telefono_secundario
                          }
                        </small>
                      )}
                    </td>

                    <td>
                      {
                        proveedor.ciudad ||
                        "-"
                      }
                    </td>

                    <td>
                      {
                        proveedor.rnc ||
                        "-"
                      }
                    </td>

                    <td>
                      <span
                        className={
                          proveedor.activo
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {proveedor.activo
                          ? "ACTIVO"
                          : "INACTIVO"}
                      </span>
                    </td>

                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          onClick={() =>
                            editarProveedor(
                              proveedor
                            )
                          }
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            cambiarEstado(
                              proveedor
                            )
                          }
                        >
                          {proveedor.activo
                            ? "Desactivar"
                            : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Proveedores;