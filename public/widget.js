;(function() {
  'use strict';

  function init() {
    // Trouver le script courant ou tous les scripts avec data-boutique
    var allScripts = document.querySelectorAll('script[data-boutique]');
    
    if (allScripts.length === 0) {
      // Chercher le script par son src
      var scripts = document.querySelectorAll('script[src*="widget.js"]');
      scripts.forEach(function(s) {
        if (s.getAttribute('data-boutique')) {
          allScripts = [s];
        }
      });
    }

    allScripts.forEach(function(script) {
      var boutique = script.getAttribute('data-boutique');
      var produit = script.getAttribute('data-produit') || '';
      var produitNom = script.getAttribute('data-produit-nom') || '';
      var produitPrix = script.getAttribute('data-produit-prix') || '';
      var produitImage = script.getAttribute('data-produit-image') || '';
      var mode = script.getAttribute('data-mode') || 'form';
      var couleur = script.getAttribute('data-couleur') || '#F59E0B';

      if (!boutique) return;

      // Créer le conteneur juste après le script
      var container = document.createElement('div');
      container.style.cssText = 'width:100%;max-width:480px;margin:0 auto;font-family:Inter,-apple-system,sans-serif;';
      script.parentNode.insertBefore(container, script.nextSibling);

      // Construire l'URL de l'iframe
      var baseUrl = script.src.replace('/widget.js', '');
      var params = 'boutique=' + encodeURIComponent(boutique) +
        '&mode=' + encodeURIComponent(mode) +
        '&couleur=' + encodeURIComponent(couleur);
      
      if (produit) params += '&produit=' + encodeURIComponent(produit);
      if (produitNom) params += '&produit_nom=' + encodeURIComponent(produitNom);
      if (produitPrix) params += '&produit_prix=' + encodeURIComponent(produitPrix);
      if (produitImage) params += '&produit_image=' + encodeURIComponent(produitImage);

      var iframeSrc = baseUrl + '/widget?' + params;

      // Style animation
      var style = document.createElement('style');
      style.textContent = '@keyframes sw-spin{to{transform:rotate(360deg)}} @keyframes sw-fade{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(style);

      // Loader
      var loader = document.createElement('div');
      loader.style.cssText = 'text-align:center;padding:32px 16px;';
      loader.innerHTML = '<div style="width:32px;height:32px;border:3px solid #1E1E2E;border-top-color:' + couleur + ';border-radius:50%;animation:sw-spin 0.8s linear infinite;margin:0 auto 12px;"></div>' +
        '<p style="color:#9898B0;font-size:13px;margin:0;font-family:Inter,sans-serif;">Chargement du formulaire...</p>';
      container.appendChild(loader);

      // Créer l'iframe
      var iframe = document.createElement('iframe');
      iframe.src = iframeSrc;
      iframe.style.cssText = 'width:100%;border:none;border-radius:12px;min-height:480px;display:none;animation:sw-fade 0.3s ease;';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      iframe.title = 'Commande Shipivo';

      iframe.onload = function() {
        loader.style.display = 'none';
        iframe.style.display = 'block';
      };

      container.appendChild(iframe);

      // Resize automatique
      window.addEventListener('message', function(e) {
        try {
          if (e.data && e.data.type === 'shipivo-resize') {
            iframe.style.minHeight = (e.data.height + 20) + 'px';
          }
          if (e.data && e.data.type === 'shipivo-success') {
            var ev = new CustomEvent('shipivo:order_placed', { detail: e.data.order });
            document.dispatchEvent(ev);
          }
        } catch(err) {}
      });

      // Powered by
      var powered = document.createElement('p');
      powered.style.cssText = 'text-align:center;font-size:11px;color:#999;margin:6px 0 0 0;font-family:Inter,sans-serif;';
      powered.innerHTML = 'Propulsé par <a href="https://shipivo.app" target="_blank" style="color:' + couleur + ';text-decoration:none;font-weight:600;">Shipivo</a>';
      container.appendChild(powered);
    });
  }

  // Lancer quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
