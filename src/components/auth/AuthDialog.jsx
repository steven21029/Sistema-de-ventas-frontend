import {
  CheckCircle2,
  IdCard,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../utils/apiError";
import styles from "./AuthDialog.module.css";

const INITIAL_REGISTER_FORM = {
  aceptaPrivacidad: false,
  aceptaTerminos: false,
  email: "",
  nombreCompleto: "",
  numeroIdentidad: "",
  password: "",
  passwordConfirmacion: "",
  telefono: "",
};

const EMPTY_FEEDBACK = {
  message: "",
  type: "error",
};

function getUserName(session) {
  const user = session?.usuario;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();

  return fullName || user?.username || user?.email || "Mi cuenta";
}

function getFeedbackClass(feedback) {
  return feedback.type === "success"
    ? `${styles.feedback} ${styles.feedbackSuccess}`
    : styles.feedback;
}

function AuthDialog({
  canAccessAdminPanel = false,
  empresaSlug = "",
  isOpen,
  isRestoring = false,
  onClose,
  onLogin,
  onLogout,
  onOpenAdminPanel,
  onRegister,
  onResendVerification,
  onVerifyEmail,
  session,
}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFeedback(EMPTY_FEEDBACK);
      setMode("login");
      setPassword("");
      setRegisterForm(INITIAL_REGISTER_FORM);
      setVerificationCode("");
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

  function updateRegisterField(field, value) {
    setRegisterForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function showLogin(nextEmail = "") {
    setMode("login");
    setFeedback(EMPTY_FEEDBACK);
    setPassword("");

    if (nextEmail) {
      setEmail(nextEmail);
    }
  }

  function showRegister() {
    setMode("register");
    setFeedback(EMPTY_FEEDBACK);
    setRegisterForm((current) => ({
      ...current,
      email: current.email || email,
    }));
  }

  function showVerify(nextEmail = "") {
    setMode("verify");
    setFeedback(EMPTY_FEEDBACK);
    setVerificationEmail(nextEmail || verificationEmail || registerForm.email || email);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
      setPassword("");
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(
          error,
          "No se pudo iniciar sesion. Revisa tus datos e intentalo nuevamente.",
        ),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);

    if (!empresaSlug) {
      setFeedback({
        message: "No se pudo identificar la empresa para crear la cuenta.",
        type: "error",
      });
      return;
    }

    if (registerForm.password !== registerForm.passwordConfirmacion) {
      setFeedback({
        message: "La contrasena y su confirmacion no coinciden.",
        type: "error",
      });
      return;
    }

    if (!registerForm.aceptaTerminos || !registerForm.aceptaPrivacidad) {
      setFeedback({
        message: "Debes aceptar los terminos y la politica de privacidad.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = registerForm.email.trim();

      await onRegister({
        ...registerForm,
        email: normalizedEmail,
        empresaSlug,
      });

      setVerificationEmail(normalizedEmail);
      setVerificationCode("");
      setRegisterForm(INITIAL_REGISTER_FORM);
      setMode("verify");
      setFeedback({
        message: "Cuenta creada. Ingresa el codigo enviado a tu correo para activarla.",
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(error, "No se pudo crear la cuenta."),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySubmit(event) {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);
    setIsSubmitting(true);

    try {
      const normalizedEmail = verificationEmail.trim();

      await onVerifyEmail(normalizedEmail, verificationCode);
      setEmail(normalizedEmail);
      setVerificationCode("");
      setMode("login");
      setFeedback({
        message: "Correo verificado. Ya puedes iniciar sesion.",
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(error, "No se pudo verificar el correo."),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    setFeedback(EMPTY_FEEDBACK);

    if (!verificationEmail.trim()) {
      setFeedback({
        message: "Escribe el correo de la cuenta para reenviar el codigo.",
        type: "error",
      });
      return;
    }

    setIsResending(true);

    try {
      await onResendVerification(verificationEmail);
      setFeedback({
        message: "Codigo reenviado. Revisa tu correo e intentalo nuevamente.",
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(error, "No se pudo reenviar el codigo."),
        type: "error",
      });
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogout() {
    setFeedback(EMPTY_FEEDBACK);
    setIsSubmitting(true);

    try {
      await onLogout();
      onClose();
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(error, "No se pudo cerrar la sesion."),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const userName = getUserName(session);
  const userInitial = userName.charAt(0).toUpperCase();
  const formTitle =
    mode === "register"
      ? "Crear cuenta"
      : mode === "verify"
        ? "Activar cuenta"
        : "Iniciar sesion";
  const formEyebrow =
    mode === "register"
      ? "Cuenta de comprador"
      : mode === "verify"
        ? "Verificacion"
        : "Tu cuenta";
  const formIcon =
    mode === "register" ? (
      <UserPlus size={27} />
    ) : mode === "verify" ? (
      <CheckCircle2 size={27} />
    ) : (
      <UserRound size={27} />
    );

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

            {feedback.message && (
              <div className={getFeedbackClass(feedback)} role="alert">
                {feedback.message}
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
              <span aria-hidden="true">{formIcon}</span>
              <div>
                <p>{formEyebrow}</p>
                <h2 id="auth-dialog-title">{formTitle}</h2>
              </div>
            </div>

            {mode === "login" && (
              <p className={styles.loginCopy}>
                Accede para continuar tu compra y consultar la informacion de tu cuenta.
              </p>
            )}

            {mode === "register" && (
              <p className={styles.loginCopy}>
                Completa tus datos para crear una cuenta de comprador.
              </p>
            )}

            {mode === "verify" && (
              <p className={styles.loginCopy}>
                Ingresa el codigo de 6 digitos para activar tu cuenta.
              </p>
            )}

            {mode === "login" && (
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

                {feedback.message && (
                  <div className={getFeedbackClass(feedback)} role="alert">
                    {feedback.message}
                  </div>
                )}

                <button
                  className={styles.loginButton}
                  type="submit"
                  disabled={isSubmitting || isRestoring}
                >
                  {isSubmitting || isRestoring ? "Validando cuenta" : "Entrar"}
                </button>

                <div className={styles.secondaryPanel}>
                  <span>No tienes cuenta?</span>
                  <button type="button" onClick={showRegister}>
                    Crear cuenta
                  </button>
                </div>
              </form>
            )}

            {mode === "register" && (
              <form className={`${styles.form} ${styles.registerForm}`} onSubmit={handleRegisterSubmit}>
                <label>
                  Nombre completo
                  <span className={styles.inputShell}>
                    <UserRound size={18} aria-hidden="true" />
                    <input
                      type="text"
                      value={registerForm.nombreCompleto}
                      onChange={(event) =>
                        updateRegisterField("nombreCompleto", event.target.value)
                      }
                      autoComplete="name"
                      required
                    />
                  </span>
                </label>

                <div className={styles.fieldGrid}>
                  <label>
                    Correo
                    <span className={styles.inputShell}>
                      <Mail size={18} aria-hidden="true" />
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(event) =>
                          updateRegisterField("email", event.target.value)
                        }
                        autoComplete="email"
                        required
                      />
                    </span>
                  </label>

                  <label>
                    Telefono
                    <span className={styles.inputShell}>
                      <Phone size={18} aria-hidden="true" />
                      <input
                        type="tel"
                        value={registerForm.telefono}
                        onChange={(event) =>
                          updateRegisterField("telefono", event.target.value)
                        }
                        autoComplete="tel"
                        required
                      />
                    </span>
                  </label>
                </div>

                <label>
                  Numero de identidad
                  <span className={styles.inputShell}>
                    <IdCard size={18} aria-hidden="true" />
                    <input
                      type="text"
                      value={registerForm.numeroIdentidad}
                      onChange={(event) =>
                        updateRegisterField(
                          "numeroIdentidad",
                          event.target.value.replace(/\D/g, "").slice(0, 13),
                        )
                      }
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]{13}"
                      maxLength={13}
                      required
                    />
                  </span>
                </label>

                <div className={styles.fieldGrid}>
                  <label>
                    Contrasena
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={(event) =>
                          updateRegisterField("password", event.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />
                    </span>
                  </label>

                  <label>
                    Confirmar contrasena
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        type="password"
                        value={registerForm.passwordConfirmacion}
                        onChange={(event) =>
                          updateRegisterField(
                            "passwordConfirmacion",
                            event.target.value,
                          )
                        }
                        autoComplete="new-password"
                        required
                      />
                    </span>
                  </label>
                </div>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={registerForm.aceptaTerminos}
                    onChange={(event) =>
                      updateRegisterField("aceptaTerminos", event.target.checked)
                    }
                    required
                  />
                  <span>Acepto los terminos y condiciones.</span>
                </label>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={registerForm.aceptaPrivacidad}
                    onChange={(event) =>
                      updateRegisterField("aceptaPrivacidad", event.target.checked)
                    }
                    required
                  />
                  <span>Acepto la politica de privacidad.</span>
                </label>

                {feedback.message && (
                  <div className={getFeedbackClass(feedback)} role="alert">
                    {feedback.message}
                  </div>
                )}

                <button
                  className={styles.loginButton}
                  type="submit"
                  disabled={isSubmitting || isRestoring}
                >
                  {isSubmitting ? "Creando cuenta" : "Crear cuenta"}
                </button>

                <div className={styles.actionsRow}>
                  <button className={styles.textButton} type="button" onClick={() => showLogin(registerForm.email)}>
                    Ya tengo cuenta
                  </button>
                  <button className={styles.textButton} type="button" onClick={() => showVerify(registerForm.email)}>
                    Tengo codigo
                  </button>
                </div>
              </form>
            )}

            {mode === "verify" && (
              <form className={styles.form} onSubmit={handleVerifySubmit}>
                <label>
                  Correo
                  <span className={styles.inputShell}>
                    <Mail size={18} aria-hidden="true" />
                    <input
                      type="email"
                      value={verificationEmail}
                      onChange={(event) => setVerificationEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </span>
                </label>

                <label>
                  Codigo de verificacion
                  <span className={styles.inputShell}>
                    <ShieldCheck size={18} aria-hidden="true" />
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </span>
                </label>

                {feedback.message && (
                  <div className={getFeedbackClass(feedback)} role="alert">
                    {feedback.message}
                  </div>
                )}

                <button
                  className={styles.loginButton}
                  type="submit"
                  disabled={isSubmitting || isRestoring}
                >
                  {isSubmitting ? "Verificando" : "Activar cuenta"}
                </button>

                <div className={styles.actionsRow}>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                  >
                    {isResending ? "Reenviando" : "Reenviar codigo"}
                  </button>
                  <button className={styles.textButton} type="button" onClick={() => showLogin(verificationEmail)}>
                    Iniciar sesion
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default AuthDialog;
