import {
  useEffect,
  useState
} from "react";

import { useAuth } from "../../context/AuthContext";

import Operadores from "./Operadores";
import Clientes from "./Clientes";
import Proveedores from "./Proveedores";
import Productos from "./Productos";
import Inventario from "./Inventario";
import Rutas from "./Rutas";
import Ventas from "./Ventas";
import Caja from "./Caja";
import Bancos from "./Bancos";
import CuentasPorCobrar from "./CuentasPorCobrar";
import CuentasPorPagar from "./CuentasPorPagar";
import GastosOperacionales from "./GastosOperacionales";
import Nomina from "./Nomina";

type Seccion =
  | "inicio"
  | "operadores"
  | "clientes"
  | "proveedores"
  | "productos"
  | "inventario"
  | "rutas"
  | "ventas"
  | "caja"
  | "bancos"
  | "cuentas-por-cobrar"
  | "cuentas-por-pagar"
  | "gastos-operacionales"
  | "nomina";

interface MenuItem {
  id: Seccion;
  nombre: string;
  icono: string;
}

const menuPrincipal: MenuItem[] = [
  {
    id: "inicio",
    nombre: "Inicio",
    icono: "⌂"
  },
  {
    id: "operadores",
    nombre: "Operadores",
    icono: "◉"
  },
  {
    id: "clientes",
    nombre: "Clientes",
    icono: "♙"
  },
  {
    id: "proveedores",
    nombre: "Proveedores",
    icono: "▣"
  },
  {
    id: "productos",
    nombre: "Productos",
    icono: "▤"
  },
  {
    id: "inventario",
    nombre: "Inventario",
    icono: "▦"
  },
  {
    id: "rutas",
    nombre: "Rutas",
    icono: "⌖"
  }
];

const menuOperaciones: MenuItem[] = [
  {
    id: "ventas",
    nombre: "Ventas",
    icono: "$"
  },
  {
    id: "caja",
    nombre: "Caja",
    icono: "▰"
  },
  {
    id: "bancos",
    nombre: "Bancos",
    icono: "▥"
  }
];

const menuFinanzas: MenuItem[] = [
  {
    id: "cuentas-por-cobrar",
    nombre: "Cuentas por cobrar",
    icono: "◌"
  },
  {
    id: "cuentas-por-pagar",
    nombre: "Cuentas por pagar",
    icono: "◍"
  },
  {
    id: "gastos-operacionales",
    nombre: "Gastos operacionales",
    icono: "−"
  },
  {
    id: "nomina",
    nombre: "Nómina",
    icono: "♧"
  }
];

/* =========================================================
   RUTAS DEL DASHBOARD
========================================================= */

const seccionesValidas: Seccion[] = [
  "inicio",
  "operadores",
  "clientes",
  "proveedores",
  "productos",
  "inventario",
  "rutas",
  "ventas",
  "caja",
  "bancos",
  "cuentas-por-cobrar",
  "cuentas-por-pagar",
  "gastos-operacionales",
  "nomina"
];

function obtenerSeccionDesdeRuta(): Seccion {
  const ruta =
    window.location.pathname
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

  if (
    seccionesValidas.includes(
      ruta as Seccion
    )
  ) {
    return ruta as Seccion;
  }

  return "inicio";
}

