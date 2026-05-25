;(function(){
  'use strict';

  window.Shipivo = window.Shipivo || {};

  window.Shipivo.loadEmbeds = function() {
    document.querySelectorAll('iframe[data-shipivo-src]:not([src])').forEach(function(iframe) {
      iframe.src = iframe.getAttribute('data-shipivo-src');

      // Supprimer la scrollbar
      iframe.style.overflow = 'hidden';
      iframe.setAttribute('scrolling', 'no');

      // Écouter les messages de resize depuis l'iframe
      window.addEventListener('message', function(e) {
        try {
          if (e.data && e.data.type === 'shipivo-resize' && e.data.height) {
            iframe.style.height = (parseInt(e.data.height) + 32) + 'px';
            iframe.style.minHeight = 'unset';
          }
        } catch(err) {}
      });
    });
  };

  window.Shipivo.loadEmbeds();

})();
