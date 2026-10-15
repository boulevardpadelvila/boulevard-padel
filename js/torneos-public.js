/* Boulevard Pádel — lectura pública de competencias y solicitud segura de pareja. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const list = $("public-tournaments-list");
  const dialog = $("public-tournament-dialog");
  const form = $("public-tournament-form");
  const feedback = $("public-tournament-feedback");
  const labels = {
    league: "Liga",
    groups_knockout: "Grupos + eliminatorias",
    knockout: "Eliminación directa",
  };
  let selection = null;
  let loading = false;
  function status(text) {
    feedback.textContent = text;
  }
  function tokenReset() {
    try {
      window.turnstile?.reset();
    } catch (_e) {
      /* no widget yet */
    }
  }
  function close() {
    if (loading) return;
    dialog.close();
    selection = null;
    form.reset();
    tokenReset();
  }
  $("public-tournament-back").addEventListener("click", close);
  dialog.addEventListener("close", () => {
    selection = null;
    form.reset();
    tokenReset();
  });
  function open(t) {
    selection = t;
    form.reset();
    $("public-tournament-error").textContent = "";
    $("public-tournament-name").textContent = t.name;
    dialog.showModal();
    $("public-player1").focus();
  }
  function render(tournaments) {
    list.replaceChildren();
    if (!tournaments.length) {
      const p = document.createElement("p");
      p.textContent = "Próximamente publicaremos nuestras competencias.";
      list.append(p);
      return;
    }
    for (const t of tournaments) {
      const card = document.createElement("article");
      card.className = "public-tournament-card";
      const heading = document.createElement("h3");
      heading.textContent = t.name;
      const meta = document.createElement("p");
      meta.textContent = [
        t.bp_tournament_categories?.name || "Categoría por confirmar",
        labels[t.format] || t.format,
        `Del ${t.starts_on.split("-").reverse().join("/")} al ${t.ends_on.split("-").reverse().join("/")}`,
      ].join(" · ");
      const details = document.createElement("p");
      details.textContent =
        t.status === "registration_open"
          ? "Inscripciones abiertas"
          : t.status === "registration_closed"
            ? "Inscripciones cerradas"
            : "Inscripciones no disponibles";
      card.append(heading, meta, details);
      if (t.status === "registration_open") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button--dark";
        button.textContent = "Inscribir pareja";
        button.addEventListener("click", () => open(t));
        card.append(button);
      }
      list.append(card);
    }
  }
  async function load() {
    status("Cargando torneos…");
    try {
      const { data, error } = await supabaseClient
        .from("bp_tournaments")
        .select(
          "id,name,format,status,starts_on,ends_on,bp_tournament_categories(name)",
        )
        .eq("is_published", true)
        .order("starts_on", { ascending: true })
        .limit(50);
      if (error) throw error;
      render(data || []);
      status("");
    } catch (error) {
      console.error(error);
      status(
        "No se pudieron cargar los torneos. Intentá nuevamente más tarde.",
      );
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loading || !selection) return;
    const p1 = $("public-player1").value.trim().replace(/\s+/g, " ");
    const p2 = $("public-player2").value.trim().replace(/\s+/g, " ");
    const phone = $("public-phone").value.trim();
    const errorBox = $("public-tournament-error");
    errorBox.textContent = "";
    if (
      ![p1, p2].every(
        (p) => p.length >= 3 && p.length <= 100 && p.includes(" "),
      ) ||
      p1.toLowerCase() === p2.toLowerCase() ||
      !/^[+\d\s()\-]{6,30}$/.test(phone)
    ) {
      errorBox.textContent =
        "Ingresá nombre y apellido de ambos jugadores y un teléfono válido.";
      return;
    }
    const token = form.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!token) {
      errorBox.textContent = "Completá la verificación de seguridad.";
      return;
    }
    loading = true;
    $("public-tournament-send").disabled = true;
    try {
      const { data, error } = await supabaseClient.functions.invoke(
        "register-tournament-pair",
        {
          body: {
            tournamentId: selection.id,
            player1_name: p1,
            player2_name: p2,
            contact_phone: phone,
            turnstileToken: token,
          },
        },
      );
      if (error || !data?.ok) {
        let message = data?.error;
        if (
          !message &&
          error?.context &&
          typeof error.context.json === "function"
        ) {
          try {
            message = (await error.context.json()).error;
          } catch (_e) {
            /* network error */
          }
        }
        throw new Error(
          message || "No se pudo enviar la inscripción. Intentá nuevamente.",
        );
      }
      closeAfterSuccess();
    } catch (error) {
      errorBox.textContent =
        error.message || "No se pudo completar la inscripción.";
      tokenReset();
    } finally {
      loading = false;
      $("public-tournament-send").disabled = false;
    }
  });
  function closeAfterSuccess() {
    loading = false;
    dialog.close();
    selection = null;
    form.reset();
    tokenReset();
    status(
      "Solicitud recibida correctamente. Quedó pendiente de aprobación del administrador.",
    );
  }
  load();
})();
