
import { supabase } from "./supabase.js";

const token = sessionStorage.getItem("admin_token");
const lista = document.getElementById("lista-convidados");

if (!token) {
  window.location.replace("login.html");
} else {
  carregarConvidados();
}

async function chamarAdmin(metodo, dados = null) {
  const { data, error } = await supabase.functions.invoke(
    "admin-convidados",
    {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`
      },
      ...(dados !== null ? { body: dados } : {})
    }
  );

  if (error) throw error;
  return data;
}

async function carregarConvidados() {
  lista.textContent = "Carregando convidados...";

  try {
    const resultado = await chamarAdmin("GET");
    lista.replaceChildren();

    if (!resultado.convidados?.length) {
      lista.textContent = "Nenhum convidado cadastrado.";
      return;
    }

    for (const convidado of resultado.convidados) {
      const item = document.createElement("div");
      item.textContent =
        `${convidado.nome} — ${convidado.status}`;
      lista.appendChild(item);
    }
  } catch {
    lista.textContent =
      "Não foi possível carregar os convidados. " +
      "Faça login novamente.";
  }
}
