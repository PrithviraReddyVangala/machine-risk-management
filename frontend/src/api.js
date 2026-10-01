import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

export async function getFields() {
  const { data } = await api.get("/fields");
  return data;
}

export async function createField(payload) {
  const { data } = await api.post("/fields", payload);
  return data;
}

export async function updateField(id, payload) {
  const { data } = await api.put(`/fields/${id}`, payload);
  return data;
}

export async function deleteField(id) {
  const { data } = await api.delete(`/fields/${id}`);
  return data;
}

export async function getMachines() {
  const { data } = await api.get("/machines");
  return data;
}

export async function createMachine(values) {
  const { data } = await api.post("/machines", { values });
  return data;
}

export async function updateMachine(id, values) {
  const { data } = await api.put(`/machines/${id}`, { values });
  return data;
}

export async function deleteMachine(id) {
  const { data } = await api.delete(`/machines/${id}`);
  return data;
}

export async function predictMachine(id) {
  const { data } = await api.post(`/machines/${id}/predict`);
  return data;
}
