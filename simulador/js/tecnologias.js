// O que um site usa por trás: o navegador olha pistas que ele já recebeu (cabeçalhos, scripts, meta tags, variáveis
// da página) e compara com esta lista. Nada sai deste computador. Um site pode esconder ou imitar pistas.

// recolhe as pistas dentro da página; só devolve texto curto
export const SCRIPT_TECNOLOGIAS = `(() => {
  const GLOBAIS = ['React', 'ReactDOM', '__REACT_DEVTOOLS_GLOBAL_HOOK__', '__NEXT_DATA__', 'next', 'Vue', '__VUE__', '__NUXT__', '$nuxt', 'angular', 'getAllAngularRootElements', 'ng', '__svelte', 'jQuery', 'Alpine', 'htmx', 'THREE', 'gsap', 'TweenMax', 'd3', '_', 'moment', 'axios', 'Swiper', 'wp', 'wc_add_to_cart_params', 'elementorFrontend', 'Drupal', 'Joomla', 'Shopify', 'Wix', 'wixBiSession', 'Squarespace', 'Webflow', 'ga', 'gtag', 'dataLayer', 'google_tag_manager', 'fbq', 'hj', 'Stripe', 'grecaptcha', 'hcaptcha', 'Matomo', '_paq', 'Stimulus', 'Turbo', 'Ember', 'preact', 'bootstrap', 'webpackChunk', 'swup', 'litElementVersions'];
  const dentro = c => { try { return c(); } catch { return null; } };
  const versoes = {
    jQuery: dentro(() => jQuery.fn.jquery), React: dentro(() => React.version), Vue: dentro(() => Vue.version), Angular: dentro(() => angular.version.full || document.querySelector('[ng-version]')?.getAttribute('ng-version')),
    'Three.js': dentro(() => THREE.REVISION), GSAP: dentro(() => gsap.version), D3: dentro(() => d3.version), Lodash: dentro(() => _.VERSION), Moment: dentro(() => moment.version), Bootstrap: dentro(() => bootstrap.Tooltip.VERSION), Alpine: dentro(() => Alpine.version), htmx: dentro(() => htmx.version), 'Next.js': dentro(() => next.version), Ember: dentro(() => Ember.VERSION),
  };
  const lista = s => [...document.querySelectorAll(s)];
  return {
    gerador: lista('meta[name="generator" i]').map(m => m.content).slice(0, 4),
    scripts: [...document.scripts].map(s => s.src).filter(Boolean).slice(0, 200),
    estilos: lista('link[rel="stylesheet"]').map(l => l.href).slice(0, 80),
    previas: lista('link[rel="preconnect"], link[rel="dns-prefetch"]').map(l => l.href).slice(0, 30),
    globais: GLOBAIS.filter(g => { try { return g in window; } catch { return false; } }),
    versoes: Object.fromEntries(Object.entries(versoes).filter(([, v]) => v != null).map(([k, v]) => [k, String(v).slice(0, 24)])),
    dom: { reactRoot: !!document.querySelector('[data-reactroot], #__next, [data-rsbuild]'), vue: !!document.querySelector('[data-v-app], [data-server-rendered]'), ngVersion: !!document.querySelector('[ng-version]'), svelte: !!document.querySelector('[class*="svelte-"]'), astro: !!document.querySelector('astro-island, [data-astro-cid]'), tailwind: !!document.querySelector('[class*="sm:"], [class*="md:"], [class*="lg:"]'), fontAwesome: !!document.querySelector('i.fa, i.fas, i.far, i.fab, i.fa-solid'), elementor: !!document.querySelector('.elementor'), wp: !!document.querySelector('link[href*="/wp-content/"], script[src*="/wp-includes/"]'), htmx: !!document.querySelector('[hx-get], [hx-post]'), alpine: !!document.querySelector('[x-data]'), lit: !!document.querySelector('[lit-part]') },
    cookies: document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean).slice(0, 60),
  };
})()`;

