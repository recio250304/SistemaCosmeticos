import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Cliente {
  id: string;
  nombre_negocio: string;
  tipo: string;
  nombre_contacto: string | null;
  telefono: string | null;
}

interface Venta {
  id: string;
  numero_venta: number;
  total: number;
  total_pagado: number;
  saldo_pendiente: number;
  estado: string;
  fecha_venta: string;
  operador_id: string | null;
  ruta_id: string | null;
}

interface CuentaPorCobrar {
  id: string;
  venta_id: string;
  cliente_id: string;
  monto_original: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: string;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  cliente: Cliente | null;
  venta: Venta | null;
}

interface RespuestaCuentasPorCobrar {
  cuentas: CuentaPorCobrar[];
}

function CuentasPorCobrar() {
  const { sesion } = useAuth();

  const [datos, setDatos] =
    useState<RespuestaCuentasPorCobrar | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // CARGAR CUENTAS POR COBRAR
  // ==========================================================

  async function cargarCuentas() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/cuentas-por-cobrar",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            "No se pudieron cargar las cuentas por cobrar."
        );
      }

      setDatos(resultado);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando las cuentas por cobrar."
      );
    } finally {
      setCargando(false);
    }
  }

  // ==========================================================
  // EFECTO INICIAL
  // ==========================================================

  useEffect(() => {
    if (sesion?.access_token) {
      cargarCuentas();
    }
  }, [sesion?.access_token]);

  // ==========================================================
  // FORMATO DINERO
  // ==========================================================

  function formatearDinero(monto: number) {
    return monto.toLocaleString(
      "es-DO",
      {
        style: "currency",
        currency: "DOP",
        minimumFractionDigits: 2
      }
    );
  }

  // ==========================================================
  // FORMATO FECHA
  // ==========================================================

  function formatearFecha(fecha: string) {
    return new Date(
      fecha
    ).toLocaleDateString("es-DO");
  }

  // ==========================================================
  // ESTADO DE CUENTA
  // ==========================================================

  function obtenerEstado(
    cuenta: CuentaPorCobrar
  ) {
    if (
      Number(cuenta.saldo_pendiente) <= 0
    ) {
      return "PAGADA";
    }

    if (
      Number(cuenta.monto_pagado) > 0 &&
      Number(cuenta.saldo_pendiente) > 0
    ) {
      return "ABONADA";
    }

    return "PENDIENTE";
  }

  // ==========================================================
  // DATOS
  // ==========================================================

  const cuentas =
    datos?.cuentas ?? [];

  const totalOriginal =
    cuentas.reduce(
      (total, cuenta) =>
        total +
        Number(
          cuenta.monto_original
        ),
      0
    );

  const totalPagado =
    cuentas.reduce(
      (total, cuenta) =>
        total +
        Number(
          cuenta.monto_pagado
        ),
      0
    );

  const totalPendiente =
    cuentas.reduce(
      (total, cuenta) =>
        total +
        Number(
          cuenta.saldo_pendiente
        ),
      0
    );

  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (cargando) {
    return (
      <section
        style={{
          padding: "24px"
        }}
      >
        <p>
          Cargando cuentas por cobrar...
        </p>
      </section>
    );
  }

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <section
      style={{
        padding: "24px"
      }}
    >
      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              marginBottom: "6px"
            }}
          >
            Cuentas por cobrar
          </h1>

          <p
            style={{
              margin: 0,
              color: "#666"
            }}
          >
            Control y seguimiento de las
            cuentas pendientes de los
            clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarCuentas}
          disabled={cargando}
          style={{
            padding:
              "10px 16px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
            background:
              "#fff",
            cursor:
              cargando
                ? "not-allowed"
                : "pointer"
          }}
        >
          Actualizar
        </button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          style={{
            marginBottom:
              "20px",
            padding:
              "12px 16px",
            borderRadius:
              "8px",
            background:
              "#fee2e2",
            color:
              "#991b1b"
          }}
        >
          {error}
        </div>
      )}

      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "16px",
          marginBottom:
            "24px"
        }}
      >
        <div
          style={{
            padding: "20px",
            borderRadius:
              "12px",
            background:
              "#f3f4f6"
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom:
                "8px"
            }}
          >
            Total original
          </div>

          <strong
            style={{
              fontSize:
                "24px"
            }}
          >
            {formatearDinero(
              totalOriginal
            )}
          </strong>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius:
              "12px",
            background:
              "#f3f4f6"
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom:
                "8px"
            }}
          >
            Total pagado
          </div>

          <strong
            style={{
              fontSize:
                "24px"
            }}
          >
            {formatearDinero(
              totalPagado
            )}
          </strong>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius:
              "12px",
            background:
              "#f3f4f6"
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom:
                "8px"
            }}
          >
            Total pendiente
          </div>

          <strong
            style={{
              fontSize:
                "24px"
            }}
          >
            {formatearDinero(
              totalPendiente
            )}
          </strong>
        </div>
      </div>

      {/* ======================================================
          TABLA
      ====================================================== */}

      <div
        style={{
          overflowX:
            "auto"
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
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Venta
              </th>

              <th
                style={{
                  textAlign:
                    "left",
                  padding:
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Cliente
              </th>

              <th
                style={{
                  textAlign:
                    "left",
                  padding:
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Fecha
              </th>

              <th
                style={{
                  textAlign:
                    "right",
                  padding:
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Original
              </th>

              <th
                style={{
                  textAlign:
                    "right",
                  padding:
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Pagado
              </th>

              <th
                style={{
                  textAlign:
                    "right",
                  padding:
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Pendiente
              </th>

              <th
                style={{
                  textAlign:
                    "center",
                  padding:
                    "12px",
                  borderBottom:
                    "1px solid #ddd"
                }}
              >
                Estado
              </th>
            </tr>
          </thead>

          <tbody>
            {cuentas.length ===
            0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding:
                      "30px",
                    textAlign:
                      "center",
                    color:
                      "#666"
                  }}
                >
                  No hay cuentas por
                  cobrar.
                </td>
              </tr>
            ) : (
              cuentas.map(
                (cuenta) => {
                  const estado =
                    obtenerEstado(
                      cuenta
                    );

                  const saldo =
                    Number(
                      cuenta.saldo_pendiente
                    );

                  return (
                    <tr
                      key={
                        cuenta.id
                      }
                    >
                      <td
                        style={{
                          padding:
                            "12px",
                          borderBottom:
                            "1px solid #eee"
                        }}
                      >
                        #
                        {
                          cuenta
                            .venta
                            ?.numero_venta
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "12px",
                          borderBottom:
                            "1px solid #eee"
                        }}
                      >
                        <strong>
                          {
                            cuenta
                              .cliente
                              ?.nombre_negocio ??
                              "Sin cliente"
                          }
                        </strong>

                        {cuenta
                          .cliente
                          ?.nombre_contacto && (
                          <div
                            style={{
                              fontSize:
                                "13px",
                              color:
                                "#666"
                            }}
                          >
                            {
                              cuenta
                                .cliente
                                .nombre_contacto
                            }
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "12px",
                          borderBottom:
                            "1px solid #eee"
                        }}
                      >
                        {formatearFecha(
                          cuenta.fecha_emision
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "12px",
                          textAlign:
                            "right",
                          borderBottom:
                            "1px solid #eee"
                        }}
                      >
                        {formatearDinero(
                          Number(
                            cuenta.monto_original
                          )
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "12px",
                          textAlign:
                            "right",
                          borderBottom:
                            "1px solid #eee"
                        }}
                      >
                        {formatearDinero(
                          Number(
                            cuenta.monto_pagado
                          )
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "12px",
                          textAlign:
                            "right",
                          borderBottom:
                            "1px solid #eee",
                          fontWeight:
                            "bold"
                        }}
                      >
                        {formatearDinero(
                          saldo
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "12px",
                          textAlign:
                            "center",
                          borderBottom:
                            "1px solid #eee"
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "5px 9px",
                            borderRadius:
                              "999px",
                            fontSize:
                              "12px",
                            fontWeight:
                              "bold",
                            background:
                              estado ===
                              "PAGADA"
                                ? "#dcfce7"
                                : estado ===
                                  "ABONADA"
                                ? "#fef3c7"
                                : "#fee2e2",
                            color:
                              estado ===
                              "PAGADA"
                                ? "#166534"
                                : estado ===
                                  "ABONADA"
                                ? "#92400e"
                                : "#991b1b"
                          }}
                        >
                          {estado}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CuentasPorCobrar;