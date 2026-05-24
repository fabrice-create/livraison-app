// Shipivo Widget — v1.0
// Intégration formulaire de commande sur sites externes
;(function() {
  'use strict'

  // Trouver tous les scripts Shipivo sur la page
  var scripts = document.querySelectorAll('script[data-boutique]')
  
  scripts.forEach(function(script) {
    var boutique = script.getAttribute('data-boutique')
    var produit = script.getAttribute('data-produit') || ''
    var mode = script.getAttribute('data-mode') || 'form' // 'form' ou 'full'
    var couleur = script.getAttribute('data-couleur') || '#F59E0B'
    var langue = script.getAttribute('data-langue') || 'fr'

    if (!boutique) return

    // Créer le conteneur
    var container = document.createElement('div')
    container.id = 'shipivo-widget-' + Math.random().toString(36).slice(2)
    container.style.cssText = 'font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto;'
    script.parentNode.insertBefore(container, script.nextSibling)

    // Créer l'iframe
    var baseUrl = 'https://shipivo.app'
    var params = new URLSearchParams({
      boutique: boutique,
      mode: mode,
      couleur: couleur,
      langue: langue,
    })
    if (produit) params.set('produit', produit)

    var iframe = document.createElement('iframe')
    iframe.src = baseUrl + '/widget?' + params.toString()
    iframe.style.cssText = [
      'width: 100%',
      'border: none',
      'border-radius: 12px',
      'min-height: 400px',
      'display: block',
    ].join(';')
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('allowtransparency', 'true')
    iframe.title = 'Commande Shipivo'

    // Resize automatique selon le contenu
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'shipivo-resize' && e.data.id === container.id) {
        iframe.style.minHeight = e.data.height + 'px'
      }
      if (e.data && e.data.type === 'shipivo-success') {
        // Déclencher un event custom sur la page hôte
        var event = new CustomEvent('shipivo:order_placed', { detail: e.data.order })
        document.dispatchEvent(event)
      }
    })

    // Loader pendant le chargement
    var loader = document.createElement('div')
    loader.style.cssText = 'text-align:center;padding:32px;color:#9898B0;font-size:14px;'
    loader.innerHTML = '<div style="display:inline-block;width:24px;height:24px;border:3px solid #1E1E2E;border-top-color:' + couleur + ';border-radius:50%;animation:sw-spin 0.8s linear infinite;margin-bottom:8px;"></div><br>Chargement...'

    var style = document.createElement('style')
    style.textContent = '@keyframes sw-spin{to{transform:rotate(360deg)}}'
    document.head.appendChild(style)

    container.appendChild(loader)

    iframe.onload = function() {
      loader.style.display = 'none'
      container.appendChild(iframe)
      // Envoyer l'ID du container à l'iframe pour le resize
      iframe.contentWindow.postMessage({ type: 'shipivo-init', id: container.id }, '*')
    }

    // Créer iframe en arrière plan
    var tempDiv = document.createElement('div')
    tempDiv.style.display = 'none'
    document.body.appendChild(tempDiv)
    tempDiv.appendChild(iframe)

    // Powered by Shipivo
    var powered = document.createElement('p')
    powered.style.cssText = 'text-align:center;font-size:11px;color:#55556A;margin:8px 0 0 0;'
    powered.innerHTML = 'Propulsé par <a href="https://shipivo.app" target="_blank" style="color:' + couleur + ';text-decoration:none;font-weight:600;">Shipivo</a>'
    container.appendChild(powered)
  })
})()
