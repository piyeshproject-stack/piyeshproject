/**
 * Custom Right-Click / Long-Press Context Menu
 * Include this file on all pages EXCEPT checkout.html
 */
(function () {
  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '* {',
    '  -webkit-touch-callout: none;',
    '  -webkit-user-select: none;',
    '  -khtml-user-select: none;',
    '  -moz-user-select: none;',
    '  -ms-user-select: none;',
    '  user-select: none;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    'input, textarea, [contenteditable] {',
    '  -webkit-user-select: text !important;',
    '  user-select: text !important;',
    '}',
    '#customContextMenu a:hover, #customContextMenu div:hover {',
    '  background: rgba(255,77,77,0.07);',
    '}',
    '#customContextMenu a:first-child:hover { border-radius: 12px 12px 0 0; }',
    '#customContextMenu > div:last-child:hover { border-radius: 0 0 12px 12px; }',
    '#customContextMenu {',
    '  animation: ctxFadeIn 0.12s ease;',
    '}',
    '@keyframes ctxFadeIn {',
    '  from { opacity: 0; transform: scale(0.92); }',
    '  to   { opacity: 1; transform: scale(1); }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // Inject HTML
  var menu = document.createElement('div');
  menu.id = 'customContextMenu';
  menu.style.cssText = [
    'position:fixed',
    'z-index:99999',
    'background:#fff',
    'border-radius:12px',
    'box-shadow:0 10px 40px rgba(0,0,0,0.18)',
    'padding:8px 0',
    'min-width:185px',
    'display:none',
    'border:1px solid rgba(0,0,0,0.08)'
  ].join(';');

  menu.innerHTML = [
    '<a href="shop.html" style="display:flex;align-items:center;gap:12px;padding:10px 16px;font-size:14px;font-weight:500;color:#1a1a1a;transition:background 0.15s;text-decoration:none;">',
    '  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    '  Shop Now',
    '</a>',
    '<a href="cart.html" style="display:flex;align-items:center;gap:12px;padding:10px 16px;font-size:14px;font-weight:500;color:#1a1a1a;transition:background 0.15s;text-decoration:none;">',
    '  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    '  View Cart',
    '</a>',
    '<a href="#" id="ctxWhatsapp" style="display:flex;align-items:center;gap:12px;padding:10px 16px;font-size:14px;font-weight:500;color:#1a1a1a;transition:background 0.15s;text-decoration:none;">',
    '  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    '  Contact Now',
    '</a>',
    '<hr style="margin:6px 0;border:none;border-top:1px solid #eee;">',
    '<div onclick="window.location.reload()" style="display:flex;align-items:center;gap:12px;padding:10px 16px;font-size:14px;font-weight:500;color:#1a1a1a;transition:background 0.15s;cursor:pointer;">',
    '  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    '  Refresh',
    '</div>'
  ].join('');

  document.body.appendChild(menu);

  // Helper to update WhatsApp link from siteSettings if available
  function updateWaLink() {
    var wa = document.getElementById('ctxWhatsapp');
    if (!wa) return;
    if (typeof siteSettings !== 'undefined' && siteSettings.whatsapp_number) {
      wa.href = 'https://wa.me/' + siteSettings.whatsapp_number;
    } else if (typeof settings !== 'undefined' && settings.whatsapp_number) {
      wa.href = 'https://wa.me/' + settings.whatsapp_number;
    }
  }

  // Show menu
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    updateWaLink();

    var x = e.clientX;
    var y = e.clientY;
    var mw = 195, mh = 210;

    if (x + mw > window.innerWidth)  x = window.innerWidth  - mw - 8;
    if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;

    menu.style.left    = x + 'px';
    menu.style.top     = y + 'px';
    menu.style.display = 'block';
  });

  // Hide on click / scroll
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target)) menu.style.display = 'none';
  });
  window.addEventListener('scroll', function () {
    menu.style.display = 'none';
  }, { passive: true });

  // Mobile long-press → show context menu at touch position
  var _touchTimer = null;
  var _touchX = 0, _touchY = 0;
  var INTERACTIVE = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'];

  document.addEventListener('touchstart', function (e) {
    if (INTERACTIVE.includes(e.target.tagName)) return;
    _touchX = e.touches[0].clientX;
    _touchY = e.touches[0].clientY;

    _touchTimer = setTimeout(function () {
      updateWaLink();
      var x = _touchX, y = _touchY;
      var mw = 195, mh = 210;
      if (x + mw > window.innerWidth)  x = window.innerWidth  - mw - 8;
      if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
      menu.style.left    = x + 'px';
      menu.style.top     = y + 'px';
      menu.style.display = 'block';
    }, 500);
  }, { passive: true });

  document.addEventListener('touchend',   function () { clearTimeout(_touchTimer); }, { passive: true });
  document.addEventListener('touchmove',  function () { clearTimeout(_touchTimer); }, { passive: true });
  document.addEventListener('touchcancel',function () { clearTimeout(_touchTimer); }, { passive: true });
})();
