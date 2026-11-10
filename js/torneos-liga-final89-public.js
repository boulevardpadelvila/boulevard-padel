/* Boulevard Pádel · P89 · Fase final pública de Liga.
 * Solo consume la RPC sanitizada bp_public_league_final89.
 * No consulta tablas privadas ni datos personales de contacto.
 */
(function (root) {
  "use strict";
  const make = (tag, className = "", text = null) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== null) node.textContent = String(text);
    return node;
  };
  function formatDate(iso) {
    if (!iso || Number.isNaN(Date.parse(iso))) return "Fecha y hora por confirmar";
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Cordoba",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).format(new Date(iso));
  }
  // El mismo trofeo vectorial del cuadro eliminatorio, sin dependencias
  // nuevas ni imágenes externas. Oro y plata se distinguen mediante CSS.
  function trophyIcon(rank) {
    const ns = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(ns, "svg");
    for (const [key, value] of Object.entries({
      viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      "stroke-width": "1.8", "stroke-linecap": "round",
      "stroke-linejoin": "round", "aria-hidden": "true",
      class: "public-tournament-highlight__trophy public-tournament-highlight__trophy--" + rank
    })) icon.setAttribute(key, value);
    for (const d of [
      "M8 21h8", "M12 17v4", "M7 4h10v7a5 5 0 0 1-10 0V4Z",
      "M7 6H4v3a3 3 0 0 0 3 3", "M17 6h3v3a3 3 0 0 1-3 3"
    ]) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      icon.append(path);
    }
    return icon;
  }

  function podium(championName, runnerUpName) {
    const winners = make("div",
      "public-tournament-highlight bp-public-league-final__champions");
    for (const [rank, label, value] of [
      ["gold", "Campeones", championName],
      ["silver", "Subcampeones", runnerUpName]
    ]) {
      const card = make("div", "public-tournament-highlight__item " +
        "public-tournament-highlight__item--" + rank);
      const info = make("div", "public-tournament-highlight__text");
      info.append(
        make("span", "public-tournament-highlight__label", label),
        make("strong",
          "public-tournament-highlight__value bp-public-league-final__" +
          (rank === "gold" ? "winner" : "runnerup"), value)
      );
      card.append(trophyIcon(rank), info);
      winners.append(card);
    }
    return winners;
  }

  function finalBlock(tournament, regularReport, finalReport) {
    if (!tournament || tournament.format !== "league" ||
        !regularReport || !finalReport ||
        finalReport.tournament_id !== tournament.id ||
        !Array.isArray(finalReport.matches) || !finalReport.matches.length) return null;

    const pairs = new Map((regularReport.pairs || []).map((pair) =>
      [pair.id, pair.name]));
    const name = (id, fallback) =>
      id ? (pairs.get(id) || "Pareja clasificada") : fallback;
    const matches = finalReport.matches
      .filter((m) => m && (m.stage === "semifinal" && [1, 2].includes(m.slot) ||
                            m.stage === "final" && m.slot === 1))
      .sort((a, b) => (a.stage === "final" ? 2 : 1) -
                       (b.stage === "final" ? 2 : 1) || a.slot - b.slot);
    if (!matches.length) return null;

    const block = make("details", "public-tournament-more bp-public-league bp-public-league-final");
    block.append(make("summary", "public-tournament-more__summary",
      "Fase final · Semifinales y final"));
    const body = make("div", "public-tournament-more__body");
    body.append(make("p", "bp-public-league__note",
      "Clasifican las cuatro mejores parejas. Semifinal 1: 1° vs 3°. Semifinal 2: 2° vs 4°. La final se juega entre sus ganadores."));

    const grid = make("div", "bp-public-league-final__grid");
    for (const match of matches) {
      const article = make("article", "bp-public-league__match bp-public-league-final__match");
      article.append(make("h4", "bp-public-league-final__stage",
        match.stage === "final" ? "Final" : "Semifinal " + match.slot));
      const rivals = make("div", "bp-public-league__rivals");
      rivals.append(
        make("strong", "bp-public-league__rival",
          name(match.pair1_id, match.stage === "final" ? "Ganador semifinal 1" : "Por confirmar")),
        make("span", "bp-public-league__versus", "vs"),
        make("strong", "bp-public-league__rival",
          name(match.pair2_id, match.stage === "final" ? "Ganador semifinal 2" : "Por confirmar"))
      );
      article.append(rivals);
      const state = match.match_status === "played" ? "Jugado" :
        match.schedule_status === "postponed" ? "Postergado" : "Pendiente";
      const when = match.schedule_status === "scheduled" && match.scheduled_at
        ? formatDate(match.scheduled_at) : "Horario por confirmar";
      article.append(make("p", "bp-public-league__meta", state + " · " + when));
      if (match.match_status === "played" && Array.isArray(match.sets))
        article.append(make("p", "bp-public-league__score",
          match.sets.filter((set) => Array.isArray(set) && set.length === 2)
            .map((set) => set.join("–")).join(" · ")));
      grid.append(article);
    }
    body.append(grid);

    const championship = matches.find((m) => m.stage === "final");
    const champion = finalReport.champion_pair_id;
    const runnerUp = finalReport.runner_up_pair_id;
    if (tournament.status === "completed" &&
        finalReport.status === "completed" &&
        championship?.match_status === "played" &&
        championship.winner_pair_id === champion &&
        champion && runnerUp && champion !== runnerUp &&
        [championship.pair1_id, championship.pair2_id].includes(champion) &&
        [championship.pair1_id, championship.pair2_id].includes(runnerUp)) {
      body.append(podium(
        name(champion, "Pareja campeona"),
        name(runnerUp, "Pareja subcampeona")
      ));
    } else {
      body.append(make("p", "bp-public-league-final__pending",
        "El campeón y subcampeón se confirmarán al finalizar la final y cerrar oficialmente la Liga."));
    }
    block.append(body);
    return block;
  }
  root.BPLeagueFinalPublic89 = Object.freeze({ finalBlock });
})(typeof globalThis !== "undefined" ? globalThis : this);
