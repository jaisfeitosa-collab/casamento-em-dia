// Dados fictícios (mock) para testar o visual. Ficam guardados no navegador (localStorage).
// Na integração com o Supabase, este arquivo deixa de ser usado.
var DadosMock = (function () {
  var CHAVE = "meu-coracao-convidados";
  var inicial = [
    { token: "teste-ana",    nome: "Ana Souza",       status: "confirmado", acompanhantes: 1, data_resposta: null },
    { token: "teste-maria",  nome: "Maria Oliveira",  status: "pendente",   acompanhantes: 0, data_resposta: null },
    { token: "teste-pedro",  nome: "Pedro Cruz",      status: "ausente",    acompanhantes: 0, data_resposta: null },
    { token: "teste-lucas",  nome: "Lucas Lima",      status: "confirmado", acompanhantes: 2, data_resposta: null },
    { token: "teste-julia",  nome: "Júlia Mendes",    status: "pendente",   acompanhantes: 0, data_resposta: null },
    { token: "teste-carla",  nome: "Carla Santos",    status: "confirmado", acompanhantes: 0, data_resposta: null },
    { token: "teste-rafael", nome: "Rafael Costa",    status: "pendente",   acompanhantes: 0, data_resposta: null },
    { token: "teste-bia",    nome: "Beatriz Alves",   status: "ausente",    acompanhantes: 0, data_resposta: null }
  ];
  function ler() {
    try {
      var salvo = localStorage.getItem(CHAVE);
      if (salvo) return JSON.parse(salvo);
    } catch (e) {}
    return JSON.parse(JSON.stringify(inicial));
  }
  function gravar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) {}
  }
  return { ler: ler, gravar: gravar };
})();
