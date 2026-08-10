import {
  apiGet,
  apiPost,
  apiPostWithMeta,
  hasApiAccessToken,
  refreshApiAccessToken,
  setApiAccessToken,
} from "./apiClient";

export async function loginUsuario(email, password) {
  const payload = await apiPost(
    "/usuarios/login/",
    {
      email: email.trim(),
      password,
    },
    {
      credentials: "include",
    },
  );

  setApiAccessToken(payload?.access);
  return payload;
}

export async function registrarComprador({
  aceptaPrivacidad,
  aceptaTerminos,
  email,
  empresaSlug,
  nombreCompleto,
  numeroIdentidad,
  password,
  passwordConfirmacion,
  telefono,
}) {
  return apiPost("/usuarios/registro-comprador/", {
    empresa_slug: empresaSlug,
    nombre_completo: nombreCompleto.replace(/[^\p{L} ]/gu, "").trim(),
    email: email.trim(),
    telefono: telefono.replace(/\D/g, ""),
    numero_identidad: numeroIdentidad.replace(/\D/g, "").slice(0, 13),
    password,
    password_confirmacion: passwordConfirmacion,
    acepta_terminos: aceptaTerminos === true,
    acepta_privacidad: aceptaPrivacidad === true,
  });
}

export async function verificarCorreo(email, codigo) {
  return apiPost("/usuarios/verificar-correo/", {
    email: email.trim(),
    codigo: String(codigo ?? "").replace(/\D/g, "").slice(0, 6),
  });
}

export async function reenviarVerificacion(email) {
  return apiPostWithMeta("/usuarios/reenviar-verificacion/", {
    email: email.trim(),
  });
}

export async function getMiPerfil() {
  return apiGet("/usuarios/perfiles/mi-perfil/", undefined, {
    auth: true,
  });
}

export async function restoreUsuarioSession() {
  if (!hasApiAccessToken()) {
    const renewedToken = await refreshApiAccessToken();
    if (!renewedToken) {
      return null;
    }
  }

  try {
    const perfil = await getMiPerfil();

    return {
      perfil,
      usuario: perfil?.usuario_detalle || null,
    };
  } catch {
    setApiAccessToken("");
    return null;
  }
}

export async function logoutUsuario() {
  try {
    return await apiPost(
      "/usuarios/token/logout/",
      {},
      {
        credentials: "include",
      },
    );
  } finally {
    setApiAccessToken("");
  }
}
