import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

interface Empleado {
  id: string;
  nombre_completo: string;
  documento_identidad: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  puesto: string | null;
  salario_base: number;
  frecuencia_pago: string;
  fecha_ingreso: string | null;
  activo: boolean;
  observaciones: string | null;
}

interface Nomina {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string | null;
  total_bruto: number;
  total_deducciones: number;
  total_neto: number;
  estado: "ABIERTA" | "PAGADA";
  observaciones: string | null;
  usuario_id: string;
  creado_en: string;
  actualizado_en: string;
}

interface NominaDetalle {
  id: string;
  nomina_id: string;
  empleado_id: string;
  salario_base: number;
  bonos: number;
  deducciones: number;
  salario_neto: number;
  pagado: boolean;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  empleados: Empleado | null;
}

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

interface RespuestaDetalle {
  nomina: Nomina;
  detalles: NominaDetalle[];
}

type ModoPago = "INDIVIDUAL" | "COMPLETA";

function Nomina() {
  const { sesion } = useAuth();

  const [nominas, setNominas] =
    useState<Nomina[]>([]);

  const [empleados, setEmpleados] =
    useState<Empleado[]>([]);

  const [cuentas, setCuentas] =
    useState<CuentaBancaria[]>([]);

  const [nominaSeleccionada, setNominaSeleccionada] =
    useState<RespuestaDetalle | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [cargandoDetalle, setCargandoDetalle] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [fechaInicio, setFechaInicio] =
    useState("");

  const [fechaFin, setFechaFin] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [empleadoId, setEmpleadoId] =
    useState("");

  const [salarioBase, setSalarioBase] =
    useState("");

  const [bonos, setBonos] =
    useState("0");

  const [deducciones, setDeducciones] =
    useState("0");

  const [observacionesDetalle, setObservacionesDetalle] =
    useState("");

  const [mostrarPago, setMostrarPago] =
    useState(false);

  const [detallePago, setDetallePago] =
    useState<NominaDetalle | null>(null);

  const [modoPago, setModoPago] =
    useState<ModoPago>("INDIVIDUAL");

  const [medioPago, setMedioPago] =
    useState<"EFECTIVO" | "TRANSFERENCIA">(
      "EFECTIVO"
    );

  const [cuentaBancariaId, setCuentaBancariaId] =
    useState("");

  const [referenciaPago, setReferenciaPago] =
    useState("");

  const [observacionesPago, setObservacionesPago] =
    useState("");

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

  async function cargarNominas() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await apiFetch(
        "/api/nomina",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar las nóminas."
        );
      }

      const lista: Nomina[] =
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.nominas)
          ? datos.nominas
          : Array.isArray(datos.data)
          ? datos.data
          : [];

      setNominas(lista);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando las nóminas."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarEmpleados() {
    try {
      const respuesta = await apiFetch(
        "/api/nomina/empleados",
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudieron cargar los empleados."
        );
      }

      const lista: Empleado[] =
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.empleados)
          ? datos.empleados
          : Array.isArray(datos.data)
          ? datos.data
          : [];

      setEmpleados(lista);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando los empleados."
      );
    }
  }

  async function cargarCuentas() {
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

      const lista: CuentaBancaria[] =
        Array.isArray(datos.cuentas)
          ? datos.cuentas
          : Array.isArray(datos)
          ? datos
          : [];

      setCuentas(
        lista.filter(
          (cuenta) => cuenta.activa
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

  useEffect(() => {
    if (sesion?.access_token) {
      cargarNominas();
      cargarEmpleados();
      cargarCuentas();
    }
  }, [sesion?.access_token]);

  function abrirFormulario() {
    const hoy = new Date()
      .toISOString()
      .split("T")[0];

    setFechaInicio(hoy);
    setFechaFin(hoy);
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
    setFechaInicio("");
    setFechaFin("");
    setObservaciones("");
  }

  async function crearNomina() {
    if (!fechaInicio) {
      setError(
        "Debes seleccionar la fecha de inicio."
      );
      return;
    }

    if (!fechaFin) {
      setError(
        "Debes seleccionar la fecha de finalización."
      );
      return;
    }

    if (fechaFin < fechaInicio) {
      setError(
        "La fecha final no puede ser anterior a la fecha inicial."
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta = await apiFetch(
        "/api/nomina",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
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
            "No se pudo crear la nómina."
        );
      }

      cerrarFormulario();

      setMensaje(
        "Nómina creada correctamente."
      );

      await cargarNominas();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error creando la nómina."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function abrirDetalle(
    nominaId: string
  ) {
    try {
      setCargandoDetalle(true);
      setError("");
      setMensaje("");

      const respuesta = await apiFetch(
        `/api/nomina/${nominaId}`,
        {
          method: "GET"
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo cargar el detalle de la nómina."
        );
      }

      const detalle: RespuestaDetalle =
        datos.nomina && datos.detalles
          ? datos
          : {
              nomina:
                datos.nomina ?? datos,
              detalles:
                datos.detalles ??
                datos.nomina_detalles ??
                []
            };

      setNominaSeleccionada(detalle);
      setMostrarDetalle(true);

      await cargarEmpleados();
      await cargarCuentas();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error cargando el detalle."
      );
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDetalle() {
    if (guardando) {
      return;
    }

    setMostrarDetalle(false);
    setNominaSeleccionada(null);

    setEmpleadoId("");
    setSalarioBase("");
    setBonos("0");
    setDeducciones("0");
    setObservacionesDetalle("");
  }

  function seleccionarEmpleado(
    id: string
  ) {
    setEmpleadoId(id);

    const empleado =
      empleados.find(
        (item) => item.id === id
      );

    if (empleado) {
      setSalarioBase(
        String(
          Number(
            empleado.salario_base
          ) || 0
        )
      );
    }
  }

  function calcularNeto() {
    return (
      (Number(salarioBase) || 0) +
      (Number(bonos) || 0) -
      (Number(deducciones) || 0)
    );
  }

  async function agregarEmpleado() {
    if (!nominaSeleccionada) {
      return;
    }

    if (
      nominaSeleccionada.nomina.estado !==
      "ABIERTA"
    ) {
      setError(
        "Esta nómina ya fue pagada y no puede modificarse."
      );
      return;
    }

    if (!empleadoId) {
      setError(
        "Debes seleccionar un empleado."
      );
      return;
    }

    const salario =
      Number(salarioBase) || 0;

    const bonosNumero =
      Number(bonos) || 0;

    const deduccionesNumero =
      Number(deducciones) || 0;

    if (
      salario < 0 ||
      bonosNumero < 0 ||
      deduccionesNumero < 0
    ) {
      setError(
        "Los valores no pueden ser negativos."
      );
      return;
    }

    if (
      salario +
        bonosNumero -
        deduccionesNumero <
      0
    ) {
      setError(
        "El salario neto no puede ser negativo."
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta = await apiFetch(
        `/api/nomina/${nominaSeleccionada.nomina.id}/detalles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            empleado_id: empleadoId,
            salario_base: salario,
            bonos: bonosNumero,
            deducciones:
              deduccionesNumero,
            observaciones:
              observacionesDetalle.trim() ||
              null
          })
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo agregar el empleado."
        );
      }

      setEmpleadoId("");
      setSalarioBase("");
      setBonos("0");
      setDeducciones("0");
      setObservacionesDetalle("");

      await abrirDetalle(
        nominaSeleccionada.nomina.id
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error agregando el empleado."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function editarDetalle(
    detalle: NominaDetalle
  ) {
    if (!nominaSeleccionada) {
      return;
    }

    if (
      nominaSeleccionada.nomina.estado !==
      "ABIERTA"
    ) {
      setError(
        "Esta nómina ya fue pagada."
      );
      return;
    }

    const salarioTexto =
      window.prompt(
        "Salario base:",
        String(
          detalle.salario_base
        )
      );

    if (salarioTexto === null) {
      return;
    }

    const bonosTexto =
      window.prompt(
        "Bonos:",
        String(detalle.bonos)
      );

    if (bonosTexto === null) {
      return;
    }

    const deduccionesTexto =
      window.prompt(
        "Deducciones:",
        String(
          detalle.deducciones
        )
      );

    if (deduccionesTexto === null) {
      return;
    }

    const salario =
      Number(salarioTexto);

    const bonosNumero =
      Number(bonosTexto);

    const deduccionesNumero =
      Number(deduccionesTexto);

    if (
      !Number.isFinite(salario) ||
      !Number.isFinite(bonosNumero) ||
      !Number.isFinite(deduccionesNumero)
    ) {
      setError(
        "Los valores deben ser numéricos."
      );
      return;
    }

    if (
      salario < 0 ||
      bonosNumero < 0 ||
      deduccionesNumero < 0
    ) {
      setError(
        "Los valores no pueden ser negativos."
      );
      return;
    }

    if (
      salario +
        bonosNumero -
        deduccionesNumero <
      0
    ) {
      setError(
        "El salario neto no puede ser negativo."
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const respuesta = await apiFetch(
        `/api/nomina/${nominaSeleccionada.nomina.id}/detalles/${detalle.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            salario_base: salario,
            bonos: bonosNumero,
            deducciones:
              deduccionesNumero
          })
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo actualizar el empleado."
        );
      }

      await abrirDetalle(
        nominaSeleccionada.nomina.id
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error actualizando el empleado."
      );
    } finally {
      setGuardando(false);
    }
  }

  function abrirPagoIndividual(
    detalle: NominaDetalle
  ) {
    if (!nominaSeleccionada) {
      return;
    }

    if (
      nominaSeleccionada.nomina.estado !==
      "ABIERTA"
    ) {
      setError(
        "Esta nómina ya fue pagada."
      );
      return;
    }

    if (detalle.pagado) {
      setError(
        "Este empleado ya está pagado."
      );
      return;
    }

    setDetallePago(detalle);
    setModoPago("INDIVIDUAL");
    setMedioPago("EFECTIVO");
    setCuentaBancariaId("");
    setReferenciaPago("");
    setObservacionesPago("");
    setError("");
    setMostrarPago(true);
  }

  function abrirPagoCompleto() {
    if (!nominaSeleccionada) {
      return;
    }

    if (
      nominaSeleccionada.nomina.estado !==
      "ABIERTA"
    ) {
      setError(
        "Esta nómina ya fue pagada."
      );
      return;
    }

    const pendientes =
      nominaSeleccionada.detalles.filter(
        (detalle) =>
          !detalle.pagado
      );

    if (pendientes.length === 0) {
      setError(
        "Todos los empleados ya están pagados."
      );
      return;
    }

    setDetallePago(null);
    setModoPago("COMPLETA");
    setMedioPago("EFECTIVO");
    setCuentaBancariaId("");
    setReferenciaPago("");
    setObservacionesPago("");
    setError("");
    setMostrarPago(true);
  }

  function cerrarPago() {
    if (guardando) {
      return;
    }

    setMostrarPago(false);
    setDetallePago(null);
    setModoPago("INDIVIDUAL");
    setMedioPago("EFECTIVO");
    setCuentaBancariaId("");
    setReferenciaPago("");
    setObservacionesPago("");
  }

  async function confirmarPago() {
    if (!nominaSeleccionada) {
      return;
    }

    if (
      nominaSeleccionada.nomina.estado !==
      "ABIERTA"
    ) {
      setError(
        "Esta nómina ya fue pagada."
      );
      return;
    }

    if (
      medioPago ===
        "TRANSFERENCIA" &&
      !cuentaBancariaId
    ) {
      setError(
        "Debes seleccionar una cuenta bancaria."
      );
      return;
    }

    /*
     * IMPORTANTE:
     * Guardamos el modo antes de llamar
     * cerrarPago(), porque cerrarPago()
     * vuelve modoPago a INDIVIDUAL.
     */
    const pagoCompleto =
      modoPago === "COMPLETA";

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      let url = "";

      if (!pagoCompleto) {
        if (!detallePago) {
          setError(
            "No se encontró el empleado a pagar."
          );
          return;
        }

        url =
          `/api/nomina/${nominaSeleccionada.nomina.id}/detalles/${detallePago.id}/pagar`;
      } else {
        url =
          `/api/nomina/${nominaSeleccionada.nomina.id}/pagar-completa`;
      }

      const respuesta = await apiFetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            medio_pago: medioPago,
            cuenta_bancaria_id:
              medioPago ===
              "TRANSFERENCIA"
                ? cuentaBancariaId
                : null,
            referencia:
              referenciaPago.trim() ||
              null,
            observaciones:
              observacionesPago.trim() ||
              null
          })
        },
        sesion?.access_token
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No se pudo registrar el pago."
        );
      }

      cerrarPago();

      setMensaje(
        pagoCompleto
          ? "Nómina pagada correctamente."
          : "Pago del empleado registrado correctamente."
      );

      await cargarNominas();

      await abrirDetalle(
        nominaSeleccionada.nomina.id
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Error registrando el pago."
      );
    } finally {
      setGuardando(false);
    }
  }

  const empleadosDisponibles =
    empleados.filter(
      (empleado) =>
        !nominaSeleccionada?.detalles.some(
          (detalle) =>
            detalle.empleado_id ===
            empleado.id
        )
    );

  if (cargando) {
    return (
      <section>
        <h2>Nómina</h2>
        <p>
          Cargando nóminas...
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
          <h2>Nómina</h2>

          <p>
            Gestión de nóminas y pagos de
            empleados.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px"
          }}
        >
          <button
            onClick={
              cargarNominas
            }
          >
            Actualizar
          </button>

          <button
            onClick={
              abrirFormulario
            }
          >
            Nueva nómina
          </button>
        </div>
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

      {nominas.length === 0 ? (
        <div className="dashboard-card">
          <h3>
            No hay nóminas registradas
          </h3>

          <p>
            Crea la primera nómina para
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
                <th style={{ padding: "10px", textAlign: "left" }}>
                  Inicio
                </th>

                <th style={{ padding: "10px", textAlign: "left" }}>
                  Fin
                </th>

                <th style={{ padding: "10px", textAlign: "right" }}>
                  Bruto
                </th>

                <th style={{ padding: "10px", textAlign: "right" }}>
                  Deducciones
                </th>

                <th style={{ padding: "10px", textAlign: "right" }}>
                  Neto
                </th>

                <th style={{ padding: "10px", textAlign: "center" }}>
                  Estado
                </th>

                <th style={{ padding: "10px", textAlign: "center" }}>
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {nominas.map(
                (nomina) => (
                  <tr
                    key={
                      nomina.id
                    }
                  >
                    <td style={{ padding: "10px" }}>
                      {
                        nomina.fecha_inicio
                      }
                    </td>

                    <td style={{ padding: "10px" }}>
                      {
                        nomina.fecha_fin
                      }
                    </td>

                    <td style={{ padding: "10px", textAlign: "right" }}>
                      {dinero(
                        nomina.total_bruto
                      )}
                    </td>

                    <td style={{ padding: "10px", textAlign: "right" }}>
                      {dinero(
                        nomina.total_deducciones
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
                      {dinero(
                        nomina.total_neto
                      )}
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
                        nomina.estado
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
                      <button
                        onClick={() =>
                          abrirDetalle(
                            nomina.id
                          )
                        }
                      >
                        Ver nómina
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
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.5)",
            display: "flex",
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
                "min(450px,92%)"
            }}
          >
            <h3>
              Nueva nómina
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
                Fecha de inicio
              </label>

              <input
                type="date"
                value={
                  fechaInicio
                }
                onChange={(e) =>
                  setFechaInicio(
                    e.target
                      .value
                  )
                }
              />

              <label>
                Fecha de finalización
              </label>

              <input
                type="date"
                value={
                  fechaFin
                }
                onChange={(e) =>
                  setFechaFin(
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
                onChange={(e) =>
                  setObservaciones(
                    e.target
                      .value
                  )
                }
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
                  crearNomina
                }
                disabled={
                  guardando
                }
              >
                {guardando
                  ? "Creando..."
                  : "Crear nómina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarDetalle &&
        nominaSeleccionada && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,0.5)",
              display: "flex",
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
                  "min(1100px,94%)",
                maxHeight:
                  "92vh",
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
                    "flex-start"
                }}
              >
                <div>
                  <h3>
                    Detalle de nómina
                  </h3>

                  <p>
                    Período:{" "}
                    <strong>
                      {
                        nominaSeleccionada
                          .nomina
                          .fecha_inicio
                      }
                    </strong>{" "}
                    al{" "}
                    <strong>
                      {
                        nominaSeleccionada
                          .nomina
                          .fecha_fin
                      }
                    </strong>
                  </p>

                  <p>
                    Estado:{" "}
                    <strong>
                      {
                        nominaSeleccionada
                          .nomina
                          .estado
                      }
                    </strong>
                  </p>

                  <p>
                    Total bruto:{" "}
                    <strong>
                      {dinero(
                        nominaSeleccionada
                          .nomina
                          .total_bruto
                      )}
                    </strong>
                  </p>

                  <p>
                    Deducciones:{" "}
                    <strong>
                      {dinero(
                        nominaSeleccionada
                          .nomina
                          .total_deducciones
                      )}
                    </strong>
                  </p>

                  <p>
                    Total neto:{" "}
                    <strong>
                      {dinero(
                        nominaSeleccionada
                          .nomina
                          .total_neto
                      )}
                    </strong>
                  </p>
                </div>

                <button
                  onClick={
                    cerrarDetalle
                  }
                >
                  Cerrar
                </button>
              </div>

              {nominaSeleccionada
                .nomina.estado ===
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
                    Agregar empleado
                  </h4>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 140px 120px 120px auto",
                      gap:
                        "10px",
                      alignItems:
                        "end"
                    }}
                  >
                    <div>
                      <label>
                        Empleado
                      </label>

                      <select
                        value={
                          empleadoId
                        }
                        onChange={(e) =>
                          seleccionarEmpleado(
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
                          Seleccionar empleado
                        </option>

                        {empleadosDisponibles.map(
                          (
                            empleado
                          ) => (
                            <option
                              key={
                                empleado.id
                              }
                              value={
                                empleado.id
                              }
                            >
                              {
                                empleado.nombre_completo
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label>
                        Salario
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          salarioBase
                        }
                        onChange={(e) =>
                          setSalarioBase(
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

                    <div>
                      <label>
                        Bonos
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          bonos
                        }
                        onChange={(e) =>
                          setBonos(
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

                    <div>
                      <label>
                        Deducciones
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          deducciones
                        }
                        onChange={(e) =>
                          setDeducciones(
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
                        agregarEmpleado
                      }
                      disabled={
                        guardando
                      }
                    >
                      Agregar
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "10px"
                    }}
                  >
                    <label>
                      Observaciones
                    </label>

                    <textarea
                      value={
                        observacionesDetalle
                      }
                      onChange={(e) =>
                        setObservacionesDetalle(
                          e.target
                            .value
                        )
                      }
                      rows={2}
                      style={{
                        width:
                          "100%"
                      }}
                    />
                  </div>

                  <p>
                    Neto calculado:{" "}
                    <strong>
                      {dinero(
                        calcularNeto()
                      )}
                    </strong>
                  </p>
                </div>
              )}

              <div
                style={{
                  marginTop:
                    "24px"
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
                  <h4>
                    Empleados
                  </h4>

                  {nominaSeleccionada
                    .nomina.estado ===
                    "ABIERTA" &&
                    nominaSeleccionada
                      .detalles
                      .length >
                      0 && (
                      <button
                        onClick={
                          abrirPagoCompleto
                        }
                      >
                        Pagar nómina completa
                      </button>
                    )}
                </div>

                {nominaSeleccionada
                  .detalles.length ===
                0 ? (
                  <p>
                    No hay empleados en
                    esta nómina.
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
                          <th style={{ padding: "10px", textAlign: "left" }}>
                            Empleado
                          </th>

                          <th style={{ padding: "10px", textAlign: "right" }}>
                            Salario
                          </th>

                          <th style={{ padding: "10px", textAlign: "right" }}>
                            Bonos
                          </th>

                          <th style={{ padding: "10px", textAlign: "right" }}>
                            Deducciones
                          </th>

                          <th style={{ padding: "10px", textAlign: "right" }}>
                            Neto
                          </th>

                          <th style={{ padding: "10px", textAlign: "center" }}>
                            Estado
                          </th>

                          {nominaSeleccionada
                            .nomina
                            .estado ===
                            "ABIERTA" && (
                            <th style={{ padding: "10px", textAlign: "center" }}>
                              Acción
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {nominaSeleccionada
                          .detalles.map(
                            (
                              detalle
                            ) => (
                              <tr
                                key={
                                  detalle.id
                                }
                              >
                                <td style={{ padding: "10px" }}>
                                  {
                                    detalle
                                      .empleados
                                      ?.nombre_completo
                                  }
                                </td>

                                <td style={{ padding: "10px", textAlign: "right" }}>
                                  {dinero(
                                    detalle.salario_base
                                  )}
                                </td>

                                <td style={{ padding: "10px", textAlign: "right" }}>
                                  {dinero(
                                    detalle.bonos
                                  )}
                                </td>

                                <td style={{ padding: "10px", textAlign: "right" }}>
                                  {dinero(
                                    detalle.deducciones
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
                                  {dinero(
                                    detalle.salario_neto
                                  )}
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
                                  {detalle.pagado
                                    ? "PAGADO"
                                    : "PENDIENTE"}
                                </td>

                                {nominaSeleccionada
                                  .nomina
                                  .estado ===
                                  "ABIERTA" && (
                                  <td
                                    style={{
                                      padding:
                                        "10px",
                                      textAlign:
                                        "center"
                                    }}
                                  >
                                    {!detalle.pagado && (
                                      <>
                                        <button
                                          onClick={() =>
                                            editarDetalle(
                                              detalle
                                            )
                                          }
                                          style={{
                                            marginRight:
                                              "6px"
                                          }}
                                        >
                                          Editar
                                        </button>

                                        <button
                                          onClick={() =>
                                            abrirPagoIndividual(
                                              detalle
                                            )
                                          }
                                        >
                                          Pagar
                                        </button>
                                      </>
                                    )}

                                    {detalle.pagado && (
                                      <span>
                                        ✓ Registrado
                                      </span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {mostrarPago && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1200
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
                "min(480px,92%)"
            }}
          >
            <h3>
              {modoPago ===
              "COMPLETA"
                ? "Pagar nómina completa"
                : "Registrar pago"}
            </h3>

            {modoPago ===
              "INDIVIDUAL" &&
              detallePago && (
                <div
                  style={{
                    marginTop:
                      "15px",
                    marginBottom:
                      "15px",
                    padding:
                      "12px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "8px"
                  }}
                >
                  <p>
                    Empleado:{" "}
                    <strong>
                      {
                        detallePago
                          .empleados
                          ?.nombre_completo
                      }
                    </strong>
                  </p>

                  <p>
                    Monto:{" "}
                    <strong>
                      {dinero(
                        detallePago
                          .salario_neto
                      )}
                    </strong>
                  </p>
                </div>
              )}

            {modoPago ===
              "COMPLETA" && (
              <div
                style={{
                  marginTop:
                    "15px",
                  marginBottom:
                    "15px",
                  padding:
                    "12px",
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    "8px"
                }}
              >
                <p>
                  Total:{" "}
                  <strong>
                    {dinero(
                      nominaSeleccionada
                        ?.nomina
                        .total_neto ||
                        0
                    )}
                  </strong>
                </p>
              </div>
            )}

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "8px"
              }}
            >
              <label>
                Medio de pago
              </label>

              <select
                value={
                  medioPago
                }
                onChange={(e) =>
                  setMedioPago(
                    e.target
                      .value as
                      | "EFECTIVO"
                      | "TRANSFERENCIA"
                  )
                }
              >
                <option value="EFECTIVO">
                  Efectivo — Caja Principal
                </option>

                <option value="TRANSFERENCIA">
                  Transferencia bancaria
                </option>
              </select>

              {medioPago ===
                "TRANSFERENCIA" && (
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
                        e.target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Seleccionar cuenta
                    </option>

                    {cuentas.map(
                      (
                        cuenta
                      ) => (
                        <option
                          key={
                            cuenta.id
                          }
                          value={
                            cuenta.id
                          }
                        >
                          {
                            cuenta.nombre
                          }{" "}
                          —{" "}
                          {
                            cuenta.banco
                          }
                        </option>
                      )
                    )}
                  </select>
                </>
              )}

              <label>
                Referencia
              </label>

              <input
                type="text"
                value={
                  referenciaPago
                }
                onChange={(e) =>
                  setReferenciaPago(
                    e.target
                      .value
                  )
                }
                placeholder="Opcional"
              />

              <label>
                Observaciones
              </label>

              <textarea
                value={
                  observacionesPago
                }
                onChange={(e) =>
                  setObservacionesPago(
                    e.target
                      .value
                  )
                }
                rows={3}
                placeholder="Opcional"
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
                  cerrarPago
                }
                disabled={
                  guardando
                }
              >
                Cancelar
              </button>

              <button
                onClick={
                  confirmarPago
                }
                disabled={
                  guardando
                }
              >
                {guardando
                  ? "Registrando..."
                  : modoPago ===
                    "COMPLETA"
                  ? "Pagar nómina"
                  : "Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cargandoDetalle && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1300
          }}
        >
          <div
            style={{
              background:
                "white",
              padding:
                "20px 30px",
              borderRadius:
                "10px"
            }}
          >
            Cargando detalle...
          </div>
        </div>
      )}
    </section>
  );
}

export default Nomina;