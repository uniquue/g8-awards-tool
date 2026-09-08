(() => {
  const splash = document.getElementById('splash');
  const surfaces = [...document.querySelectorAll('body > header, body > main')];
  surfaces.forEach(surface => { surface.inert = true; });
  document.body.classList.add('splash-active');
  splash.classList.add('playing');
  const finish = () => {
    splash.remove();
    surfaces.forEach(surface => { surface.inert = false; });
    document.body.classList.remove('splash-active');
  };
  setTimeout(finish, 7000);
})();
