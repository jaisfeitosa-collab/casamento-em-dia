
/*
 * Casamento em Dia — RSVP do convidado
 * US04, US05, US06 e US08
 *
 * Integração real com Supabase Edge Functions.
 * Não utiliza dados fictícios.
 * Não permite acompanhantes.
 */

(function () {
  "use strict";

  // ==========================================
  // CONFIGURAÇÃO
  // ==========================================

  const SUPABASE_URL =
    "https://hlwctlmrfubbqoohzird.supabase.co";

  const FUNCAO_RSVP =
    SUPABASE_URL + "/functions/v1/rsvp-convidado";

  const PRAZO_ALTERACAO =
    "2026-11-21T23:59:59-03:00";

  // Deve corresponder ao prazo configurado
  // no secret RSVP_DEADLINE do Supabase.

  // ==========================================
  // ELEMENTOS DA PÁGINA
  // ==========================================

  const el = (id) => document.getElementById(id);

  const form = el("form-rsvp");
  const erro = el("erro-convite");
  const mensagem = el("mensagem");

  let status = null;
  let token = new URLSearchParams(
    window.location.search
  ).get("token");

  let prazoServidorEncerrado = false;
  let enviando = false;

  // ==========================================
  // COMUNICAÇÃO COM SUPABASE
  // ==========================================

  async function chamarRSVP(dados) {
    const resposta = await fetch(FUNCAO_RSVP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    });

    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      throw new Error(
        "Não foi possível interpretar a resposta do servidor."
      );
    }

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        "Não foi possível realizar a operação."
      );
    }

    return resultado;
  }

  async function consultarConvite(tokenConvite) {
    return chamarRSVP({
      acao: "consultar",
      token: tokenConvite
    });
  }

  async function salvarResposta(tokenConvite, novoStatus) {
    return chamarRSVP({
      acao: "responder",
      token: tokenConvite,
      status: novoStatus,
      acompanhantes: 0
    });
  }

  // ==========================================
  // MENSAGENS
  // ==========================================

  function mostrarMensagem(texto, tipo) {
    if (!mensagem) return;

    mensagem.textContent = texto || "";

    mensagem.className =
      "mensagem" + (tipo ? " " + tipo : "");
  }

  // ==========================================
  // PRAZO
  // ==========================================

  function prazoEncerrado() {
    return (
      prazoServidorEncerrado ||
      Date.now() > Date.parse(PRAZO_ALTERACAO)
    );
  }

  // ==========================================
  // ATUALIZAÇÃO DA INTERFACE
  // ==========================================

  function atualizarTela() {
    el("opcao-sim").classList.toggle(
      "ativa",
      status === "confirmado"
    );

    el("opcao-nao").classList.toggle(
      "ativa",
      status === "ausente"
    );

    // O projeto não permite acompanhantes.
    const blocoAcompanhantes =
      el("bloco-acompanhantes");

    if (blocoAcompanhantes) {
      blocoAcompanhantes.classList.add("oculto");
    }

    const qtdAcompanhantes =
      el("qtd-acompanhantes");

    if (qtdAcompanhantes) {
      qtdAcompanhantes.textContent = "0";
    }

    const botaoMenos = el("menos");
    const botaoMais = el("mais");

    if (botaoMenos) botaoMenos.disabled = true;
    if (botaoMais) botaoMais.disabled = true;

    const limite = el("limite-acompanhantes");

    if (limite) {
      limite.textContent =
        "Este convite não permite acompanhantes.";
    }

    el("enviar").disabled =
      enviando || prazoEncerrado();
  }

  // ==========================================
  // CARREGAR CONVITE
  // ==========================================

  async function carregarConvite() {
    if (!token || !token.trim()) {
      erro.classList.remove("oculto");
      mostrarMensagem(
        "O link do convite é inválido.",
        "erro"
      );
      return;
    }

    token = token.trim();

    try {
      mostrarMensagem("Carregando convite...");

      const convidado =
        await consultarConvite(token);

      if (!convidado || !convidado.nome) {
        throw new Error(
          "Convite não encontrado."
        );
      }

      erro.classList.add("oculto");
      form.classList.remove("oculto");

      el("nome-convidado").textContent =
        "Convite de " + convidado.nome;

      el("nome-convidado").classList.remove(
        "oculto"
      );

      // Converte os valores oficiais do banco
      // para os valores utilizados pelo formulário.

      if (
        convidado.status === "Confirmado" ||
        convidado.status === "confirmado"
      ) {
        status = "confirmado";
      } else if (
        convidado.status === "Não comparecerá" ||
        convidado.status === "ausente"
      ) {
        status = "ausente";
      } else {
        status = null;
      }

      prazoServidorEncerrado =
        convidado.prazo_encerrado === true;

      const respostaAtual =
        el("resposta-atual");

      if (respostaAtual) {
        if (status) {
          respostaAtual.classList.remove(
            "oculto"
          );

          respostaAtual.textContent =
            "Sua resposta atual: " +
            (
              status === "confirmado"
                ? "presença confirmada"
                : "você não poderá comparecer"
            ) +
            ".";
        } else {
          respostaAtual.classList.add(
            "oculto"
          );
        }
      }

      if (prazoEncerrado()) {
        mostrarMensagem(
          "O prazo para confirmar ou alterar a presença terminou.",
          "erro"
        );
      } else {
        mostrarMensagem("");
      }

      atualizarTela();

    } catch (e) {
      console.error(
        "Erro ao consultar RSVP:",
        e
      );

      form.classList.add("oculto");
      erro.classList.remove("oculto");

      mostrarMensagem(
        e.message ||
        "Não foi possível carregar o convite.",
        "erro"
      );
    }
  }

  // ==========================================
  // ESCOLHER PRESENÇA
  // ==========================================

  el("opcao-sim").addEventListener(
    "click",
    function () {
      if (prazoEncerrado()) return;

      status = "confirmado";
      mostrarMensagem("");
      atualizarTela();
    }
  );

  el("opcao-nao").addEventListener(
    "click",
    function () {
      if (prazoEncerrado()) return;

      status = "ausente";
      mostrarMensagem("");
      atualizarTela();
    }
  );

  // ==========================================
  // ENVIAR RESPOSTA
  // ==========================================

  form.addEventListener(
    "submit",
    async function (evento) {
      evento.preventDefault();

      if (enviando) return;

      if (!status) {
        mostrarMensagem(
          "Escolha se você poderá comparecer.",
          "erro"
        );
        return;
      }

      if (prazoEncerrado()) {
        mostrarMensagem(
          "O prazo para confirmar ou alterar a presença terminou.",
          "erro"
        );
        return;
      }

      enviando = true;
      atualizarTela();

      try {
        const resultado =
          await salvarResposta(token, status);

        if (!resultado.salvo) {
          throw new Error(
            "Não foi possível confirmar o registro da resposta."
          );
        }

        if (status === "confirmado") {
          mostrarMensagem(
            "Presença confirmada! Obrigado, estamos te esperando.",
            "ok"
          );
        } else {
          mostrarMensagem(
            "Resposta registrada. Sentiremos sua falta!",
            "ok"
          );
        }

        const respostaAtual =
          el("resposta-atual");

        if (respostaAtual) {
          respostaAtual.classList.remove(
            "oculto"
          );

          respostaAtual.textContent =
            "Sua resposta atual: " +
            (
              status === "confirmado"
                ? "presença confirmada."
                : "você não poderá comparecer."
            );
        }

      } catch (e) {
        console.error(
          "Erro ao salvar RSVP:",
          e
        );

        mostrarMensagem(
          e.message ||
          "Não foi possível salvar. Tente novamente.",
          "erro"
        );

      } finally {
        enviando = false;
        atualizarTela();
      }
    }
  );

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================

  if (!form || !erro || !mensagem) {
    console.error(
      "Elementos essenciais do RSVP não encontrados."
    );
    return;
  }

  atualizarTela();
  carregarConvite();

})();
