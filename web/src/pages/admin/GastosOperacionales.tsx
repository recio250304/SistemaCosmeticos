import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface CategoriaGasto {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  creado_en: string;
}

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string;
  activa: boolean;
}

interface Proveedor {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Gasto {
  id: string;
  categoria_id: string;
  descripcion: string;
  monto: number;
  medio_pago: string;
  caja_id: string | null;
  cuenta_bancaria_id: string | null;
  usuario_id: string;
  proveedor_id: string | null;
  fecha_gasto: string;
  referencia: string | null;
  observaciones: string | null;
  creado_en: string;
  actualizado_en?: string;
  categoria:
    | {
        id: string;
        nombre: string;
        descripcion: string | null;
      }
    | null;
  proveedor:
    | {
        id: string;
        nombre: string;
      }
    | null;
  cuenta_bancaria:
    | {
        id: string;
        nombre: string;
        banco: string;
        moneda: string;
      }
    | null;
}

function GastosOperacionales() {
  const { sesion } = useAuth();

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [cuentasBancarias, setCuentasBancarias] =
    useState<CuentaBancaria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [categoriaId, setCategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState("EFECTIVO");
  const [cuentaBancariaId, setCuentaBancariaId] =
    useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [fechaGasto, setFechaGasto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] =
    useState("");

  async function cargarGastos() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/gastos-operacionales",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar los gastos."
        );
      }

