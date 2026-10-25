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
  /* BVPadel parche 28: grupos publicados en el sitio publico. */
  let publishedGroupsByTournament = new Map();
  /* BVPadel parche 41: fixture de grupos, solo mediante vista publica segura. */
  let publishedFixtureByTournament = new Map();

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
    const values = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(new Date()).map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
  // BVPadel parche 42: fin estimado no finaliza automaticamente.
  function isFinished(t) {
    return t.status === "completed";
  }
  function registrationOpen(t) {
    return !isFinished(t) && t.status === "registration_open" &&
      (!t.registration_closes_at || Date.now() < Date.parse(t.registration_closes_at));
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

  // Se dibujan solo datos de la vista publica segura.
  function publicGroupLetter(groupNumber) {
    let n = Number(groupNumber);
    let letters = "";
    if (!Number.isSafeInteger(n) || n < 1) return String(groupNumber);
    while (n > 0) {
      n -= 1;
      letters = String.fromCharCode(65 + n % 26) + letters;
      n = Math.floor(n / 26);
    }
    return letters;
  }
  function publishedGroupsBlock(t) {
    if (t.format !== "groups_knockout") return null;
    const groups = publishedGroupsByTournament.get(t.id);
    if (!groups || !groups.length) return null;

    const details = make("details", "public-tournament-groups");
    const title = make(
      "summary", "public-tournament-groups__summary",
      `Ver grupos · ${groups.length} ${groups.length === 1 ? "grupo" : "grupos"}`,
    );
    const grid = make("div", "public-tournament-groups__grid");
    for (const group of groups) {
      const section = make("section", "public-tournament-group");
      section.append(make("h4", "public-tournament-group__title", `Grupo ${publicGroupLetter(group.number)}`));
      section.append(make("p", "public-tournament-group__count", `${group.pairs.length} ${group.pairs.length === 1 ? "pareja" : "parejas"}`));
      const members = make("ul", "public-tournament-group__pairs");
      for (const pair of group.pairs) {
        const entry = make("li", "public-tournament-group__pair");
        entry.append(
          make("span", "public-tournament-group__player", pair.player1_name),
          make("span", "public-tournament-group__player", pair.player2_name),
        );
        members.append(entry);
      }
      section.append(members);
      grid.append(section);
    }
    details.append(title, grid);
    return details;
  }
  async function fetchPublishedGroups(visibleTournaments) {
    const ids = visibleTournaments
      .filter((t) => t.format === "groups_knockout")
      .map((t) => t.id);
    const grouped = new Map();
    if (!ids.length) return grouped;

    // Consulta publica y paginada para no truncar la lista si crecen los torneos.
    const rows = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient
        .from("bp_public_tournament_groups")
        .select("tournament_id,group_number,player1_name,player2_name")
        .in("tournament_id", ids)
        .order("tournament_id", { ascending: true })
        .order("group_number", { ascending: true })
        .order("player1_name", { ascending: true })
        .order("player2_name", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    for (const row of rows) {
      if (!grouped.has(row.tournament_id)) grouped.set(row.tournament_id, new Map());
      const byNumber = grouped.get(row.tournament_id);
      if (!byNumber.has(row.group_number)) {
        byNumber.set(row.group_number, { number: row.group_number, pairs: [] });
      }
      byNumber.get(row.group_number).pairs.push({
        player1_name: row.player1_name,
        player2_name: row.player2_name,
      });
    }
    const result = new Map();
    for (const [id, groups] of grouped) {
      result.set(id, Array.from(groups.values()).sort((a, b) => a.number - b.number));
    }
    return result;
  }

  /* Parche 41: el navegador consulta solamente la vista autorizada.
     La vista comprueba publicacion de torneo, grupos y fixture en Supabase. */
  async function fetchPublishedFixture(visibleTournaments) {
    const ids = visibleTournaments
      .filter((t) => t.format === "groups_knockout")
      .map((t) => t.id);
    const matchesByTournament = new Map();
    if (!ids.length) return matchesByTournament;

    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient
        .from("bp_public_tournament_group_fixture")
        .select("tournament_id,group_number,round_number,match_number,pair1_player1_name,pair1_player2_name,pair2_player1_name,pair2_player2_name")
        .in("tournament_id", ids)
        .order("tournament_id", { ascending: true })
        .order("round_number", { ascending: true })
        .order("group_number", { ascending: true })
        .order("match_number", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      for (const match of data || []) {
        if (!matchesByTournament.has(match.tournament_id)) {
          matchesByTournament.set(match.tournament_id, []);
        }
        matchesByTournament.get(match.tournament_id).push(match);
      }
      if (!data || data.length < pageSize) break;
    }
    return matchesByTournament;
  }

  function publishedFixtureBlock(t) {
    if (t.format !== "groups_knockout") return null;
    const matches = publishedFixtureByTournament.get(t.id);
    if (!matches || !matches.length) return null;

    const rounds = new Map();
    for (const match of matches) {
      const number = Number(match.round_number);
      const groupNumber = Number(match.group_number);
      if (!rounds.has(number)) rounds.set(number, new Map());
      const groups = rounds.get(number);
      if (!groups.has(groupNumber)) groups.set(groupNumber, []);
      groups.get(groupNumber).push(match);
    }

    const details = make("details", "public-tournament-fixture");
    const roundCount = rounds.size;
    const summary = make(
      "summary", "public-tournament-fixture__summary",
      `Ver fixture · ${roundCount} ${roundCount === 1 ? "jornada" : "jornadas"} · ${matches.length} ${matches.length === 1 ? "partido" : "partidos"}`,
    );
    const body = make("div", "public-tournament-fixture__body");
    body.append(make(
      "p", "public-tournament-fixture__notice",
      "Las fechas y los horarios se informarán cuando estén definidos.",
    ));

    for (const [roundNumber, groups] of [...rounds].sort((a, b) => a[0] - b[0])) {
      const roundSection = make("section", "public-tournament-fixture__round");
      roundSection.append(make("h4", "public-tournament-fixture__round-title", `Jornada ${roundNumber}`));
      const groupGrid = make("div", "public-tournament-fixture__groups");

      for (const [groupNumber, groupMatches] of [...groups].sort((a, b) => a[0] - b[0])) {
        const groupSection = make("section", "public-tournament-fixture__group");
        groupSection.append(make("h5", "public-tournament-fixture__group-title", `Grupo ${publicGroupLetter(groupNumber)}`));

        for (const match of groupMatches.sort((a, b) => Number(a.match_number) - Number(b.match_number))) {
          const article = make("article", "public-tournament-fixture__match");
          article.append(make("p", "public-tournament-fixture__number", `Partido ${match.match_number}`));
          const versus = make("div", "public-tournament-fixture__versus-row");
          const pair1 = make("div", "public-tournament-fixture__pair public-tournament-fixture__pair--first");
          const pair2 = make("div", "public-tournament-fixture__pair public-tournament-fixture__pair--second");
          pair1.append(
            make("span", "public-tournament-fixture__player", match.pair1_player1_name),
            make("span", "public-tournament-fixture__player", match.pair1_player2_name),
          );
          pair2.append(
            make("span", "public-tournament-fixture__player", match.pair2_player1_name),
            make("span", "public-tournament-fixture__player", match.pair2_player2_name),
          );
          versus.append(pair1, make("span", "public-tournament-fixture__vs", "VS"), pair2);
          article.append(versus);
          groupSection.append(article);
        }
        groupGrid.append(groupSection);
      }
      roundSection.append(groupGrid);
      body.append(roundSection);
    }
    details.append(summary, body);
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
        `Fechas previstas: ${dateText(t.starts_on)} — ${dateText(t.ends_on)}`,
      ),
    );
    if (!isFinished(t)) {
      const state = make(
        "p",
        "public-tournament-card__registration",
        registrationOpen(t)
          ? "Inscripciones abiertas"
          : "Inscripciones no disponibles",
      );
      card.append(state);
      if (registrationOpen(t)) {
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
    const groupsBlock = publishedGroupsBlock(t);
    if (groupsBlock) card.append(groupsBlock);
    const fixtureBlock = publishedFixtureBlock(t);
    if (fixtureBlock) card.append(fixtureBlock);
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
          "id,name,format,status,starts_on,ends_on,registration_closes_at,bp_tournament_categories(name)",
        )
        .eq("is_published", true)
        .order("starts_on", { ascending: true })
        .limit(50);
      if (error) throw error;
      tournamentsCache = data || [];
      publishedGroupsByTournament = new Map();
      publishedFixtureByTournament = new Map();
      const notices = [];
      try {
        publishedGroupsByTournament = await fetchPublishedGroups(tournamentsCache);
      } catch (groupsError) {
        console.error("No se pudieron cargar los grupos publicados", groupsError);
        notices.push("No se pudieron consultar los grupos publicados.");
      }
      try {
        publishedFixtureByTournament = await fetchPublishedFixture(tournamentsCache);
      } catch (fixtureError) {
        console.error("No se pudo cargar el fixture publicado", fixtureError);
        notices.push("No se pudieron consultar los fixtures publicados.");
      }
      status(notices.length ? `${notices.join(" ")} Recargá la página para intentarlo nuevamente.` : "");
      render();
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
    if (!registrationOpen(selection)) {
      $("public-tournament-error").textContent = "Las inscripciones de este torneo están cerradas.";
      return;
    }
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
