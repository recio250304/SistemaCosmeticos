import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Venta {
  id: string;
  numero_venta: number;
  cliente_id: string;
  operador_id: string;
  ruta_id: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  total_pagado: number;
  saldo_pendiente: number;
  estado: string;
  fecha_venta: string;

  clientes?: {
    id: string;
    nombre_negocio: string;
    nombre_contacto: string;
  };

  usuarios?: {
    id: string;
    nombre_completo: string;
    usuario: string;
  };
}

interface RespuestaVentas {
  ventas?: unknown;
  data?: unknown;
  mensaje?: unknown;
}

function convertirNumero(valor: unknown): number {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  if (typeof valor === "string") {
    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : 0;
  }

  return 0;
}

function convertirTexto(
  valor: unknown,
  valorPorDefecto = ""
): string {
  return typeof valor === "string"
    ? valor
    : valorPorDefecto;
}

function convertirNullableTexto(
  valor: unknown
): string | null {
  if (typeof valor === "string") {
    return valor;
  }

  return null;
}

function convertirCliente(
  valor: unknown
): Venta["clientes"] | undefined {
  if (
    typeof valor !== "object" ||
    valor === null
  ) {
    return undefined;
  }

  const cliente =
    valor as Record<string, unknown>;

  return {
    id: convertirTexto(cliente.id),

    nombre_negocio: convertirTexto(
      cliente.nombre_negocio,
      "Cliente sin nombre"
    ),

    nombre_contacto: convertirTexto(
      cliente.nombre_contacto
    )
  };
}

function convertirUsuario(
  valor: unknown
): Venta["usuarios"] | undefined {
  if (
    typeof valor !== "object" ||
    valor === null
  ) {
    return undefined;
  }

  const usuario =
    valor as Record<string, unknown>;

  return {
    id: convertirTexto(usuario.id),

    nombre_completo: convertirTexto(
      usuario.nombre_completo,
      "Operador sin nombre"
    ),

    usuario: convertirTexto(
      usuario.usuario
    )
  };
}

function convertirVenta(
  valor: unknown
): Venta | null {
  if (
    typeof valor !== "object" ||
    valor === null
  ) {
    return null;
  }

  const venta =
    valor as Record<string, unknown>;

  if (typeof venta.id !== "string") {
    return null;
  }

  return {
    id: venta.id,

    numero_venta: convertirNumero(
      venta.numero_venta
    ),

    cliente_id: convertirTexto(
      venta.cliente_id
    ),

    operador_id: convertirTexto(
      venta.operador_id
    ),

    ruta_id: convertirNullableTexto(
      venta.ruta_id
    ),

    subtotal: convertirNumero(
      venta.subtotal
    ),

    descuento: convertirNumero(
      venta.descuento
    ),

    total: convertirNumero(
      venta.total
    ),

    total_pagado: convertirNumero(
      venta.total_pagado
    ),

    saldo_pendiente: convertirNumero(
      venta.saldo_pendiente
    ),

    estado: convertirTexto(
      venta.estado,
      "PENDIENTE"
    ),

    fecha_venta: convertirTexto(
      venta.fecha_venta
    ),

    clientes: convertirCliente(
      venta.clientes
    ),

    usuarios: convertirUsuario(
      venta.usuarios
    )
  };
}

function obtenerListaVentas(
  data: unknown
): Venta[] {
  if (Array.isArray(data)) {
    return data
      .map(convertirVenta)
      .filter(
        (
          venta
        ): venta is Venta =>
          venta !== null
      );
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const respuesta =
      data as RespuestaVentas;

    if (Array.isArray(respuesta.ventas)) {
      return respuesta.ventas
        .map(convertirVenta)
        .filter(
          (
            venta
          ): venta is Venta =>
            venta !== null
        );
    }

    if (Array.isArray(respuesta.data)) {
      return respuesta.data
        .map(convertirVenta)
        .filter(
          (
            venta
          ): venta is Venta =>
            venta !== null
        );
    }
  }

  return [];
}

function obtenerMensajeError(
  data: unknown
): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "mensaje" in data
  ) {
    const respuesta =
      data as {
        mensaje?: unknown;
      };

    if (
      typeof respuesta.mensaje ===
      "string"
    ) {
      return respuesta.mensaje;
    }
  }

  return null;
}