function Dashboard() {
  const {
    usuario,
    cerrarSesion
  } = useAuth();

  const [
    seccion,
    setSeccion
  ] = useState<Seccion>(
    obtenerSeccionDesdeRuta()
  );

  const [
    menuAbierto,
    setMenuAbierto
  ] = useState(false);

  /* =========================================================
     SINCRONIZAR RUTA INICIAL
  ========================================================= */

  useEffect(() => {
    const rutaActual =
      window.location.pathname;

    const seccionActual =
      obtenerSeccionDesdeRuta();

    const rutaEsperada =
      seccionActual === "inicio"
        ? "/inicio"
        : `/${seccionActual}`;

    if (
      rutaActual !== rutaEsperada
    ) {
      window.history.replaceState(
        {
          seccion: seccionActual
        },
        "",
        rutaEsperada
      );
    }
  }, []);

  /* =========================================================
     ESCUCHAR FLECHA ATRÁS / ADELANTE DEL NAVEGADOR
  ========================================================= */

  useEffect(() => {
    function manejarNavegacion() {
      const nuevaSeccion =
        obtenerSeccionDesdeRuta();

      setSeccion(
        nuevaSeccion
      );

      setMenuAbierto(false);
    }

    window.addEventListener(
      "popstate",
      manejarNavegacion
    );

    return () => {
      window.removeEventListener(
        "popstate",
        manejarNavegacion
      );
    };
  }, []);

  /* =========================================================
     CAMBIAR DE SECCIÓN
  ========================================================= */

  function cambiarSeccion(
    nuevaSeccion: Seccion
  ) {
    if (
      nuevaSeccion === seccion
    ) {
      setMenuAbierto(false);
      return;
    }

    const nuevaRuta =
      nuevaSeccion === "inicio"
        ? "/inicio"
        : `/${nuevaSeccion}`;

    window.history.pushState(
      {
        seccion: nuevaSeccion
      },
      "",
      nuevaRuta
    );

    setSeccion(
      nuevaSeccion
    );

    setMenuAbierto(false);
  }

  /* =========================================================
     NOMBRE DE LA SECCIÓN
  ========================================================= */

  function obtenerNombreSeccion() {
    const todosLosItems = [
      ...menuPrincipal,
      ...menuOperaciones,
      ...menuFinanzas
    ];

    return (
      todosLosItems.find(
        (item) =>
          item.id === seccion
      )?.nombre ||
      "Inicio"
    );
  }

  /* =========================================================
     ITEM DEL MENÚ
  ========================================================= */

  function renderMenuItem(
    item: MenuItem
  ) {
    return (
      <button
        key={item.id}
        type="button"
        className={`sidebar-menu-item ${
          seccion === item.id
            ? "sidebar-menu-item-active"
            : ""
        }`}
        onClick={() =>
          cambiarSeccion(
            item.id
          )
        }
      >
        <span className="sidebar-menu-icon">
          {item.icono}
        </span>

        <span>
          {item.nombre}
        </span>
      </button>
    );
  }

  /* =========================================================
     CONTENIDO
  ========================================================= */

  function renderContenido() {
    switch (seccion) {
      case "operadores":
        return <Operadores />;

      case "clientes":
        return <Clientes />;

      case "proveedores":
        return <Proveedores />;

      case "productos":
        return <Productos />;

      case "inventario":
        return <Inventario />;

      case "rutas":
        return <Rutas />;

      case "ventas":
        return <Ventas />;

      case "caja":
        return <Caja />;

      case "bancos":
        return <Bancos />;

      case "cuentas-por-cobrar":
        return (
          <CuentasPorCobrar />
        );

      case "cuentas-por-pagar":
        return (
          <CuentasPorPagar />
        );

      case "gastos-operacionales":
        return (
          <GastosOperacionales />
        );

      case "nomina":
        return <Nomina />;

      default:
        return (
          <section className="home-dashboard">
            <div className="welcome-panel">
              <div>
                <span className="welcome-label">
                  PANEL ADMINISTRATIVO
                </span>

                <h2>
                  Bienvenido,{" "}
                  {usuario?.nombre_completo}
                </h2>

                <p>
                  Administra las operaciones
                  de tu negocio desde un
                  solo lugar.
                </p>
              </div>

              <div className="welcome-symbol">
                ✦
              </div>
            </div>

            <div className="dashboard-section-heading">
              <div>
                <h2>
                  Accesos rápidos
                </h2>

                <p>
                  Selecciona un módulo para
                  comenzar a trabajar.
                </p>
              </div>
            </div>

            <div className="dashboard-grid">
              <button
                type="button"
                className="dashboard-card dashboard-card-button"
                onClick={() =>
                  cambiarSeccion(
                    "operadores"
                  )
                }
              >
                <span className="dashboard-card-icon">
                  ◉
                </span>

                <div>
                  <h3>
                    Operadores
                  </h3>

                  <p>
                    Gestiona los operadores
                    de ruta.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="dashboard-card dashboard-card-button"
                onClick={() =>
                  cambiarSeccion(
                    "clientes"
                  )
                }
              >
                <span className="dashboard-card-icon">
                  ♙
                </span>

                <div>
                  <h3>
                    Clientes
                  </h3>

                  <p>
                    Administra clientes y
                    establecimientos.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="dashboard-card dashboard-card-button"
                onClick={() =>
                  cambiarSeccion(
                    "productos"
                  )
                }
              >
                <span className="dashboard-card-icon">
                  ▤
                </span>

                <div>
                  <h3>
                    Productos
                  </h3>

                  <p>
                    Gestiona productos,
                    kits y precios.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="dashboard-card dashboard-card-button"
                onClick={() =>
                  cambiarSeccion(
                    "inventario"
                  )
                }
              >
                <span className="dashboard-card-icon">
                  ▦
                </span>

                <div>
                  <h3>
                    Inventario
                  </h3>

                  <p>
                    Controla existencias del
                    almacén.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="dashboard-card dashboard-card-button"
                onClick={() =>
                  cambiarSeccion(
                    "ventas"
                  )
                }
              >
                <span className="dashboard-card-icon">
                  $
                </span>

                <div>
                  <h3>
                    Ventas
                  </h3>

                  <p>
                    Consulta las ventas
                    realizadas.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="dashboard-card dashboard-card-button"
                onClick={() =>
                  cambiarSeccion(
                    "cuentas-por-cobrar"
                  )
                }
              >
                <span className="dashboard-card-icon">
                  ◌
                </span>

                <div>
                  <h3>
                    Cuentas por cobrar
                  </h3>

                  <p>
                    Consulta saldos
                    pendientes.
                  </p>
                </div>
              </button>
            </div>
          </section>
        );
    }
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  return (
    <main className="dashboard-layout">
      <aside
        className={`dashboard-sidebar ${
          menuAbierto
            ? "dashboard-sidebar-open"
            : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            SC
          </div>

          <div>
            <strong>
              Sistema
            </strong>

            <span>
              Cosméticos
            </span>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-group">
            <span className="sidebar-group-title">
              PRINCIPAL
            </span>

            {menuPrincipal.map(
              renderMenuItem
            )}
          </div>

          <div className="sidebar-group">
            <span className="sidebar-group-title">
              OPERACIONES
            </span>

            {menuOperaciones.map(
              renderMenuItem
            )}
          </div>

          <div className="sidebar-group">
            <span className="sidebar-group-title">
              FINANZAS
            </span>

            {menuFinanzas.map(
              renderMenuItem
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {usuario?.nombre_completo
                ?.charAt(0)
                .toUpperCase() ||
                "A"}
            </div>

            <div className="sidebar-user-info">
              <strong>
                {usuario?.nombre_completo}
              </strong>

              <span>
                {usuario?.rol}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={
              cerrarSesion
            }
          >
            <span>
              ↪
            </span>

            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuAbierto && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() =>
            setMenuAbierto(
              false
            )
          }
        />
      )}

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() =>
                setMenuAbierto(
                  !menuAbierto
                )
              }
              aria-label="Abrir menú"
            >
              ☰
            </button>

            <div>
              <span className="topbar-section-label">
                MÓDULO ACTUAL
              </span>

              <h1>
                {obtenerNombreSeccion()}
              </h1>
            </div>
          </div>

          <div className="topbar-user">
            <div className="topbar-user-avatar">
              {usuario?.nombre_completo
                ?.charAt(0)
                .toUpperCase() ||
                "A"}
            </div>

            <div className="topbar-user-text">
              <strong>
                {usuario?.nombre_completo}
              </strong>

              <span>
                Administrador
              </span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {renderContenido()}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;