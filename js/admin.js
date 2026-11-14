
import { supabase } from "./supabase.js";

// Sessão administrativa
const token = sessionStorage.getItem("admin_token");

// Elementos da página
const lista = document.getElementById("lista-convidados");
const formulario = document.getElementById("form-convidado");
const campoNome = document.getElementById("nome");

// Verificar sessão administrativa
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
      item.className = "item-convidado";

      const informacoes = document.createElement("span");
      informacoes.textContent =
        `${convidado.nome} — ${convidado.status}`;

      // Botão Editar
      const botaoEditar = document.createElement("button");
      botaoEditar.type = "button";
      botaoEditar.textContent = "Editar";
      botaoEditar.className = "botao-editar";

      botaoEditar.addEventListener("click", () => {
        editarConvidado(convidado);
      });

      // Botão Excluir
      const botaoExcluir = document.createElement("button");
      botaoExcluir.type = "button";
      botaoExcluir.textContent = "Excluir";
      botaoExcluir.className = "botao-excluir";

      botaoExcluir.addEventListener("click", () => {
        excluirConvidado(convidado);
      });

      item.appendChild(informacoes);
      item.appendChild(botaoEditar);
      item.appendChild(botaoExcluir);

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

// Editar um convidado existente
async function editarConvidado(convidado) {
  const novoNome = prompt(
    "Digite o novo nome do convidado:",
    convidado.nome
  );

  if (novoNome === null) return;

  const nome = novoNome.trim();

  if (!nome) {
    alert("O nome não pode ficar vazio.");
    return;
  }

  if (nome.length > 150) {
    alert("O nome deve ter no máximo 150 caracteres.");
    return;
  }

  if (nome === convidado.nome) return;

  try {
    await chamarAdmin("PATCH", {
      id: convidado.id,
      nome,
      contato: convidado.contato
    });

    await carregarConvidados();

    alert("Convidado atualizado com sucesso!");
  } catch (erro) {
    console.error("Erro ao editar convidado:", erro);

    alert(
      "Não foi possível atualizar o convidado. " +
      "Verifique sua sessão e tente novamente."
    );
  }
}

// Excluir um convidado
async function excluirConvidado(convidado) {
  const confirmar = confirm(
    `Tem certeza que deseja excluir "${convidado.nome}"?`
  );

  if (!confirmar) return;

  try {
    await chamarAdmin("DELETE", {
      id: convidado.id
    });

    await carregarConvidados();

    alert("Convidado excluído com sucesso!");
  } catch (erro) {
    console.error("Erro ao excluir convidado:", erro);

    alert(
      "Não foi possível excluir o convidado. " +
      "Verifique sua sessão e tente novamente."
    );
  }
}
