import {
  FormEvent,
  useEffect,
  useState
} from "react";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  costo: number;
  tipo:
    | "INDIVIDUAL"
    | "KIT_SALON"
    | "KIT_BARBERIA";
  creado_en: string;
  actualizado_en: string;
}

interface ProductoFormulario {
  nombre: string;
  descripcion: string;
  precio: string;
  costo: string;
  tipo:
    | "INDIVIDUAL"
    | "KIT_SALON"
    | "KIT_BARBERIA";
}

const formularioInicial: ProductoFormulario = {
  nombre: "",
  descripcion: "",
  precio: "",
  costo: "",
  tipo: "INDIVIDUAL"
};

function Productos() {
  const { sesion } = useAuth();

  const [productos, setProductos] =
    useState<Producto[]>([]);

  const [formulario, setFormulario] =
    useState<ProductoFormulario>({
      ...formularioInicial
    });

  const [productoEditando, setProductoEditando] =
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

  async function cargarProductos() {
    if (!sesion?.access_token) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/productos",
        {
          method: "GET"
        },
        sesion.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudieron cargar los productos."
        );

        return;
      }

      setProductos(
        Array.isArray(datos.productos)
          ? datos.productos
          : []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO PRODUCTOS:",
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
    cargarProductos();
  }, [sesion]);

  function actualizarCampo(
    campo: keyof ProductoFormulario,
    valor: string
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor
    }));
  }

  function limpiarFormulario() {
    setFormulario({
      ...formularioInicial
    });

    setProductoEditando(null);
  }

  function editarProducto(
    producto: Producto
  ) {
    setMensaje("");
    setError("");

    setProductoEditando(
      producto.id
    );

    setFormulario({
      nombre:
        producto.nombre || "",

      descripcion:
        producto.descripcion || "",

      precio:
        String(producto.precio ?? ""),

      costo:
        String(producto.costo ?? ""),

      tipo:
        producto.tipo
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
      const nombre =
        formulario.nombre.trim();

      if (!nombre) {
        setError(
          "El nombre del producto es obligatorio."
        );

        return;
      }

      const precio =
        Number(formulario.precio);

      const costo =
        Number(formulario.costo);

      if (
        !Number.isFinite(precio) ||
        precio < 0
      ) {
        setError(
          "El precio debe ser un número válido mayor o igual a 0."
        );

        return;
      }

      if (
        !Number.isFinite(costo) ||
        costo < 0
      ) {
        setError(
          "El costo debe ser un número válido mayor o igual a 0."
        );

        return;
      }

      const esEdicion =
        productoEditando !== null;

      const ruta = esEdicion
        ? `/api/productos/${productoEditando}`
        : "/api/productos";

      const respuesta = await apiFetch(
        ruta,
        {
          method: esEdicion
            ? "PATCH"
            : "POST",

          body: JSON.stringify({
            nombre,

            descripcion:
              formulario.descripcion.trim(),

            precio,

            costo,

            tipo:
              formulario.tipo
          })
        },
        sesion.access_token
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.mensaje ||
            "No se pudo guardar el producto."
        );

        return;
      }

      /*
       * Si el backend devuelve el producto
       * actualizado, sincronizamos inmediatamente
       * la lista local.
       */
      if (
        datos.producto &&
        datos.producto.id
      ) {
        setProductos((actuales) => {
          const existe =
            actuales.some(
              (producto) =>
                producto.id ===
                datos.producto.id
            );

          if (existe) {
            return actuales.map(
              (producto) =>
                producto.id ===
                datos.producto.id
                  ? {
                      ...producto,
                      ...datos.producto
                    }
                  : producto
            );
          }

          return [
            datos.producto,
            ...actuales
          ];
        });
      }

      setMensaje(
        esEdicion
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente."
      );

      limpiarFormulario();

      /*
       * Recargamos desde el backend para
       * confirmar que la base de datos tiene
       * exactamente el mismo estado.
       */
      await cargarProductos();
    } catch (error) {
      console.error(
        "ERROR GUARDANDO PRODUCTO:",
        error
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  const productosFiltrados =
    productos.filter(
      (producto) => {
        const texto =
          busqueda
            .trim()
            .toLowerCase();

        if (!texto) {
          return true;
        }

        return (
          producto.nombre
            .toLowerCase()
            .includes(texto) ||

          (producto.descripcion ||
            "")
            .toLowerCase()
            .includes(texto) ||

          producto.tipo
            .toLowerCase()
            .includes(texto)
        );
      }
    );

  function mostrarTipo(
    tipo: Producto["tipo"]
  ) {
    switch (tipo) {
      case "KIT_SALON":
        return "KIT SALÓN";

      case "KIT_BARBERIA":
        return "KIT BARBERÍA";

      case "INDIVIDUAL":
      default:
        return "INDIVIDUAL";
    }
  }

  if (cargando) {
    return (
      <section className="admin-section">
        <p>
          Cargando productos...
        </p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Productos</h2>

          <p>
            Gestiona los productos y kits de la empresa.
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
          {productoEditando
            ? "Editar producto"
            : "Nuevo producto"}
        </h3>

        <div className="admin-form-grid">
          <div className="form-group">
            <label htmlFor="producto-nombre">
              Nombre
            </label>

            <input
              id="producto-nombre"
              type="text"
              value={formulario.nombre}
              onChange={(event) =>
                actualizarCampo(
                  "nombre",
                  event.target.value
                )
              }
              placeholder="Ej. Shampoo Profesional"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="producto-tipo">
              Tipo
            </label>

            <select
              id="producto-tipo"
              value={formulario.tipo}
              onChange={(event) =>
                actualizarCampo(
                  "tipo",
                  event.target.value as
                    | "INDIVIDUAL"
                    | "KIT_SALON"
                    | "KIT_BARBERIA"
                )
              }
              required
            >
              <option value="INDIVIDUAL">
                Individual
              </option>

              <option value="KIT_SALON">
                Kit Salón
              </option>

              <option value="KIT_BARBERIA">
                Kit Barbería
              </option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="producto-precio">
              Precio de venta
            </label>

            <input
              id="producto-precio"
              type="number"
              min="0"
              step="0.01"
              value={formulario.precio}
              onChange={(event) =>
                actualizarCampo(
                  "precio",
                  event.target.value
                )
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="producto-costo">
              Costo
            </label>

            <input
              id="producto-costo"
              type="number"
              min="0"
              step="0.01"
              value={formulario.costo}
              onChange={(event) =>
                actualizarCampo(
                  "costo",
                  event.target.value
                )
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group form-group-full">
            <label htmlFor="producto-descripcion">
              Descripción
            </label>

            <textarea
              id="producto-descripcion"
              value={
                formulario.descripcion
              }
              onChange={(event) =>
                actualizarCampo(
                  "descripcion",
                  event.target.value
                )
              }
              placeholder="Descripción del producto"
              rows={3}
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
              : productoEditando
                ? "Guardar cambios"
                : "Crear producto"}
          </button>

          {productoEditando && (
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
            Productos registrados
          </h3>

          <input
            type="search"
            value={busqueda}
            onChange={(event) => {
              /*
               * El buscador solamente modifica
               * su propio estado.
               */
              setBusqueda(
                event.target.value
              );
            }}
            onKeyDown={(event) => {
              /*
               * Evita que cualquier manejador
               * global del Dashboard interprete
               * las teclas del buscador como
               * navegación.
               */
              event.stopPropagation();
            }}
            onKeyUp={(event) => {
              event.stopPropagation();
            }}
            onKeyPress={(event) => {
              event.stopPropagation();
            }}
            placeholder="Buscar producto..."
            autoComplete="off"
            style={{
              minWidth: "250px"
            }}
          />
        </div>

        {productosFiltrados.length ===
        0 ? (
          <p>
            {busqueda
              ? "No se encontraron productos con esa búsqueda."
              : "Todavía no hay productos registrados."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  Producto
                </th>

                <th>
                  Tipo
                </th>

                <th>
                  Precio
                </th>

                <th>
                  Costo
                </th>

                <th>
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map(
                (producto) => (
                  <tr
                    key={producto.id}
                  >
                    <td>
                      <strong>
                        {
                          producto.nombre
                        }
                      </strong>

                      {producto.descripcion && (
                        <small>
                          {
                            producto.descripcion
                          }
                        </small>
                      )}
                    </td>

                    <td>
                      {mostrarTipo(
                        producto.tipo
                      )}
                    </td>

                    <td>
                      RD${" "}
                      {Number(
                        producto.precio
                      ).toFixed(2)}
                    </td>

                    <td>
                      RD${" "}
                      {Number(
                        producto.costo
                      ).toFixed(2)}
                    </td>

                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          onClick={() =>
                            editarProducto(
                              producto
                            )
                          }
                        >
                          Editar
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

export default Productos;