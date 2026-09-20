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
  email: string | null;
  activo: boolean;
}

interface CuentaPorPagar {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  concepto: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: string;
  observaciones: string | null;
}

interface RespuestaCuentasPorPagar {
  cuentas: CuentaPorPagar[];
  total_cuentas: number;
  total_pendiente: number;
  total_pagado: number;
}

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string;
  saldo_actual: number;
  activa: boolean;
}

interface RespuestaBancos {
  bancos: CuentaBancaria[];
}

interface PagoProveedor {
  id: string;
  cuenta_por_pagar_id: string;
  monto: number;
  medio_pago: string;
  cuenta_bancaria_id: string | null;
  cuenta_bancaria_nombre: string | null;
  referencia: string | null;
  observaciones: string | null;
  fecha_pago: string;
  usuario_nombre: string | null;
}

interface CuentaHistorial {
  cuenta: CuentaPorPagar;
  pagos: PagoProveedor[];
}

interface RespuestaHistorial {
  cuenta: CuentaPorPagar;
  pagos: PagoProveedor[];
}

export default function CuentasPorPagar() {
  const { sesion } = useAuth();

  const [datos, setDatos] =
    useState<RespuestaCuentasPorPagar>({
      cuentas: [],
      total_cuentas: 0,
      total_pendiente: 0,
      total_pagado: 0
    });

  const [proveedores, setProveedores] =
    useState<Proveedor[]>([]);

  const [cuentasBancarias, setCuentasBancarias] =
    useState<CuentaBancaria[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [pagando, setPagando] =
    useState(false);

  const [cargandoHistorial, setCargandoHistorial] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [mostrarPago, setMostrarPago] =
    useState(false);

  const [mostrarHistorial, setMostrarHistorial] =
    useState(false);

  const [cuentaSeleccionada, setCuentaSeleccionada] =
    useState<CuentaPorPagar | null>(null);

  const [historialSeleccionado, setHistorialSeleccionado] =
    useState<CuentaHistorial | null>(null);

  const [proveedorId, setProveedorId] =
    useState("");

  const [concepto, setConcepto] =
    useState("");

  const [montoTotal, setMontoTotal] =
    useState("");

  const [fechaEmision, setFechaEmision] =
    useState("");

  const [fechaVencimiento, setFechaVencimiento] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [montoPago, setMontoPago] =
    useState("");

  const [medioPago, setMedioPago] =
    useState("EFECTIVO");

  const [cuentaBancariaId, setCuentaBancariaId] =
    useState("");

  const [referencia, setReferencia] =
    useState("");

  const [observacionesPago, setObservacionesPago] =
    useState("");

  async function cargarCuentas() {
    try {
      setCargando(true);
      setError(null);

      const respuesta = await apiFetch(
        "/api/cuentas-por-pagar",
        {
          method: "GET",
          cache: "no-store"
        },
        sesion?.access_token
      );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            "No se pudieron cargar las cuentas por pagar."
        );
      }

      setDatos(resultado);
    } catch (err) {
      console.error(
        "Error cargando cuentas por pagar:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las cuentas por pagar."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarProveedores() {
    try {
      const respuesta = await apiFetch(
        "/api/proveedores",
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
            "No se pudieron cargar los proveedores."
        );
      }

      const lista: Proveedor[] =
        Array.isArray(resultado)
          ? resultado
          : Array.isArray(resultado.proveedores)
          ? resultado.proveedores
          : Array.isArray(resultado.data)
          ? resultado.data
          : [];

      setProveedores(
        lista.filter(
          (proveedor) =>
            proveedor.activo !== false
        )
      );
    } catch (err) {
      console.error(
        "Error cargando proveedores:",
        err
      );
    }
  }

  async function cargarBancos() {
    try {
      const respuesta = await apiFetch(
        "/api/bancos",
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
            "No se pudieron cargar las cuentas bancarias."
        );
      }

      const respuestaBancos =
        resultado as RespuestaBancos;

      setCuentasBancarias(
        Array.isArray(
          respuestaBancos.bancos
        )
          ? respuestaBancos.bancos.filter(
              (banco) =>
                banco.activa !== false
            )
          : []
      );
    } catch (err) {
      console.error(
        "Error cargando cuentas bancarias:",
        err
      );
    }
  }

  useEffect(() => {
    if (!sesion?.access_token) {
      return;
    }

    cargarCuentas();
    cargarProveedores();
    cargarBancos();
  }, [sesion?.access_token]);

  function formatearDinero(
    valor: number
  ) {
    return new Intl.NumberFormat(
      "es-DO",
      {
        style: "currency",
        currency: "DOP",
        minimumFractionDigits: 2
      }
    ).format(valor || 0);
  }

  function formatearFecha(
    fecha: string | null
  ) {
    if (!fecha) {
      return "—";
    }

    const fechaObj =
      new Date(fecha);

    if (
      Number.isNaN(
        fechaObj.getTime()
      )
    ) {
      return "—";
    }

    return fechaObj.toLocaleDateString(
      "es-DO"
    );
  }

  function formatearFechaHora(
    fecha: string | null
  ) {
    if (!fecha) {
      return "—";
    }

    const fechaObj =
      new Date(fecha);

    if (
      Number.isNaN(
        fechaObj.getTime()
      )
    ) {
      return "—";
    }

    return fechaObj.toLocaleString(
      "es-DO",
      {
        dateStyle: "short",
        timeStyle: "short"
      }
    );
  }

  function obtenerEstado(
    cuenta: CuentaPorPagar
  ) {
    if (
      cuenta.saldo_pendiente <= 0
    ) {
      return {
        texto: "PAGADA",
        clase:
          "estado-badge estado-pagada"
      };
    }

    if (
      cuenta.fecha_vencimiento
    ) {
      const hoy =
        new Date();

      const vencimiento =
        new Date(
          cuenta.fecha_vencimiento
        );

      if (
        vencimiento < hoy
      ) {
        return {
          texto: "VENCIDA",
          clase:
            "estado-badge estado-anulada"
        };
      }
    }

    if (
      cuenta.monto_pagado > 0
    ) {
      return {
        texto: "ABONO",
        clase:
          "estado-badge estado-pendiente"
      };
    }

    return {
      texto: "PENDIENTE",
      clase:
        "estado-badge estado-pendiente"
    };
  }

  function abrirFormulario() {
    const hoy =
      new Date();

    const fecha =
      hoy.toISOString()
        .split("T")[0];

    setProveedorId("");
    setConcepto("");
    setMontoTotal("");
    setFechaEmision(fecha);
    setFechaVencimiento("");
    setObservaciones("");
    setError(null);
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
  }

  async function crearCuenta(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!proveedorId) {
      setError(
        "Debe seleccionar un proveedor."
      );
      return;
    }

    if (!concepto.trim()) {
      setError(
        "Debe indicar el concepto."
      );
      return;
    }

    const monto =
      Number(montoTotal);

    if (
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      setError(
        "El monto total debe ser mayor que cero."
      );
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      const respuesta =
        await apiFetch(
          "/api/cuentas-por-pagar",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              proveedor_id:
                proveedorId,
              concepto:
                concepto.trim(),
              monto_total:
                monto,
              fecha_emision:
                fechaEmision ||
                null,
              fecha_vencimiento:
                fechaVencimiento ||
                null,
              observaciones:
                observaciones.trim() ||
                null
            })
          },
          sesion?.access_token
        );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            "No se pudo crear la cuenta por pagar."
        );
      }

      setMostrarFormulario(
        false
      );

      await cargarCuentas();
    } catch (err) {
      console.error(
        "Error creando cuenta por pagar:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la cuenta por pagar."
      );
    } finally {
      setGuardando(false);
    }
  }

  function abrirPago(
    cuenta: CuentaPorPagar
  ) {
    setCuentaSeleccionada(
      cuenta
    );

    setMontoPago("");
    setMedioPago("EFECTIVO");
    setCuentaBancariaId("");
    setReferencia("");
    setObservacionesPago("");
    setError(null);
    setMostrarPago(true);
  }

  function cerrarPago() {
    if (pagando) {
      return;
    }

    setMostrarPago(false);
    setCuentaSeleccionada(
      null
    );
  }

  async function registrarPago(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!cuentaSeleccionada) {
      return;
    }

    const monto =
      Number(montoPago);

    if (
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      setError(
        "El monto del pago debe ser mayor que cero."
      );
      return;
    }

    if (
      monto >
      cuentaSeleccionada.saldo_pendiente
    ) {
      setError(
        "El monto del pago no puede ser mayor que el saldo pendiente."
      );
      return;
    }

    if (
      medioPago ===
        "TRANSFERENCIA" &&
      !cuentaBancariaId
    ) {
      setError(
        "Debe seleccionar la cuenta bancaria."
      );
      return;
    }

    try {
      setPagando(true);
      setError(null);

      const respuesta =
        await apiFetch(
          `/api/cuentas-por-pagar/${cuentaSeleccionada.id}/pago`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              monto,
              medio_pago:
                medioPago,
              cuenta_bancaria_id:
                medioPago ===
                "TRANSFERENCIA"
                  ? cuentaBancariaId
                  : null,
              referencia:
                referencia.trim() ||
                null,
              observaciones:
                observacionesPago.trim() ||
                null
            })
          },
          sesion?.access_token
        );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            "No se pudo registrar el pago."
        );
      }

      setMostrarPago(false);
      setCuentaSeleccionada(
        null
      );

      await cargarCuentas();
      await cargarBancos();
    } catch (err) {
      console.error(
        "Error registrando pago:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el pago."
      );
    } finally {
      setPagando(false);
    }
  }

  async function abrirHistorial(
    cuenta: CuentaPorPagar
  ) {
    try {
      setCargandoHistorial(true);
      setError(null);
      setCuentaSeleccionada(
        cuenta
      );

      const respuesta =
        await apiFetch(
          `/api/cuentas-por-pagar/${cuenta.id}/pagos`,
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
            "No se pudo cargar el historial de pagos."
        );
      }

      const historial =
        resultado as RespuestaHistorial;

      setHistorialSeleccionado({
        cuenta:
          historial.cuenta,
        pagos:
          Array.isArray(
            historial.pagos
          )
            ? historial.pagos
            : []
      });

      setMostrarHistorial(
        true
      );
    } catch (err) {
      console.error(
        "Error cargando historial:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el historial de pagos."
      );
    } finally {
      setCargandoHistorial(false);
    }
  }

  function cerrarHistorial() {
    if (cargandoHistorial) {
      return;
    }

    setMostrarHistorial(
      false
    );

    setHistorialSeleccionado(
      null
    );

    setCuentaSeleccionada(
      null
    );
  }

  if (cargando) {
    return (
      <section>
        <h2>
          Cuentas por pagar
        </h2>

        <p>
          Cargando información
          de cuentas por pagar...
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
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "20px"
        }}
      >
        <div>
          <h2>
            Cuentas por pagar
          </h2>

          <p>
            Control de las obligaciones
            pendientes con proveedores.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px"
          }}
        >
          <button
            type="button"
            onClick={
              cargarCuentas
            }
            disabled={cargando}
          >
            Actualizar
          </button>

          <button
            type="button"
            onClick={
              abrirFormulario
            }
          >
            + Nueva cuenta
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div
          style={{
            marginBottom:
              "20px",
            padding:
              "12px",
            borderRadius:
              "8px",
            background:
              "#ffe5e5",
            color:
              "#a00000"
          }}
        >
          {error}
        </div>
      )}

      {/* RESUMEN */}
      <div
        className="dashboard-grid"
        style={{
          marginBottom:
            "30px"
        }}
      >
        <div className="dashboard-card">
          <h3>
            Total de cuentas
          </h3>

          <p
            style={{
              fontSize:
                "28px",
              fontWeight:
                "bold"
            }}
          >
            {
              datos.total_cuentas
            }
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Total pendiente
          </h3>

          <p
            style={{
              fontSize:
                "24px",
              fontWeight:
                "bold"
            }}
          >
            {formatearDinero(
              datos.total_pendiente
            )}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Total pagado
          </h3>

          <p
            style={{
              fontSize:
                "24px",
              fontWeight:
                "bold"
            }}
          >
            {formatearDinero(
              datos.total_pagado
            )}
          </p>
        </div>
      </div>

      {/* INFORMACIÓN PRINCIPAL */}
      <div
        className="dashboard-card"
        style={{
          marginBottom:
            "30px"
        }}
      >
        <h3>
          Cuentas por pagar
        </h3>

        <p>
          Aquí se registran las
          obligaciones del negocio
          con sus proveedores.
        </p>

        <p>
          Los pagos pueden realizarse
          de forma parcial o completa,
          y cada pago queda registrado
          en el historial de la cuenta.
        </p>
      </div>

      {/* HISTORIAL / TABLA */}
      <div>
        <h3>
          Cuentas registradas
        </h3>

        {datos.cuentas.length ===
        0 ? (
          <div className="dashboard-card">
            <h4>
              No hay cuentas por
              pagar registradas
            </h4>

            <p>
              Todavía no se ha
              registrado ninguna
              obligación con
              proveedores.
            </p>

            <button
              type="button"
              onClick={
                abrirFormulario
              }
            >
              Crear primera cuenta
            </button>
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
                    Proveedor
                  </th>

                  <th
                    style={{
                      textAlign:
                        "left",
                      padding:
                        "10px"
                    }}
                  >
                    Concepto
                  </th>

                  <th
                    style={{
                      textAlign:
                        "right",
                      padding:
                        "10px"
                    }}
                  >
                    Total
                  </th>

                  <th
                    style={{
                      textAlign:
                        "right",
                      padding:
                        "10px"
                    }}
                  >
                    Pagado
                  </th>

                  <th
                    style={{
                      textAlign:
                        "right",
                      padding:
                        "10px"
                    }}
                  >
                    Pendiente
                  </th>

                  <th
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "10px"
                    }}
                  >
                    Vencimiento
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
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {datos.cuentas.map(
                  (cuenta) => {
                    const estado =
                      obtenerEstado(
                        cuenta
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
                              "10px"
                          }}
                        >
                          <strong>
                            {
                              cuenta.proveedor_nombre
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
                            cuenta.concepto
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
                          {formatearDinero(
                            cuenta.monto_total
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
                          {formatearDinero(
                            cuenta.monto_pagado
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
                          {formatearDinero(
                            cuenta.saldo_pendiente
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "center"
                          }}
                        >
                          {formatearFecha(
                            cuenta.fecha_vencimiento
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "center"
                          }}
                        >
                          <span
                            className={
                              estado.clase
                            }
                          >
                            {
                              estado.texto
                            }
                          </span>
                        </td>

                        <td
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "center"
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "center",
                              gap:
                                "8px",
                              flexWrap:
                                "wrap"
                            }}
                          >
                            {cuenta.saldo_pendiente >
                              0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirPago(
                                    cuenta
                                  )
                                }
                              >
                                Pagar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                abrirHistorial(
                                  cuenta
                                )
                              }
                            >
                              Historial
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
      </div>

      {/* MODAL NUEVA CUENTA */}
      {mostrarFormulario && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            zIndex: 1000,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "20px",
            background:
              "rgba(0,0,0,0.5)"
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                "650px",
              maxHeight:
                "90vh",
              overflowY:
                "auto",
              background:
                "#fff",
              borderRadius:
                "12px",
              padding:
                "25px"
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px"
              }}
            >
              <h2>
                Nueva cuenta por
                pagar
              </h2>

              <button
                type="button"
                onClick={
                  cerrarFormulario
                }
                disabled={
                  guardando
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                crearCuenta
              }
            >
              <div
                style={{
                  marginBottom:
                    "15px"
                }}
              >
                <label>
                  Proveedor
                </label>

                <select
                  value={
                    proveedorId
                  }
                  onChange={(e) =>
                    setProveedorId(
                      e.target.value
                    )
                  }
                  required
                  style={{
                    width:
                      "100%",
                    padding:
                      "10px",
                    marginTop:
                      "5px"
                  }}
                >
                  <option value="">
                    Seleccione un
                    proveedor
                  </option>

                  {proveedores.map(
                    (
                      proveedor
                    ) => (
                      <option
                        key={
                          proveedor.id
                        }
                        value={
                          proveedor.id
                        }
                      >
                        {
                          proveedor.nombre
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={{
                  marginBottom:
                    "15px"
                }}
              >
                <label>
                  Concepto
                </label>

                <input
                  type="text"
                  value={
                    concepto
                  }
                  onChange={(e) =>
                    setConcepto(
                      e.target.value
                    )
                  }
                  placeholder="Ej. Compra de productos"
                  required
                  style={{
                    width:
                      "100%",
                    padding:
                      "10px",
                    marginTop:
                      "5px"
                  }}
                />
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap:
                    "15px",
                  marginBottom:
                    "15px"
                }}
              >
                <div>
                  <label>
                    Monto total
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      montoTotal
                    }
                    onChange={(e) =>
                      setMontoTotal(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    required
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      marginTop:
                        "5px"
                    }}
                  />
                </div>

                <div>
                  <label>
                    Fecha de emisión
                  </label>

                  <input
                    type="date"
                    value={
                      fechaEmision
                    }
                    onChange={(e) =>
                      setFechaEmision(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      marginTop:
                        "5px"
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginBottom:
                    "15px"
                }}
              >
                <label>
                  Fecha de
                  vencimiento
                </label>

                <input
                  type="date"
                  value={
                    fechaVencimiento
                  }
                  onChange={(e) =>
                    setFechaVencimiento(
                      e.target.value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "10px",
                    marginTop:
                      "5px"
                  }}
                />
              </div>

              <div
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <label>
                  Observaciones
                </label>

                <textarea
                  value={
                    observaciones
                  }
                  onChange={(e) =>
                    setObservaciones(
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Observaciones opcionales"
                  style={{
                    width:
                      "100%",
                    padding:
                      "10px",
                    marginTop:
                      "5px"
                  }}
                />
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap:
                    "10px"
                }}
              >
                <button
                  type="button"
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
                  type="submit"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : "Crear cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGO */}
      {mostrarPago &&
        cuentaSeleccionada && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              zIndex: 1000,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding:
                "20px",
              background:
                "rgba(0,0,0,0.5)"
            }}
          >
            <div
              style={{
                width:
                  "100%",
                maxWidth:
                  "550px",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto",
                background:
                  "#fff",
                borderRadius:
                  "12px",
                padding:
                  "25px"
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "20px"
                }}
              >
                <h2>
                  Registrar pago
                </h2>

                <button
                  type="button"
                  onClick={
                    cerrarPago
                  }
                  disabled={
                    pagando
                  }
                >
                  ×
                </button>
              </div>

              <div
                className="dashboard-card"
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <p>
                  Proveedor
                </p>

                <strong>
                  {
                    cuentaSeleccionada.proveedor_nombre
                  }
                </strong>

                <p>
                  Total:{" "}
                  <strong>
                    {formatearDinero(
                      cuentaSeleccionada.monto_total
                    )}
                  </strong>
                </p>

                <p>
                  Saldo pendiente:{" "}
                  <strong>
                    {formatearDinero(
                      cuentaSeleccionada.saldo_pendiente
                    )}
                  </strong>
                </p>
              </div>

              <form
                onSubmit={
                  registrarPago
                }
              >
                <div
                  style={{
                    marginBottom:
                      "15px"
                  }}
                >
                  <label>
                    Monto del pago
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    max={
                      cuentaSeleccionada.saldo_pendiente
                    }
                    step="0.01"
                    value={
                      montoPago
                    }
                    onChange={(e) =>
                      setMontoPago(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    required
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      marginTop:
                        "5px"
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom:
                      "15px"
                  }}
                >
                  <label>
                    Medio de pago
                  </label>

                  <select
                    value={
                      medioPago
                    }
                    onChange={(e) => {
                      setMedioPago(
                        e.target.value
                      );

                      if (
                        e.target.value !==
                        "TRANSFERENCIA"
                      ) {
                        setCuentaBancariaId(
                          ""
                        );
                      }
                    }}
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      marginTop:
                        "5px"
                    }}
                  >
                    <option value="EFECTIVO">
                      Efectivo
                    </option>

                    <option value="TRANSFERENCIA">
                      Transferencia
                    </option>

                    <option value="CHEQUE">
                      Cheque
                    </option>

                    <option value="OTRO">
                      Otro
                    </option>
                  </select>
                </div>

                {medioPago ===
                  "TRANSFERENCIA" && (
                  <div
                    style={{
                      marginBottom:
                        "15px"
                    }}
                  >
                    <label>
                      Cuenta bancaria
                    </label>

                    <select
                      value={
                        cuentaBancariaId
                      }
                      onChange={(e) =>
                        setCuentaBancariaId(
                          e.target.value
                        )
                      }
                      required
                      style={{
                        width:
                          "100%",
                        padding:
                          "10px",
                        marginTop:
                          "5px"
                      }}
                    >
                      <option value="">
                        Seleccione una
                        cuenta
                      </option>

                      {cuentasBancarias.map(
                        (
                          banco
                        ) => (
                          <option
                            key={
                              banco.id
                            }
                            value={
                              banco.id
                            }
                          >
                            {
                              banco.nombre
                            }{" "}
                            -{" "}
                            {
                              banco.banco
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div
                  style={{
                    marginBottom:
                      "15px"
                  }}
                >
                  <label>
                    Referencia
                  </label>

                  <input
                    type="text"
                    value={
                      referencia
                    }
                    onChange={(e) =>
                      setReferencia(
                        e.target.value
                      )
                    }
                    placeholder="Número de referencia, cheque, etc."
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      marginTop:
                        "5px"
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom:
                      "20px"
                  }}
                >
                  <label>
                    Observaciones
                  </label>

                  <textarea
                    value={
                      observacionesPago
                    }
                    onChange={(e) =>
                      setObservacionesPago(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Observaciones del pago"
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      marginTop:
                        "5px"
                    }}
                  />
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    gap:
                      "10px"
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      cerrarPago
                    }
                    disabled={
                      pagando
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      pagando
                    }
                  >
                    {pagando
                      ? "Registrando..."
                      : "Registrar pago"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* MODAL HISTORIAL */}
      {mostrarHistorial &&
        historialSeleccionado && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              zIndex: 1000,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding:
                "20px",
              background:
                "rgba(0,0,0,0.5)"
            }}
          >
            <div
              style={{
                width:
                  "100%",
                maxWidth:
                  "850px",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto",
                background:
                  "#fff",
                borderRadius:
                  "12px",
                padding:
                  "25px"
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "20px"
                }}
              >
                <div>
                  <h2>
                    Historial de pagos
                  </h2>

                  <p>
                    {
                      historialSeleccionado
                        .cuenta
                        .proveedor_nombre
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    cerrarHistorial
                  }
                  disabled={
                    cargandoHistorial
                  }
                >
                  ×
                </button>
              </div>

              <div
                className="dashboard-grid"
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <div className="dashboard-card">
                  <h3>
                    Total
                  </h3>

                  <p
                    style={{
                      fontSize:
                        "22px",
                      fontWeight:
                        "bold"
                    }}
                  >
                    {formatearDinero(
                      historialSeleccionado
                        .cuenta
                        .monto_total
                    )}
                  </p>
                </div>

                <div className="dashboard-card">
                  <h3>
                    Pagado
                  </h3>

                  <p
                    style={{
                      fontSize:
                        "22px",
                      fontWeight:
                        "bold"
                    }}
                  >
                    {formatearDinero(
                      historialSeleccionado
                        .cuenta
                        .monto_pagado
                    )}
                  </p>
                </div>

                <div className="dashboard-card">
                  <h3>
                    Pendiente
                  </h3>

                  <p
                    style={{
                      fontSize:
                        "22px",
                      fontWeight:
                        "bold"
                    }}
                  >
                    {formatearDinero(
                      historialSeleccionado
                        .cuenta
                        .saldo_pendiente
                    )}
                  </p>
                </div>
              </div>

              {historialSeleccionado
                .pagos.length ===
              0 ? (
                <div className="dashboard-card">
                  <h4>
                    No hay pagos
                    registrados
                  </h4>

                  <p>
                    Esta cuenta todavía
                    no tiene pagos
                    registrados.
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
                          Fecha
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
                          Medio
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
                          Usuario
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {historialSeleccionado.pagos.map(
                        (pago) => (
                          <tr
                            key={
                              pago.id
                            }
                          >
                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {formatearFechaHora(
                                pago.fecha_pago
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
                              {formatearDinero(
                                pago.monto
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {
                                pago.medio_pago
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {
                                pago.cuenta_bancaria_nombre ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {
                                pago.referencia ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px"
                              }}
                            >
                              {
                                pago.usuario_nombre ||
                                "—"
                              }
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
    </section>
  );
}