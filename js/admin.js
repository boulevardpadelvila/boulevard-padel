/* Boulevard Pádel — Portal Admin (acceso y recuperación). */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panels = ['login-panel', 'request-panel', 'recovery-panel', 'dashboard-panel', 'loading-panel'].map($);
  let operation = false;
  let recoveryMode = false;
  const show = (id) => panels.forEach((p) => { p.hidden = p.id !== id; });
  const display = (id, text, success = false) => {
    const el = $(id); el.textContent = text; el.hidden = !text; el.classList.toggle('success', success);
  };
  const recoveryInUrl = () =>
    new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery' ||
    new URLSearchParams(location.search).get('type') === 'recovery';

  async function getAdminProfile(user) {
    const { data, error } = await supabaseClient.from('profiles')
      .select('full_name, role, active').eq('id', user.id).maybeSingle();
    if (error) throw new Error('No pudimos verificar los permisos del administrador.');
    if (!data || data.role !== 'admin' || data.active !== true) return null;
    return data;
  }
  async function verifySession() {
    if (recoveryMode) { show('recovery-panel'); return; }
    show('loading-panel');
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (recoveryMode) { show('recovery-panel'); return; }
      if (error || !user) { show('login-panel'); return; }
      const profile = await getAdminProfile(user);
      if (recoveryMode) { show('recovery-panel'); return; }
      if (!profile) {
        await supabaseClient.auth.signOut();
        display('login-message', 'Esta cuenta no tiene permiso para administrar Boulevard Pádel.');
        show('login-panel'); return;
      }
      $('admin-name').textContent = profile.full_name || user.email || 'Acceso autorizado';
      show('dashboard-panel');
    } catch (error) {
      display('login-message', error.message || 'No se pudo verificar el acceso.');
      show('login-panel');
    }
  }

  // Supabase procesa el enlace de recuperación al iniciar su cliente.
  // El evento evita mostrar el panel cuando se abre ese enlace.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      show('recovery-panel');
    }
  });

  $('forgot-button').addEventListener('click', () => {
    $('request-email').value = $('email').value.trim();
    display('request-message', ''); show('request-panel');
  });
  $('request-back').addEventListener('click', () => show('login-panel'));

  $('request-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (operation) return;
    operation = true; $('request-button').disabled = true;
    display('request-message', '');
    try {
      const email = $('request-email').value.trim();
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/admin/index.html`,
      });
      if (error) throw error;
      display('request-message', 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña. Revisá también spam.', true);
    } catch (error) {
      display('request-message', 'No se pudo enviar el enlace. Esperá un momento e intentá nuevamente.');
    } finally { operation = false; $('request-button').disabled = false; }
  });

  $('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (operation) return;
    const password = $('new-password').value;
    if (password.length < 12) { display('recovery-message', 'Usá al menos 12 caracteres.'); return; }
    if (password !== $('confirm-password').value) {
      display('recovery-message', 'Las contraseñas no coinciden.'); return;
    }
    operation = true; $('recovery-button').disabled = true;
    display('recovery-message', '');
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user || !recoveryMode) throw new Error('El enlace no es válido o ya venció. Solicitá uno nuevo.');
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      // Al finalizar la recuperación, exigir un nuevo inicio de sesión.
      await supabaseClient.auth.signOut();
      recoveryMode = false;
      history.replaceState(null, '', location.pathname);
      $('new-password').value = ''; $('confirm-password').value = '';
      display('login-message', 'Contraseña actualizada. Ahora podés ingresar.', true);
      show('login-panel');
    } catch (error) {
      display('recovery-message', error.message || 'No se pudo guardar la contraseña.');
    } finally { operation = false; $('recovery-button').disabled = false; }
  });

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (operation) return;
    operation = true; $('login-button').disabled = true;
    $('login-button').textContent = 'Ingresando…'; display('login-message', '');
    try {
      const email = $('email').value.trim(), password = $('password').value;
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Correo o contraseña incorrectos, o acceso no disponible.');
      $('password').value = '';
      await verifySession();
    } catch (error) {
      display('login-message', error.message || 'No se pudo iniciar sesión.'); show('login-panel');
    } finally { operation = false; $('login-button').disabled = false; $('login-button').textContent = 'Ingresar'; }
  });
  $('logout-button').addEventListener('click', async () => {
    if (operation) return;
    operation = true; $('logout-button').disabled = true;
    try { await supabaseClient.auth.signOut(); display('login-message', ''); show('login-panel'); }
    finally { $('logout-button').disabled = false; operation = false; }
  });

  // Durante el canje de tokens, mantener visible el estado de verificación.
  if (recoveryInUrl()) show('loading-panel');
  verifySession();
})();
