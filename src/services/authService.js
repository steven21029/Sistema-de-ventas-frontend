import {
  apiGet,
  apiPost,
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
    nombre_completo: nombreCompleto.trim(),
    email: email.trim(),
    telefono: telefono.trim(),
    numero_identidad: numeroIdentidad.trim(),
    password,
    password_confirmacion: passwordConfirmacion,
    acepta_terminos: aceptaTerminos === true,
    acepta_privacidad: aceptaPrivacidad === true,
  });
}

export async function verificarCorreo(email, codigo) {
  return apiPost("/usuarios/verificar-correo/", {
    email: email.trim(),
    codigo: codigo.trim(),
  });
}

export async function reenviarVerificacion(email) {
  return apiPost("/usuarios/reenviar-verificacion/", {
    email: email.trim(),
  });
}

export async function getMiPerfil() {
  return apiGet("/usuarios/perfiles/mi-perfil/", undefined, {
    auth: true,
  });
}

export async function restoreUsuarioSession() {
  const renewedToken = await refreshApiAccessToken();

  if (!renewedToken) {
    return null;
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
