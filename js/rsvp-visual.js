
/*
  CASAMENTO EM DIA
  Confirmação de presença (RSVP)
  Contador de acompanhantes com + e -
*/

(function () {
  "use strict";

  const SUPABASE_URL =
    "https://hlwctlmrfubbqoohzird.supabase.co";

  const RSVP_URL =
    `${SUPABASE_URL}/functions/v1/rsvp-convidado`;

  const PRAZO_ALTERACAO =
    "2026-11-21T23:59:59-03:00";

  const LIMITE_PADRAO = 3;

  const el = (id) => document.getElementById(id);

  // Elementos da página
  const formulario = el("form-rsvp");
  const erroConvite = el("erro-convite");
  const nomeConvidado = el("nome-convidado");
  const respostaAtual = el("resposta-atual");
  const mensagem = el("mensagem");

  const botaoSim = el("opcao-sim");
  const botaoNao = el("opcao-nao");
  const botaoEnviar = el("enviar");

  // Elementos dos acompanhantes
  const blocoAcompanhantes =
    el("bloco-acompanhantes");

  const campoAcompanhantes =
    el("acompanhantes");

  const limiteAcompanhantes =
    el("limite-acompanhantes");

  const botaoDiminuir =
    el("diminuir-acompanhantes");

  const botaoAumentar =
    el("aumentar-acompanhantes");

  const numeroAcompanhantes =
    el("numero-acompanhantes");

  const totalPessoas =
    el("total-pessoas");

  // Token individual
  const token = new URLSearchParams(
    window.location.search
  ).get("token")?.trim();

  // Estado da aplicação
  let statusSelecionado = null;
  let statusSalvo = null;

  let quantidadeAcompanhantes = 0;
  let acompanhantesSalvos = 0;

  let maxAcompanhantes = LIMITE_PADRAO;

  let carregado = false;
  let enviando = false;
  let prazoServidorEncerrado = false;

  // ========================================
  // VERIFICAR ELEMENTOS
  // ========================================

  const elementosObrigatorios = [
    formulario,
    erroConvite,
    nomeConvidado,
    respostaAtual,
    mensagem,
    botaoSim,
    botaoNao,
    botaoEnviar,
    blocoAcompanhantes,
    campoAcompanhantes,
    limiteAcompanhantes,
    botaoDiminuir,
    botaoAumentar,
    numeroAcompanhantes,
    totalPessoas
  ];

  if (
    elementosObrigatorios.some(
      (elemento) => !elemento
    )
  ) {
    console.error(
      "Erro: elementos do RSVP não encontrados."
    );
    return;
  }

  // ========================================
  // MENSAGENS
  // ========================================

  function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto || "";

    mensagem.className =
      `mensagem${tipo ? " " + tipo : ""}`;
  }

  // ========================================
  // PRAZO
  // ========================================

  function prazoEncerrado() {
    return (
      prazoServidorEncerrado ||
      Date.now() > Date.parse(PRAZO_ALTERACAO)
    );
  }

  // ========================================
  // COMUNICAÇÃO COM SUPABASE
  // ========================================

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
      console.error(erro);

      throw new Error(
        "Não foi possível conectar ao servidor."
      );
    }

    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      throw new Error(
        "Resposta inválida do servidor."
      );
    }

    if (!resposta.ok) {
      throw new Error(
        resultado?.erro ||
        resultado?.error ||
        resultado?.message ||
        "Não foi possível realizar a operação."
      );
    }

    return resultado;
  }

  async function consultarConvite() {
    return chamarRSVP({
      acao: "consultar",
      token
    });
  }

  async function salvarResposta(
    status,
    acompanhantes
  ) {
    return chamarRSVP({
      acao: "responder",
      token,
      status,
      acompanhantes
    });
  }

  // ========================================
  // NORMALIZAR STATUS
  // ========================================

  function normalizarStatus(status) {
    if (
      status === "Confirmado" ||
      status === "confirmado"
    ) {
      return "Confirmado";
    }

    if (
      status === "Não comparecerá" ||
      status === "ausente"
    ) {
      return "Não comparecerá";
    }

    return null;
  }

  // ========================================
  // CONTADOR DE ACOMPANHANTES
  // ========================================

  function configurarCampoOculto() {
    campoAcompanhantes.innerHTML = "";

    for (
      let i = 0;
      i <= maxAcompanhantes;
      i++
    ) {
      const opcao =
        document.createElement("option");

      opcao.value = String(i);

      opcao.textContent =
        i === 0
          ? "Nenhum acompanhante"
          : i === 1
            ? "1 acompanhante"
            : `${i} acompanhantes`;

      campoAcompanhantes.appendChild(opcao);
    }

    campoAcompanhantes.value =
      String(quantidadeAcompanhantes);
  }

  function atualizarContadorVisual() {
    numeroAcompanhantes.textContent =
      String(quantidadeAcompanhantes);

    totalPessoas.textContent =
      `Total de pessoas no convite: ${
        quantidadeAcompanhantes + 1
      }`;

    limiteAcompanhantes.textContent =
      `Máximo permitido: ${maxAcompanhantes} acompanhante(s).`;

    campoAcompanhantes.value =
      String(quantidadeAcompanhantes);

    const bloqueado =
      !carregado ||
      enviando ||
      prazoEncerrado() ||
      statusSelecionado !== "Confirmado";

    botaoDiminuir.disabled =
      bloqueado ||
      quantidadeAcompanhantes <= 0;

    botaoAumentar.disabled =
      bloqueado ||
      quantidadeAcompanhantes >= maxAcompanhantes;
  }

  function definirQuantidade(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero)) {
      return;
    }

    quantidadeAcompanhantes = Math.max(
      0,
      Math.min(maxAcompanhantes, numero)
    );

    atualizarContadorVisual();
  }

  function atualizarCampoAcompanhantes() {
    const mostrar =
      statusSelecionado === "Confirmado";

    blocoAcompanhantes.classList.toggle(
      "oculto",
      !mostrar
    );

    atualizarContadorVisual();
  }

  // ========================================
  // BOTÕES + E -
  // ========================================

  botaoAumentar.addEventListener(
    "click",
    function () {
      if (
        !carregado ||
        enviando ||
        prazoEncerrado() ||
        statusSelecionado !== "Confirmado"
      ) {
        return;
      }

      definirQuantidade(
        quantidadeAcompanhantes + 1
      );
    }
  );

  botaoDiminuir.addEventListener(
    "click",
    function () {
      if (
        !carregado ||
        enviando ||
        prazoEncerrado() ||
        statusSelecionado !== "Confirmado"
      ) {
        return;
      }

      definirQuantidade(
        quantidadeAcompanhantes - 1
      );
    }
  );

  // ========================================
  // SELEÇÃO DE PRESENÇA
  // ========================================

  function atualizarSelecao() {
    const confirmado =
      statusSelecionado === "Confirmado";

    const ausente =
      statusSelecionado === "Não comparecerá";

    botaoSim.classList.toggle(
      "ativa",
      confirmado
    );

    botaoNao.classList.toggle(
      "ativa",
      ausente
    );

    botaoSim.setAttribute(
      "aria-pressed",
      String(confirmado)
    );

    botaoNao.setAttribute(
      "aria-pressed",
      String(ausente)
    );

    atualizarCampoAcompanhantes();
  }

  function selecionarStatus(status) {
    if (
      !carregado ||
      enviando ||
      prazoEncerrado()
    ) {
      return;
    }

    const statusAnterior =
      statusSelecionado;

    statusSelecionado = status;

    if (status === "Não comparecerá") {
      definirQuantidade(0);
    }

    if (
      status === "Confirmado" &&
      statusAnterior === "Não comparecerá"
    ) {
      definirQuantidade(0);
    }

    atualizarSelecao();
    mostrarMensagem("");
  }

  botaoSim.addEventListener(
    "click",
    function () {
      selecionarStatus("Confirmado");
    }
  );

  botaoNao.addEventListener(
    "click",
    function () {
      selecionarStatus("Não comparecerá");
    }
  );

  // ========================================
  // RESPOSTA ATUAL
  // ========================================

  function atualizarRespostaAtual() {
    if (!statusSalvo) {
      respostaAtual.textContent = "";
      respostaAtual.classList.add("oculto");
      return;
    }

    respostaAtual.classList.remove("oculto");

    if (statusSalvo === "Confirmado") {
      if (acompanhantesSalvos === 0) {
        respostaAtual.textContent =
          "Sua resposta atual: presença confirmada, sem acompanhantes.";
      } else {
        respostaAtual.textContent =
          `Sua resposta atual: presença confirmada com ${acompanhantesSalvos} acompanhante(s).`;
      }
    } else {
      respostaAtual.textContent =
        "Sua resposta atual: você não poderá comparecer.";
    }
  }

  // ========================================
  // BLOQUEAR CAMPOS
  // ========================================

  function atualizarBloqueio() {
    const bloqueado =
      prazoEncerrado() || enviando;

    botaoSim.disabled = bloqueado;
    botaoNao.disabled = bloqueado;
    botaoEnviar.disabled = bloqueado;

    campoAcompanhantes.disabled =
      bloqueado;

    atualizarContadorVisual();

    if (prazoEncerrado()) {
      mostrarMensagem(
        "O prazo para confirmar ou alterar a presença terminou.",
        "erro"
      );
    }
  }

  // ========================================
  // CARREGAR CONVITE
  // ========================================

  async function carregarConvite() {
    formulario.classList.add("oculto");
    erroConvite.classList.add("oculto");
    nomeConvidado.classList.add("oculto");

    if (!token) {
      erroConvite.classList.remove("oculto");
      return;
    }

    try {
      const convidado =
        await consultarConvite();

      if (!convidado?.nome) {
        throw new Error(
          "Convite não encontrado."
        );
      }

      nomeConvidado.textContent =
        `Convite de ${convidado.nome}`;

      nomeConvidado.classList.remove(
        "oculto"
      );

      statusSalvo = normalizarStatus(
        convidado.status
      );

      statusSelecionado = statusSalvo;

      prazoServidorEncerrado =
        convidado.prazo_encerrado === true;

      // Utiliza o limite informado pelo servidor.
      // Se o campo não vier na resposta,
      // utiliza o limite padrão de 3.
      const limiteServidor =
        Number(convidado.max_acompanhantes);

      maxAcompanhantes =
        convidado.max_acompanhantes != null &&
        Number.isInteger(limiteServidor) &&
        limiteServidor >= 0
          ? limiteServidor
          : LIMITE_PADRAO;

      const quantidadeSalva =
        Number(convidado.acompanhantes);

      acompanhantesSalvos =
        Number.isInteger(quantidadeSalva) &&
        quantidadeSalva >= 0
          ? quantidadeSalva
          : 0;

      quantidadeAcompanhantes =
        statusSalvo === "Confirmado"
          ? Math.min(
              acompanhantesSalvos,
              maxAcompanhantes
            )
          : 0;

      configurarCampoOculto();

      carregado = true;

      atualizarSelecao();
      atualizarRespostaAtual();

      formulario.classList.remove(
        "oculto"
      );

      mostrarMensagem("");
      atualizarBloqueio();

      console.log(
        "Convite carregado.",
        {
          maxAcompanhantes,
          acompanhantesSalvos
        }
      );

    } catch (erro) {
      console.error(
        "Erro ao carregar convite:",
        erro
      );

      carregado = false;

      formulario.classList.add(
        "oculto"
      );

      erroConvite.classList.remove(
        "oculto"
      );
    }
  }

  // ========================================
  // SALVAR RESPOSTA
  // ========================================

  formulario.addEventListener(
    "submit",
    async function (evento) {
      evento.preventDefault();

      if (!carregado || enviando) {
        return;
      }

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

      const quantidade =
        statusSelecionado === "Confirmado"
          ? quantidadeAcompanhantes
          : 0;

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 0 ||
        quantidade > maxAcompanhantes
      ) {
        mostrarMensagem(
          "Quantidade de acompanhantes inválida.",
          "erro"
        );
        return;
      }

      enviando = true;

      atualizarBloqueio();

      mostrarMensagem(
        "Salvando sua resposta..."
      );

      try {
        const resultado =
          await salvarResposta(
            statusSelecionado,
            quantidade
          );

        if (resultado?.salvo !== true) {
          throw new Error(
            "O servidor não confirmou o salvamento."
          );
        }

        const novoStatus =
          normalizarStatus(resultado.status);

        if (!novoStatus) {
          throw new Error(
            "O servidor retornou um status inválido."
          );
        }

        statusSalvo = novoStatus;
        statusSelecionado = novoStatus;

        const quantidadeRetornada =
          Number(resultado.acompanhantes);

        acompanhantesSalvos =
          Number.isInteger(quantidadeRetornada) &&
          quantidadeRetornada >= 0
            ? quantidadeRetornada
            : quantidade;

        if (statusSalvo === "Confirmado") {
          definirQuantidade(
            acompanhantesSalvos
          );
        } else {
          definirQuantidade(0);
        }

        atualizarSelecao();
        atualizarRespostaAtual();

        if (statusSalvo === "Confirmado") {
          const total =
            acompanhantesSalvos + 1;

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

  // ========================================
  // INICIAR
  // ========================================

  atualizarContadorVisual();
  carregarConvite();

})();