      setGastos(
        Array.isArray(datos.gastos)
          ? datos.gastos
          : []
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando los gastos."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarCategorias() {
    try {
      const respuesta = await apiFetch(
        "/api/gastos-operacionales/categorias",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar las categorías."
        );
      }

      setCategorias(
        Array.isArray(datos.categorias)
          ? datos.categorias
          : []
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando las categorías."
      );
    }
  }

  async function cargarCuentasBancarias() {
    try {
      const respuesta = await apiFetch(
        "/api/bancos",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar las cuentas bancarias."
        );
      }

      const lista = Array.isArray(datos.cuentas)
        ? datos.cuentas
        : Array.isArray(datos.cuentas_bancarias)
        ? datos.cuentas_bancarias
        : [];

      setCuentasBancarias(
        lista.filter(
          (cuenta: CuentaBancaria) =>
            cuenta.activa
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando las cuentas bancarias."
      );
    }
  }

  async function cargarProveedores() {
    try {
      const respuesta = await apiFetch(
        "/api/cuentas-por-pagar/proveedores",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      if (!respuesta.ok) {
        setProveedores([]);
        return;
      }

      const datos = await respuesta.json();

      const lista = Array.isArray(
        datos.proveedores
      )
        ? datos.proveedores
        : [];

      setProveedores(
        lista.filter(
          (proveedor: Proveedor) =>
            proveedor.activo
        )
      );
    } catch (error) {
      console.error(error);
      setProveedores([]);
    }
  }

  useEffect(() => {
    if (sesion?.access_token) {
      cargarGastos();
      cargarCategorias();
      cargarCuentasBancarias();
      cargarProveedores();
    }
  }, [sesion?.access_token]);

  function abrirFormulario() {
    const hoy = new Date()
      .toISOString()
      .split("T")[0];

    setCategoriaId("");
    setDescripcion("");
    setMonto("");
    setMedioPago("EFECTIVO");
    setCuentaBancariaId("");
    setProveedorId("");
    setFechaGasto(hoy);
    setReferencia("");
    setObservaciones("");

    setError("");
    setMensaje("");

    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
  }

  async function guardarGasto() {
    setError("");
    setMensaje("");

    if (!categoriaId) {
      setError(
        "Debes seleccionar una categoría."
      );
      return;
    }

    if (!descripcion.trim()) {
      setError(
        "Debes escribir una descripción."
      );
      return;
    }

    const montoNumerico = Number(monto);

    if (
      !Number.isFinite(montoNumerico) ||
      montoNumerico <= 0
    ) {
      setError(
        "El monto debe ser mayor que cero."
      );
      return;
    }

    if (
      (medioPago === "TRANSFERENCIA" ||
        medioPago === "TARJETA") &&
      !cuentaBancariaId
    ) {
      setError(
        "Debes seleccionar una cuenta bancaria."
      );
      return;
    }

    try {
      setGuardando(true);

      const respuesta = await apiFetch(
        "/api/gastos-operacionales",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categoria_id: categoriaId,
            descripcion: descripcion.trim(),
            monto: montoNumerico,
            medio_pago: medioPago,
            cuenta_bancaria_id:
              cuentaBancariaId || null,
            proveedor_id:
              proveedorId || null,
            fecha_gasto: fechaGasto,
            referencia:
              referencia.trim() || null,
            observaciones:
              observaciones.trim() || null
          })
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo registrar el gasto."
        );
      }

      setMensaje(
        "Gasto registrado correctamente."
      );

      setMostrarFormulario(false);

      await cargarGastos();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error registrando el gasto."
      );
    } finally {
      setGuardando(false);
    }
  }

  const totalGastos = gastos.reduce(
    (total, gasto) =>
      total + Number(gasto.monto),
    0
  );

  const totalEfectivo = gastos
    .filter(
      (gasto) =>
        gasto.medio_pago === "EFECTIVO"
    )
    .reduce(
      (total, gasto) =>
        total + Number(gasto.monto),
      0
    );

  const totalBancario = gastos
    .filter(
      (gasto) =>
        gasto.medio_pago ===
          "TRANSFERENCIA" ||
        gasto.medio_pago === "TARJETA"
    )
    .reduce(
      (total, gasto) =>
        total + Number(gasto.monto),
      0
    );

  function formatearMoneda(valor: number) {
    return valor.toLocaleString(
      "es-DO",
      {
        style: "currency",
        currency: "DOP"
      }
    );
  }

  if (cargando) {
    return (
      <section>
        <h2>Gastos operacionales</h2>

        <p>
          Cargando gastos...
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
            Gastos operacionales
          </h2>

          <p>
            Control de los gastos
            operativos de la empresa.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px"
          }}
        >
          <button
            onClick={cargarGastos}
            disabled={cargando}
          >
            Actualizar
          </button>

          <button
            onClick={abrirFormulario}
          >
            Nuevo gasto
          </button>
        </div>
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
          {error}
        </div>
      )}

      {/* MENSAJE */}
      {mensaje && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            borderRadius: "8px",
            background: "#e5f7e5",
            color: "#176b17"
          }}
        >
          {mensaje}
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
            Total de gastos
          </h3>

          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold"
            }}
          >
            {formatearMoneda(
              totalGastos
            )}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Gastos en efectivo
          </h3>

          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold"
            }}
          >
            {formatearMoneda(
              totalEfectivo
            )}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>
            Gastos bancarios
          </h3>

          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold"
            }}
          >
            {formatearMoneda(
              totalBancario
            )}
          </p>
        </div>
      </div>

      {/* INFORMACIÓN PRINCIPAL */}
      <div
        className="dashboard-card"
        style={{
          marginBottom: "30px"
        }}
      >
        <h3>
          Control de gastos
        </h3>

        <p>
          Aquí se registran y consultan
          los gastos operacionales de
          la empresa.
        </p>

        <p>
          Gastos registrados:{" "}
          <strong>
            {gastos.length}
          </strong>
        </p>
      </div>

      {/* HISTORIAL */}
      <div>
        <h3>
          Historial de gastos
        </h3>

        {gastos.length === 0 ? (
          <div className="dashboard-card">
            <h4>
              No hay gastos registrados
            </h4>

            <p>
              Todavía no existen gastos
              operacionales registrados.
            </p>

            <p>
              Puedes registrar el primer
              gasto utilizando el botón
              <strong>
                {" "}Nuevo gasto
              </strong>.
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
                    Categoría
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Descripción
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Proveedor
                  </th>

                  <th
                    style={{
                      textAlign: "center",
                      padding: "10px"
                    }}
                  >
                    Medio
                  </th>

                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px"
                    }}
                  >
                    Monto
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px"
                    }}
                  >
                    Referencia
                  </th>
                </tr>
              </thead>

              <tbody>
                {gastos.map((gasto) => (
                  <tr key={gasto.id}>
                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {gasto.fecha_gasto}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {gasto.categoria
                        ?.nombre ?? "-"}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {gasto.descripcion}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {gasto.proveedor
                        ?.nombre ?? "-"}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center"
                      }}
                    >
                      {gasto.medio_pago}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: "bold"
                      }}
                    >
                      {formatearMoneda(
                        Number(gasto.monto)
                      )}
                    </td>

                    <td
                      style={{
                        padding: "10px"
                      }}
                    >
                      {gasto.referencia ||
                        "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.5)",
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
              width: "min(600px, 94%)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)"
            }}
          >
            <h3>
              Nuevo gasto
            </h3>

            <p>
              Registra un nuevo gasto
              operacional de la empresa.
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
                Categoría
              </label>

              <select
                value={categoriaId}
                onChange={(e) =>
                  setCategoriaId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccionar categoría
                </option>

                {categorias.map(
                  (categoria) => (
                    <option
                      key={categoria.id}
                      value={categoria.id}
                    >
                      {categoria.nombre}
                    </option>
                  )
                )}
              </select>

              <label>
                Descripción
              </label>

              <input
                type="text"
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(
                    e.target.value
                  )
                }
                placeholder="Ej. Compra de materiales"
              />

              <label>
                Monto
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) =>
                  setMonto(
                    e.target.value
                  )
                }
                placeholder="0.00"
              />

              <label>
                Medio de pago
              </label>

              <select
                value={medioPago}
                onChange={(e) => {
                  setMedioPago(
                    e.target.value
                  );

                  if (
                    e.target.value ===
                    "EFECTIVO"
                  ) {
                    setCuentaBancariaId(
                      ""
                    );
                  }
                }}
              >
                <option value="EFECTIVO">
                  Efectivo
                </option>

                <option value="TRANSFERENCIA">
                  Transferencia
                </option>

                <option value="TARJETA">
                  Tarjeta
                </option>
              </select>

              {(medioPago ===
                "TRANSFERENCIA" ||
                medioPago ===
                  "TARJETA") && (
                <>
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
                  >
                    <option value="">
                      Seleccionar cuenta
                    </option>

                    {cuentasBancarias.map(
                      (cuenta) => (
                        <option
                          key={cuenta.id}
                          value={cuenta.id}
                        >
                          {cuenta.nombre} —{" "}
                          {cuenta.banco}
                        </option>
                      )
                    )}
                  </select>
                </>
              )}

              <label>
                Proveedor
                <span
                  style={{
                    fontWeight: "normal",
                    marginLeft: "6px"
                  }}
                >
                  (opcional)
                </span>
              </label>

              <select
                value={proveedorId}
                onChange={(e) =>
                  setProveedorId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Sin proveedor
                </option>

                {proveedores.map(
                  (proveedor) => (
                    <option
                      key={proveedor.id}
                      value={proveedor.id}
                    >
                      {proveedor.nombre}
                    </option>
                  )
                )}
              </select>

              <label>
                Fecha
              </label>

              <input
                type="date"
                value={fechaGasto}
                onChange={(e) =>
                  setFechaGasto(
                    e.target.value
                  )
                }
              />

              <label>
                Referencia
                <span
                  style={{
                    fontWeight: "normal",
                    marginLeft: "6px"
                  }}
                >
                  (opcional)
                </span>
              </label>

              <input
                type="text"
                value={referencia}
                onChange={(e) =>
                  setReferencia(
                    e.target.value
                  )
                }
                placeholder="Ej. recibo, cheque o transferencia"
              />

              <label>
                Observaciones
                <span
                  style={{
                    fontWeight: "normal",
                    marginLeft: "6px"
                  }}
                >
                  (opcional)
                </span>
              </label>

              <textarea
                value={observaciones}
                onChange={(e) =>
                  setObservaciones(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Información adicional"
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
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                onClick={guardarGasto}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default GastosOperacionales;