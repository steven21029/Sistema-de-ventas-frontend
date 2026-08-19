import {
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getActiveDepartments,
  getActiveMunicipalities,
} from "../../services/locationService";
import {
  actualizarPreferenciasComunicacion,
  getAvisoLegal,
  getPreferenciasComunicacion,
} from "../../services/authService";
import { getApiErrorMessage } from "../../utils/apiError";
import { clearAuthFlow, getAuthFlow, saveAuthFlow } from "../../utils/authFlow";
import { normalizePhone, PHONE_LENGTH, PHONE_PATTERN } from "../../utils/phone";
import styles from "./AuthDialog.module.css";

const INITIAL_REGISTER_FORM = {
  aceptaPromociones: false,
  aceptaTerminos: false,
  departamentoId: "",
  email: "",
  municipioId: "",
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

const REGISTER_FIELD_ORDER = [
  "nombreCompleto",
  "email",
  "telefono",
  "numeroIdentidad",
  "departamentoId",
  "municipioId",
  "password",
  "passwordConfirmacion",
  "aceptaTerminos",
];

const REGISTER_API_FIELDS = {
  acepta_privacidad: "aceptaTerminos",
  acepta_promociones: "aceptaPromociones",
  acepta_terminos: "aceptaTerminos",
  acepta_terminos_privacidad: "aceptaTerminos",
  departamento_id: "departamentoId",
  email: "email",
  municipio_id: "municipioId",
  nombre_completo: "nombreCompleto",
  numero_identidad: "numeroIdentidad",
  password: "password",
  password_confirmacion: "passwordConfirmacion",
  telefono: "telefono",
};

function getErrorText(value) {
  if (Array.isArray(value)) {
    return value.map(getErrorText).filter(Boolean).join(" ");
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function getRegisterApiErrors(error) {
  const payload = error?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(REGISTER_API_FIELDS)
      .map(([apiField, formField]) => [formField, getErrorText(payload[apiField])])
      .filter(([, message]) => message),
  );
}

function validateRegisterForm(form) {
  const errors = {};

  if (!form.nombreCompleto.trim()) errors.nombreCompleto = "Escribe tu nombre completo.";
  if (!form.email.trim()) errors.email = "Escribe tu correo.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Escribe un correo valido.";
  }
  if (form.telefono.length !== PHONE_LENGTH) {
    errors.telefono = `El telefono debe tener ${PHONE_LENGTH} digitos.`;
  }
  if (form.numeroIdentidad.length !== 13) {
    errors.numeroIdentidad = "La identidad debe tener 13 digitos.";
  }
  if (!form.departamentoId) errors.departamentoId = "Selecciona un departamento.";
  if (!form.municipioId) errors.municipioId = "Selecciona un municipio.";
  if (!form.password) errors.password = "Escribe una contraseña.";
  if (!form.passwordConfirmacion) {
    errors.passwordConfirmacion = "Confirma tu contraseña.";
  } else if (form.password !== form.passwordConfirmacion) {
    errors.passwordConfirmacion = "Las contraseñas no coinciden.";
  }
  if (!form.aceptaTerminos) {
    errors.aceptaTerminos = "Debes aceptar los terminos y condiciones.";
  }

  return errors;
}

function focusFirstRegisterError(formElement, errors) {
  const firstField = REGISTER_FIELD_ORDER.find((field) => errors[field]);
  if (!firstField) return;

  globalThis.requestAnimationFrame(() => {
    formElement?.elements?.namedItem(firstField)?.focus();
  });
}

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
      aceptaPromociones: storedForm.aceptaPromociones === true,
      aceptaTerminos: storedForm.aceptaTerminos === true,
      departamentoId:
        storedForm.departamentoId === undefined || storedForm.departamentoId === null
          ? ""
          : String(storedForm.departamentoId),
      email: typeof storedForm.email === "string" ? storedForm.email : "",
      nombreCompleto:
        typeof storedForm.nombreCompleto === "string"
          ? storedForm.nombreCompleto.replace(/[^\p{L} ]/gu, "")
          : "",
      numeroIdentidad:
        typeof storedForm.numeroIdentidad === "string"
          ? storedForm.numeroIdentidad.replace(/\D/g, "").slice(0, 13)
          : "",
      municipioId:
        storedForm.municipioId === undefined || storedForm.municipioId === null
          ? ""
          : String(storedForm.municipioId),
      telefono:
        typeof storedForm.telefono === "string"
          ? normalizePhone(storedForm.telefono)
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

function getPreferenceData(response) {
  return response?.preferencias || response?.data || response || {};
}

function getLegalNoticeData(response) {
  const noticeCandidates = [response?.aviso_legal, response?.aviso, response?.data, response];
  const notice = noticeCandidates.find(
    (candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate),
  );

  return notice || null;
}

function getLegalNoticeSections(notice) {
  if (!notice) return [];

  if (Array.isArray(notice.secciones)) {
    return notice.secciones
      .map((section, index) => {
        if (typeof section === "string") {
          return { title: `Seccion ${index + 1}`, text: section.trim() };
        }

        return {
          title:
            section?.titulo || section?.nombre || section?.encabezado ||
            `Seccion ${index + 1}`,
          text:
            section?.contenido || section?.texto || section?.descripcion || "",
        };
      })
      .filter((section) => section.text);
  }

  if (notice.secciones && typeof notice.secciones === "object") {
    return Object.entries(notice.secciones)
      .map(([title, text]) => ({ title, text: typeof text === "string" ? text : "" }))
      .filter((section) => section.text);
  }

  return [
    {
      title: "Terminos y condiciones",
      text:
        notice.terminos_condiciones || notice.contenido_terminos ||
        notice.texto_terminos || notice.terminos || "",
    },
    {
      title: "Privacidad",
      text:
        notice.politica_privacidad || notice.contenido_privacidad ||
        notice.texto_privacidad || notice.privacidad || "",
    },
    {
      title: "Promociones opcionales",
      text:
        notice.contenido_promociones || notice.texto_promociones ||
        notice.promociones || "",
    },
  ].filter((section) => typeof section.text === "string" && section.text.trim());
}

function getLegalNoticeText(notice) {
  const candidates = [
    notice?.contenido,
    notice?.contenido_legal,
    notice?.contenido_terminos_privacidad,
    notice?.texto,
    notice?.texto_aviso,
    notice?.texto_legal,
    notice?.texto_terminos_privacidad,
    notice?.terminos_privacidad,
    typeof notice?.aviso_legal === "string" ? notice.aviso_legal : "",
    typeof notice?.aviso === "string" ? notice.aviso : "",
    notice?.resumen,
    notice?.descripcion,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

function getLegalNoticeVersion(notice) {
  const combined =
    notice?.version_terminos_privacidad || notice?.version_aviso || notice?.version;
  if (combined) return `Version ${combined}`;

  const versions = [
    notice?.version_terminos || notice?.version_terminos_actual
      ? `Terminos ${notice.version_terminos || notice.version_terminos_actual}`
      : "",
    notice?.version_privacidad || notice?.version_privacidad_actual
      ? `Privacidad ${notice.version_privacidad || notice.version_privacidad_actual}`
      : "",
  ].filter(Boolean);

  return versions.length ? `Version: ${versions.join(" | ")}` : "";
}

function PasswordVisibilityButton({ isVisible, onToggle }) {
  const Icon = isVisible ? EyeOff : Eye;
  const label = isVisible ? "Ocultar contraseña" : "Mostrar contraseña";

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

function LegalTermsDialog({ company, error, isLoading, notice, onClose, onRetry }) {
  const companyName = company?.nombre || "la empresa responsable de esta tienda";
  const contactText = company?.correo
    ? `escribiendo a ${company.correo}`
    : "mediante los canales publicados en la seccion de Contacto";

  const noticeSections = getLegalNoticeSections(notice);
  const noticeText = getLegalNoticeText(notice);
  const noticeTitle =
    notice?.titulo || notice?.encabezado || notice?.nombre || "Terminos y condiciones";
  const noticeVersion = getLegalNoticeVersion(notice);

  return (
    <div className={styles.legalLayer}>
      <button
        aria-label="Cerrar terminos y condiciones"
        className={styles.legalBackdrop}
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="legal-terms-title"
        aria-modal="true"
        className={styles.legalDialog}
        role="dialog"
      >
        <header className={styles.legalHeader}>
          <div>
            <p>Registro y privacidad</p>
            <h2 id="legal-terms-title">{noticeTitle}</h2>
          </div>
          <button aria-label="Cerrar" onClick={onClose} title="Cerrar" type="button">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.legalBody}>
          {isLoading ? (
            <div className={styles.legalStatus} role="status">
              <LoaderCircle className={styles.spin} size={18} aria-hidden="true" />
              Cargando aviso legal vigente
            </div>
          ) : null}
          {error ? (
            <div className={styles.legalStatusError} role="alert">
              <span>{error}</span>
              <button onClick={onRetry} type="button">Reintentar</button>
            </div>
          ) : null}
          <p className={styles.legalUpdated}>
            {noticeVersion || "Ultima actualizacion: 13 de agosto de 2026."}
          </p>
          <p className={styles.legalIntro}>
            El responsable de esta tienda es {companyName}
            {company?.direccion ? `, con domicilio en ${company.direccion}` : ""}.
            Al crear una cuenta aceptas estas condiciones y autorizas el registro y
            tratamiento de los datos necesarios para prestar el servicio. Para consultas
            puedes comunicarte {contactText}.
          </p>

          {noticeText || noticeSections.length ? (
            <div className={styles.legalServerContent}>
              {noticeText ? <p>{noticeText}</p> : null}
              {noticeSections.map((section, index) => (
                <section key={`${section.title}-${index}`}>
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </section>
              ))}
            </div>
          ) : null}

          {!noticeText && noticeSections.length === 0 ? (
          <div className={styles.legalSections}>
            <section>
              <h3>1. Datos recopilados</h3>
              <p>
                Podemos registrar nombre, identidad, correo, telefono, departamento,
                municipio y la informacion relacionada con cuentas, carritos, pedidos,
                pagos, prefacturas y solicitudes realizadas en la plataforma.
              </p>
            </section>
            <section>
              <h3>2. Finalidades necesarias</h3>
              <p>
                Los datos se utilizan para crear y proteger la cuenta, verificar la
                identidad y los medios de contacto, procesar compras y pagos, enviar
                documentos solicitados, atender consultas, prevenir fraude y cumplir
                obligaciones legales o administrativas aplicables.
              </p>
            </section>
            <section>
              <h3>3. Promociones opcionales</h3>
              <p>
                Solo si marcas la autorizacion separada podremos enviarte promociones,
                descuentos e informacion comercial por correo electronico, llamadas,
                SMS o mensajeria asociada al telefono proporcionado. Rechazar esta
                opcion no impide crear la cuenta ni realizar compras.
              </p>
            </section>
            <section>
              <h3>4. Conservacion y proveedores</h3>
              <p>
                La informacion se conservara mientras la cuenta este activa y durante
                los plazos necesarios para atender obligaciones comerciales, fiscales,
                de seguridad o legales. Podran intervenir proveedores de alojamiento,
                correo, mensajeria, pagos o soporte, limitados a la funcion contratada.
                Esta aceptacion no autoriza la venta de tus datos personales.
              </p>
            </section>
            <section>
              <h3>5. Derechos y retiro del consentimiento</h3>
              <p>
                Puedes solicitar acceso, correccion, actualizacion o eliminacion cuando
                corresponda, y retirar en cualquier momento la autorizacion para
                promociones {contactText}. Retirarla no afecta pedidos anteriores ni el
                uso normal de la cuenta.
              </p>
            </section>
            <section>
              <h3>6. Cuenta y uso seguro</h3>
              <p>
                Debes proporcionar datos correctos, mantener en secreto tu contraseña y
                codigos de verificacion, cerrar la sesion en dispositivos compartidos y
                avisarnos sin demora si detectas un acceso o una compra no reconocida.
                No debes compartir enlaces de pago, codigos ni credenciales con terceros.
              </p>
            </section>
            <section>
              <h3>7. Precios, pedidos y cobros</h3>
              <p>
                Antes de confirmar se mostraran los articulos, descuentos, impuestos,
                envio y total aplicables. El monto definitivo es el asociado al pedido
                confirmado por el servidor. Debes revisar esa informacion antes de
                pagar y conservar la referencia o comprobante de la operacion. Cualquier
                cobro duplicado, monto incorrecto o cargo no reconocido debe reportarse
                de inmediato {contactText} para su revision.
              </p>
            </section>
            <section>
              <h3>8. Pago en linea</h3>
              <p>
                Los pagos en linea pueden ser procesados por un proveedor externo bajo
                sus propios controles y condiciones. Debes verificar que estas en el
                sitio o aplicacion autorizada, utilizar una conexion y un dispositivo
                confiables y no revelar claves, codigos bancarios ni datos completos de
                tu medio de pago. La empresa no solicita esos codigos por llamadas,
                mensajes o correo electronico.
              </p>
            </section>
            <section>
              <h3>9. Pago en sucursal y prefactura</h3>
              <p>
                Una prefactura no es comprobante fiscal ni acredita un pago. El monto
                indicado se respeta durante las 72 horas de vigencia informadas al
                emitirla. Si el pago no se confirma dentro de ese plazo, la solicitud
                puede ser rechazada y sera necesario crear un pedido nuevo. El pago solo
                se considera realizado cuando sea confirmado por la sucursal.
              </p>
            </section>
            <section>
              <h3>10. Uso inseguro y limites de responsabilidad</h3>
              <p>
                En la medida permitida por la ley, la empresa no responde por perdidas
                originadas exclusivamente por compartir credenciales o codigos, ignorar
                advertencias de seguridad, utilizar dispositivos o redes comprometidas,
                proporcionar datos incorrectos o permitir el uso de la cuenta por otra
                persona. Esta limitacion no aplica cuando el dano sea atribuible a fallas
                de seguridad, fraude, negligencia u obligaciones propias de la empresa,
                ni elimina los derechos legales del consumidor.
              </p>
            </section>
            <section>
              <h3>11. Disponibilidad, devoluciones y terceros</h3>
              <p>
                El servicio puede interrumpirse temporalmente por mantenimiento, fallas
                de telecomunicaciones, proveedores de pago o causas fuera del control
                razonable de la empresa. Las anulaciones, devoluciones y correcciones de
                cobro se atenderan segun el estado del pedido, el medio de pago, las
                condiciones informadas y la legislacion aplicable.
              </p>
            </section>
            <section>
              <h3>12. Seguridad, cambios y contacto</h3>
              <p>
                Se aplicaran medidas razonables para proteger la informacion. Las
                modificaciones importantes de estas condiciones deberan informarse y,
                cuando cambien las finalidades del tratamiento, podra solicitarse una
                nueva aceptacion. Puedes realizar consultas {contactText}.
              </p>
            </section>
            <section>
              <h3>13. Informacion sanitaria y ley aplicable</h3>
              <p>
                El catalogo y el proceso de compra no sustituyen una evaluacion,
                diagnostico o recomendacion de un profesional de la salud. Estas
                condiciones se interpretan conforme a la legislacion de Honduras, sin
                limitar los derechos que correspondan al consumidor.
              </p>
            </section>
          </div>
          ) : null}
        </div>

        <footer className={styles.legalFooter}>
          <button onClick={onClose} type="button">Entendido</button>
        </footer>
      </section>
    </div>
  );
}

function AuthDialog({
  canAccessAdminPanel = false,
  empresa,
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
  const [registerErrors, setRegisterErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmation, setShowRegisterConfirmation] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirmation, setShowRecoveryConfirmation] = useState(false);
  const [showLegalTerms, setShowLegalTerms] = useState(false);
  const [legalNotice, setLegalNotice] = useState(null);
  const [legalNoticeError, setLegalNoticeError] = useState("");
  const [legalNoticeRequest, setLegalNoticeRequest] = useState(0);
  const [isLoadingLegalNotice, setIsLoadingLegalNotice] = useState(false);
  const [acceptsPromotions, setAcceptsPromotions] = useState(false);
  const [savedAcceptsPromotions, setSavedAcceptsPromotions] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    if (!showLegalTerms) return undefined;

    function closeLegalTerms(event) {
      if (event.key === "Escape") setShowLegalTerms(false);
    }

    globalThis.addEventListener("keydown", closeLegalTerms);
    return () => globalThis.removeEventListener("keydown", closeLegalTerms);
  }, [showLegalTerms]);

  useEffect(() => {
    if (!showLegalTerms || !empresaSlug) return undefined;

    let isActive = true;
    setIsLoadingLegalNotice(true);
    setLegalNoticeError("");

    getAvisoLegal(empresaSlug)
      .then((response) => {
        if (isActive) setLegalNotice(getLegalNoticeData(response));
      })
      .catch((error) => {
        if (isActive) {
          setLegalNoticeError(
            getApiErrorMessage(
              error,
              "No se pudo actualizar el aviso legal. Se muestra la copia disponible.",
            ),
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingLegalNotice(false);
      });

    return () => {
      isActive = false;
    };
  }, [empresaSlug, legalNoticeRequest, showLegalTerms]);

  useEffect(() => {
    if (!isOpen || !session) return undefined;

    let isActive = true;
    setIsLoadingPreferences(true);
    setHasLoadedPreferences(false);

    getPreferenciasComunicacion()
      .then((response) => {
        if (!isActive) return;
        const preference = getPreferenceData(response).acepta_promociones === true;
        setAcceptsPromotions(preference);
        setSavedAcceptsPromotions(preference);
        setHasLoadedPreferences(true);
      })
      .catch((error) => {
        if (isActive) {
          setFeedback({
            message: getApiErrorMessage(
              error,
              "No se pudo cargar tu preferencia de comunicaciones.",
            ),
            type: "error",
          });
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingPreferences(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, session]);

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
      setRegisterErrors({});
      setLocationError("");
      setShowLegalTerms(false);
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
        aceptaPromociones: registerForm.aceptaPromociones,
        aceptaTerminos: registerForm.aceptaTerminos,
        departamentoId: registerForm.departamentoId,
        email: registerForm.email,
        municipioId: registerForm.municipioId,
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
    registerForm.aceptaPromociones,
    registerForm.aceptaTerminos,
    registerForm.departamentoId,
    registerForm.email,
    registerForm.municipioId,
    registerForm.nombreCompleto,
    registerForm.numeroIdentidad,
    registerForm.telefono,
    session,
    verificationEmail,
  ]);

  useEffect(() => {
    if (!isOpen || mode !== "register" || departments.length > 0) {
      return undefined;
    }

    let isActive = true;
    setIsLoadingDepartments(true);
    setLocationError("");

    getActiveDepartments()
      .then((items) => {
        if (isActive) setDepartments(items);
      })
      .catch(() => {
        if (isActive) {
          setDepartments([]);
          setLocationError("No se pudieron cargar los departamentos.");
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingDepartments(false);
      });

    return () => {
      isActive = false;
    };
  }, [departments.length, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "register" || !registerForm.departamentoId) {
      setMunicipalities([]);
      setIsLoadingMunicipalities(false);
      return undefined;
    }

    let isActive = true;
    setIsLoadingMunicipalities(true);
    setLocationError("");

    getActiveMunicipalities(registerForm.departamentoId)
      .then((items) => {
        if (isActive) setMunicipalities(items);
      })
      .catch(() => {
        if (isActive) {
          setMunicipalities([]);
          setLocationError("No se pudieron cargar los municipios del departamento.");
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingMunicipalities(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, mode, registerForm.departamentoId]);

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
    setRegisterErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateRegisterDepartment(value) {
    setRegisterForm((current) => ({
      ...current,
      departamentoId: value,
      municipioId: "",
    }));
    setRegisterErrors((current) => {
      const next = { ...current };
      delete next.departamentoId;
      delete next.municipioId;
      return next;
    });
  }

  function getRegisterFieldClass(field, baseClass = "") {
    return [baseClass, registerErrors[field] ? styles.fieldInvalid : ""]
      .filter(Boolean)
      .join(" ");
  }

  function showLogin(nextEmail = "") {
    setMode("login");
    setFeedback(EMPTY_FEEDBACK);
    setPassword("");
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmation(false);
    setRegisterErrors({});
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
    setRegisterErrors({});
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
          "No se pudo solicitar la recuperacion de contraseña.",
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
        message: "La nueva contraseña y su confirmacion no coinciden.",
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
          "Contraseña actualizada. Ya puedes iniciar sesion.",
        ),
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(
          error,
          "No se pudo actualizar la contraseña. Revisa el codigo.",
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
    const formElement = event.currentTarget;
    setFeedback(EMPTY_FEEDBACK);
    setRegisterErrors({});

    if (!empresaSlug) {
      setFeedback({
        message: "No se pudo identificar la empresa para crear la cuenta.",
        type: "error",
      });
      return;
    }

    const validationErrors = validateRegisterForm(registerForm);
    if (Object.keys(validationErrors).length > 0) {
      setRegisterErrors(validationErrors);
      setFeedback({
        message: "Revisa los campos señalados antes de crear la cuenta.",
        type: "error",
      });
      focusFirstRegisterError(formElement, validationErrors);
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
      setRegisterErrors({});
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
      const apiFieldErrors = getRegisterApiErrors(error);
      const hasFieldErrors = Object.keys(apiFieldErrors).length > 0;
      if (hasFieldErrors) {
        setRegisterErrors(apiFieldErrors);
        focusFirstRegisterError(formElement, apiFieldErrors);
      }
      setFeedback({
        message: hasFieldErrors
          ? "Revisa los campos señalados por el servidor."
          : getApiErrorMessage(error, "No se pudo crear la cuenta."),
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

  async function handleSaveCommunicationPreference() {
    setFeedback(EMPTY_FEEDBACK);
    setIsSavingPreferences(true);

    try {
      const response = await actualizarPreferenciasComunicacion(acceptsPromotions);
      const responseData = getPreferenceData(response);
      const savedPreference =
        typeof responseData.acepta_promociones === "boolean"
          ? responseData.acepta_promociones
          : acceptsPromotions;

      setAcceptsPromotions(savedPreference);
      setSavedAcceptsPromotions(savedPreference);
      setFeedback({
        message: getResponseMessage(
          response,
          savedPreference
            ? "Preferencia guardada. Podras recibir promociones y descuentos."
            : "Preferencia guardada. No recibiras comunicaciones promocionales.",
        ),
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(
          error,
          "No se pudo actualizar tu preferencia de comunicaciones.",
        ),
        type: "error",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  }

  const userName = getUserName(session);
  const userInitial = userName.charAt(0).toUpperCase();
  const formTitle = {
    login: "Iniciar sesion",
    recover: "Recuperar acceso",
    register: "Crear cuenta",
    reset: "Nueva contraseña",
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

            <section className={styles.communicationPanel}>
              <div className={styles.communicationHeading}>
                <Megaphone size={20} aria-hidden="true" />
                <div>
                  <strong>Comunicaciones promocionales</strong>
                  <span>Promociones, descuentos e informacion comercial.</span>
                </div>
              </div>

              <label className={styles.preferenceSwitch}>
                <input
                  checked={acceptsPromotions}
                  disabled={
                    !hasLoadedPreferences || isLoadingPreferences || isSavingPreferences
                  }
                  onChange={(event) => setAcceptsPromotions(event.target.checked)}
                  type="checkbox"
                />
                <span aria-hidden="true" />
                <strong>
                  {isLoadingPreferences
                    ? "Consultando"
                    : hasLoadedPreferences
                      ? acceptsPromotions
                        ? "Aceptadas"
                        : "Desactivadas"
                      : "No disponible"}
                </strong>
              </label>

              <p>
                Los codigos de seguridad, la recuperacion de cuenta y las prefacturas
                seguiran llegando aunque desactives esta opcion.
              </p>

              <button
                className={styles.preferenceSaveButton}
                disabled={
                  isLoadingPreferences ||
                  isSavingPreferences ||
                  !hasLoadedPreferences ||
                  acceptsPromotions === savedAcceptsPromotions
                }
                onClick={handleSaveCommunicationPreference}
                type="button"
              >
                {isSavingPreferences ? (
                  <LoaderCircle className={styles.spin} size={17} aria-hidden="true" />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {isLoadingPreferences
                  ? "Cargando preferencia"
                  : isSavingPreferences
                    ? "Guardando"
                    : "Guardar preferencia"}
              </button>
            </section>

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
                Ingresa el codigo recibido y crea una nueva contraseña.
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
                  Contraseña
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
                    Olvide mi contraseña
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
                    Nueva contraseña
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
                    Confirmar contraseña
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
                  {isSubmitting ? "Actualizando" : "Cambiar contraseña"}
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
              <form className={`${styles.form} ${styles.registerForm}`} noValidate onSubmit={handleRegisterSubmit}>
                <label className={getRegisterFieldClass("nombreCompleto")}>
                  Nombre completo
                  <span className={styles.inputShell}>
                    <UserRound size={18} aria-hidden="true" />
                    <input
                      aria-invalid={Boolean(registerErrors.nombreCompleto)}
                      name="nombreCompleto"
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
                  {registerErrors.nombreCompleto && <small className={styles.fieldError}>{registerErrors.nombreCompleto}</small>}
                </label>

                <div className={styles.fieldGrid}>
                  <label className={getRegisterFieldClass("email")}>
                    Correo
                    <span className={styles.inputShell}>
                      <Mail size={18} aria-hidden="true" />
                      <input
                        aria-invalid={Boolean(registerErrors.email)}
                        name="email"
                        type="email"
                        value={registerForm.email}
                        onChange={(event) =>
                          updateRegisterField("email", event.target.value)
                        }
                        autoComplete="email"
                        required
                      />
                    </span>
                    {registerErrors.email && <small className={styles.fieldError}>{registerErrors.email}</small>}
                  </label>

                  <label className={getRegisterFieldClass("telefono")}>
                    Telefono
                    <span className={styles.inputShell}>
                      <Phone size={18} aria-hidden="true" />
                      <input
                        aria-invalid={Boolean(registerErrors.telefono)}
                        name="telefono"
                        type="text"
                        value={registerForm.telefono}
                        onChange={(event) =>
                          updateRegisterField(
                            "telefono",
                            normalizePhone(event.target.value),
                          )
                        }
                        autoComplete="tel"
                        inputMode="numeric"
                        maxLength={PHONE_LENGTH}
                        pattern={PHONE_PATTERN}
                        required
                      />
                    </span>
                    {registerErrors.telefono && <small className={styles.fieldError}>{registerErrors.telefono}</small>}
                  </label>
                </div>

                <label className={getRegisterFieldClass("numeroIdentidad")}>
                  Numero de identidad
                  <span className={styles.inputShell}>
                    <IdCard size={18} aria-hidden="true" />
                    <input
                      aria-invalid={Boolean(registerErrors.numeroIdentidad)}
                      name="numeroIdentidad"
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
                  {registerErrors.numeroIdentidad && <small className={styles.fieldError}>{registerErrors.numeroIdentidad}</small>}
                </label>

                <div className={styles.fieldGrid}>
                  <label className={getRegisterFieldClass("departamentoId")}>
                    Departamento
                    <span className={styles.inputShell}>
                      <MapPin size={18} aria-hidden="true" />
                      <select
                        aria-invalid={Boolean(registerErrors.departamentoId)}
                        disabled={isLoadingDepartments}
                        name="departamentoId"
                        onChange={(event) => updateRegisterDepartment(event.target.value)}
                        required
                        value={registerForm.departamentoId}
                      >
                        <option value="">
                          {isLoadingDepartments ? "Cargando..." : "Seleccionar departamento"}
                        </option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>{department.nombre}</option>
                        ))}
                      </select>
                    </span>
                    {registerErrors.departamentoId && <small className={styles.fieldError}>{registerErrors.departamentoId}</small>}
                  </label>

                  <label className={getRegisterFieldClass("municipioId")}>
                    Municipio
                    <span className={styles.inputShell}>
                      <MapPin size={18} aria-hidden="true" />
                      <select
                        aria-invalid={Boolean(registerErrors.municipioId)}
                        disabled={!registerForm.departamentoId || isLoadingMunicipalities}
                        name="municipioId"
                        onChange={(event) => updateRegisterField("municipioId", event.target.value)}
                        required
                        value={registerForm.municipioId}
                      >
                        <option value="">
                          {isLoadingMunicipalities ? "Cargando..." : "Seleccionar municipio"}
                        </option>
                        {municipalities.map((municipality) => (
                          <option key={municipality.id} value={municipality.id}>{municipality.nombre}</option>
                        ))}
                      </select>
                    </span>
                    {registerErrors.municipioId && <small className={styles.fieldError}>{registerErrors.municipioId}</small>}
                  </label>
                </div>

                {locationError && <div className={styles.locationError} role="alert">{locationError}</div>}

                <div className={styles.fieldGrid}>
                  <label className={getRegisterFieldClass("password")}>
                    Contraseña
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        aria-invalid={Boolean(registerErrors.password)}
                        name="password"
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
                    {registerErrors.password && <small className={styles.fieldError}>{registerErrors.password}</small>}
                  </label>

                  <label className={getRegisterFieldClass("passwordConfirmacion")}>
                    Confirmar contraseña
                    <span className={styles.inputShell}>
                      <LockKeyhole size={18} aria-hidden="true" />
                      <input
                        aria-invalid={Boolean(registerErrors.passwordConfirmacion)}
                        name="passwordConfirmacion"
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
                    {registerErrors.passwordConfirmacion && <small className={styles.fieldError}>{registerErrors.passwordConfirmacion}</small>}
                  </label>
                </div>

                <div className={getRegisterFieldClass("aceptaTerminos", styles.checkboxField)}>
                  <input
                    aria-invalid={Boolean(registerErrors.aceptaTerminos)}
                    id="register-terms"
                    name="aceptaTerminos"
                    type="checkbox"
                    checked={registerForm.aceptaTerminos}
                    onChange={(event) =>
                      updateRegisterField("aceptaTerminos", event.target.checked)
                    }
                    required
                  />
                  <span className={styles.consentCopy}>
                    <span>
                      <label htmlFor="register-terms">Acepto los </label>
                      <button
                        className={styles.legalLink}
                        onClick={() => setShowLegalTerms(true)}
                        type="button"
                      >
                        términos y condiciones
                      </button>
                      <label htmlFor="register-terms">.</label>
                    </span>
                    {registerErrors.aceptaTerminos && <small className={styles.fieldError}>{registerErrors.aceptaTerminos}</small>}
                  </span>
                </div>

                <label className={styles.checkboxField}>
                  <input
                    name="aceptaPromociones"
                    type="checkbox"
                    checked={registerForm.aceptaPromociones}
                    onChange={(event) =>
                      updateRegisterField("aceptaPromociones", event.target.checked)
                    }
                  />
                  <span className={styles.consentCopy}>
                    Si, acepto recibir promociones, descuentos e informacion comercial
                    mediante el correo electronico y el numero de telefono proporcionados.
                    <small>Opcional. Puedes retirar esta autorizacion posteriormente.</small>
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

      {showLegalTerms ? (
        <LegalTermsDialog
          company={empresa}
          error={legalNoticeError}
          isLoading={isLoadingLegalNotice}
          notice={legalNotice}
          onClose={() => setShowLegalTerms(false)}
          onRetry={() => setLegalNoticeRequest((current) => current + 1)}
        />
      ) : null}
    </div>
  );
}

export default AuthDialog;
