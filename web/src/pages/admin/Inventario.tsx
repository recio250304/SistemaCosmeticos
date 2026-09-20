import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface ProductoInventario {
  producto_id: string;
  cantidad: number;
  actualizado_en: string;
  productos:
    | {
        id: string;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        precio: number;
        costo: number;
        disponible: boolean;
      }
    | null;
}

function Inventario() {
  const { sesion } = useAuth();

  const [inventario, setInventario] = useState<
    ProductoInventario[]
  >([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoInventario | null>(null);

  const [cantidad, setCantidad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargarInventario() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/inventario",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo cargar el inventario."
        );
      }

      setInventario(datos);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando inventario."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (sesion?.access_token) {
      cargarInventario();
    }
  }, [sesion?.access_token]);

  function abrirEntrada(
    producto: ProductoInventario
  ) {
    setProductoSeleccionado(producto);
    setCantidad("");
    setDescripcion("");
  }

  function cerrarEntrada() {
    if (guardando) {
      return;
    }

    setProductoSeleccionado(null);
    setCantidad("");
    setDescripcion("");
  }

  async function registrarEntrada() {
    if (!productoSeleccionado) {
      return;
    }

    const cantidadNumerica = Number(cantidad);

    if (
      !Number.isInteger(cantidadNumerica) ||
      cantidadNumerica <= 0
    ) {
      setError(
        "La cantidad debe ser un número entero mayor que 0."
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/inventario/entrada",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            producto_id:
              productoSeleccionado.producto_id,
            cantidad: cantidadNumerica,
            descripcion: descripcion.trim() || null
          })
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo registrar la entrada."
        );
      }

      cerrarEntrada();

      await cargarInventario();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error registrando la entrada."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <section>
        <h2>Inventario</h2>
        <p>Cargando inventario...</p>
      </section>
    );
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <div>
          <h2>Inventario</h2>
          <p>
            Existencias actuales del almacén.
          </p>
        </div>

        <button
          onClick={cargarInventario}
          disabled={cargando}
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            borderRadius: "8px",
            background: "#ffe5e5",
            color: "#a00000"
          }}
        >
          {error}
        </div>
      )}

      {inventario.length === 0 ? (
        <div className="dashboard-card">
          <h3>No hay productos en inventario</h3>
          <p>
            Los productos aparecerán aquí cuando tengan
            un registro de inventario.
          </p>
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto"
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px" }}>
                  Código
                </th>

                <th style={{ textAlign: "left", padding: "10px" }}>
                  Producto
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Precio
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Costo
                </th>

                <th style={{ textAlign: "center", padding: "10px" }}>
                  Existencia
                </th>

                <th style={{ textAlign: "center", padding: "10px" }}>
                  Estado
                </th>

                <th style={{ textAlign: "center", padding: "10px" }}>
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {inventario.map((item) => {
                const producto = item.productos;

                if (!producto) {
                  return null;
                }

                return (
                  <tr key={item.producto_id}>
                    <td style={{ padding: "10px" }}>
                      {producto.codigo}
                    </td>

                    <td style={{ padding: "10px" }}>
                      {producto.nombre}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right"
                      }}
                    >
                      RD${Number(producto.precio).toFixed(2)}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right"
                      }}
                    >
                      RD${Number(producto.costo).toFixed(2)}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        fontWeight: "bold"
                      }}
                    >
                      {item.cantidad}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center"
                      }}
                    >
                      {producto.disponible
                        ? "DISPONIBLE"
                        : "NO DISPONIBLE"}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center"
                      }}
                    >
                      <button
                        onClick={() =>
                          abrirEntrada(item)
                        }
                      >
                        Entrada
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {productoSeleccionado &&
        productoSeleccionado.productos && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000
            }}
          >
            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                width: "min(420px, 90%)"
              }}
            >
              <h3>
                Entrada de mercancía
              </h3>

              <p>
                <strong>
                  {productoSeleccionado.productos.codigo}
                </strong>
                {" — "}
                {productoSeleccionado.productos.nombre}
              </p>

              <p>
                Existencia actual:{" "}
                <strong>
                  {productoSeleccionado.cantidad}
                </strong>
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "20px"
                }}
              >
                <label>
                  Cantidad a ingresar
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(e.target.value)
                  }
                  placeholder="Ej. 20"
                />

                <label>
                  Descripción
                </label>

                <textarea
                  value={descripcion}
                  onChange={(e) =>
                    setDescripcion(e.target.value)
                  }
                  placeholder="Ej. Compra de mercancía"
                  rows={3}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px"
                }}
              >
                <button
                  onClick={cerrarEntrada}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  onClick={registrarEntrada}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Registrar entrada"}
                </button>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}

export default Inventario;