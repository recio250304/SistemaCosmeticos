const API_URL = "https://sistemacosmeticos.onrender.com";

export async function apiFetch(
  ruta: string,
  opciones: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  const headers = new Headers(opciones.headers);

  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`
    );
  }

  return fetch(
    `${API_URL}${ruta}`,
    {
      ...opciones,
      headers
    }
  );
}