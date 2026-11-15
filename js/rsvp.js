
/*
 * Casamento em Dia — RSVP do convidado
 * US04, US05, US06 e US08
 *
 * Integração com Supabase Edge Functions.
 * Sem dados fictícios.
 * Sem acompanhantes.
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

  // O prazo também deve estar configurado
  // no servidor, no secret RSVP_DEADLINE.

  // ==========================================
  // ELEMENTOS
  // ==========================================

  function el(id) {
    return document.getElementById(id);
  }

  const form = el("form-rsvp");
  const erro = el("erro-convite");
  const mensagem = el("mensagem");

  const botaoSim = el("opcao-sim");
  const botaoNao = el("opcao-nao");
  const botaoEnviar = el("enviar");

  const nomeConvidado = el("nome-convidado");
  const respostaAtual = el("resposta-atual");

  let status = null;
  let enviando = false;
  let carregando = true;
  let prazoServidorEncerrado = false;

  let token = new URLSearchParams(
    window.location.search
  ).get("token");

  // ==========================================
  // FUNÇÕES AUXILIARES
  // ==========================================

  function mostrarMensagem(texto, tipo) {
    if (!mensagem) {
      console.log(texto);
      return;
    }

    mensagem.textContent = texto || "";
    mensagem.className =
      "mensagem" + (tipo ? " " + tipo : "");
  }

  function mostrarErroConvite(texto) {
    if (form) {
      form.classList.add("oculto");
    }

    if (erro) {
      erro.classList.remove("oculto");
    }

    mostrarMensagem(texto, "erro");
  }

  function prazoEncerrado() {
    return (
      prazoServidorEncerrado ||
      Date.now() > Date.parse(PRAZO_ALTERACAO)
    );
  }

  function normalizarStatus(valor) {
    if (
      valor === "Confirmado" ||
      valor === "confirmado"
    ) {
      return "confirmado";
    }

    if (
      valor === "Não comparecerá" ||
      valor === "ausente"
    ) {
      return "ausente";
    }

    return null;
  }

  // ==========================================
  // COMUNICAÇÃO COM SUPABASE
  // ==========================================

  async function chamarRSVP(dados) {
    let resposta;

    try {
      resposta = await fetch(FUNCAO_RSVP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });
    } catch (e) {
      console.error("Erro de conexão:", e);

      throw new Error(
        "Não foi possível conectar ao servidor."
      );
    }

    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      throw new Error(
        "O servidor retornou uma resposta inválida."
      );
    }

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        resultado.message ||
        "Não foi possível concluir a operação."
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
  // ATUALIZAR TELA
  // ==========================================

  function atualizarTela() {
    if (botaoSim) {
      botaoSim.classList.toggle(
        "ativa",
        status === "confirmado"
      );
    }

    if (botaoNao) {
      botaoNao.classList.toggle(
        "ativa",
        status === "ausente"
      );
    }

    // Acompanhantes não são permitidos.

    const blocoAcompanhantes =
      el("bloco-acompanhantes");

    if (blocoAcompanhantes) {
      blocoAcompanhantes.classList.add("oculto");
      blocoAcompanhantes.style.display = "none";
    }

    const quantidade = el("qtd-acompanhantes");

    if (quantidade) {
      quantidade.textContent = "0";
    }

    const menos = el("menos");
    const mais = el("mais");

    if (menos) {
      menos.disabled = true;
    }

    if (mais) {
      mais.disabled = true;
    }

    const limite = el("limite-acompanhantes");

    if (limite) {
      limite.textContent =
        "Este convite não permite acompanhantes.";
    }

    if (botaoEnviar) {
      botaoEnviar.disabled =
        enviando ||
        carregando ||
        prazoEncerrado();
    }
  }

  // ==========================================
  // MOSTRAR RESPOSTA ATUAL
  // ==========================================

  function atualizarRespostaAtual() {
    if (!respostaAtual) return;

    if (!status) {
      respostaAtual.classList.add("oculto");
      return;
    }

    respostaAtual.classList.remove("oculto");

    if (status === "confirmado") {
      respostaAtual.textContent =
        "Sua resposta atual: presença confirmada.";
    } else {
      respostaAtual.textContent =
        "Sua resposta atual: você não poderá comparecer.";
    }
  }

  // ==========================================
  // CARREGAR CONVITE
  // ==========================================

  async function carregarConvite() {
    if (!token || !token.trim()) {
      carregando = false;

      mostrarErroConvite(
        "Link de convite inválido ou sem token."
      );

      atualizarTela();
      return;
    }

    token = token.trim();

    mostrarMensagem("Carregando convite...");

    try {
      const convidado =
        await consultarConvite(token);

      if (!convidado || !convidado.nome) {
        throw new Error(
          "Convite não encontrado."
        );
      }

      // Exibir formulário

      if (erro) {
        erro.classList.add("oculto");
      }

      if (form) {
        form.classList.remove("oculto");
      }

      if (nomeConvidado) {
        nomeConvidado.textContent =
          "Convite de " + convidado.nome;

        nomeConvidado.classList.remove(
          "oculto"
        );
      }

      status = normalizarStatus(
        convidado.status
      );

      prazoServidorEncerrado =
        convidado.prazo_encerrado === true;

      atualizarRespostaAtual();

      if (prazoEncerrado()) {
        mostrarMensagem(
          "O prazo para confirmar ou alterar a presença terminou.",
          "erro"
        );
      } else {
        mostrarMensagem("");
      }

      console.log(
        "Convite consultado com sucesso."
      );

    } catch (e) {
      console.error(
        "Erro ao carregar convite:",
        e
      );

      mostrarErroConvite(
        e.message ||
        "Não foi possível carregar o convite."
      );

    } finally {
      carregando = false;
      atualizarTela();
    }
  }

  // ==========================================
  // SELEÇÃO DE PRESENÇA
  // ==========================================

  if (botaoSim) {
    botaoSim.addEventListener(
      "click",
      function (evento) {
        evento.preventDefault();

        if (
          carregando ||
          enviando ||
          prazoEncerrado()
        ) {
          return;
        }

        status = "confirmado";

        mostrarMensagem("");
        atualizarTela();
      }
    );
  } else {
    console.warn(
      "Elemento opcao-sim não encontrado no HTML."
    );
  }

  if (botaoNao) {
    botaoNao.addEventListener(
      "click",
      function (evento) {
        evento.preventDefault();

        if (
          carregando ||
          enviando ||
          prazoEncerrado()
        ) {
          return;
        }

        status = "ausente";

        mostrarMensagem("");
        atualizarTela();
      }
    );
  } else {
    console.warn(
      "Elemento opcao-nao não encontrado no HTML."
    );
  }

  // ==========================================
  // ENVIO DA RESPOSTA
  // ==========================================

  if (form) {
    form.addEventListener(
      "submit",
      async function (evento) {
        evento.preventDefault();

        if (enviando || carregando) {
          return;
        }

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

        mostrarMensagem(
          "Salvando sua resposta..."
        );

        try {
          const resultado =
            await salvarResposta(token, status);

          if (resultado.salvo !== true) {
            throw new Error(
              "O servidor não confirmou o salvamento."
            );
          }

          status = normalizarStatus(
            resultado.status
          ) || status;

          atualizarRespostaAtual();

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
  } else {
    console.warn(
      "Formulário form-rsvp não encontrado no HTML."
    );
  }

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================

  function iniciar() {
    if (!form || !erro || !mensagem) {
      console.error(
        "O HTML não contém todos os elementos essenciais do RSVP."
      );

      mostrarErroConvite(
        "O formulário está indisponível. Verifique a configuração da página."
      );

      return;
    }

    atualizarTela();
    carregarConvite();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );
  } else {
    iniciar();
  }

})();
