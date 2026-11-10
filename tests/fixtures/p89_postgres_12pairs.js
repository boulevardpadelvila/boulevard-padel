/* Boulevard Pádel · P89 · Liga 12 parejas / 66 partidos / 11 fechas.
 * Genera datos ficticios SOLAMENTE para PostgreSQL efímero de GitHub CI.
 * NO ejecutar contra Supabase productivo.
 */
const league = require("../../js/torneos-liga-motor.js");
const uuid = (n) => "20000000-0000-0000-0000-" + String(n).padStart(12, "0");
const tournamentId = uuid(101);
const ids = Array.from({ length: 12 }, (_, i) => uuid(i + 1));
const fixtures = league.buildSchedule(ids, 1);
if (fixtures.length !== 66 || new Set(fixtures.map((m) => m.roundNumber)).size !== 11)
  throw new Error("Fixture de 12 parejas inválido");
for (let round = 1; round <= 11; round++) {
  const selected = fixtures.filter((m) => m.roundNumber === round);
  if (selected.length !== 6 ||
      new Set(selected.flatMap((m) => [m.pair1Id, m.pair2Id])).size !== 12)
    throw new Error("Fecha " + round + " inválida");
}
const sql = [];
sql.push("-- Liga sintética de 12 parejas: SOLO CI PostgreSQL temporal.");
sql.push("SELECT set_config('app.test_uid','10000000-0000-0000-0000-000000000001',false);");
sql.push("SELECT set_config('app.test_admin','on',false);");
sql.push("INSERT INTO public.bp_tournaments(id,name,format,status,is_published) VALUES (" +
  "'" + tournamentId + "','Liga 12 parejas CI','league','in_progress',false);");
sql.push("INSERT INTO public.bp_tournament_pairs(id,tournament_id,status,player1_name,player2_name) VALUES");
sql.push(ids.map((id, i) =>
  "('" + id + "','" + tournamentId + "','approved','Dúo " + (i + 1) + "','Prueba')").join(",\n") + ";");
sql.push("INSERT INTO public.bp_league_matches(tournament_id,pair1_id,pair2_id,match_number,round_number,leg,match_status,sets,sets_pair1,sets_pair2,winner_pair_id) VALUES");
sql.push(fixtures.map((m) => {
  const p1Wins = ids.indexOf(m.pair1Id) < ids.indexOf(m.pair2Id);
  const sets = p1Wins ? "[[6,2],[6,3]]" : "[[2,6],[3,6]]";
  return "('" + tournamentId + "','" + m.pair1Id + "','" + m.pair2Id +
    "'," + m.matchNumber + "," + m.roundNumber + ",1,'played','" + sets +
    "'," + (p1Wins ? 2 : 0) + "," + (p1Wins ? 0 : 2) + ",'" +
    (p1Wins ? m.pair1Id : m.pair2Id) + "')";
}).join(",\n") + ";");
process.stdout.write(sql.join("\n") + "\n");
