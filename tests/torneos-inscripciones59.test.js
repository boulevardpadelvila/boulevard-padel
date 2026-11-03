const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const file=path.join(__dirname,'../js/admin-parejas.js');
const sql=path.join(__dirname,'../sql/SQL_63_Alta_solo_inscripciones_abiertas.sql');
test('Alta en Admin requiere inscripciones abiertas y revisa estado antes del INSERT',()=>{
 const s=fs.readFileSync(file,'utf8');
 assert.match(s,/registrationAllowsNewPair\(t\)/);assert.match(s,/status !== "registration_open"/);
 assert.match(s,/!registrationAllowsNewPair\(latest\)/);assert.match(s,/addButton\.disabled = true/);
});
test('Sin bypass del botón para torneos borrador',()=>{
 const s=fs.readFileSync(file,'utf8');
 assert.match(s,/Para agregar parejas, primero abrí las inscripciones/);
 assert.match(s,/registration_opens_at,registration_closes_at/);
});
