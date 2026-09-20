import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string;
  activa: boolean;
  saldo: number;
}

interface MovimientoBancario {
  id: string;
  cuenta_bancaria_id: string;
  tipo: string;
  monto: number;
  referencia: string | null;
  pago_id: string | null;
  pago_nomina_id?: string | null;
  descripcion: string | null;
  creado_en: string;
}

interface RespuestaBancos {
  cuentas: CuentaBancaria[];
  movimientos: MovimientoBancario[];
}

function Bancos() {
  const { sesion } = useAuth();

  const [datos, setDatos] =
    useState<RespuestaBancos | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const token = sesion?.access_token;

  async function cargarBancos() {
    if (!token) {
      setCargando(false);
      setError("No hay una sesión activa.");
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/bancos",
        {
          method: "GET"
        },
        token
      );

      const texto =
        await respuesta.text();

      let resultado: unknown = null;

      if (texto.trim() !== "") {
        try {
          resultado = JSON.parse(texto);
        } catch {
          throw new Error(
            `El servidor respondió con un formato inválido. Código HTTP: ${respuesta.status}`
          );
        }
      }

      if (!respuesta.ok) {
        const mensaje =
          typeof resultado === "object" &&
          resultado !== null &&
          "mensaje" in resultado &&
          typeof (
            resultado as {
              mensaje?: unknown;
            }
          ).mensaje === "string"
            ? (
                resultado as {
                  mensaje: string;
                }
              ).mensaje
            : `Error cargando los bancos. Código HTTP: ${respuesta.status}`;

        throw new Error(mensaje);
      }

      setDatos(
        resultado as RespuestaBancos
      );
    } catch (err) {
      console.error(
        "ERROR CARGANDO BANCOS:"
      );
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Error cargando los bancos."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarBancos();
  }, [token]);

  function formatearDinero(
    monto: number,
    moneda: string = "DOP"
  ) {
    return Number(
      monto || 0
    ).toLocaleString("es-DO", {
      style: "currency",
      currency: moneda,
      minimumFractionDigits: 2
    });
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

  function obtenerCuenta(
    cuentaId: string
  ) {
    return datos?.cuentas.find(
      (cuenta) =>
        cuenta.id === cuentaId
    );
  }

  function obtenerTipoMovimiento(
    tipo: string
  ) {
    switch (tipo) {
      case "INGRESO":
        return "Ingreso";

      case "COBRO_VENTA":
        return "Cobro de venta";

      case "DEPOSITO":
        return "Depósito";

      case "TRANSFERENCIA_ENTRADA":
        return "Transferencia recibida";

      case "TRANSFERENCIA_SALIDA":
        return "Transferencia enviada";

      case "EGRESO":
        return "Egreso";

      case "PAGO":
        return "Pago";

      case "PAGO_NOMINA":
        return "Pago de nómina";

      case "AJUSTE":
        return "Ajuste";

      default:
        return tipo;
    }
  }

  function esEntrada(
    tipo: string
  ) {
    return (
      tipo === "INGRESO" ||
      tipo === "COBRO_VENTA" ||
      tipo === "DEPOSITO" ||
      tipo === "TRANSFERENCIA_ENTRADA" ||
      tipo === "AJUSTE"
    );
  }

  if (cargando) {
    return (
      <section>
        <h2>Bancos</h2>

        <p>
          Cargando información bancaria...
        </p>
      </section>
    );
  }

  const cuentas =
    datos?.cuentas || [];

  const movimientos =
    datos?.movimientos || [];

  const saldoTotal =
    cuentas.reduce(
      (total, cuenta) =>
        total +
        Number(
          cuenta.saldo || 0
        ),
      0
    );

  const cuentasActivas =
    cuentas.filter(
      (cuenta) =>
        cuenta.activa
    ).length;

  return (
    <section>
      {/* ENCABEZADO */}
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
          <h2>Bancos</h2>

          <p>
            Consulta y seguimiento de
            las cuentas bancarias y sus
            movimientos financieros.
          </p>
        </div>

        <button
          onClick={cargarBancos}
          disabled={cargando}
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
            background:
              "#ffe5e5",
            color: "#a00000"
          }}
        >
          {error}
        </div>
      )}

      {datos && (
        <>
          {/* RESUMEN */}
          <div
            className="dashboard-grid"
            style={{
              marginBottom: "30px"
            }}
          >
            <div className="dashboard-card">
              <h3>
                Saldo total
              </h3>

              <p
                style={{
                  fontSize: "28px",
                  fontWeight:
                    "bold"
                }}
              >
                {formatearDinero(
                  saldoTotal
                )}
              </p>
            </div>

            <div className="dashboard-card">
              <h3>
                Cuentas bancarias
              </h3>

              <p
                style={{
                  fontSize: "24px",
                  fontWeight:
                    "bold"
                }}
              >
                {cuentas.length}
              </p>
            </div>

            <div className="dashboard-card">
              <h3>
                Cuentas activas
              </h3>

              <p
                style={{
                  fontSize: "24px",
                  fontWeight:
                    "bold"
                }}
              >
                {cuentasActivas}
              </p>
            </div>

            <div className="dashboard-card">
              <h3>
                Movimientos
              </h3>

              <p
                style={{
                  fontSize: "24px",
                  fontWeight:
                    "bold"
                }}
              >
                {movimientos.length}
              </p>
            </div>
          </div>

          {/* INFORMACIÓN DE CUENTAS */}
          <div
            className="dashboard-card"
            style={{
              marginBottom: "30px"
            }}
          >
            <h3>
              Cuentas bancarias
            </h3>

            <p>
              Cuentas utilizadas para
              administrar los fondos
              del negocio.
            </p>

            {cuentas.length === 0 ? (
              <div
                style={{
                  marginTop: "20px"
                }}
              >
                <h4>
                  No hay cuentas
                  bancarias
                </h4>

                <p>
                  Todavía no se ha
                  registrado ninguna
                  cuenta bancaria.
                </p>
              </div>
            ) : (
              <div
                style={{
                  marginTop: "20px",
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
                        Cuenta
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Banco
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Tipo
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Número
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Moneda
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Estado
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                          padding:
                            "10px"
                        }}
                      >
                        Saldo
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {cuentas.map(
                      (cuenta) => (
                        <tr
                          key={
                            cuenta.id
                          }
                        >
                          <td
                            style={{
                              padding:
                                "10px"
                            }}
                          >
                            <strong>
                              {
                                cuenta.nombre
                              }
                            </strong>
                          </td>

                          <td
                            style={{
                              padding:
                                "10px"
                            }}
                          >
                            {
                              cuenta.banco
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                "10px"
                            }}
                          >
                            {cuenta
                              .tipo_cuenta ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px"
                            }}
                          >
                            {cuenta
                              .numero_cuenta ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px"
                            }}
                          >
                            {
                              cuenta.moneda
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                "10px"
                            }}
                          >
                            <strong>
                              {cuenta.activa
                                ? "ACTIVA"
                                : "INACTIVA"}
                            </strong>
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
                            {formatearDinero(
                              Number(
                                cuenta.saldo ||
                                  0
                              ),
                              cuenta.moneda
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MOVIMIENTOS */}
          <div>
            <h3>
              Movimientos bancarios
            </h3>

            {movimientos.length ===
            0 ? (
              <div className="dashboard-card">
                <h4>
                  No hay movimientos
                </h4>

                <p>
                  Las cuentas bancarias
                  todavía no tienen
                  movimientos
                  registrados.
                </p>

                <p>
                  Saldo total:{" "}
                  <strong>
                    {formatearDinero(
                      saldoTotal
                    )}
                  </strong>
                </p>
              </div>
            ) : (
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
                        Cuenta
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Tipo
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                          padding:
                            "10px"
                        }}
                      >
                        Monto
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Referencia
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px"
                        }}
                      >
                        Descripción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimientos.map(
                      (movimiento) => {
                        const cuenta =
                          obtenerCuenta(
                            movimiento.cuenta_bancaria_id
                          );

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
                                  "10px"
                              }}
                            >
                              <strong>
                                {cuenta
                                  ?.nombre ||
                                  "Cuenta desconocida"}
                              </strong>

                              {cuenta?.banco && (
                                <div>
                                  {
                                    cuenta.banco
                                  }
                                </div>
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
                              {obtenerTipoMovimiento(
                                movimiento.tipo
                              )}
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
                                    movimiento.monto ||
                                      0
                                  )
                                ),
                                cuenta
                                  ?.moneda ||
                                  "DOP"
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {movimiento
                                .referencia ||
                                "—"}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {movimiento
                                .descripcion ||
                                "—"}
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

export default Bancos;