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
