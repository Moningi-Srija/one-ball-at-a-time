(function loadRouteManifest() {
  const isDemo = window.location.pathname.replace(/\/+$/, '') === '/demo';
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.id = 'appManifest';
  manifest.href = isDemo ? '/demo-manifest.webmanifest' : '/manifest.webmanifest';
  document.head.appendChild(manifest);
}());