function Ventas() {
  const { sesion } = useAuth();

  const [ventas, setVentas] =
    useState<Venta[]>([]);

  const [
    cargandoDatos,
    setCargandoDatos
  ] = useState(true);

  const [error, setError] =
    useState("");

  const token =
    sesion?.access_token;

  async function cargarVentas() {
    if (!token) {
      setCargandoDatos(false);

      setError(
        "No hay una sesión activa."
      );

      return;
    }

    setCargandoDatos(true);
    setError("");

    try {
      const response =
        await apiFetch(
          "/api/ventas",
          {
            method: "GET"
          },
          token
        );

      const texto =
        await response.text();

      let data: unknown = null;

      if (texto.trim() !== "") {
        try {
          data = JSON.parse(texto);
        } catch {
          throw new Error(
            `El servidor respondió con un formato inválido. Código HTTP: ${response.status}`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          obtenerMensajeError(data) ||
            `Error consultando las ventas. Código HTTP: ${response.status}`
        );
      }

      const listaVentas =
        obtenerListaVentas(data);

      setVentas(listaVentas);
    } catch (err) {
      console.error(
        "ERROR CARGANDO VENTAS:"
      );

      console.error(err);

      setVentas([]);

      setError(
        err instanceof Error
          ? err.message
          : "Error consultando las ventas."
      );
    } finally {
      setCargandoDatos(false);
    }
  }

  useEffect(() => {
    cargarVentas();
  }, [token]);

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString(
      "es-DO",
      {
        style: "currency",
        currency: "DOP",
        minimumFractionDigits: 2
      }
    );
  }

  function formatearFecha(
    fecha: string
  ) {
    if (!fecha) {
      return "—";
    }

    const fechaFormateada =
      new Date(fecha);

    if (
      Number.isNaN(
        fechaFormateada.getTime()
      )
    ) {
      return "—";
    }

    return fechaFormateada.toLocaleString(
      "es-DO"
    );
  }

  function estadoVenta(
    estado: string
  ) {
    switch (estado) {
      case "PAGADA":
        return "Pagada";

      case "ABONADA":
        return "Abonada";

      case "PENDIENTE":
        return "Pendiente";

      case "ANULADA":
        return "Anulada";

      default:
        return estado;
    }
  }

  function claseEstado(
    estado: string
  ) {
    switch (estado) {
      case "PAGADA":
        return "estado-badge estado-pagada";

      case "ANULADA":
        return "estado-badge estado-anulada";

      case "ABONADA":
        return "estado-badge estado-pendiente";

      case "PENDIENTE":
      default:
        return "estado-badge estado-pendiente";
    }
  }

  const totalVendido =
    ventas.reduce(
      (total, venta) =>
        total + venta.total,
      0
    );

  const totalPagado =
    ventas.reduce(
      (total, venta) =>
        total + venta.total_pagado,
      0
    );

  const totalPendiente =
    ventas.reduce(
      (total, venta) =>
        total + venta.saldo_pendiente,
      0
    );

  if (cargandoDatos) {
    return (
      <section>
        <h2>Ventas</h2>

        <p>
          Cargando información de
          ventas...
        </p>
      </section>
    );
  }

  return (
    <section>
      {/* ENCABEZADO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <div>
          <h2>
            Ventas
          </h2>

          <p>
            Consulta y seguimiento
            de las ventas realizadas
            por los operadores.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarVentas}
          disabled={cargandoDatos}
        >
          Actualizar
        </button>
      </div>

      {/* ERROR */}
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
          <strong>
            No se pudieron
            consultar las ventas.
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={cargarVentas}
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      {/* RESUMEN */}
      <div
        className="dashboard-grid"
        style={{
          marginBottom: "30px"
        }}
      >
        <div className="dashboard-card">
          <h3>
            Ventas registradas
          </h3>

          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold"
            }}
          >
            {ventas.length}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Total vendido
          </h3>

          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold"
            }}
          >
            {dinero(totalVendido)}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Total cobrado
          </h3>

          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold"
            }}
          >
            {dinero(totalPagado)}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Saldo pendiente
          </h3>

          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold"
            }}
          >
            {dinero(totalPendiente)}
          </p>
        </div>
      </div>

      {/* INFORMACIÓN GENERAL */}
      <div
        className="dashboard-card"
        style={{
          marginBottom: "30px"
        }}
      >
        <h3>
          Información de ventas
        </h3>

        <p>
          Las ventas y los cobros son
          registrados desde la aplicación
          móvil utilizada por los operadores.
        </p>

        <p>
          Este módulo permite al
          administrador consultar las
          operaciones, pagos recibidos y
          saldos pendientes.
        </p>

        <p>
          El panel web no registra cobros
          a clientes.
        </p>
      </div>

      {/* HISTORIAL */}
      <div>
        <h3>
          Historial de ventas
        </h3>

        {ventas.length === 0 ? (
          <div className="dashboard-card">
            <h4>
              No hay ventas registradas
            </h4>

            <p>
              Cuando un operador registre
              una venta desde la aplicación,
              aparecerá aquí.
            </p>

            <p>
              Total vendido:{" "}
              <strong>
                {dinero(totalVendido)}
              </strong>
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
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    # Venta
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Fecha
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Cliente
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Operador
                  </th>

                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px"
                    }}
                  >
                    Total
                  </th>

                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px"
                    }}
                  >
                    Pagado
                  </th>

                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px"
                    }}
                  >
                    Pendiente
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      <strong>
                        #{venta.numero_venta}
                      </strong>
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {formatearFecha(
                        venta.fecha_venta
                      )}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      <strong>
                        {venta.clientes
                          ?.nombre_negocio ||
                          "—"}
                      </strong>

                      {venta.clientes
                        ?.nombre_contacto && (
                        <div>
                          {
                            venta.clientes
                              .nombre_contacto
                          }
                        </div>
                      )}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {venta.usuarios
                        ?.nombre_completo ||
                        "—"}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: "bold"
                      }}
                    >
                      {dinero(
                        venta.total
                      )}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: "bold"
                      }}
                    >
                      {dinero(
                        venta.total_pagado
                      )}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: "bold"
                      }}
                    >
                      {dinero(
                        venta.saldo_pendiente
                      )}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      <span
                        className={claseEstado(
                          venta.estado
                        )}
                      >
                        {estadoVenta(
                          venta.estado
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Ventas;