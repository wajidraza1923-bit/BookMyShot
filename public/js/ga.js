/**
 * Google Analytics 4 — BookMyShot
 * Measurement ID: G-2GY5VLHCX2
 * Auto-injects gtag.js and tracks page views.
 */
(function() {
  var GA_ID = 'G-2GY5VLHCX2';

  // Inject gtag.js script
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();
