
import { supabase } from "./supabase.js";

// Sessão administrativa
const token = sessionStorage.getItem("admin_token");

// Elementos da página
const lista = document.getElementById("lista-convidados");
const formulario = document.getElementById("form-convidado");
const campoNome = document.getElementById("nome");

// Verificar se existe uma sessão
if (!token) {
  window.location.replace("login.html");
} else {
  carregarConvidados();
}

// Comunicação com a função administrativa
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

// Carregar a lista de convidados
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
  } catch (erro) {
    console.error("Erro ao carregar convidados:", erro);

    lista.textContent =
      "Não foi possível carregar os convidados. " +
      "Verifique sua sessão e tente novamente.";
  }
}

// Cadastrar um novo convidado
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = campoNome.value.trim();

  if (!nome) {
    alert("Informe o nome do convidado.");
    return;
  }

  if (nome.length > 150) {
    alert("O nome deve ter no máximo 150 caracteres.");
    return;
  }

  const botao = formulario.querySelector(
    'button[type="submit"], button'
  );

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Cadastrando...";
  }

  try {
    await chamarAdmin("POST", { nome });

    formulario.reset();

    await carregarConvidados();

    alert("Convidado cadastrado com sucesso!");
  } catch (erro) {
    console.error("Erro ao cadastrar convidado:", erro);

    alert(
      "Não foi possível cadastrar o convidado. " +
      "Verifique sua sessão e tente novamente."
    );
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Cadastrar convidado";
    }
  }
});
