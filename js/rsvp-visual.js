// RSVP do convidado (US04–US08) — versão com DADOS FICTÍCIOS (mock).
// Depois da integração, troque apenas as duas funções da seção "ACESSO AOS DADOS"
// para chamarem a Edge Function rsvp-convidado do Supabase.
// Precisa de js/dados-mock.js carregado antes.

(function () {
  // ---------- CONFIGURAÇÃO (decisões pendentes com a equipe) ----------
  var MAX_ACOMPANHANTES = 2;   // máximo de acompanhantes por convite
  var PRAZO_ALTERACAO = null;  // ex.: "2026-11-25T23:59:59-03:00" (null = sem prazo)
  // --------------------------------------------------------------------

  // ---------- ACESSO AOS DADOS (mock) ----------
  function consultarConvite(token) {
    var achado = DadosMock.ler().filter(function (c) { return c.token === token; })[0];
    return Promise.resolve(achado || null);
  }
  function salvarResposta(token, status, acompanhantes) {
    var lista = DadosMock.ler();
    var convidado = lista.filter(function (c) { return c.token === token; })[0];
    if (!convidado) return Promise.reject(new Error("Convite não encontrado"));
    convidado.status = status;
    convidado.acompanhantes = status === "confirmado" ? acompanhantes : 0;
    convidado.data_resposta = new Date().toISOString();
    DadosMock.gravar(lista);
    return Promise.resolve(convidado);
  }
  // ---------------------------------------------

  var el = function (id) { return document.getElementById(id); };
  var form = el("form-rsvp"), erro = el("erro-convite"), mensagem = el("mensagem");
  var status = null, qtd = 0;

  function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto || "";
    mensagem.className = "mensagem" + (tipo ? " " + tipo : "");
  }

  function atualizarTela() {
    el("opcao-sim").classList.toggle("ativa", status === "confirmado");
    el("opcao-nao").classList.toggle("ativa", status === "ausente");
    // Acompanhantes ficam sempre visíveis; só somem se o convidado disser que não vai.
    el("bloco-acompanhantes").classList.toggle("oculto", status === "ausente");
    el("qtd-acompanhantes").textContent = qtd;
    el("menos").disabled = qtd <= 0;
    el("mais").disabled = qtd >= MAX_ACOMPANHANTES;
    el("limite-acompanhantes").textContent = "Máximo de " + MAX_ACOMPANHANTES + " acompanhantes por convite.";
  }

  function prazoEncerrado() {
    return PRAZO_ALTERACAO && new Date() > new Date(PRAZO_ALTERACAO);
  }

  var token = new URLSearchParams(location.search).get("token");

  if (!token) {
    erro.classList.remove("oculto");
  } else {
    consultarConvite(token.trim()).then(function (convidado) {
      if (!convidado) { erro.classList.remove("oculto"); return; }

      form.classList.remove("oculto");
      el("nome-convidado").textContent = "Convite de " + convidado.nome;
      el("nome-convidado").classList.remove("oculto");

      if (convidado.status === "confirmado" || convidado.status === "ausente") {
        status = convidado.status;
        qtd = convidado.acompanhantes || 0;
        var atual = el("resposta-atual");
        atual.classList.remove("oculto");
        atual.textContent = "Sua resposta atual: " +
          (status === "confirmado" ? "presença confirmada" : "você não poderá comparecer") +
          ". Você pode alterá-la abaixo.";
        if (prazoEncerrado()) {
          el("enviar").disabled = true;
          mostrarMensagem("O prazo para alterar a resposta terminou.", "erro");
        }
      }
      atualizarTela();
    });
  }

  el("opcao-sim").addEventListener("click", function () { status = "confirmado"; mostrarMensagem(""); atualizarTela(); });
  el("opcao-nao").addEventListener("click", function () { status = "ausente"; qtd = 0; mostrarMensagem(""); atualizarTela(); });
  el("menos").addEventListener("click", function () { if (qtd > 0) { qtd--; atualizarTela(); } });
  el("mais").addEventListener("click", function () {
    if (qtd < MAX_ACOMPANHANTES) {
      qtd++;
      if (!status) status = "confirmado"; // quem adiciona acompanhante está confirmando presença
      atualizarTela();
    }
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!status) { mostrarMensagem("Escolha se você poderá comparecer.", "erro"); return; }
    if (prazoEncerrado()) { mostrarMensagem("O prazo para alterar a resposta terminou.", "erro"); return; }

    el("enviar").disabled = true;
    salvarResposta(token.trim(), status, qtd).then(function () {
      mostrarMensagem(status === "confirmado"
        ? "Presença confirmada! Obrigado, estamos te esperando."
        : "Resposta registrada. Sentiremos sua falta!", "ok");
      el("enviar").disabled = false;
    }).catch(function (e) {
      mostrarMensagem(e.message || "Não foi possível salvar. Tente novamente.", "erro");
      el("enviar").disabled = false;
    });
  });
})();
