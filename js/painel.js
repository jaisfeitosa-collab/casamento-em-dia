
import { supabase } from "./supabase.js";

// ========================================
// AUTENTICAÇÃO ADMINISTRATIVA
// ========================================

const token = sessionStorage.getItem("admin_token");

if (!token) {
  window.location.replace("login.html");
} else {
  carregarPainel();
}

// ========================================
// LOGOUT
// ========================================

document.getElementById("btn-sair").addEventListener(
  "click",
  () => {
    sessionStorage.removeItem("admin_token");
  }
);

// ========================================
// DATA ATUAL
// ========================================

document.getElementById("data-hoje").textContent =
  new Date().toLocaleDateString("pt-BR");

// ========================================
// CARREGAR DADOS REAIS
// ========================================

async function carregarPainel() {
  const listaConfirmados =
    document.getElementById("lista-confirmados");

  try {
    const { data, error } =
      await supabase.functions.invoke(
        "admin-convidados",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

    if (error) {
      throw error;
    }

    if (data?.erro || data?.error) {
      throw new Error(
        String(data.erro || data.error)
      );
    }

    if (!data || !Array.isArray(data.convidados)) {
      throw new Error("Resposta inválida do servidor.");
    }

    const convidados = data.convidados;

    // ========================================
    // INDICADORES DE PRESENÇA
    // ========================================

    const total = convidados.length;

    const confirmados = convidados.filter(
      c => c.status === "Confirmado"
    );

    const pendentes = convidados.filter(
      c => c.status === "Pendente"
    );

    const ausentes = convidados.filter(
      c => c.status === "Não comparecerá"
    );

    document.getElementById("ind-total").textContent =
      total;

    document.getElementById("ind-confirmados").textContent =
      confirmados.length;

    document.getElementById("ind-pendentes").textContent =
      pendentes.length;

    document.getElementById("ind-ausentes").textContent =
      ausentes.length;

    document.getElementById("res-total").textContent =
      total;

    // O projeto não permite acompanhantes.
    // Cada confirmação corresponde a uma pessoa.
    document.getElementById("res-previsto").textContent =
      confirmados.length;

    // ========================================
    // NOVOS INDICADORES DE ENVIO
    // ========================================

    const enviados = convidados.filter(
      c => c.convite_enviado === true
    );

    const naoEnviados = convidados.filter(
      c => c.convite_enviado !== true
    );

    document.getElementById("ind-enviados").textContent =
      enviados.length;

    document.getElementById("ind-nao-enviados").textContent =
      naoEnviados.length;

    // ========================================
    // GRÁFICO DE ROSCA
    // ========================================

    const p1 = total
      ? (confirmados.length / total) * 100
      : 0;

    const p2 = total
      ? ((confirmados.length + pendentes.length) / total) * 100
      : 0;

    const rosca = document.getElementById("rosca");

    rosca.style.background =
      `conic-gradient(
        #b86d76 0% ${p1}%,
        #eccfc9 ${p1}% ${p2}%,
        #faf0ef ${p2}% 100%
      )`;

    rosca.setAttribute(
      "aria-label",
      `${confirmados.length} confirmados, ` +
      `${pendentes.length} pendentes e ` +
      `${ausentes.length} ausentes`
    );

    // ========================================
    // LISTA DE CONFIRMADOS
    // ========================================

    listaConfirmados.replaceChildren();

    if (confirmados.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Ninguém confirmou ainda.";
      listaConfirmados.appendChild(item);
    } else {
      confirmados.forEach(convidado => {
        const item = document.createElement("li");
        item.textContent = convidado.nome;
        listaConfirmados.appendChild(item);
      });
    }

  } catch (erro) {
    console.error("Erro ao carregar painel:", erro);

    listaConfirmados.replaceChildren();

    const item = document.createElement("li");
    item.textContent =
      "Não foi possível carregar os dados. " +
      "Verifique sua sessão e tente novamente.";

    listaConfirmados.appendChild(item);
  }
}
