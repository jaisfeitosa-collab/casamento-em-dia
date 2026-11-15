
/*
 * CASAMENTO EM DIA
 * RSVP do convidado — integração com Supabase
 * Com quantidade de acompanhantes
 */

(function () {
  "use strict";

  const SUPABASE_URL =
    "https://hlwctlmrfubbqoohzird.supabase.co";

  const RSVP_URL =
    SUPABASE_URL + "/functions/v1/rsvp-convidado";

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

  // Elementos dos acompanhantes
  const blocoAcompanhantes = el("bloco-acompanhantes");
  const campoAcompanhantes = el("acompanhantes");
  const limiteAcompanhantes = el("limite-acompanhantes");

  const token = new URLSearchParams(
    window.location.search
  ).get("token")?.trim();

  let statusSelecionado = null;
  let statusSalvo = null;
  let acompanhantesSalvos = 0;
  let maxAcompanhantes = 0;
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
    !botaoEnviar ||
    !blocoAcompanhantes ||
    !campoAcompanhantes ||
    !limiteAcompanhantes
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
    campoAcompanhantes.disabled = bloqueado;

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

  function salvarResposta(status, acompanhantes) {
    return chamarRSVP({
      acao: "responder",
      token: token,
      status: status,
      acompanhantes: acompanhantes
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

  // ==========================================
  // ACOMPANHANTES
  // ==========================================

  function configurarAcompanhantes() {
    campoAcompanhantes.innerHTML = "";

    for (let i = 0; i <= maxAcompanhantes; i++) {
      const opcao = document.createElement("option");

      opcao.value = String(i);

      opcao.textContent =
        i === 0
          ? "Nenhum acompanhante"
          : i === 1
            ? "1 acompanhante"
            : `${i} acompanhantes`;

      campoAcompanhantes.appendChild(opcao);
    }

    limiteAcompanhantes.textContent =
      `Máximo permitido: ${maxAcompanhantes} acompanhante(s).`;
  }

  function atualizarCampoAcompanhantes() {
    const mostrar =
      statusSelecionado === "Confirmado";

    blocoAcompanhantes.classList.toggle(
      "oculto",
      !mostrar
    );

    if (!mostrar) {
      campoAcompanhantes.value = "0";
    }
  }

  function obterQuantidadeAcompanhantes() {
    if (statusSelecionado !== "Confirmado") {
      return 0;
    }

    const quantidade = Number(
      campoAcompanhantes.value
    );

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 0 ||
      quantidade > maxAcompanhantes
    ) {
      throw new Error(
        "Selecione uma quantidade válida de acompanhantes."
      );
    }

    return quantidade;
  }

  // ==========================================
  // SELEÇÃO
  // ==========================================

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

    atualizarCampoAcompanhantes();
  }

  function atualizarRespostaAtual() {
    if (!statusSalvo) {
      respostaAtual.textContent = "";
      respostaAtual.classList.add("oculto");
      return;
    }

    respostaAtual.classList.remove("oculto");

    if (statusSalvo === "Confirmado") {
      respostaAtual.textContent =
        acompanhantesSalvos === 0
          ? "Sua resposta atual: presença confirmada, sem acompanhantes."
          : `Sua resposta atual: presença confirmada com ${acompanhantesSalvos} acompanhante(s).`;
    } else {
      respostaAtual.textContent =
        "Sua resposta atual: você não poderá comparecer.";
    }
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

      maxAcompanhantes =
        Number.isInteger(convidado.max_acompanhantes) &&
        convidado.max_acompanhantes >= 0
          ? convidado.max_acompanhantes
          : 0;

      acompanhantesSalvos =
        Number.isInteger(convidado.acompanhantes) &&
        convidado.acompanhantes >= 0
          ? convidado.acompanhantes
          : 0;

      configurarAcompanhantes();

      campoAcompanhantes.value = String(
        Math.min(acompanhantesSalvos, maxAcompanhantes)
      );

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

      let quantidade;

      try {
        quantidade = obterQuantidadeAcompanhantes();
      } catch (erro) {
        mostrarMensagem(erro.message, "erro");
        return;
      }

      enviando = true;
      atualizarBloqueio();

      mostrarMensagem("Salvando sua resposta...");

      try {
        const resultado = await salvarResposta(
          statusSelecionado,
          quantidade
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

        acompanhantesSalvos =
          Number.isInteger(resultado.acompanhantes)
            ? resultado.acompanhantes
            : quantidade;

        statusSelecionado = statusSalvo;

        campoAcompanhantes.value =
          String(acompanhantesSalvos);

        atualizarSelecao();
        atualizarRespostaAtual();

        if (statusSalvo === "Confirmado") {
          const total = 1 + acompanhantesSalvos;

          mostrarMensagem(
            `Presença confirmada! Total de pessoas neste convite: ${total}.`,
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
