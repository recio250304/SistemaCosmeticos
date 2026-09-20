import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import { useAuth } from "./context/AuthContext";

function App() {
  const {
    usuario,
    cargando
  } = useAuth();

  if (cargando) {
    return (
      <main className="loading-page">
        <p>Cargando sistema...</p>
      </main>
    );
  }

  if (!usuario) {
    return <Login />;
  }

  return <Dashboard />;
}

export default App;