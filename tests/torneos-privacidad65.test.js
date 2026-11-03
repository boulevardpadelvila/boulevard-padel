const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../js/admin-torneos.js'),'utf8');
const publicJs=fs.readFileSync(path.join(__dirname,'../js/torneos-public.js'),'utf8');
const pairs=fs.readFileSync(path.join(__dirname,'../js/admin-parejas.js'),'utf8');

test('inscripciones abiertas preservan visibilidad pública',()=>{
  assert.match(js,/status: "registration_open",\s*\/\/ No modificar is_published/);
  assert.doesNotMatch(js,/status: "registration_open",\s*is_published: true/);
  assert.match(js,/confirm: opening \? "Abrir inscripciones"/);
  assert.match(js,/\.eq\("is_published", t\.is_published\)/);
  assert.doesNotMatch(js,/Primero cerrá las inscripciones y después ocultá el torneo/);
});
test('la inscripción privada conserva la validación y el público solo muestra publicados',()=>{
  assert.match(pairs,/registrationAllowsNewPair/);
  assert.match(pairs,/t\.status !== "registration_open"/);
  assert.match(publicJs,/\.eq\("is_published", true\)/);
  assert.match(js,/const opening = !registrationOpen\(t\)/);
});
