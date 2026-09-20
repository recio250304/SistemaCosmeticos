import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Caja {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

interface ResumenCaja {
  total_entradas: number;
  total_salidas: number;
  saldo: number;
}

interface MovimientoCaja {
  id: string;
  operador_id: string | null;
  ruta_id: string | null;
  pago_id: string | null;
  tipo: string;
  monto: number;
  descripcion: string | null;
  creado_en: string;
  caja_id: string;
}

interface RespuestaCaja {
  caja: Caja;
  resumen: ResumenCaja;
  movimientos: MovimientoCaja[];
}

function Caja() {
  const { sesion } = useAuth();

  const [datos, setDatos] =
    useState<RespuestaCaja | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  async function cargarCaja() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/caja",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            "No se pudo cargar la caja."
        );
      }

      setDatos(resultado);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando la caja."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (sesion?.access_token) {
      cargarCaja();
    }
  }, [sesion?.access_token]);

  function formatearDinero(
    monto: number
  ) {
    return monto.toLocaleString(
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
    return new Date(fecha).toLocaleString(
      "es-DO"
    );
  }

  function esEntrada(
    tipo: string
  ) {
    return (
      tipo === "COBRO_VENTA" ||
      tipo === "DEPOSITO"
    );
  }

  if (cargando) {
    return (
      <section>
        <h2>Caja</h2>

        <p>
          Cargando información de caja...
        </p>
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
          <h2>Caja</h2>

          <p>
            Control del efectivo disponible
            en la caja principal.
          </p>
        </div>

        <button
          onClick={cargarCaja}
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

      {datos && (
        <>
          <div
            className="dashboard-grid"
            style={{
              marginBottom: "30px"
            }}
          >
            <div className="dashboard-card">
              <h3>
                Saldo actual
              </h3>

              <p
                style={{
                  fontSize: "28px",
                  fontWeight: "bold"
                }}
              >
                {formatearDinero(
                  datos.resumen.saldo
                )}
              </p>
            </div>

            <div className="dashboard-card">
              <h3>
                Total entradas
              </h3>

              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold"
                }}
              >
                {formatearDinero(
                  datos.resumen
                    .total_entradas
                )}
              </p>
            </div>

            <div className="dashboard-card">
              <h3>
                Total salidas
              </h3>

              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold"
                }}
              >
                {formatearDinero(
                  datos.resumen
                    .total_salidas
                )}
              </p>
            </div>
          </div>

          <div
            className="dashboard-card"
            style={{
              marginBottom: "30px"
            }}
          >
            <h3>
              {datos.caja.nombre}
            </h3>

            <p>
              {datos.caja.descripcion ||
                "Caja principal del sistema."}
            </p>

            <p>
              Estado:{" "}
              <strong>
                {datos.caja.activa
                  ? "ACTIVA"
                  : "INACTIVA"}
              </strong>
            </p>
          </div>

          <div>
            <h3>
              Movimientos de caja
            </h3>

            {datos.movimientos.length ===
            0 ? (
              <div
                className="dashboard-card"
              >
                <h4>
                  No hay movimientos
                </h4>

                <p>
                  La caja todavía no
                  tiene entradas ni
                  salidas registradas.
                </p>

                <p>
                  Saldo actual:{" "}
                  <strong>
                    {formatearDinero(
                      datos.resumen
                        .saldo
                    )}
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
                          padding: "10px"
                        }}
                      >
                        Fecha
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding: "10px"
                        }}
                      >
                        Tipo
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                          padding: "10px"
                        }}
                      >
                        Monto
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding: "10px"
                        }}
                      >
                        Descripción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {datos.movimientos.map(
                      (movimiento) => {
                        const entrada =
                          esEntrada(
                            movimiento.tipo
                          );

                        return (
                          <tr
                            key={
                              movimiento.id
                            }
                          >
                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {formatearFecha(
                                movimiento.creado_en
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px",
                                fontWeight:
                                  "bold"
                              }}
                            >
                              {
                                movimiento.tipo
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px",
                                textAlign:
                                  "right",
                                fontWeight:
                                  "bold"
                              }}
                            >
                              {entrada
                                ? "+"
                                : "-"}{" "}
                              {formatearDinero(
                                Math.abs(
                                  Number(
                                    movimiento.monto
                                  )
                                )
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {movimiento
                                .descripcion ||
                                "-"}
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
        </>
      )}
    </section>
  );
}

export default Caja;