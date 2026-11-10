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
      const winners = make("div", "bp-public-league-final__champions");
      winners.append(
        make("p", "bp-public-league-final__winner", "Campeón: " + name(champion, "Pareja campeona")),
        make("p", "bp-public-league-final__runnerup", "Subcampeón: " + name(runnerUp, "Pareja subcampeona"))
      );
      body.append(winners);
    } else {
      body.append(make("p", "bp-public-league-final__pending",
        "El campeón y subcampeón se confirmarán al finalizar la final y cerrar oficialmente la Liga."));
    }
    block.append(body);
    return block;
  }
  root.BPLeagueFinalPublic89 = Object.freeze({ finalBlock });
})(typeof globalThis !== "undefined" ? globalThis : this);
