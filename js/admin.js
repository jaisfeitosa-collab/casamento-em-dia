
import { supabase } from "./supabase.js";

// ========================================
// SESSÃO ADMINISTRATIVA
// ========================================

const token = sessionStorage.getItem("admin_token");

// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const lista = document.getElementById("lista-convidados");
const formulario = document.getElementById("form-convidado");
const campoNome = document.getElementById("nome");

const campoBusca = document.getElementById("busca-convidado");
const filtroStatus = document.getElementById("filtro-status");

// Armazena os convidados carregados do Supabase
let convidados = [];

// Verificar sessão administrativa
if (!token) {
  window.location.replace("login.html");
} else {
  carregarConvidados();
}

// ========================================
// COMUNICAÇÃO COM O SUPABASE
// ========================================

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

// ========================================
// CARREGAR CONVIDADOS
// ========================================

async function carregarConvidados() {
  lista.textContent = "Carregando convidados...";

  try {
    const resultado = await chamarAdmin("GET");

    convidados = resultado.convidados ?? [];

    // Atualiza a lista respeitando os filtros
    aplicarFiltros();

  } catch (erro) {
    console.error("Erro ao carregar convidados:", erro);

    lista.textContent =
      "Não foi possível carregar os convidados. " +
      "Verifique sua sessão e tente novamente.";
  }
}

// ========================================
// PESQUISA E FILTROS - US09
// ========================================

function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function aplicarFiltros() {
  const busca = normalizarTexto(campoBusca.value);
  const statusSelecionado = filtroStatus.value;

  const convidadosFiltrados = convidados.filter((convidado) => {

    // Pesquisa pelo nome
    const correspondeNome = normalizarTexto(
      convidado.nome
    ).includes(busca);

    // Filtro pelo status
    const correspondeStatus =
      statusSelecionado === "Todos" ||
      convidado.status === statusSelecionado;

    return correspondeNome && correspondeStatus;
  });

  renderizarConvidados(convidadosFiltrados);
}

// Atualizar resultados enquanto o usuário digita
campoBusca.addEventListener("input", aplicarFiltros);

// Atualizar resultados quando o status mudar
filtroStatus.addEventListener("change", aplicarFiltros);

// ========================================
// EXIBIR CONVIDADOS NA TELA
// ========================================

function renderizarConvidados(convidadosFiltrados) {
  lista.replaceChildren();

  if (convidados.length === 0) {
    lista.textContent = "Nenhum convidado cadastrado.";
    return;
  }

  if (convidadosFiltrados.length === 0) {
    lista.textContent =
      "Nenhum convidado encontrado para os filtros selecionados.";
    return;
  }

  for (const convidado of convidadosFiltrados) {

    const item = document.createElement("div");
    item.className = "item-convidado";

    // Informações do convidado
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
}

// ========================================
// CADASTRAR CONVIDADO - US01
// ========================================

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

// ========================================
// EDITAR CONVIDADO - US02
// ========================================

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

// ========================================
// EXCLUIR CONVIDADO - US03
// ========================================

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
