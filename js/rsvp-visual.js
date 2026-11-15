
/*
 * CASAMENTO EM DIA
 * RSVP do convidado — integração com Supabase
 * Compatível com o rsvp.html de Isadora
 * Sem acompanhantes e sem dados fictícios
 */

(function () {
  "use strict";

  const SUPABASE_URL =
    "https://hlwctlmrfubbqoohzird.supabase.co";

  const RSVP_URL =
    SUPABASE_URL + "/functions/v1/rsvp-convidado";

  // Prazo exibido na interface.
  // O servidor também deve validar esse prazo.
  const PRAZO_ALTERACAO =
    "2026-11-21T23:59:59-03:00";

  const el = (id) => document.getElementById(id);

  const formulario = el("form-rsvp");
  const erroConvite = el("erro-convite");
  const nomeConvidado = el("nome-convidado");
  const respostaAtual = el("resposta-atual");
  const mensagem = el("mensagem");
  const botaoSim = el("opcao-sim");
  const botaoNao = el("opcao-nao");
  const botaoEnviar = el("enviar");

  const token = new URLSearchParams(
    window.location.search
  ).get("token")?.trim();

  let statusSelecionado = null;
  let statusSalvo = null;
  let carregado = false;
  let enviando = false;
  let prazoServidorEncerrado = false;

  if (
    !formulario ||
    !erroConvite ||
    !nomeConvidado ||
    !respostaAtual ||
    !mensagem ||
    !botaoSim ||
    !botaoNao ||
    !botaoEnviar
  ) {
    console.error(
      "Elementos da página RSVP não encontrados."
    );
    return;
  }

  // ==========================================
  // MENSAGENS
  // ==========================================

  function mostrarMensagem(texto, tipo = "") {
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

  function atualizarBloqueio() {
    const bloqueado = prazoEncerrado() || enviando;

    botaoSim.disabled = bloqueado;
    botaoNao.disabled = bloqueado;
    botaoEnviar.disabled = bloqueado;

    if (prazoEncerrado()) {
      mostrarMensagem(
        "O prazo para confirmar ou alterar a presença terminou.",
        "erro"
      );
    }
  }

  // ==========================================
  // SUPABASE
  // ==========================================

  async function chamarRSVP(dados) {
    let resposta;

    try {
      resposta = await fetch(RSVP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });
    } catch (erro) {
      console.error("Erro de conexão:", erro);
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
        resultado?.erro ||
        resultado?.error ||
        resultado?.message ||
        "Não foi possível concluir a operação."
      );
    }

    return resultado;
  }

  function consultarConvite() {
    return chamarRSVP({
      acao: "consultar",
      token: token
    });
  }

  function salvarResposta(status) {
    return chamarRSVP({
      acao: "responder",
      token: token,
      status: status,
      acompanhantes: 0
    });
  }

  // ==========================================
  // STATUS
  // ==========================================

  function normalizarStatus(valor) {
    if (
      valor === "Confirmado" ||
      valor === "confirmado"
    ) {
      return "Confirmado";
    }

    if (
      valor === "Não comparecerá" ||
      valor === "ausente"
    ) {
      return "Não comparecerá";
    }

    return null;
  }

  function atualizarSelecao() {
    botaoSim.classList.toggle(
      "ativa",
      statusSelecionado === "Confirmado"
    );

    botaoNao.classList.toggle(
      "ativa",
      statusSelecionado === "Não comparecerá"
    );

    botaoSim.setAttribute(
      "aria-pressed",
      String(statusSelecionado === "Confirmado")
    );

    botaoNao.setAttribute(
      "aria-pressed",
      String(statusSelecionado === "Não comparecerá")
    );
  }

  function atualizarRespostaAtual() {
    if (!statusSalvo) {
      respostaAtual.textContent = "";
      respostaAtual.classList.add("oculto");
      return;
    }

    respostaAtual.classList.remove("oculto");

    respostaAtual.textContent =
      statusSalvo === "Confirmado"
        ? "Sua resposta atual: presença confirmada."
        : "Sua resposta atual: você não poderá comparecer.";
  }

  function selecionarStatus(status) {
    if (!carregado || prazoEncerrado() || enviando) {
      return;
    }

    statusSelecionado = status;
    atualizarSelecao();
    mostrarMensagem("");
  }

  // ==========================================
  // CONSULTAR CONVITE
  // ==========================================

  async function carregarConvite() {
    formulario.classList.add("oculto");
    erroConvite.classList.add("oculto");
    nomeConvidado.classList.add("oculto");

    if (!token) {
      erroConvite.classList.remove("oculto");
      return;
    }

    mostrarMensagem("Carregando convite...");

    try {
      const convidado = await consultarConvite();

      if (!convidado || !convidado.nome) {
        throw new Error("Convite não encontrado.");
      }

      nomeConvidado.textContent =
        "Convite de " + convidado.nome;

      nomeConvidado.classList.remove("oculto");

      statusSalvo = normalizarStatus(
        convidado.status
      );

      statusSelecionado = statusSalvo;

      prazoServidorEncerrado =
        convidado.prazo_encerrado === true;

      carregado = true;

      atualizarSelecao();
      atualizarRespostaAtual();

      formulario.classList.remove("oculto");

      mostrarMensagem("");
      atualizarBloqueio();

      console.log("Convite carregado com sucesso.");

    } catch (erro) {
      console.error(
        "Erro ao consultar convite:",
        erro
      );

      carregado = false;
      formulario.classList.add("oculto");
      erroConvite.classList.remove("oculto");

      mostrarMensagem(
        erro.message ||
        "Não foi possível carregar o convite.",
        "erro"
      );
    }
  }

  // ==========================================
  // BOTÕES DE PRESENÇA
  // ==========================================

  botaoSim.addEventListener("click", function () {
    selecionarStatus("Confirmado");
  });

  botaoNao.addEventListener("click", function () {
    selecionarStatus("Não comparecerá");
  });

  // ==========================================
  // SALVAR RESPOSTA
  // ==========================================

  formulario.addEventListener(
    "submit",
    async function (evento) {
      evento.preventDefault();

      if (!carregado || enviando) return;

      if (prazoEncerrado()) {
        atualizarBloqueio();
        return;
      }

      if (!statusSelecionado) {
        mostrarMensagem(
          "Selecione se você poderá comparecer.",
          "erro"
        );
        return;
      }

      enviando = true;
      atualizarBloqueio();

      mostrarMensagem("Salvando sua resposta...");

      try {
        const resultado = await salvarResposta(
          statusSelecionado
        );

        if (resultado?.salvo !== true) {
          throw new Error(
            "O servidor não confirmou o salvamento."
          );
        }

        statusSalvo = normalizarStatus(
          resultado.status
        );

        if (!statusSalvo) {
          throw new Error(
            "O servidor retornou um status inválido."
          );
        }

        statusSelecionado = statusSalvo;

        atualizarSelecao();
        atualizarRespostaAtual();

        if (statusSalvo === "Confirmado") {
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

      } catch (erro) {
        console.error(
          "Erro ao salvar resposta:",
          erro
        );

        mostrarMensagem(
          erro.message ||
          "Não foi possível salvar sua resposta.",
          "erro"
        );

      } finally {
        enviando = false;
        atualizarBloqueio();
      }
    }
  );

  // ==========================================
  // INICIAR
  // ==========================================

  carregarConvite();

})();
