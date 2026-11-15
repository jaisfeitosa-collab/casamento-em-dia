
/*
 * CASAMENTO EM DIA
 * RSVP DO CONVIDADO — US04, US05, US06, US08
 *
 * Integração com Supabase Edge Function.
 * Compatível com o index.html de Isadora.
 * Sem acompanhantes e sem dados fictícios.
 */

(function () {
  "use strict";

  // ==========================================
  // CONFIGURAÇÕES
  // ==========================================

  const SUPABASE_URL =
    "https://hlwctlmrfubbqoohzird.supabase.co";

  const RSVP_URL =
    SUPABASE_URL + "/functions/v1/rsvp-convidado";

  const PRAZO_ALTERACAO =
    "2026-11-21T23:59:59-03:00";

  // O prazo deve ser igual ao secret
  // RSVP_DEADLINE da Edge Function.

  // ==========================================
  // ELEMENTOS DO HTML
  // ==========================================

  const el = (id) => document.getElementById(id);

  const mensagem = el("rsvp-mensagem");
  const boasVindas = el("boas-vindas");
  const nomeConvidado = el("nome-convidado");
  const botaoComecar = el("btn-comecar");

  const formulario = el("form-rsvp");
  const botaoEnviar = el("btn-enviar");
  const respostaAtual = el("rsvp-resposta-atual");

  const radios = document.querySelectorAll(
    'input[name="presenca"]'
  );

  const token = new URLSearchParams(
    window.location.search
  ).get("token")?.trim();

  let carregado = false;
  let enviando = false;
  let statusSalvo = null;
  let prazoServidorEncerrado = false;

  // ==========================================
  // VERIFICAR ELEMENTOS
  // ==========================================

  if (
    !mensagem ||
    !boasVindas ||
    !nomeConvidado ||
    !botaoComecar ||
    !formulario ||
    !botaoEnviar ||
    !respostaAtual ||
    radios.length !== 2
  ) {
    console.error(
      "Erro: elementos do formulário RSVP não encontrados."
    );
    return;
  }

  // ==========================================
  // MENSAGENS
  // ==========================================

  function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto || "";

    mensagem.className =
      "rsvp-mensagem" + (tipo ? " " + tipo : "");

    mensagem.hidden = !texto;
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

  function atualizarPrazo() {
    const encerrado = prazoEncerrado();

    botaoEnviar.disabled = encerrado || enviando;

    radios.forEach(function (radio) {
      radio.disabled = encerrado || enviando;
    });

    if (encerrado) {
      mostrarMensagem(
        "O prazo para confirmar ou alterar a presença terminou.",
        "erro"
      );
    }
  }

  // ==========================================
  // COMUNICAÇÃO COM SUPABASE
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
        resultado.erro ||
        resultado.message ||
        "Não foi possível concluir a operação."
      );
    }

    return resultado;
  }

  async function consultarConvite() {
    return chamarRSVP({
      acao: "consultar",
      token: token
    });
  }

  async function salvarResposta(novoStatus) {
    return chamarRSVP({
      acao: "responder",
      token: token,
      status: novoStatus,
      acompanhantes: 0
    });
  }

  // ==========================================
  // NORMALIZAR STATUS
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
  // RESPOSTA ATUAL
  // ==========================================

  function atualizarRespostaAtual() {
    if (!statusSalvo) {
      respostaAtual.hidden = true;
      return;
    }

    respostaAtual.hidden = false;

    if (statusSalvo === "Confirmado") {
      respostaAtual.textContent =
        "Sua resposta atual: presença confirmada.";
    } else {
      respostaAtual.textContent =
        "Sua resposta atual: você não poderá comparecer.";
    }
  }

  function selecionarResposta(valor) {
    radios.forEach(function (radio) {
      radio.checked = radio.value === valor;
    });
  }

  // ==========================================
  // CARREGAR CONVITE
  // ==========================================

  async function carregarConvite() {
    boasVindas.hidden = true;
    formulario.hidden = true;

    if (!token) {
      mostrarMensagem(
        "Este link não contém um convite válido.",
        "erro"
      );
      return;
    }

    mostrarMensagem("Carregando seu convite...");

    try {
      const convidado = await consultarConvite();

      if (!convidado || !convidado.nome) {
        throw new Error(
          "Convite não encontrado."
        );
      }

      nomeConvidado.textContent = convidado.nome;

      statusSalvo = normalizarStatus(
        convidado.status
      );

      prazoServidorEncerrado =
        convidado.prazo_encerrado === true;

      selecionarResposta(statusSalvo);
      atualizarRespostaAtual();

      carregado = true;

      boasVindas.hidden = false;
      formulario.hidden = true;

      mostrarMensagem("");

      console.log(
        "Convite carregado com sucesso."
      );

    } catch (erro) {
      console.error(
        "Erro ao consultar convite:",
        erro
      );

      boasVindas.hidden = true;
      formulario.hidden = true;

      mostrarMensagem(
        erro.message ||
        "Não foi possível carregar o convite.",
        "erro"
      );
    }
  }

  // ==========================================
  // BOTÃO COMEÇAR
  // ==========================================

  botaoComecar.addEventListener(
    "click",
    function () {
      if (!carregado) return;

      boasVindas.hidden = true;
      formulario.hidden = false;

      atualizarRespostaAtual();
      atualizarPrazo();

      if (!prazoEncerrado()) {
        mostrarMensagem("");
      }
    }
  );

  // ==========================================
  // ENVIAR RESPOSTA
  // ==========================================

  formulario.addEventListener(
    "submit",
    async function (evento) {
      evento.preventDefault();

      if (!carregado || enviando) {
        return;
      }

      if (prazoEncerrado()) {
        mostrarMensagem(
          "O prazo para confirmar ou alterar a presença terminou.",
          "erro"
        );
        return;
      }

      const selecionado = document.querySelector(
        'input[name="presenca"]:checked'
      );

      if (!selecionado) {
        mostrarMensagem(
          "Selecione se você poderá comparecer.",
          "erro"
        );
        return;
      }

      const novoStatus = normalizarStatus(
        selecionado.value
      );

      if (!novoStatus) {
        mostrarMensagem(
          "Resposta inválida.",
          "erro"
        );
        return;
      }

      enviando = true;
      botaoEnviar.disabled = true;

      mostrarMensagem("Salvando sua resposta...");

      try {
        const resultado = await salvarResposta(
          novoStatus
        );

        if (resultado.salvo !== true) {
          throw new Error(
            "O servidor não confirmou o salvamento."
          );
        }

        statusSalvo = normalizarStatus(
          resultado.status
        );

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

        console.log(
          "Resposta registrada com sucesso."
        );

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
        atualizarPrazo();
      }
    }
  );

  // ==========================================
  // INICIAR
  // ==========================================

  carregarConvite();

})();
