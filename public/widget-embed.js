;(function(){
  'use strict';
  window.Shipivo = window.Shipivo || {};
  window.Shipivo.loadEmbeds = function() {
    document.querySelectorAll('iframe[data-shipivo-src]:not([src])').forEach(function(iframe) {
      iframe.src = iframe.getAttribute('data-shipivo-src');
    });
  };
  window.Shipivo.loadEmbeds();
})();
