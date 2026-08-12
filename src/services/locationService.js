import { apiGet, asArray } from "./apiClient";

export async function getActiveDepartments() {
  const payload = await apiGet("/ubicaciones/departamentos/", {
    activo: true,
    orden: "nombre",
    paginar: false,
  });

  return asArray(payload);
}

export async function getActiveMunicipalities(departmentId) {
  if (!departmentId) {
    return [];
  }

  const payload = await apiGet("/ubicaciones/municipios/", {
    activo: true,
    departamento_id: departmentId,
    orden: "nombre",
    paginar: false,
  });

  return asArray(payload);
}
