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
  const DEMO_TOURNAMENTS = {
    current: [
      {
        id: "demo-current-showcase",
        demo: true,
        name: "Copa Boulevard Primavera",
        category_name: "Caballeros 5ta",
        format: "groups_knockout",
        status: "in_progress",
        starts_on: "2026-10-10",
        ends_on: "2026-10-28",
        demoHelperText: "Datos ficticios para mostrar cómo se verían resultados y posiciones de un torneo vigente.",
        demoSummaryTitle: "Ver demo de resultados y posiciones",
        resultsLabel: "Resultados recientes",
        results: [
          {
            stage: "Fecha 1 · Grupo A",
            date: "14/10/2026",
            teams: "López / Sosa vs. Molina / Ruiz",
            score: "6-4 · 3-6 · 6-3",
            winner: "Ganadores: López / Sosa",
          },
          {
            stage: "Fecha 1 · Grupo A",
            date: "14/10/2026",
            teams: "Ríos / Cejas vs. Benítez / Páez",
            score: "6-2 · 6-1",
            winner: "Ganadores: Ríos / Cejas",
          },
          {
            stage: "Fecha 1 · Grupo B",
            date: "15/10/2026",
            teams: "Maidana / Acosta vs. Giménez / Falco",
            score: "7-5 · 6-4",
            winner: "Ganadores: Maidana / Acosta",
          },
        ],
        tables: [
          {
            title: "Grupo A — tabla de posiciones",
            caption: "Ejemplo visual con sistema de puntos WPC Rafaela",
            columns: ["Pareja", "PJ", "PG", "PP", "Pts"],
            rows: [
              ["López / Sosa", "1", "1", "0", "2"],
              ["Ríos / Cejas", "1", "1", "0", "2"],
              ["Molina / Ruiz", "1", "0", "1", "1"],
              ["Benítez / Páez", "1", "0", "1", "1"],
            ],
          },
        ],
        highlights: [
          { label: "Próxima instancia", value: "Clasifican 2 parejas por grupo" },
          { label: "Siguiente fecha", value: "Sábado 17/10 · desde las 16:00" },
        ],
      },
    ],
    finished: [
      {
        id: "demo-finished-showcase",
        demo: true,
        name: "Torneo Relámpago de Septiembre",
        category_name: "Mixto libre",
        format: "knockout",
        status: "completed",
        starts_on: "2026-09-19",
        ends_on: "2026-09-20",
        champion: "Pérez / González",
        demoHelperText: "Datos ficticios para mostrar cómo se vería un torneo finalizado y su cierre.",
        demoSummaryTitle: "Ver demo de resultados finales",
        resultsLabel: "Resultados decisivos",
        results: [
          {
            stage: "Semifinal 1",
            date: "20/09/2026",
            teams: "Pérez / González vs. Díaz / Nieva",
            score: "6-3 · 6-4",
            winner: "Ganadores: Pérez / González",
          },
          {
            stage: "Semifinal 2",
            date: "20/09/2026",
            teams: "Soria / Mendieta vs. Roldán / Ferrero",
            score: "4-6 · 6-3 · 6-4",
            winner: "Ganadores: Soria / Mendieta",
          },
          {
            stage: "Final",
            date: "20/09/2026",
            teams: "Pérez / González vs. Soria / Mendieta",
            score: "6-2 · 7-5",
            winner: "Campeones: Pérez / González",
          },
        ],
        tables: [
          {
            title: "Posiciones finales",
            caption: "Ejemplo visual de cierre para mostrar en competencias finalizadas",
            columns: ["Pos.", "Pareja", "Instancia"],
            rows: [
              ["1", "Pérez / González", "Campeones"],
              ["2", "Soria / Mendieta", "Finalistas"],
              ["3", "Díaz / Nieva", "Semifinal"],
              ["4", "Roldán / Ferrero", "Semifinal"],
            ],
          },
        ],
        highlights: [
          { label: "Campeones", value: "Pérez / González" },
          { label: "Resultado final", value: "6-2 · 7-5" },
        ],
      },
    ],
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
    return t.bp_tournament_categories?.name || t.category_name || "Categoría por confirmar";
  }
  function appendResults(container, items) {
    const list = make("div", "public-tournament-results");
    items.forEach((item) => {
      const article = make("article", "public-tournament-result");
      const meta = make("div", "public-tournament-result__meta");
      meta.append(make("span", "", item.stage), make("span", "", item.date));
      article.append(meta);
      article.append(make("div", "public-tournament-result__teams", item.teams));
      article.append(make("span", "public-tournament-result__score", item.score));
      article.append(make("span", "public-tournament-result__winner", item.winner));
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
        const td = make("td", index === 0 && block.columns[0] === "Pos." ? "public-tournament-table__pos" : "", cell);
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
    const summary = make("summary", "public-tournament-more__summary", t.demoSummaryTitle || "Ver resultados y posiciones");
    const content = make("div", "public-tournament-more__body");
    const matches = make("section", "public-tournament-data");
    matches.append(make("h4", "", t.resultsLabel || "Resultados de partidos"));

    if (t.demo) {
      matches.append(make("p", "public-tournament-data__note", t.demoHelperText));
      appendResults(matches, t.results || []);
    } else {
      matches.append(make("p", "public-tournament-data__empty", "Los resultados aparecerán aquí cuando la organización los registre."));
    }

    const standings = make("section", "public-tournament-data");
    standings.append(make("h4", "", isFinished(t)
      ? (t.format === "knockout" ? "Cierre de la competencia" : "Posiciones finales")
      : (t.format === "knockout" ? "Cuadro eliminatorio" : "Tabla de posiciones")));

    if (t.demo) {
      if (t.highlights?.length) {
        const highlight = make("div", "public-tournament-highlight");
        t.highlights.forEach((item) => {
          const card = make("div", "public-tournament-highlight__item");
          card.append(make("span", "public-tournament-highlight__label", item.label));
          card.append(make("div", "public-tournament-highlight__value", item.value));
          highlight.append(card);
        });
        standings.append(highlight);
      }
      (t.tables || []).forEach((tableData) => {
        standings.append(make("span", "public-tournament-data__eyebrow", tableData.title));
        standings.append(buildTableBlock(tableData));
      });
    } else if (t.format === "knockout") {
      standings.append(make("p", "public-tournament-data__empty", "Los cruces y ganadores estarán disponibles cuando se programe el cuadro."));
    } else {
      const scroller = make("div", "public-tournament-table-scroll");
      const table = make("table", "public-tournament-table");
      const caption = make("caption", "", "Estructura prevista; sin posiciones oficiales todavía");
      const thead = document.createElement("thead");
      const head = document.createElement("tr");
      ["Pareja", "PJ", "PG", "PP", "Pts"].forEach((col) => head.append(make("th", "", col)));
      thead.append(head);
      const tbody = document.createElement("tbody");
      const tr = document.createElement("tr");
      const td = make("td", "public-tournament-table__pending", "Tabla pendiente de resultados");
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
    const chips = make("div", "public-tournament-card__chips");
    chips.append(make("span", "public-tournament-card__state", competitionState(t)));
    if (t.demo) chips.append(make("span", "public-tournament-card__demo", "Demo visual"));
    top.append(chips);
    top.append(make("span", "public-tournament-card__format", labels[t.format] || t.format));
    card.append(top, make("h3", "", t.name));
    card.append(make("p", "public-tournament-card__category", categoryName(t)));
    card.append(make("p", "public-tournament-card__dates", `${dateText(t.starts_on)} — ${dateText(t.ends_on)}`));
    if (t.champion) {
      const winner = make("p", "public-tournament-card__winner");
      winner.append("Campeones:");
      winner.append(make("strong", "", t.champion));
      card.append(winner);
    }
    if (t.demo) {
      card.append(make("p", "public-tournament-card__demo-text", t.demoHelperText));
    } else if (!isFinished(t)) {
      const state = make("p", "public-tournament-card__registration", t.status === "registration_open" ? "Inscripciones abiertas" : "Inscripciones no disponibles");
      card.append(state);
      if (t.status === "registration_open") {
        const button = make("button", "button button--dark", "Inscribir pareja");
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
    const current = [...DEMO_TOURNAMENTS.current, ...currentReal];
    const finished = [...DEMO_TOURNAMENTS.finished, ...finishedReal];
    $("public-current-count").textContent = String(current.length);
    $("public-finished-count").textContent = String(finished.length);
    const selected = currentTab === "finished" ? finished : current;
    list.replaceChildren();
    if (!selected.length) {
      list.append(make("p", "public-tournaments__empty", currentTab === "finished"
        ? "Todavía no hay competencias finalizadas publicadas."
        : "Por ahora no hay competencias vigentes ni próximas."));
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
        .select("id,name,format,status,starts_on,ends_on,bp_tournament_categories(name)")
        .eq("is_published", true)
        .order("starts_on", { ascending: true })
        .limit(50);
      if (error) throw error;
      tournamentsCache = data || [];
      render();
      status("");
    } catch (error) {
      console.error(error);
      status("No se pudieron cargar los torneos. Intentá nuevamente más tarde.");
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
    if (! [p1, p2].every((p) => p.length >= 3 && p.length <= 100 && p.includes(" ")) || p1.toLowerCase() === p2.toLowerCase() || !/^[+\d\s()\-]{6,30}$/.test(phone)) {
      errorBox.textContent = "Ingresá nombre y apellido de ambos jugadores y un teléfono válido.";
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
      const { data, error } = await supabaseClient.functions.invoke("register-tournament-pair", {
        body: {
          tournamentId: selection.id,
          player1_name: p1,
          player2_name: p2,
          contact_phone: phone,
          turnstileToken: token,
        },
      });
      if (error || !data?.ok) {
        let message = data?.error;
        if (!message && error?.context && typeof error.context.json === "function") {
          try {
            message = (await error.context.json()).error;
          } catch (_e) {
            /* network error */
          }
        }
        throw new Error(message || "No se pudo enviar la inscripción. Intentá nuevamente.");
      }
      closeAfterSuccess();
    } catch (error) {
      errorBox.textContent = error.message || "No se pudo completar la inscripción.";
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
    status("Solicitud recibida correctamente. Quedó pendiente de aprobación del administrador.");
  }
  load();
})();
