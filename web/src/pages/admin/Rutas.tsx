import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Operador {
  id: string;
  nombre_completo: string;
  usuario: string;
  estado: string;
}

interface Ruta {
  id: string;
  operador_id: string;
  fecha: string;
  estado: "ABIERTA" | "CERRADA" | "CANCELADA";
  hora_salida: string | null;
  hora_cierre: string | null;
  observaciones: string | null;
  creado_en: string;
  usuarios:
    | {
        id: string;
        nombre_completo: string;
        usuario: string;
        estado: string;
      }
    | null;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  costo: number;
  tipo: string;
  cantidad: number;
}

interface RutaProducto {
  id: string;
  producto_id: string;
  cantidad_salida: number;
  cantidad_vendida: number;
  cantidad_devuelta: number;
  cantidad_ajustada: number;
  productos:
    | {
        id: string;
        codigo: string;
        nombre: string;
        precio: number;
        costo: number;
        tipo: string;
      }
    | null;
}

interface DetalleRuta {
  ruta: Ruta;
  inventario: RutaProducto[];
}

function Rutas() {
  const { sesion } = useAuth();

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [operadores, setOperadores] = useState<
    Operador[]
  >([]);
  const [productos, setProductos] = useState<
    Producto[]
  >([]);

  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] =
    useState(false);
  const [error, setError] = useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [rutaSeleccionada, setRutaSeleccionada] =
    useState<DetalleRuta | null>(null);

  const [operadorId, setOperadorId] =
    useState("");
  const [fecha, setFecha] =
    useState("");
  const [observaciones, setObservaciones] =
    useState("");

  const [productoId, setProductoId] =
    useState("");
  const [cantidad, setCantidad] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);
  const [asignandoProducto, setAsignandoProducto] =
    useState(false);

  async function cargarRutas() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/rutas",
        {
          method: "GET",
          cache: "no-store"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar las rutas."
        );
      }

      const listaRutas: Ruta[] =
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.rutas)
          ? datos.rutas
          : Array.isArray(datos.data)
          ? datos.data
          : [];

      setRutas(listaRutas);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando las rutas."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarOperadores() {
    try {
      const respuesta = await apiFetch(
        "/api/operadores",
        {
          method: "GET",
          cache: "no-store"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar los operadores."
        );
      }

      const listaOperadores: Operador[] =
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.operadores)
          ? datos.operadores
          : Array.isArray(datos.data)
          ? datos.data
          : [];

      setOperadores(
        listaOperadores.filter(
          (operador) =>
            operador.estado === "ACTIVO"
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando los operadores."
      );
    }
  }

  async function cargarProductos() {
    try {
      const respuesta = await apiFetch(
        "/api/inventario",
        {
          method: "GET",
          cache: "no-store"
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

      /*
       * El endpoint de inventario devuelve
       * los productos junto con su cantidad
       * actual en almacén.
       */
      const listaProductos: Producto[] =
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.inventario)
          ? datos.inventario
          : Array.isArray(datos.productos)
          ? datos.productos
          : Array.isArray(datos.data)
          ? datos.data
          : [];

      /*
       * Un producto solamente puede asignarse
       * a una ruta si existe cantidad física
       * disponible en el almacén.
       */
      setProductos(
        listaProductos.filter(
          (producto) =>
            Number(producto.cantidad) > 0
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando el inventario."
      );
    }
  }

  useEffect(() => {
    if (sesion?.access_token) {
      cargarRutas();
      cargarOperadores();
      cargarProductos();
    }
  }, [sesion?.access_token]);

  function abrirFormulario() {
    const hoy = new Date()
      .toISOString()
      .split("T")[0];

    setOperadorId("");
    setFecha(hoy);
    setObservaciones("");
    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setOperadorId("");
    setFecha("");
    setObservaciones("");
  }

  async function crearRuta() {
    if (!operadorId) {
      setError(
        "Debes seleccionar un operador."
      );
      return;
    }

    if (!fecha) {
      setError(
        "Debes seleccionar una fecha."
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/rutas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            operador_id: operadorId,
            fecha,
            observaciones:
              observaciones.trim() ||
              null
          })
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo crear la ruta."
        );
      }

      cerrarFormulario();

      await cargarRutas();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error creando la ruta."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function abrirDetalleRuta(
    rutaId: string
  ) {
    try {
      setCargandoDetalle(true);
      setError("");

      const respuesta = await apiFetch(
        `/api/rutas/${rutaId}`,
        {
          method: "GET",
          cache: "no-store"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo cargar el detalle de la ruta."
        );
      }

      const detalle: DetalleRuta =
        datos.ruta &&
        datos.inventario
          ? datos
          : {
              ruta:
                datos.ruta ??
                datos,
              inventario:
                datos.inventario ??
                datos.ruta_inventario ??
                []
            };

      setRutaSeleccionada(detalle);
      setMostrarDetalle(true);

      await cargarProductos();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando el detalle de la ruta."
      );
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDetalleRuta() {
    if (asignandoProducto) {
      return;
    }

    setMostrarDetalle(false);
    setRutaSeleccionada(null);
    setProductoId("");
    setCantidad("");
  }

  async function asignarProductoARuta() {
    if (!rutaSeleccionada) {
      return;
    }

    if (
      rutaSeleccionada.ruta.estado !==
      "ABIERTA"
    ) {
      setError(
        "Solo puedes asignar productos a una ruta ABIERTA."
      );
      return;
    }

    if (!productoId) {
      setError(
        "Debes seleccionar un producto."
      );
      return;
    }

    const cantidadNumerica =
      Number(cantidad);

    if (
      !Number.isInteger(
        cantidadNumerica
      ) ||
      cantidadNumerica <= 0
    ) {
      setError(
        "La cantidad debe ser un número entero mayor que cero."
      );
      return;
    }

    const producto = productos.find(
      (item) =>
        item.id === productoId
    );

    if (!producto) {
      setError(
        "No se encontró el producto seleccionado."
      );
      return;
    }

    if (
      cantidadNumerica >
      producto.cantidad
    ) {
      setError(
        `No hay suficiente existencia. Disponible: ${producto.cantidad}.`
      );
      return;
    }

    try {
      setAsignandoProducto(true);
      setError("");

      const respuesta = await apiFetch(
        `/api/rutas/${rutaSeleccionada.ruta.id}/salida`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            producto_id: productoId,
            cantidad:
              cantidadNumerica
          })
        },
        sesion?.access_token
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo asignar el producto a la ruta."
        );
      }

      setProductoId("");
      setCantidad("");

      await abrirDetalleRuta(
        rutaSeleccionada.ruta.id
      );

      await cargarRutas();
      await cargarProductos();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error asignando producto a la ruta."
      );
    } finally {
      setAsignandoProducto(false);
    }
  }

  if (cargando) {
    return (
      <section>
        <h2>Rutas</h2>
        <p>Cargando rutas...</p>
      </section>
    );
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <div>
          <h2>Rutas</h2>

          <p>
            Gestión de rutas diarias de
            los operadores.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px"
          }}
        >
          <button
            onClick={cargarRutas}
          >
            Actualizar
          </button>

          <button
            onClick={abrirFormulario}
          >
            Nueva ruta
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            borderRadius: "8px",
            background:
              "#ffe5e5",
            color: "#a00000"
          }}
        >
          {error}
        </div>
      )}

      {rutas.length === 0 ? (
        <div className="dashboard-card">
          <h3>
            No hay rutas registradas
          </h3>

          <p>
            Crea la primera ruta para
            comenzar.
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
              borderCollapse:
                "collapse"
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign:
                      "left",
                    padding:
                      "10px"
                  }}
                >
                  Fecha
                </th>

                <th
                  style={{
                    textAlign:
                      "left",
                    padding:
                      "10px"
                  }}
                >
                  Operador
                </th>

                <th
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "10px"
                  }}
                >
                  Estado
                </th>

                <th
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "10px"
                  }}
                >
                  Salida
                </th>

                <th
                  style={{
                    textAlign:
                      "left",
                    padding:
                      "10px"
                  }}
                >
                  Observaciones
                </th>

                <th
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "10px"
                  }}
                >
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {rutas.map(
                (ruta) => (
                  <tr
                    key={
                      ruta.id
                    }
                  >
                    <td
                      style={{
                        padding:
                          "10px"
                      }}
                    >
                      {ruta.fecha}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px"
                      }}
                    >
                      {ruta.usuarios
                        ?.nombre_completo ??
                        "Sin operador"}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px",
                        textAlign:
                          "center",
                        fontWeight:
                          "bold"
                      }}
                    >
                      {ruta.estado}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px",
                        textAlign:
                          "center"
                      }}
                    >
                      {ruta.hora_salida
                        ? new Date(
                            ruta.hora_salida
                          ).toLocaleTimeString()
                        : "-"}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px"
                      }}
                    >
                      {ruta.observaciones ||
                        "-"}
                    </td>

                    <td
                      style={{
                        padding:
                          "10px",
                        textAlign:
                          "center"
                      }}
                    >
                      <button
                        onClick={() =>
                          abrirDetalleRuta(
                            ruta.id
                          )
                        }
                      >
                        Ver ruta
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {mostrarFormulario && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.5)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background:
                "white",
              padding:
                "24px",
              borderRadius:
                "12px",
              width:
                "min(420px, 90%)"
            }}
          >
            <h3>
              Nueva ruta
            </h3>

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "8px",
                marginTop:
                  "20px"
              }}
            >
              <label>
                Operador
              </label>

              <select
                value={
                  operadorId
                }
                onChange={(
                  e
                ) =>
                  setOperadorId(
                    e.target
                      .value
                  )
                }
              >
                <option value="">
                  Seleccionar
                  operador
                </option>

                {operadores.map(
                  (
                    operador
                  ) => (
                    <option
                      key={
                        operador.id
                      }
                      value={
                        operador.id
                      }
                    >
                      {
                        operador.nombre_completo
                      }{" "}
                      —{" "}
                      {
                        operador.usuario
                      }
                    </option>
                  )
                )}
              </select>

              <label>
                Fecha
              </label>

              <input
                type="date"
                value={
                  fecha
                }
                onChange={(
                  e
                ) =>
                  setFecha(
                    e.target
                      .value
                  )
                }
              />

              <label>
                Observaciones
              </label>

              <textarea
                value={
                  observaciones
                }
                onChange={(
                  e
                ) =>
                  setObservaciones(
                    e.target
                      .value
                  )
                }
                placeholder="Ej. Ruta Santo Domingo Este"
                rows={3}
              />
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
                marginTop:
                  "20px"
              }}
            >
              <button
                onClick={
                  cerrarFormulario
                }
                disabled={
                  guardando
                }
              >
                Cancelar
              </button>

              <button
                onClick={
                  crearRuta
                }
                disabled={
                  guardando
                }
              >
                {guardando
                  ? "Creando..."
                  : "Crear ruta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarDetalle &&
        rutaSeleccionada && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              background:
                "rgba(0, 0, 0, 0.5)",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              zIndex: 1100
            }}
          >
            <div
              style={{
                background:
                  "white",
                padding:
                  "24px",
                borderRadius:
                  "12px",
                width:
                  "min(900px, 94%)",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto"
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center"
                }}
              >
                <div>
                  <h3>
                    Ruta del{" "}
                    {
                      rutaSeleccionada
                        .ruta
                        .fecha
                    }
                  </h3>

                  <p>
                    Operador:{" "}
                    <strong>
                      {
                        rutaSeleccionada
                          .ruta
                          .usuarios
                          ?.nombre_completo ??
                        "Sin operador"
                      }
                    </strong>
                  </p>

                  <p>
                    Estado:{" "}
                    <strong>
                      {
                        rutaSeleccionada
                          .ruta
                          .estado
                      }
                    </strong>
                  </p>
                </div>

                <button
                  onClick={
                    cerrarDetalleRuta
                  }
                  disabled={
                    asignandoProducto
                  }
                >
                  Cerrar
                </button>
              </div>

              {rutaSeleccionada
                .ruta.estado ===
                "ABIERTA" && (
                <div
                  style={{
                    marginTop:
                      "20px",
                    padding:
                      "16px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "10px"
                  }}
                >
                  <h4>
                    Asignar
                    mercancía
                  </h4>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 140px auto",
                      gap:
                        "10px",
                      alignItems:
                        "end"
                    }}
                  >
                    <div>
                      <label>
                        Producto
                      </label>

                      <select
                        value={
                          productoId
                        }
                        onChange={(
                          e
                        ) =>
                          setProductoId(
                            e.target
                              .value
                          )
                        }
                        style={{
                          width:
                            "100%"
                        }}
                      >
                        <option value="">
                          Seleccionar
                          producto
                        </option>

                        {productos.map(
                          (
                            producto
                          ) => (
                            <option
                              key={
                                producto.id
                              }
                              value={
                                producto.id
                              }
                            >
                              {
                                producto.codigo
                              }{" "}
                              —{" "}
                              {
                                producto.nombre
                              }{" "}
                              — Stock:{" "}
                              {
                                producto.cantidad
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label>
                        Cantidad
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          cantidad
                        }
                        onChange={(
                          e
                        ) =>
                          setCantidad(
                            e.target
                              .value
                          )
                        }
                        style={{
                          width:
                            "100%"
                        }}
                      />
                    </div>

                    <button
                      onClick={
                        asignarProductoARuta
                      }
                      disabled={
                        asignandoProducto
                      }
                    >
                      {asignandoProducto
                        ? "Asignando..."
                        : "Asignar"}
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop:
                    "24px"
                }}
              >
                <h4>
                  Mercancía de
                  la ruta
                </h4>

                {rutaSeleccionada
                  .inventario
                  .length ===
                0 ? (
                  <p>
                    Esta ruta
                    todavía no
                    tiene
                    mercancía
                    asignada.
                  </p>
                ) : (
                  <div
                    style={{
                      overflowX:
                        "auto"
                    }}
                  >
                    <table
                      style={{
                        width:
                          "100%",
                        borderCollapse:
                          "collapse"
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign:
                                "left",
                              padding:
                                "10px"
                            }}
                          >
                            Código
                          </th>

                          <th
                            style={{
                              textAlign:
                                "left",
                              padding:
                                "10px"
                            }}
                          >
                            Producto
                          </th>

                          <th
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "10px"
                            }}
                          >
                            Salida
                          </th>

                          <th
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "10px"
                            }}
                          >
                            Vendido
                          </th>

                          <th
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "10px"
                            }}
                          >
                            Devuelto
                          </th>

                          <th
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "10px"
                            }}
                          >
                            Disponible
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {rutaSeleccionada
                          .inventario
                          .map(
                            (
                              item
                            ) => {
                              const cantidadDisponible =
                                item.cantidad_salida -
                                item.cantidad_vendida -
                                item.cantidad_devuelta +
                                item.cantidad_ajustada;

                              return (
                                <tr
                                  key={
                                    item.id
                                  }
                                >
                                  <td
                                    style={{
                                      padding:
                                        "10px"
                                    }}
                                  >
                                    {item
                                      .productos
                                      ?.codigo ??
                                      "-"}
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        "10px"
                                    }}
                                  >
                                    {item
                                      .productos
                                      ?.nombre ??
                                      "-"}
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        "10px",
                                      textAlign:
                                        "center"
                                    }}
                                  >
                                    {
                                      item.cantidad_salida
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        "10px",
                                      textAlign:
                                        "center"
                                    }}
                                  >
                                    {
                                      item.cantidad_vendida
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        "10px",
                                      textAlign:
                                        "center"
                                    }}
                                  >
                                    {
                                      item.cantidad_devuelta
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        "10px",
                                      textAlign:
                                        "center",
                                      fontWeight:
                                        "bold"
                                    }}
                                  >
                                    {
                                      cantidadDisponible
                                    }
                                  </td>
                                </tr>
                              );
                            }
                          )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </section>
  );
}

export default Rutas;