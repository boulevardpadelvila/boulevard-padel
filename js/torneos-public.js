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
  let tournamentsCache = [];
  let currentTab = "current";

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

  const dateText = (value) => value.split("-").reverse().join("/");
  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function isFinished(t) {
    return t.status === "completed" || t.ends_on < localToday();
  }
  function make(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function competitionState(t) {
    if (isFinished(t)) return "Finalizado";
    if (t.starts_on > localToday()) return "Próximamente";
    return "En curso";
  }
  function categoryName(t) {
    return (
      t.bp_tournament_categories?.name ||
      t.category_name ||
      "Categoría por confirmar"
    );
  }
  function appendResults(container, items) {
    const list = make("div", "public-tournament-results");
    items.forEach((item) => {
      const article = make("article", "public-tournament-result");
      const meta = make("div", "public-tournament-result__meta");
      meta.append(make("span", "", item.stage), make("span", "", item.date));
      article.append(meta);
      article.append(
        make("div", "public-tournament-result__teams", item.teams),
      );
      article.append(
        make("span", "public-tournament-result__score", item.score),
      );
      article.append(
        make("span", "public-tournament-result__winner", item.winner),
      );
      list.append(article);
    });
    container.append(list);
  }
  function buildTableBlock(block) {
    const wrapper = make("div", "public-tournament-table-scroll");
    const table = make("table", "public-tournament-table");
    if (block.caption) table.append(make("caption", "", block.caption));
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    block.columns.forEach((column) => headRow.append(make("th", "", column)));
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    block.rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((cell, index) => {
        const td = make(
          "td",
          index === 0 && block.columns[0] === "Pos."
            ? "public-tournament-table__pos"
            : "",
          cell,
        );
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    wrapper.append(table);
    return wrapper;
  }
  function detailBlock(t) {
    const details = make("details", "public-tournament-more");
    const summary = make(
      "summary",
      "public-tournament-more__summary",
      "Ver resultados y posiciones",
    );
    const content = make("div", "public-tournament-more__body");
    const matches = make("section", "public-tournament-data");
    matches.append(make("h4", "", "Resultados de partidos"));
    matches.append(
      make(
        "p",
        "public-tournament-data__empty",
        "Los resultados aparecerán aquí cuando la organización los registre.",
      ),
    );
    const standings = make("section", "public-tournament-data");
    standings.append(
      make(
        "h4",
        "",
        t.format === "knockout" ? "Cuadro eliminatorio" : "Tabla de posiciones",
      ),
    );
    if (t.format === "knockout") {
      standings.append(
        make(
          "p",
          "public-tournament-data__empty",
          "Los cruces y ganadores estarán disponibles cuando se programe el cuadro.",
        ),
      );
    } else {
      const scroller = make("div", "public-tournament-table-scroll");
      const table = make("table", "public-tournament-table");
      const caption = make(
        "caption",
        "",
        "Estructura prevista; sin posiciones oficiales todavía",
      );
      const thead = document.createElement("thead");
      const head = document.createElement("tr");
      for (const col of ["Pareja", "PJ", "PG", "PP", "Pts"])
        head.append(make("th", "", col));
      thead.append(head);
      const tbody = document.createElement("tbody");
      const tr = document.createElement("tr");
      const td = make(
        "td",
        "public-tournament-table__pending",
        "Tabla pendiente de resultados",
      );
      td.colSpan = 5;
      tr.append(td);
      tbody.append(tr);
      table.append(caption, thead, tbody);
      scroller.append(table);
      standings.append(scroller);
    }
    content.append(matches, standings);
    details.append(summary, content);
    return details;
  }
  function cardFor(t) {
    const card = make("article", "public-tournament-card");
    const top = make("div", "public-tournament-card__top");
    top.append(
      make("span", "public-tournament-card__state", competitionState(t)),
    );
    top.append(
      make(
        "span",
        "public-tournament-card__format",
        labels[t.format] || t.format,
      ),
    );
    card.append(top, make("h3", "", t.name));
    card.append(
      make(
        "p",
        "public-tournament-card__category",
        t.bp_tournament_categories?.name || "Categoría por confirmar",
      ),
    );
    card.append(
      make(
        "p",
        "public-tournament-card__dates",
        `${dateText(t.starts_on)} — ${dateText(t.ends_on)}`,
      ),
    );
    if (!isFinished(t)) {
      const state = make(
        "p",
        "public-tournament-card__registration",
        t.status === "registration_open"
          ? "Inscripciones abiertas"
          : "Inscripciones no disponibles",
      );
      card.append(state);
      if (t.status === "registration_open") {
        const button = make(
          "button",
          "button button--dark",
          "Inscribir pareja",
        );
        button.type = "button";
        button.addEventListener("click", () => open(t));
        card.append(button);
      }
    }
    card.append(detailBlock(t));
    return card;
  }
  function render() {
    const currentReal = tournamentsCache.filter((t) => !isFinished(t));
    const finishedReal = tournamentsCache.filter(isFinished);
    const current = currentReal;
    const finished = finishedReal;
    $("public-current-count").textContent = String(current.length);
    $("public-finished-count").textContent = String(finished.length);
    const selected = currentTab === "finished" ? finished : current;
    list.replaceChildren();
    if (!selected.length) {
      list.append(
        make(
          "p",
          "public-tournaments__empty",
          currentTab === "finished"
            ? "Todavía no hay competencias finalizadas publicadas."
            : "Por ahora no hay competencias vigentes ni próximas.",
        ),
      );
      return;
    }
    selected.forEach((t) => list.append(cardFor(t)));
  }
  for (const tab of document.querySelectorAll("[data-tournament-tab]")) {
    tab.addEventListener("click", () => {
      currentTab = tab.dataset.tournamentTab;
      for (const button of document.querySelectorAll("[data-tournament-tab]")) {
        const active = button === tab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      }
      $("public-tournament-list-wrap").setAttribute("aria-labelledby", tab.id);
      render();
    });
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
      tournamentsCache = data || [];
      render();
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
