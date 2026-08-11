import {
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
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
import { clearAuthFlow, getAuthFlow, saveAuthFlow } from "../../utils/authFlow";
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

function getInitialAuthFlow() {
  const flow = getAuthFlow() || {};
  const storedForm = flow.registerForm || {};

  return {
    email: typeof flow.email === "string" ? flow.email : "",
    mode: flow.mode || "login",
    recoveryEmail:
      typeof flow.recoveryEmail === "string" ? flow.recoveryEmail : "",
    rememberMe: flow.rememberMe === true,
    registerForm: {
      ...INITIAL_REGISTER_FORM,
      aceptaPrivacidad: storedForm.aceptaPrivacidad === true,
      aceptaTerminos: storedForm.aceptaTerminos === true,
      email: typeof storedForm.email === "string" ? storedForm.email : "",
      nombreCompleto:
        typeof storedForm.nombreCompleto === "string"
          ? storedForm.nombreCompleto.replace(/[^\p{L} ]/gu, "")
          : "",
      numeroIdentidad:
        typeof storedForm.numeroIdentidad === "string"
          ? storedForm.numeroIdentidad.replace(/\D/g, "").slice(0, 13)
          : "",
      telefono:
        typeof storedForm.telefono === "string"
          ? storedForm.telefono.replace(/\D/g, "")
          : "",
    },
    verificationEmail:
      typeof flow.verificationEmail === "string" ? flow.verificationEmail : "",
  };
}

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

function getResponseMessage(response, fallback) {
  return (
    response?.detalle ||
    response?.detail ||
    response?.mensaje ||
    response?.message ||
    fallback
  );
}

function PasswordVisibilityButton({ isVisible, onToggle }) {
  const Icon = isVisible ? EyeOff : Eye;
  const label = isVisible ? "Ocultar contrasena" : "Mostrar contrasena";

  return (
    <button
      aria-label={label}
      className={styles.passwordToggle}
      onClick={onToggle}
      title={label}
      type="button"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

function AuthDialog({
  canAccessAdminPanel = false,
  empresaSlug = "",
  isOpen,
  isRestoring = false,
  onClose,
  onConfirmPasswordRecovery,
  onLogin,
  onLogout,
  onOpenAdminPanel,
  onRegister,
  onRequestPasswordRecovery,
  onResendVerification,
  onVerifyEmail,
  session,
}) {
  const [initialAuthFlow] = useState(getInitialAuthFlow);
  const [mode, setMode] = useState(initialAuthFlow.mode);
  const [email, setEmail] = useState(initialAuthFlow.email);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(initialAuthFlow.rememberMe);
  const [registerForm, setRegisterForm] = useState(initialAuthFlow.registerForm);
  const [verificationEmail, setVerificationEmail] = useState(
    initialAuthFlow.verificationEmail,
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState(
    initialAuthFlow.recoveryEmail,
  );
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirmation, setRecoveryPasswordConfirmation] =
    useState("");
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmation, setShowRegisterConfirmation] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirmation, setShowRecoveryConfirmation] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFeedback(EMPTY_FEEDBACK);
      setPassword("");
      setRegisterForm((current) => ({
        ...current,
        password: "",
        passwordConfirmacion: "",
      }));
      setVerificationCode("");
      setRecoveryCode("");
      setRecoveryPassword("");
      setRecoveryPasswordConfirmation("");
      setShowLoginPassword(false);
      setShowRegisterPassword(false);
      setShowRegisterConfirmation(false);
      setShowRecoveryPassword(false);
      setShowRecoveryConfirmation(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || session) {
      return;
    }

    saveAuthFlow({
      email,
      empresaSlug,
      isOpen: true,
      mode,
      recoveryEmail,
      rememberMe,
      registerForm: {
        aceptaPrivacidad: registerForm.aceptaPrivacidad,
        aceptaTerminos: registerForm.aceptaTerminos,
        email: registerForm.email,
        nombreCompleto: registerForm.nombreCompleto,
        numeroIdentidad: registerForm.numeroIdentidad,
        telefono: registerForm.telefono,
      },
      verificationEmail,
    });
  }, [
    email,
    empresaSlug,
    isOpen,
    mode,
    recoveryEmail,
    rememberMe,
    registerForm.aceptaPrivacidad,
    registerForm.aceptaTerminos,
    registerForm.email,
    registerForm.nombreCompleto,
    registerForm.numeroIdentidad,
    registerForm.telefono,
    session,
    verificationEmail,
  ]);

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
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmation(false);
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryPasswordConfirmation("");
    setShowRecoveryPassword(false);
    setShowRecoveryConfirmation(false);

    if (nextEmail) {
      setEmail(nextEmail);
    }
  }

  function showRegister() {
    setMode("register");
    setFeedback(EMPTY_FEEDBACK);
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmation(false);
    setRegisterForm((current) => ({
      ...current,
      email: current.email || email,
    }));
  }

  function showRecover(nextEmail = "") {
    setMode("recover");
    setFeedback(EMPTY_FEEDBACK);
    setRecoveryEmail(nextEmail || recoveryEmail || email);
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryPasswordConfirmation("");
    setShowLoginPassword(false);
    setShowRecoveryPassword(false);
    setShowRecoveryConfirmation(false);
  }

  function showVerify(nextEmail = "") {
    setMode("verify");
    setFeedback(EMPTY_FEEDBACK);
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmation(false);
    setVerificationEmail(nextEmail || verificationEmail || registerForm.email || email);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);
    setIsSubmitting(true);

    try {
      await onLogin(email, password, rememberMe);
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

  async function handleRecoveryRequest(event) {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);
    setIsSubmitting(true);

    try {
      const normalizedEmail = recoveryEmail.trim();
      const response = await onRequestPasswordRecovery(normalizedEmail);

      setRecoveryEmail(normalizedEmail);
      setRecoveryCode("");
      setRecoveryPassword("");
      setRecoveryPasswordConfirmation("");
      setMode("reset");
      setFeedback({
        message: getResponseMessage(
          response,
          "Si el correo corresponde a una cuenta, recibiras un codigo para continuar.",
        ),
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(
          error,
          "No se pudo solicitar la recuperacion de contrasena.",
        ),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecoveryConfirm(event) {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);

    if (recoveryPassword !== recoveryPasswordConfirmation) {
      setFeedback({
        message: "La nueva contrasena y su confirmacion no coinciden.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = recoveryEmail.trim();
      const response = await onConfirmPasswordRecovery({
        codigo: recoveryCode,
        email: normalizedEmail,
        password: recoveryPassword,
        passwordConfirmacion: recoveryPasswordConfirmation,
      });

      clearAuthFlow();
      setEmail(normalizedEmail);
      setRecoveryCode("");
      setRecoveryPassword("");
      setRecoveryPasswordConfirmation("");
      setMode("login");
      setFeedback({
        message: getResponseMessage(
          response,
          "Contrasena actualizada. Ya puedes iniciar sesion.",
        ),
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(
          error,
          "No se pudo actualizar la contrasena. Revisa el codigo.",
        ),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecoveryResend() {
    setFeedback(EMPTY_FEEDBACK);
    setIsResending(true);

    try {
      const response = await onRequestPasswordRecovery(recoveryEmail.trim());
      setRecoveryCode("");
      setFeedback({
        message: getResponseMessage(
          response,
          "Se solicito un nuevo codigo para continuar.",
        ),
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
      saveAuthFlow({
        email: normalizedEmail,
        empresaSlug,
        isOpen: true,
        mode: "verify",
        registerForm: INITIAL_REGISTER_FORM,
        verificationEmail: normalizedEmail,
      });
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
      clearAuthFlow();
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
      const response = await onResendVerification(verificationEmail);
      if (response?.status !== 200) {
        throw new Error("No se pudo confirmar el reenvio del codigo.");
      }
      setFeedback({
        message: "Código reenviado",
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
  const formTitle = {
    login: "Iniciar sesion",
    recover: "Recuperar acceso",
    register: "Crear cuenta",
    reset: "Nueva contrasena",
    verify: "Activar cuenta",
  }[mode];
  const formEyebrow = {
    login: "Tu cuenta",
    recover: "Seguridad",
    register: "Cuenta de comprador",
    reset: "Seguridad",
    verify: "Verificacion",
  }[mode];
  const formIcon =
    mode === "register" ? (
      <UserPlus size={27} />
    ) : mode === "verify" ? (
      <CheckCircle2 size={27} />
    ) : mode === "recover" || mode === "reset" ? (
      <KeyRound size={27} />
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

            {mode === "recover" && (
              <p className={styles.loginCopy}>
                Escribe tu correo para recibir un codigo de recuperacion.
              </p>
            )}

            {mode === "reset" && (
              <p className={styles.loginCopy}>
                Ingresa el codigo recibido y crea una nueva contrasena.
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
                      type={showLoginPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <PasswordVisibilityButton
                      isVisible={showLoginPassword}
                      onToggle={() => setShowLoginPassword((current) => !current)}
                    />
                  </span>
                </label>

                <div className={styles.loginOptions}>
                  <label className={`${styles.checkboxField} ${styles.rememberField}`}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    <span>Recordarme</span>
                  </label>
                  <button
                    className={styles.recoveryButton}
                    type="button"
                    onClick={() => showRecover(email)}
                  >
                    Olvide mi contrasena
                  </button>
                </div>

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

            {mode === "recover" && (
              <form className={styles.form} onSubmit={handleRecoveryRequest}>
                <label>
                  Correo de la cuenta
                  <span className={styles.inputShell}>
                    <Mail size={18} aria-hidden="true" />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(event) => setRecoveryEmail(event.target.value)}
                      autoComplete="email"
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando codigo" : "Enviar codigo"}
                </button>

                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => showLogin(recoveryEmail)}
                >
                  Volver a iniciar sesion
                </button>
              </form>
            )}

            {mode === "reset" && (
              <form className={styles.form} onSubmit={handleRecoveryConfirm}>
                <label>
                  Correo de la cuenta
                  <span className={styles.inputShell}>
                    <Mail size={18} aria-hidden="true" />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(event) => setRecoveryEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </span>
                </label>

                <label>
                  Codigo de recuperacion
                  <span className={styles.inputShell}>
                    <ShieldCheck size={18} aria-hidden="true" />
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(event) =>
                        setRecoveryCode(
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

                <div className={styles.fieldGrid}>
                  <label>
                    Nueva contrasena
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        type={showRecoveryPassword ? "text" : "password"}
                        value={recoveryPassword}
                        onChange={(event) => setRecoveryPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <PasswordVisibilityButton
                        isVisible={showRecoveryPassword}
                        onToggle={() =>
                          setShowRecoveryPassword((current) => !current)
                        }
                      />
                    </span>
                  </label>

                  <label>
                    Confirmar contrasena
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        type={showRecoveryConfirmation ? "text" : "password"}
                        value={recoveryPasswordConfirmation}
                        onChange={(event) =>
                          setRecoveryPasswordConfirmation(event.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />
                      <PasswordVisibilityButton
                        isVisible={showRecoveryConfirmation}
                        onToggle={() =>
                          setShowRecoveryConfirmation((current) => !current)
                        }
                      />
                    </span>
                  </label>
                </div>

                {feedback.message && (
                  <div className={getFeedbackClass(feedback)} role="alert">
                    {feedback.message}
                  </div>
                )}

                <button
                  className={styles.loginButton}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Actualizando" : "Cambiar contrasena"}
                </button>

                <div className={styles.actionsRow}>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={handleRecoveryResend}
                    disabled={isResending}
                  >
                    {isResending ? "Reenviando" : "Reenviar codigo"}
                  </button>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => showLogin(recoveryEmail)}
                  >
                    Iniciar sesion
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
                        updateRegisterField(
                          "nombreCompleto",
                          event.target.value.replace(/[^\p{L} ]/gu, ""),
                        )
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
                        type="text"
                        value={registerForm.telefono}
                        onChange={(event) =>
                          updateRegisterField(
                            "telefono",
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                        autoComplete="tel"
                        inputMode="numeric"
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
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerForm.password}
                        onChange={(event) =>
                          updateRegisterField("password", event.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />
                      <PasswordVisibilityButton
                        isVisible={showRegisterPassword}
                        onToggle={() => setShowRegisterPassword((current) => !current)}
                      />
                    </span>
                  </label>

                  <label>
                    Confirmar contrasena
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        type={showRegisterConfirmation ? "text" : "password"}
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
                      <PasswordVisibilityButton
                        isVisible={showRegisterConfirmation}
                        onToggle={() =>
                          setShowRegisterConfirmation((current) => !current)
                        }
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
