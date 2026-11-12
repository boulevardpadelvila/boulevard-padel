const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const engine = require(path.resolve(__dirname, "../js/torneos-motor.js"));

class Element {
  constructor(tag = "div", id = "") {
    this.tagName = tag;
    this.id = id;
    this.children = [];
    this.hidden = false;
    this.textContent = "";
    this.className = "";
    this.listeners = {};
    this.classList = { toggle: () => {} };
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  after(_node) {}
  replaceChildren(...nodes) {
    this.children = [...nodes];
  }
  addEventListener(name, cb) {
    this.listeners[name] = cb;
  }
  setAttribute() {}
  set innerHTML(html) {
    this._html = html;
    for (const id of html.matchAll(/id="([^"]+)"/g))
      elements.set(id[1], new Element("div", id[1]));
  }
  get innerHTML() {
    return this._html;
  }
}
let elements;
function gather(el) {
  return [
    el,
    ...el.children.flatMap((n) => (n instanceof Element ? gather(n) : [])),
  ];
}

function createQueryFactory(rows) {
  return {
    from(table) {
      const q = {};
      for (const op of ["select", "eq", "order"]) q[op] = () => q;
      q.maybeSingle = async () => ({ data: rows[table][0], error: null });
      q.then = (resolve, reject) =>
        Promise.resolve({ data: rows[table], error: null }).then(
          resolve,
          reject,
        );
      return q;
    },
  };
}

test("panel resultados: cuatro parejas y marcadores legacy compatibles con vista", async () => {
  elements = new Map();
  elements.set(
    "torneos-pairs-tournament",
    new Element("select", "torneos-pairs-tournament"),
  );
  elements.get("torneos-pairs-tournament").value = "t1";
  elements.set(
    "torneos-groups-panel",
    new Element("section", "torneos-groups-panel"),
  );
  const pairs = ["a", "b", "c", "d"].map((id) => ({
    id,
    player1_name: id,
    player2_name: id + "2",
  }));
  const matches = [
    {
      id: "a1",
      group_id: "g1",
      round_number: 1,
      match_number: 1,
      pair1_id: "a",
      pair2_id: "b",
      match_status: "played",
    },
    {
      id: "a2",
      group_id: "g1",
      round_number: 1,
      match_number: 2,
      pair1_id: "c",
      pair2_id: "d",
      match_status: "played",
    },
    {
      id: "a3",
      group_id: "g1",
      round_number: 2,
      match_number: 1,
      pair1_id: null,
      pair2_id: null,
      pair1_source_match_number: 1,
      pair1_source_outcome: "winner",
      pair2_source_match_number: 2,
      pair2_source_outcome: "winner",
      match_status: "played",
    },
    {
      id: "a4",
      group_id: "g1",
      round_number: 2,
      match_number: 2,
      pair1_id: null,
      pair2_id: null,
      pair1_source_match_number: 1,
      pair1_source_outcome: "loser",
      pair2_source_match_number: 2,
      pair2_source_outcome: "loser",
      match_status: "played",
    },
  ];
  const results = [
    {
      match_id: "a1",
      sets: [
        [6, 0],
        [6, 0],
      ],
      winner_pair_id: "a",
      resolved_pair1_id: "a",
      resolved_pair2_id: "b",
    },
    {
      match_id: "a2",
      sets: [
        [6, 0],
        [0, 6],
        [6, 0],
      ],
      winner_pair_id: "c",
      resolved_pair1_id: "c",
      resolved_pair2_id: "d",
    },
    {
      match_id: "a3",
      sets: [
        [0, 6],
        [0, 6],
      ],
      winner_pair_id: "c",
      resolved_pair1_id: "a",
      resolved_pair2_id: "c",
    },
    {
      match_id: "a4",
      sets: [
        [0, 6],
        [6, 0],
        [0, 6],
      ],
      winner_pair_id: "d",
      resolved_pair1_id: "b",
      resolved_pair2_id: "d",
    },
  ];
  const rows = {
    bp_tournaments: [
      {
        id: "t1",
        name: "Prueba",
        format: "groups_knockout",
        status: "registration_closed",
        fixture_published_at: new Date().toISOString(),
      },
    ],
    bp_tournament_groups: [{ id: "g1", group_number: 1 }],
    bp_tournament_group_pairs: pairs.map((p) => ({
      group_id: "g1",
      pair_id: p.id,
    })),
    bp_tournament_pairs: pairs,
    bp_tournament_group_matches: matches,
    bp_tournament_match_results: results,
  };
  const document = {
    getElementById: (id) => elements.get(id) || null,
    querySelector: () => null,
    createElement: (tag) => new Element(tag),
    body: { append() {} },
  };
  const context = {
    document,
    window: { BPTournamentEngine: engine },
    supabaseClient: createQueryFactory(rows),
    MutationObserver: class {
      observe() {}
    },
    setTimeout() {
      return null;
    },
    clearTimeout() {},
    console,
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.resolve(__dirname, "../js/admin-resultados.js"),
      "utf8",
    ),
    context,
  );
  // load() se lanza al iniciar y retorna por microtarea.
  await new Promise((resolve) => setImmediate(resolve));
  const rendered = gather(elements.get("bp-results-content"))
    .map((x) => x.textContent)
    .join(" ");
  assert.match(rendered, /a y a2/);
  assert.match(rendered, /b y b2/);
  assert.doesNotMatch(rendered, / vs\. /);
  assert.doesNotMatch(rendered, /Jornada /);
  assert.match(rendered, /Grupo A · 4 parejas/);
  assert.match(
    rendered,
    /puestos empatados que requieren definicion/i,
  );
  assert.ok(!rendered.includes("inconsistentes"));
});