const t = (nome, categoria, github, sinais) => ({ nome, categoria, github, ...sinais });
// github: "dono/repositório" quando o projeto é aberto e o endereço é conhecido; vazio nos outros
export const TECNOLOGIAS = [
  t('React', 'Interface', 'facebook/react', { global: ['React', '__REACT_DEVTOOLS_GLOBAL_HOOK__'], dom: 'reactRoot', script: /react(-dom)?(\.production)?(\.min)?\.js/i }),
  t('Next.js', 'Framework', 'vercel/next.js', { global: ['__NEXT_DATA__', 'next'], script: /\/_next\/static\//, cabecalho: { 'x-powered-by': /next\.js/i } }),
  t('Vue', 'Interface', 'vuejs/core', { global: ['Vue', '__VUE__'], dom: 'vue', script: /\/vue(@[\d.]+)?(\.global|\.runtime)?(\.min)?\.js/i }),
  t('Nuxt', 'Framework', 'nuxt/nuxt', { global: ['__NUXT__', '$nuxt'], script: /\/_nuxt\//, cabecalho: { 'x-powered-by': /nuxt/i } }),
  t('Angular', 'Interface', 'angular/angular', { global: ['angular', 'getAllAngularRootElements'], dom: 'ngVersion' }),
  t('Svelte', 'Interface', 'sveltejs/svelte', { global: ['__svelte'], dom: 'svelte' }),
  t('Astro', 'Framework', 'withastro/astro', { dom: 'astro', gerador: /^astro/i }),
  t('Gatsby', 'Framework', 'gatsbyjs/gatsby', { gerador: /gatsby/i }),
  t('Lit', 'Interface', 'lit/lit', { global: ['litElementVersions'], dom: 'lit' }),
  t('Preact', 'Interface', 'preactjs/preact', { global: ['preact'], script: /preact(\.min)?\.js/i }),
  t('Ember', 'Framework', 'emberjs/ember.js', { global: ['Ember'] }),
  t('Stimulus', 'Interface', 'hotwired/stimulus', { global: ['Stimulus'] }),
  t('Turbo', 'Interface', 'hotwired/turbo', { global: ['Turbo'] }),
  t('Alpine', 'Interface', 'alpinejs/alpine', { global: ['Alpine'], dom: 'alpine' }),
  t('htmx', 'Interface', 'bigskysoftware/htmx', { global: ['htmx'], dom: 'htmx' }),
  t('jQuery', 'Bibliotecas', 'jquery/jquery', { global: ['jQuery'], script: /jquery[-.\d]*(\.min)?\.js/i }),
  t('Three.js', 'Bibliotecas', 'mrdoob/three.js', { global: ['THREE'], script: /three(\.module)?(\.min)?\.js/i }),
  t('GSAP', 'Bibliotecas', 'greensock/GSAP', { global: ['gsap', 'TweenMax'], script: /gsap(\.min)?\.js/i }),
  t('swup', 'Bibliotecas', 'swup/swup', { global: ['swup'], script: /swup(\.umd|\.min)*\.js/i }),
  t('D3', 'Bibliotecas', 'd3/d3', { global: ['d3'], script: /\/d3(\.v\d)?(\.min)?\.js/i }),
  t('Lodash', 'Bibliotecas', 'lodash/lodash', { script: /lodash(\.min)?\.js/i }),
  t('Moment', 'Bibliotecas', 'moment/moment', { global: ['moment'], script: /moment(\.min)?\.js/i }),
  t('Axios', 'Bibliotecas', 'axios/axios', { global: ['axios'], script: /axios(\.min)?\.js/i }),
  t('Swiper', 'Bibliotecas', 'nolimits4web/swiper', { global: ['Swiper'], script: /swiper[^/]*\.js/i }),
  t('Bootstrap', 'Estilo', 'twbs/bootstrap', { global: ['bootstrap'], estilo: /bootstrap[^/]*\.css/i, script: /bootstrap[^/]*\.js/i }),
  t('Tailwind CSS', 'Estilo', 'tailwindlabs/tailwindcss', { dom: 'tailwind', estilo: /tailwind/i, script: /cdn\.tailwindcss\.com/ }),
  t('Font Awesome', 'Estilo', 'FortAwesome/Font-Awesome', { dom: 'fontAwesome', estilo: /font-?awesome/i, script: /fontawesome|kit\.fontawesome/i }),
  t('Google Fonts', 'Estilo', '', { estilo: /fonts\.googleapis\.com/, previa: /fonts\.(googleapis|gstatic)\.com/ }),
  t('WordPress', 'Plataforma', 'WordPress/WordPress', { gerador: /wordpress/i, dom: 'wp', global: ['wp'], cookie: /^wordpress_|^wp-settings/ }),
  t('WooCommerce', 'Plataforma', 'woocommerce/woocommerce', { gerador: /woocommerce/i, global: ['wc_add_to_cart_params'], script: /\/woocommerce\//, cookie: /^woocommerce_/ }),
  t('Elementor', 'Plataforma', 'elementor/elementor', { gerador: /elementor/i, global: ['elementorFrontend'], dom: 'elementor' }),
  t('Drupal', 'Plataforma', 'drupal/drupal', { gerador: /drupal/i, global: ['Drupal'], cabecalho: { 'x-generator': /drupal/i } }),
  t('Joomla', 'Plataforma', 'joomla/joomla-cms', { gerador: /joomla/i, global: ['Joomla'] }),
  t('Ghost', 'Plataforma', 'TryGhost/Ghost', { gerador: /^ghost/i }),
  t('Hugo', 'Plataforma', 'gohugoio/hugo', { gerador: /^hugo/i }),
  t('Jekyll', 'Plataforma', 'jekyll/jekyll', { gerador: /jekyll/i }),
  t('Shopify', 'Plataforma', '', { global: ['Shopify'], script: /cdn\.shopify\.com/, cabecalho: { 'x-shopify-stage': /./ } }),
  t('Wix', 'Plataforma', '', { global: ['wixBiSession', 'Wix'], gerador: /wix\.com/i, script: /static\.parastorage\.com/ }),
  t('Squarespace', 'Plataforma', '', { global: ['Squarespace'], gerador: /squarespace/i }),
  t('Webflow', 'Plataforma', '', { global: ['Webflow'], gerador: /webflow/i }),
  t('Nginx', 'Servidor', 'nginx/nginx', { cabecalho: { server: /nginx/i } }),
  t('Apache', 'Servidor', 'apache/httpd', { cabecalho: { server: /apache/i } }),
  t('PHP', 'Servidor', 'php/php-src', { cabecalho: { 'x-powered-by': /php/i }, cookie: /^PHPSESSID$/ }),
  t('Express', 'Servidor', 'expressjs/express', { cabecalho: { 'x-powered-by': /express/i } }),
  t('Laravel', 'Servidor', 'laravel/laravel', { cookie: /^laravel_session$/ }),
  t('Django', 'Servidor', 'django/django', { cookie: /^csrftoken$/ }),
  t('Ruby on Rails', 'Servidor', 'rails/rails', { cabecalho: { 'x-runtime': /^[\d.]+$/ } }),
  t('Cloudflare', 'Entrega', '', { cabecalho: { server: /cloudflare/i, 'cf-ray': /./ } }),
  t('Vercel', 'Entrega', '', { cabecalho: { server: /vercel/i, 'x-vercel-id': /./ } }),
  t('Netlify', 'Entrega', '', { cabecalho: { server: /netlify/i, 'x-nf-request-id': /./ } }),
  t('CloudFront', 'Entrega', '', { cabecalho: { via: /cloudfront/i, 'x-amz-cf-id': /./ } }),
  t('Fastly', 'Entrega', '', { cabecalho: { 'x-fastly-request-id': /./, 'x-served-by': /cache-/i } }),
  t('Google Tag Manager', 'Medição', '', { global: ['google_tag_manager'], script: /googletagmanager\.com\/gtm\.js/ }),
  t('Google Analytics', 'Medição', '', { global: ['ga', 'gtag'], script: /google-analytics\.com|googletagmanager\.com\/gtag/ }),
  t('Meta Pixel', 'Medição', '', { global: ['fbq'], script: /connect\.facebook\.net/ }),
  t('Hotjar', 'Medição', '', { global: ['hj'], script: /static\.hotjar\.com/ }),
  t('Matomo', 'Medição', 'matomo-org/matomo', { global: ['Matomo', '_paq'], script: /matomo\.js|piwik\.js/ }),
  t('Stripe', 'Serviços', '', { global: ['Stripe'], script: /js\.stripe\.com/ }),
  t('reCAPTCHA', 'Serviços', '', { global: ['grecaptcha'], script: /recaptcha/i }),
  t('hCaptcha', 'Serviços', '', { global: ['hcaptcha'], script: /hcaptcha\.com/ }),
];
export const ORDEM_CATEGORIAS = ['Framework', 'Interface', 'Plataforma', 'Bibliotecas', 'Estilo', 'Servidor', 'Entrega', 'Medição', 'Serviços'];

// compara as pistas com a lista; "por" diz como soube, para a pessoa conferir
export function detectar(sinais, cabecalhos = {}) {
  const s = sinais || {}, cab = Object.fromEntries(Object.entries(cabecalhos || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const achados = [];
  for (const x of TECNOLOGIAS) {
    const por = new Set();
    if (x.global?.some(g => s.globais?.includes(g))) por.add('variável da página');
    if (x.dom && s.dom?.[x.dom]) por.add('código da página');
    if (x.script && s.scripts?.some(u => x.script.test(u))) por.add('script');
    if (x.estilo && s.estilos?.some(u => x.estilo.test(u))) por.add('estilo');
    if (x.previa && s.previas?.some(u => x.previa.test(u))) por.add('conexão prévia');
    if (x.gerador && s.gerador?.some(g => x.gerador.test(g))) por.add('meta generator');
    if (x.cookie && s.cookies?.some(c => x.cookie.test(c))) por.add('cookie');
    if (x.cabecalho && Object.entries(x.cabecalho).some(([k, re]) => cab[k] != null && re.test(cab[k]))) por.add('cabeçalho');
    if (!por.size) continue;
    const bruta = s.versoes?.[x.nome];
    achados.push({ nome: x.nome, categoria: x.categoria, github: x.github, versao: /^[\w.+-]{1,24}$/.test(bruta || '') ? bruta : '', por: [...por] });
  }
  return achados.sort((a, b) => ORDEM_CATEGORIAS.indexOf(a.categoria) - ORDEM_CATEGORIAS.indexOf(b.categoria));
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function htmlTecnologias(achados) {
  if (!achados.length) return '<p class="nota">Nenhuma tecnologia conhecida apareceu nas pistas desta página.</p>';
  const grupos = ORDEM_CATEGORIAS.map(c => [c, achados.filter(a => a.categoria === c)]).filter(([, l]) => l.length);
  return grupos.map(([c, l]) => `<p class="dev-tec-cat">${c}</p><ul class="dev-tec">${l.map(a => `<li title="Visto por: ${esc(a.por.join(', '))}">
      ${a.github ? `<a href="#" data-tec-link="https://github.com/${esc(a.github)}">${esc(a.nome)}</a>` : `<span>${esc(a.nome)}</span>`}${a.versao ? ` <small>${esc(a.versao)}</small>` : ''}<small class="dev-tec-por">${esc(a.por.join(', '))}</small></li>`).join('')}</ul>`).join('')
    + '<p class="nota">Pistas vistas neste computador. Um site pode esconder ou imitar alguma delas.</p>';
}
