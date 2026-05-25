;(function() {
  'use strict';

  var SHIPIVO_URL = 'https://shipivo.app';

  var DIAL_CODES = [
    {code:'+228',flag:'🇹🇬',name:'TG'},{code:'+221',flag:'🇸🇳',name:'SN'},
    {code:'+225',flag:'🇨🇮',name:'CI'},{code:'+229',flag:'🇧🇯',name:'BJ'},
    {code:'+234',flag:'🇳🇬',name:'NG'},{code:'+233',flag:'🇬🇭',name:'GH'},
    {code:'+237',flag:'🇨🇲',name:'CM'},{code:'+212',flag:'🇲🇦',name:'MA'},
    {code:'+33',flag:'🇫🇷',name:'FR'},{code:'+32',flag:'🇧🇪',name:'BE'},
    {code:'+44',flag:'🇬🇧',name:'UK'},{code:'+1',flag:'🇺🇸',name:'US'},
  ];

  function injectStyles(color) {
    if (document.getElementById('shipivo-styles')) return;
    var css = [
      '.sw-form{background:#0F0F18;border-radius:16px;padding:24px 20px;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;width:100%;box-sizing:border-box;border:1px solid #1C1C2E;}',
      '.sw-form *{box-sizing:border-box;}',
      '.sw-title{color:#F4F4F8;font-size:16px;font-weight:700;margin:0 0 4px;}',
      '.sw-sub{color:#6E6E90;font-size:13px;margin:0 0 20px;}',
      '.sw-field{margin-bottom:14px;}',
      '.sw-label{display:block;color:#9898B0;font-size:12px;font-weight:500;margin-bottom:6px;}',
      '.sw-req{color:COLOR;}',
      '.sw-input{width:100%;background:#07070C;border:1px solid #1C1C2E;border-radius:8px;padding:11px 12px;color:#F4F4F8;font-size:14px;outline:none;transition:border-color 0.2s;font-family:inherit;}',
      '.sw-input:focus{border-color:COLOR;}',
      '.sw-row{display:flex;gap:8px;}',
      '.sw-select{background:#0F0F18;border:1px solid #1C1C2E;border-radius:8px;padding:11px 8px;color:#F4F4F8;font-size:13px;outline:none;cursor:pointer;flex-shrink:0;}',
      '.sw-btn{width:100%;background:COLOR;border:none;border-radius:10px;padding:14px;color:#000;font-size:15px;font-weight:800;cursor:pointer;margin-top:6px;font-family:inherit;transition:opacity 0.2s;}',
      '.sw-btn:hover{opacity:0.9;}',
      '.sw-btn:disabled{opacity:0.5;cursor:not-allowed;}',
      '.sw-error{color:#F87171;font-size:13px;padding:8px 12px;background:rgba(248,113,113,0.08);border-radius:8px;margin-bottom:10px;}',
      '.sw-success{text-align:center;padding:32px 20px;}',
      '.sw-success-icon{font-size:48px;margin-bottom:12px;}',
      '.sw-success-title{color:#F4F4F8;font-size:18px;font-weight:700;margin:0 0 8px;}',
      '.sw-success-msg{color:#6E6E90;font-size:14px;margin:0;line-height:1.6;}',
      '.sw-powered{text-align:center;font-size:11px;color:#3E3E55;margin:10px 0 0;font-family:inherit;}',
      '.sw-powered a{color:COLOR;text-decoration:none;font-weight:600;}',
      '.sw-loader{width:24px;height:24px;border:3px solid #1C1C2E;border-top-color:COLOR;border-radius:50%;animation:sw-spin 0.7s linear infinite;margin:0 auto 10px;}',
      '.sw-loading-wrap{text-align:center;padding:32px;color:#6E6E90;font-size:13px;font-family:inherit;}',
      '@keyframes sw-spin{to{transform:rotate(360deg)}}',
    ].join('\n').replace(/COLOR/g, color);
    var style = document.createElement('style');
    style.id = 'shipivo-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createForm(container, config) {
    var boutique = config.boutique;
    var color = config.color || '#F59E0B';
    var produit = config.produit || '';
    var prix = config.prix || 0;
    var apiBase = config.apiBase || SHIPIVO_URL;

    injectStyles(color);

    // Loader initial
    container.innerHTML = '<div class="sw-form"><div class="sw-loading-wrap"><div class="sw-loader"></div>Chargement...</div></div>';

    // Charger infos boutique
    fetch(apiBase + '/api/widget/order?boutique=' + encodeURIComponent(boutique))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.tenant) {
          container.innerHTML = '<div class="sw-form"><p style="color:#F87171;font-size:13px;text-align:center;">Boutique introuvable.</p></div>';
          return;
        }
        var tenant = data.tenant;
        var livraison = tenant.delivery_fee || 0;
        var devise = tenant.currency || 'FCFA';
        var total = (prix > 0 ? prix : 0) + livraison;
        var dialCode = '+228';

        // Détecter pays
        fetch('https://ipapi.co/json/', {signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined})
          .then(function(r){return r.json();})
          .then(function(geo){
            var map = {TG:'+228',SN:'+221',CI:'+225',BJ:'+229',NG:'+234',GH:'+233',CM:'+237',MA:'+212',FR:'+33',BE:'+32',GB:'+44',US:'+1'};
            if (map[geo.country_code]) dialCode = map[geo.country_code];
          }).catch(function(){})
          .finally(function(){ renderForm(); });

        function renderForm() {
          var dialOpts = DIAL_CODES.map(function(d) {
            return '<option value="' + d.code + '"' + (d.code === dialCode ? ' selected' : '') + '>' + d.flag + ' ' + d.code + '</option>';
          }).join('');

          var produitField = produit ? '' :
            '<div class="sw-field"><label class="sw-label">Produit souhaité <span class="sw-req">*</span></label>' +
            '<input class="sw-input" id="sw-produit" placeholder="Ex: Crème massage 50ml..." /></div>';

          var totalLine = total > 0 ?
            '<p style="color:#A0A0BC;font-size:12px;margin:0 0 18px;">Total : <strong style="color:' + color + '">' + total.toLocaleString('fr-FR') + ' ' + devise + '</strong>' +
            (livraison > 0 ? ' (dont ' + livraison.toLocaleString('fr-FR') + ' livraison)' : '') + '</p>' : '';

          container.innerHTML =
            '<div class="sw-form" id="sw-form-wrap">' +
              '<p class="sw-title">' + tenant.name + '</p>' +
              '<p class="sw-sub">Paiement à la livraison 🚚</p>' +
              (produit ? '<div style="background:#07070C;border:1px solid #1C1C2E;border-radius:10px;padding:12px;margin-bottom:16px;"><p style="color:#F4F4F8;font-weight:700;font-size:14px;margin:0 0 2px;">' + produit + '</p><p style="color:' + color + ';font-weight:800;font-size:15px;margin:0;">' + (prix > 0 ? prix.toLocaleString('fr-FR') + ' ' + devise : '') + '</p></div>' : '') +
              totalLine +
              '<div id="sw-error-msg"></div>' +
              produitField +
              '<div class="sw-field"><label class="sw-label">Prénom et nom <span class="sw-req">*</span></label><input class="sw-input" id="sw-name" placeholder="Ex: Kofi Mensah" /></div>' +
              '<div class="sw-field"><label class="sw-label">Téléphone WhatsApp <span class="sw-req">*</span></label><div class="sw-row"><select class="sw-select" id="sw-dial">' + dialOpts + '</select><input class="sw-input" id="sw-phone" placeholder="90 00 00 00" type="tel" style="flex:1;" /></div></div>' +
              '<div class="sw-field"><label class="sw-label">Ville <span class="sw-req">*</span></label><input class="sw-input" id="sw-city" placeholder="Ex: Lomé, Abidjan..." /></div>' +
              '<div class="sw-field"><label class="sw-label">Adresse / Quartier</label><input class="sw-input" id="sw-address" placeholder="Ex: Adidogomé, rue 12" /></div>' +
              '<div class="sw-field"><label class="sw-label">Note (optionnel)</label><textarea class="sw-input" id="sw-note" rows="2" placeholder="Instructions spéciales..." style="resize:none;font-family:inherit;"></textarea></div>' +
              '<button class="sw-btn" id="sw-submit">✅ Commander — Paiement à la livraison</button>' +
              '<p class="sw-powered">Propulsé par <a href="https://shipivo.app" target="_blank">Shipivo</a></p>' +
            '</div>';

          // Focus styles
          container.querySelectorAll('.sw-input').forEach(function(el) {
            el.addEventListener('focus', function(){ this.style.borderColor = color; });
            el.addEventListener('blur', function(){ this.style.borderColor = '#1C1C2E'; });
          });

          // Submit
          document.getElementById('sw-submit').addEventListener('click', function() {
            var btn = this;
            var name = document.getElementById('sw-name').value.trim();
            var phone = document.getElementById('sw-phone').value.trim();
            var dial = document.getElementById('sw-dial').value;
            var city = document.getElementById('sw-city').value.trim();
            var address = document.getElementById('sw-address').value.trim();
            var note = document.getElementById('sw-note').value.trim();
            var produitVal = produit || (document.getElementById('sw-produit') ? document.getElementById('sw-produit').value.trim() : '');
            var errEl = document.getElementById('sw-error-msg');

            errEl.innerHTML = '';
            if (!name) { errEl.innerHTML = '<div class="sw-error">⚠️ Prénom et nom requis.</div>'; return; }
            if (!phone) { errEl.innerHTML = '<div class="sw-error">⚠️ Numéro de téléphone requis.</div>'; return; }
            if (!city) { errEl.innerHTML = '<div class="sw-error">⚠️ Ville requise.</div>'; return; }
            if (!produitVal) { errEl.innerHTML = '<div class="sw-error">⚠️ Produit requis.</div>'; return; }

            btn.disabled = true;
            btn.textContent = 'Envoi en cours...';

            var fullPhone = dial + phone.replace(/^0/, '');

            fetch(apiBase + '/api/widget/order', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                boutique_slug: boutique,
                customer_name: name,
                phone: fullPhone,
                city: city,
                address: address,
                product: produitVal,
                quantity: 1,
                amount: total || undefined,
                note: note || undefined,
              })
            })
            .then(function(r){ return r.json(); })
            .then(function(res) {
              if (res.success) {
                container.innerHTML =
                  '<div class="sw-form"><div class="sw-success">' +
                  '<div class="sw-success-icon">✅</div>' +
                  '<p class="sw-success-title">Commande envoyée !</p>' +
                  '<p class="sw-success-msg">Merci <strong style="color:#F4F4F8">' + name + '</strong> !<br/>Notre équipe vous appellera bientôt au <strong style="color:#F4F4F8">' + fullPhone + '</strong>.</p>' +
                  '</div><p class="sw-powered">Propulsé par <a href="https://shipivo.app" target="_blank">Shipivo</a></p></div>';
              } else {
                errEl.innerHTML = '<div class="sw-error">⚠️ ' + (res.error || 'Erreur. Réessaie.') + '</div>';
                btn.disabled = false;
                btn.textContent = '✅ Commander — Paiement à la livraison';
              }
            })
            .catch(function() {
              errEl.innerHTML = '<div class="sw-error">⚠️ Erreur réseau. Vérifie ta connexion.</div>';
              btn.disabled = false;
              btn.textContent = '✅ Commander — Paiement à la livraison';
            });
          });
        }
      })
      .catch(function() {
        container.innerHTML = '<div class="sw-form"><p style="color:#F87171;font-size:13px;text-align:center;">Impossible de charger le formulaire.</p></div>';
      });
  }

  function init() {
    // Chercher tous les scripts avec data-boutique
    var scripts = document.querySelectorAll('script[data-boutique][src*="widget-form.js"]');
    if (scripts.length === 0) {
      scripts = document.querySelectorAll('script[src*="widget-form.js"]');
    }

    scripts.forEach(function(script) {
      var boutique = script.getAttribute('data-boutique');
      if (!boutique) return;

      var apiBase = script.src.replace('/widget-form.js', '');
      var color = script.getAttribute('data-couleur') || '#F59E0B';
      var produit = script.getAttribute('data-produit') || '';
      var prix = parseFloat(script.getAttribute('data-prix') || '0') || 0;
      var target = script.getAttribute('data-target'); // ID d'un conteneur existant

      var container;
      if (target) {
        container = document.getElementById(target);
      }
      if (!container) {
        container = document.createElement('div');
        script.parentNode.insertBefore(container, script.nextSibling);
      }

      createForm(container, { boutique: boutique, color: color, produit: produit, prix: prix, apiBase: apiBase });
    });

    // Support initialisation manuelle : window.ShipivoWidget.init({...})
    window.ShipivoWidget = {
      init: function(config) {
        var container = config.container;
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        createForm(container, config);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
