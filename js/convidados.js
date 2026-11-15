
import { supabase } from "./supabase.js";

// SESSÃO ADMINISTRATIVA
const token = sessionStorage.getItem("admin_token");

const corpo = document.getElementById("corpo");
const busca = document.getElementById("busca");
const filtro = document.getElementById("filtro-status");
const paginas = document.getElementById("paginas");
const contagem = document.getElementById("contagem");
const adicionar = document.getElementById("adicionar");

let convidados = [];
let pagina = 1;
const POR_PAGINA = 3;

const classesStatus = {
  "Confirmado": "confirmado",
  "Pendente": "pendente",
  "Não comparecerá": "ausente"
};

// VERIFICAR LOGIN
if (!token) {
  window.location.replace("login.html");
} else {
  carregarConvidados();
}

// SAIR
document.getElementById("btn-sair").addEventListener(
  "click",
  () => {
    sessionStorage.removeItem("admin_token");
  }
);

// COMUNICAÇÃO COM O SUPABASE
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

  if (data?.erro || data?.error) {
    throw new Error(String(data.erro || data.error));
  }

  return data;
}

// CARREGAR CONVIDADOS
async function carregarConvidados() {
  corpo.innerHTML =
    '<tr><td colspan="3">Carregando convidados...</td></tr>';

  try {
    const resultado = await chamarAdmin("GET");

    if (!Array.isArray(resultado?.convidados)) {
      throw new Error("Resposta inválida do servidor.");
    }

    convidados = resultado.convidados;
    desenhar();

    return true;
  } catch (erro) {
    console.error("Erro ao carregar convidados:", erro);

    corpo.innerHTML =
      '<tr><td colspan="3">Não foi possível carregar os convidados. Verifique sua sessão.</td></tr>';

    contagem.textContent = "Dados indisponíveis";
    paginas.replaceChildren();

    return false;
  }
}

// NORMALIZAR PESQUISA
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// FILTRAR CONVIDADOS
function filtrados() {
  const texto = normalizar(busca.value);

  return convidados.filter(c =>
    normalizar(c.nome).includes(texto) &&
    (!filtro.value || c.status === filtro.value)
  );
}

// DESENHAR TABELA
function desenhar() {
  const todos = filtrados();

  const totalPaginas = Math.max(
    1,
    Math.ceil(todos.length / POR_PAGINA)
  );

  pagina = Math.min(pagina, totalPaginas);

  const inicio = (pagina - 1) * POR_PAGINA;
  const visiveis = todos.slice(
    inicio,
    inicio + POR_PAGINA
  );

  corpo.replaceChildren();

  if (!visiveis.length) {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");

    celula.colSpan = 3;
    celula.textContent = "Nenhum convidado encontrado.";

    linha.appendChild(celula);
    corpo.appendChild(linha);
  }

  visiveis.forEach(convidado => {
    const linha = document.createElement("tr");

    const nome = document.createElement("td");
    nome.textContent = convidado.nome;

    const status = document.createElement("td");
    const etiqueta = document.createElement("span");

    etiqueta.className =
      "etiqueta " +
      (classesStatus[convidado.status] || "");

    etiqueta.textContent = convidado.status;
    status.appendChild(etiqueta);

    const acoes = document.createElement("td");
    acoes.className = "acoes";

    // EDITAR
    const editar = document.createElement("button");
    editar.type = "button";
    editar.title = "Editar";
    editar.setAttribute(
      "aria-label",
      `Editar ${convidado.nome}`
    );
    editar.innerHTML = '<i class="ic ic-edit"></i>';

    editar.addEventListener("click", () => {
      editarConvidado(convidado);
    });

    // EXCLUIR
    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.title = "Excluir";
    excluir.setAttribute(
      "aria-label",
      `Excluir ${convidado.nome}`
    );
    excluir.innerHTML = '<i class="ic ic-trash"></i>';

    excluir.addEventListener("click", () => {
      excluirConvidado(convidado);
    });

    acoes.append(editar, excluir);
    linha.append(nome, status, acoes);
    corpo.appendChild(linha);
  });

  contagem.textContent = todos.length
    ? `Mostrando ${inicio + 1}-${inicio + visiveis.length} de ${todos.length} convidados`
    : "Nenhum convidado encontrado";

  // PAGINAÇÃO
  paginas.replaceChildren();

  function criarBotao(texto, destino, ativo, desativado) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.textContent = texto;
    botao.disabled = desativado;

    if (ativo) botao.className = "atual";

    botao.addEventListener("click", () => {
      pagina = destino;
      desenhar();
    });

    paginas.appendChild(botao);
  }

  criarBotao("‹", pagina - 1, false, pagina === 1);

  for (let i = 1; i <= totalPaginas; i++) {
    criarBotao(String(i), i, i === pagina, false);
  }

  criarBotao("›", pagina + 1, false, pagina === totalPaginas);
}

// EVENTOS DE PESQUISA
busca.addEventListener("input", () => {
  pagina = 1;
  desenhar();
});

filtro.addEventListener("change", () => {
  pagina = 1;
  desenhar();
});

// CADASTRAR CONVIDADO
adicionar.addEventListener("click", async () => {
  const resposta = prompt("Nome do novo convidado:");

  if (resposta === null) return;

  const nome = resposta.trim();

  if (!nome || nome.length > 150) {
    alert("Informe um nome com até 150 caracteres.");
    return;
  }

  adicionar.disabled = true;

  try {
    await chamarAdmin("POST", { nome });

    const atualizado = await carregarConvidados();

    alert(
      atualizado
        ? "Convidado cadastrado com sucesso!"
        : "Cadastro realizado, mas não foi possível atualizar a lista."
    );
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível cadastrar o convidado.");
  } finally {
    adicionar.disabled = false;
  }
});

// EDITAR CONVIDADO
async function editarConvidado(convidado) {
  const resposta = prompt(
    "Novo nome do convidado:",
    convidado.nome
  );

  if (resposta === null) return;

  const nome = resposta.trim();

  if (!nome || nome.length > 150) {
    alert("Informe um nome com até 150 caracteres.");
    return;
  }

  if (nome === convidado.nome) return;

  try {
    await chamarAdmin("PATCH", {
      id: convidado.id,
      nome,
      contato: convidado.contato
    });

    const atualizado = await carregarConvidados();

    alert(
      atualizado
        ? "Convidado atualizado com sucesso!"
        : "Alteração salva, mas não foi possível atualizar a lista."
    );
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível editar o convidado.");
  }
}

// EXCLUIR CONVIDADO
async function excluirConvidado(convidado) {
  const confirmado = confirm(
    `Deseja excluir "${convidado.nome}"?`
  );

  if (!confirmado) return;

  try {
    await chamarAdmin("DELETE", {
      id: convidado.id
    });

    const atualizado = await carregarConvidados();

    alert(
      atualizado
        ? "Convidado excluído com sucesso!"
        : "Exclusão realizada, mas não foi possível atualizar a lista."
    );
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível excluir o convidado.");
  }
}
