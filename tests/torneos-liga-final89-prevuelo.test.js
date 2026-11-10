/* P89 · Verificación estática del prevuelo de producción (solo SELECT).
 * No contiene credenciales, no accede a Supabase y no ejecuta SQL.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(
  __dirname,"../sql/SQL_89_PREVUELO_SOLO_LECTURA.sql"),"utf8");
const sql=source.split("\n").filter(line=>!line.trim().startsWith("--")).join("\n");

test("P89: el prevuelo consulta 22 controles y no escribe producción",()=>{
  assert.match(sql,/^\s*WITH checks AS\s*\(/i);
  assert.equal((sql.match(/UNION ALL SELECT/g)||[]).length,22);
  assert.match(sql,/SELECT 'RESULTADO GENERAL'/);
  assert.match(sql,/DETENER INSTALACIÓN/);
  assert.doesNotMatch(sql,/\b(?:INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|TRUNCATE|CALL|DO\s*\$|GRANT|REVOKE)\b/i);
});
