import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import AdminApp from "./admin/AdminApp.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/utilities.css";

function isAdminRoute() {
  return window.location.pathname.startsWith("/administracion");
}

function RootApplication() {
  const [showAdmin, setShowAdmin] = useState(isAdminRoute);

  useEffect(() => {
    function syncRootRoute() {
      setShowAdmin(isAdminRoute());
    }

    window.addEventListener("popstate", syncRootRoute);
    return () => window.removeEventListener("popstate", syncRootRoute);
  }, []);

  return showAdmin ? <AdminApp /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <RootApplication />,
);
