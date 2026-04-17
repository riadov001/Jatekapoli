// Inject auth token into all API requests
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("tawsila_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
