const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export async function pingApi() {
  const res = await fetch(SERVER_URL + "/");
  return res.json();
}
