import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import AdminApp from "./admin/AdminApp.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/utilities.css";

const isAdminRoute = window.location.pathname.startsWith("/administracion");

ReactDOM.createRoot(document.getElementById("root")).render(
  isAdminRoute ? <AdminApp /> : <App />,
);
