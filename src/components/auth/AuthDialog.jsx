import {
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../utils/apiError";
import styles from "./AuthDialog.module.css";

function getUserName(session) {
  const user = session?.usuario;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();

  return fullName || user?.username || user?.email || "Mi cuenta";
}

function AuthDialog({
  canAccessAdminPanel = false,
  isOpen,
  isRestoring = false,
  onClose,
  onLogin,
  onLogout,
  onOpenAdminPanel,
  session,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFeedback("");
      setPassword("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
      setPassword("");
    } catch (error) {
      setFeedback(
        getApiErrorMessage(
          error,
          "No se pudo iniciar sesion. Revisa tus datos e intentalo nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setFeedback("");
    setIsSubmitting(true);

    try {
      await onLogout();
      onClose();
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "No se pudo cerrar la sesion."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const userName = getUserName(session);
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className={styles.overlay}>
      <button
        className={styles.backdrop}
        type="button"
        onClick={onClose}
        aria-label="Cerrar cuenta"
      />

      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <button
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {session ? (
          <div className={styles.accountView}>
            <div className={styles.avatar} aria-hidden="true">
              {userInitial}
            </div>
            <div className={styles.accountHeading}>
              <p>Cuenta activa</p>
              <h2 id="auth-dialog-title">{userName}</h2>
              {session.usuario?.email && <span>{session.usuario.email}</span>}
            </div>

            <div className={styles.sessionInfo}>
              <ShieldCheck size={21} aria-hidden="true" />
              <div>
                <strong>Sesion protegida</strong>
                <span>
                  {session.perfil?.rol_nombre || "Cliente"}
                  {session.perfil?.empresa_nombre
                    ? ` de ${session.perfil.empresa_nombre}`
                    : ""}
                </span>
              </div>
            </div>

            {feedback && (
              <div className={styles.feedback} role="alert">
                {feedback}
              </div>
            )}

            {canAccessAdminPanel && (
              <button
                className={styles.adminButton}
                type="button"
                onClick={onOpenAdminPanel}
              >
                <LayoutDashboard size={19} aria-hidden="true" />
                Ir al panel administrativo
              </button>
            )}

            <button
              className={styles.logoutButton}
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
            >
              <LogOut size={19} aria-hidden="true" />
              {isSubmitting ? "Cerrando sesion" : "Cerrar sesion"}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.loginHeading}>
              <span aria-hidden="true">
                <UserRound size={27} />
              </span>
              <div>
                <p>Tu cuenta</p>
                <h2 id="auth-dialog-title">Iniciar sesion</h2>
              </div>
            </div>

            <p className={styles.loginCopy}>
              Accede para continuar tu compra y consultar la informacion de tu cuenta.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Correo
                <span className={styles.inputShell}>
                  <Mail size={18} aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </span>
              </label>

              <label>
                Contrasena
                <span className={styles.inputShell}>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </span>
              </label>

              {feedback && (
                <div className={styles.feedback} role="alert">
                  {feedback}
                </div>
              )}

              <button
                className={styles.loginButton}
                type="submit"
                disabled={isSubmitting || isRestoring}
              >
                {isSubmitting || isRestoring ? "Validando cuenta" : "Entrar"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default AuthDialog;
