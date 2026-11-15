// Edge Function: rsvp-convidado
// Permite ao convidado (sem login) consultar e responder o RSVP usando o token do convite.
//
// Pedidos (POST, JSON):
//   Consultar:  { "acao": "consultar", "token": "teste-ana" }
//   Responder:  { "acao": "responder", "token": "teste-ana", "status": "confirmado" | "ausente", "acompanhantes": 0 }
//
// ATENÇÃO: valores PROVISÓRIOS (combinar com a Carine e a Jais) estão na seção CONFIGURAÇÃO.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- CONFIGURAÇÃO (trocar quando as decisões forem tomadas) ----------
const TABELA = "convidados";
const STATUS_CONFIRMADO = "confirmado"; // confirmar com a Carine os valores reais da coluna status
const STATUS_AUSENTE = "ausente";
const MAX_ACOMPANHANTES = 2; // decisão pendente: máximo de acompanhantes por convite
const SALVAR_ACOMPANHANTES = false; // mude para true depois que a Carine criar a coluna "acompanhantes"
const PRAZO_ALTERACAO: string | null = null; // decisão pendente. Ex.: "2026-11-25T23:59:59-03:00"
// -----------------------------------------------------------------------------

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return resposta({ erro: "Método não permitido" }, 405);

  let dados: any;
  try {
    dados = await req.json();
  } catch {
    return resposta({ erro: "JSON inválido" }, 400);
  }

  const token = String(dados?.token ?? "").trim();
  if (!token) return resposta({ erro: "Token ausente" }, 400);

  // A chave service_role é fornecida automaticamente pelo Supabase às Edge Functions.
  // NUNCA escreva essa chave no código nem no GitHub.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: convidado, error } = await supabase
    .from(TABELA)
    .select("*")
    .eq("token_convite", token)
    .maybeSingle();

  if (error) return resposta({ erro: "Erro ao consultar convite" }, 500);
  if (!convidado) return resposta({ erro: "Convite não encontrado" }, 404);

  // Só devolvemos o necessário (nunca o contato nem o id).
  const publico = {
    nome: convidado.nome,
    status: convidado.status,
    data_resposta: convidado.data_resposta,
    acompanhantes: convidado.acompanhantes ?? 0,
    max_acompanhantes: MAX_ACOMPANHANTES,
  };

  if (dados.acao === "consultar") return resposta(publico);

  if (dados.acao === "responder") {
    const novoStatus = dados.status;
    if (novoStatus !== STATUS_CONFIRMADO && novoStatus !== STATUS_AUSENTE) {
      return resposta({ erro: "Status inválido" }, 400);
    }

    if (PRAZO_ALTERACAO && new Date() > new Date(PRAZO_ALTERACAO)) {
      return resposta({ erro: "O prazo para alterar a resposta terminou" }, 403);
    }

    let acompanhantes = 0;
    if (novoStatus === STATUS_CONFIRMADO) {
      acompanhantes = Number(dados.acompanhantes ?? 0);
      if (!Number.isInteger(acompanhantes) || acompanhantes < 0 || acompanhantes > MAX_ACOMPANHANTES) {
        return resposta({ erro: `Acompanhantes deve ser entre 0 e ${MAX_ACOMPANHANTES}` }, 400);
      }
    }

    const atualizacao: Record<string, unknown> = {
      status: novoStatus,
      data_resposta: new Date().toISOString(),
    };
    if (SALVAR_ACOMPANHANTES) atualizacao.acompanhantes = acompanhantes;

    const { error: erroUpdate } = await supabase
      .from(TABELA)
      .update(atualizacao)
      .eq("token_convite", token);

    if (erroUpdate) return resposta({ erro: "Erro ao salvar resposta" }, 500);

    return resposta({ ...publico, status: novoStatus, acompanhantes, salvo: true });
  }

  return resposta({ erro: "Ação inválida. Use 'consultar' ou 'responder'" }, 400);
});
