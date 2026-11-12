
import { supabase } from "./supabase.js";
document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("form-convidado");
  const campoNome = document.getElementById("nome");

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const nome = campoNome.value.trim();

    if (!nome) {
      alert("Informe o nome do convidado.");
      return;
    }

    alert(`Formulário funcionando! Nome informado: ${nome}`);

    formulario.reset();
  });
});
