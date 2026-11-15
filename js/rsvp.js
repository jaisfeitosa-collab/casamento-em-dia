import { supabase } from "./supabase.js";

// ========================================
// RSVP DO CONVIDADO - US04, US05, US06 (TASK03)
// ========================================

// Enquanto a função do Supabase não existir, deixe true (usa dados fictícios).
// Quando a função "rsvp-convidado" estiver publicada, troque para false.
USAR_MOCK = false;

// Tokens fictícios para testar: index.html?token=teste-ana
const CONVIDADOS_MOCK = {
  "teste-ana": { nome: "Ana Exemplo", status: "Pendente" },
  "teste-bruno": { nome: "Bruno Exemplo", status: "Confirmado" }
};

const formulario = document.getElementById("form-rsvp");
const mensagem = document.getElementById("rsvp-mensagem");
const campoNome = document.getElementById("nome-convidado");
const respostaAtual = document.getElementById("rsvp-resposta-atual");
const botao = document.getElementById("btn-enviar");

const token = new URLSearchParams(window.location.search).get("token");

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
  mensagem.hidden = false;
}

// ---------- Comunicação (real ou mock) ----------

async function buscarConvite(token) {
  if (USAR_MOCK) {
    const c = CONVIDADOS_MOCK[token];
    return c ? { sucesso: true, ...c } : { sucesso: false };
  }
  const { data, error } = await supabase.functions.invoke("rsvp-convidado", {
    body: { acao: "buscar", token }
  });
  if (error) throw error;
  return data;
}

async function enviarResposta(token, status) {
  if (USAR_MOCK) {
    if (!CONVIDADOS_MOCK[token]) return { sucesso: false };
    CONVIDADOS_MOCK[token].status = status;
    return { sucesso: true, status };
  }
  const { data, error } = await supabase.functions.invoke("rsvp-convidado", {
    body: { acao: "responder", token, status }
  });
  if (error) throw error;
  return data;
}

// ---------- Tela ----------

function mostrarStatusAtual(status) {
  if (status === "Pendente") {
    respostaAtual.hidden = true;
    return;
  }
  respostaAtual.textContent = `Sua resposta atual: ${status}. Você pode alterá-la abaixo.`;
  respostaAtual.hidden = false;
  const marcado = formulario.querySelector(`input[name="presenca"][value="${status}"]`);
  if (marcado) marcado.checked = true;
}

async function iniciar() {
  if (!token) {
    mostrarMensagem("Link inválido. Use o link individual que você recebeu no convite.");
    return;
  }
  try {
    const convite = await buscarConvite(token);
    if (!convite?.sucesso) {
      mostrarMensagem("Convite não encontrado. Confira o link ou fale com os noivos.");
      return;
    }
    campoNome.textContent = convite.nome;
    mostrarStatusAtual(convite.status);
    mensagem.hidden = true;
    formulario.hidden = false;
  } catch {
    mostrarMensagem("Não foi possível carregar o convite. Tente novamente mais tarde.");
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const escolha = formulario.querySelector('input[name="presenca"]:checked');
  if (!escolha) return;

  botao.disabled = true;
  botao.textContent = "Enviando...";
  try {
    const resultado = await enviarResposta(token, escolha.value);
    if (!resultado?.sucesso) {
      mostrarMensagem("Não foi possível registrar sua resposta. Tente novamente.");
      return;
    }
    formulario.hidden = true;
    mostrarMensagem(
      escolha.value === "Confirmado"
        ? "Presença confirmada! Obrigado, estamos ansiosos para celebrar com você."
        : "Resposta registrada. Sentiremos sua falta, obrigado por avisar."
    );
  } catch {
    mostrarMensagem("Erro de conexão. Tente novamente.");
  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar confirmação";
  }
});

iniciar();
