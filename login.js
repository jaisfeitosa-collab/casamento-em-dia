
import { supabase } from "./supabase.js";

const formulario = document.getElementById("form-login");
const mensagem = document.getElementById("mensagem-login");
const botao = formulario.querySelector("button");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const pin = document.getElementById("pin").value;

  mensagem.textContent = "";
  botao.disabled = true;
  botao.textContent = "Entrando...";

  try {
    const { data, error } = await supabase.functions.invoke(
      "admin-login",
      {
        body: { pin }
      }
    );

    if (error || !data?.sucesso || !data?.token) {
      mensagem.textContent =
        "Não foi possível entrar. Confira a senha ou tente mais tarde.";
      return;
    }

    // Armazenamento temporário para o protótipo.
    // A sessão será validada pelo servidor nas próximas etapas.
    sessionStorage.setItem("admin_token", data.token);

    formulario.reset();
    window.location.href = "admin.html";

  } catch {
    mensagem.textContent =
      "Erro de conexão. Tente novamente.";

  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});
