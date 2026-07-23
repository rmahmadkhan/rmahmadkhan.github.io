(function () {
  'use strict';

  // ---- tiny templating engine -------------------------------------------
  // Supported attributes on any element inside a template:
  //   data-text="path"            -> element.textContent = resolve(path)
  //   data-attr-<name>="path"     -> element.setAttribute(name, resolve(path))
  //   data-slot="name"            -> marks an element as a named extension point
  //   data-thumb="path"           -> if path resolves to a truthy value (an image
  //                                  URL), replaces the element's placeholder
  //                                  <svg data-striped-svg> child with a real <img>
  //                                  pointing at that URL; otherwise leaves the
  //                                  striped placeholder in place
  // Supported on a top-level <template> element:
  //   data-repeat="path"          -> path must resolve to an array; clones the
  //                                  template's content once per item, binding
  //                                  paths relative to that item ("." = item itself)
  //   data-repeat-count="path"    -> path must resolve to a number; clones the
  //                                  template's content that many times, with
  //                                  no data context (for placeholder grids)

  function resolve(data, path) {
    if (path === '.' || path === '') return data;
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, data);
  }

  function bindElement(el, data) {
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name === 'data-text') {
        el.textContent = resolve(data, attr.value);
      } else if (attr.name.indexOf('data-attr-') === 0) {
        var attrName = attr.name.slice('data-attr-'.length);
        el.setAttribute(attrName, resolve(data, attr.value));
      } else if (attr.name === 'data-thumb') {
        var imageUrl = resolve(data, attr.value);
        var placeholder = el.querySelector('svg[data-striped-svg]');
        if (imageUrl && placeholder) {
          var img = document.createElement('img');
          img.className = placeholder.getAttribute('class');
          img.src = imageUrl;
          img.alt = '';
          placeholder.replaceWith(img);
        }
      }
    }
  }

  function renderTemplate(fragmentRoot, data) {
    // fragmentRoot is a DocumentFragment-like container already cloned into the DOM.
    // Expand any <template data-repeat="..."> or <template data-repeat-count="...">
    var templates = fragmentRoot.querySelectorAll('template[data-repeat], template[data-repeat-count]');
    templates.forEach(function (tpl) {
      var frag = document.createDocumentFragment();
      if (tpl.hasAttribute('data-repeat')) {
        var items = resolve(data, tpl.getAttribute('data-repeat')) || [];
        items.forEach(function (item) {
          var clone = document.importNode(tpl.content, true);
          bindDeep(clone, item);
          frag.appendChild(clone);
        });
      } else {
        var count = resolve(data, tpl.getAttribute('data-repeat-count')) || 0;
        for (var i = 0; i < count; i++) {
          var clone2 = document.importNode(tpl.content, true);
          frag.appendChild(clone2);
        }
      }
      tpl.replaceWith(frag);
    });
  }

  function bindDeep(node, data) {
    // node is a DocumentFragment; bind its own elements, then recurse into
    // any nested repeat templates using the same (item-scoped) data.
    var elements = node.querySelectorAll('*');
    for (var i = 0; i < elements.length; i++) {
      bindElement(elements[i], data);
    }
    renderTemplate(node, data);
  }

  // ---- site-wide chrome ----------------------------------------------------

  var ICONS = {
    github: '<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.26 5.69.41.36.78 1.06.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>',
    x: '<path d="M13.53 10.62 20.7 2.5h-1.7l-6.23 7.04L7.8 2.5H2.2l7.52 10.7L2.2 21.5h1.7l6.58-7.44 5.25 7.44h5.6l-7.82-10.88Zm-2.33 2.63-.76-1.06L4.4 3.74h2.6l4.9 6.85.76 1.06 6.37 8.9h-2.6l-5.23-7.3Z"/>',
    linkedin: '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.94v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45Z"/>',
    instagram: '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07ZM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.31-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14c-.3.76-.5 1.63-.56 2.91C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.66.66 1.34 1.07 2.13 1.38.76.3 1.63.5 2.91.56C8.33 24 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z"/>',
    facebook: '<path d="M22.5 12a10.5 10.5 0 1 0-12.14 10.38v-7.34H7.9V12h2.46V9.86c0-2.43 1.45-3.78 3.67-3.78 1.06 0 2.17.19 2.17.19v2.39h-1.22c-1.2 0-1.58.75-1.58 1.52V12h2.69l-.43 3.04h-2.26v7.34A10.5 10.5 0 0 0 22.5 12Z"/>',
    stackoverflow: '<path d="M17.36 20.2v-5.38h1.8V22H4.36v-7.18h1.8v5.38ZM7.9 14.16l8.82 1.85.37-1.77-8.82-1.85Zm1.16-4.2 8.16 3.8.76-1.63-8.16-3.81Zm2.28-4.02 6.92 5.76 1.15-1.38-6.92-5.76ZM15.5 2l-1.45 1.08 5.4 7.24 1.45-1.08ZM7.72 18h9v-1.8h-9Z"/>',
    email: '<path d="M2 5.5h20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm1.4 1.8 8.6 6.45 8.6-6.45H3.4Zm17.6 1.5-8.09 6.07a1 1 0 0 1-1.22 0L3.6 8.8v9.2h17.4V8.8Z"/>'
  };

  function renderSocialRow(container, socials) {
    container.innerHTML = '';
    socials.forEach(function (s) {
      var a = document.createElement('a');
      a.className = 'social-icon';
      a.href = s.url;
      a.title = s.label;
      a.target = '_blank';
      var iconPath = ICONS[s.icon] || '';
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + iconPath + '</svg>';
      container.appendChild(a);
    });
  }

  function fillSlots(root, ctx) {
    var slots = root.querySelectorAll('[data-slot]');
    slots.forEach(function (el) {
      var name = el.getAttribute('data-slot');
      if (name === 'socials') {
        renderSocialRow(el, ctx.site.socials);
      } else if (name === 'email-link') {
        el.setAttribute('href', 'mailto:' + ctx.site.email);
      }
    });
  }

  function attachStripedSvgs(root) {
    var svgs = root.querySelectorAll('svg[data-striped-svg]');
    svgs.forEach(function (svg, i) {
      var patternId = 'stripe-' + i + '-' + Math.random().toString(36).slice(2);
      svg.innerHTML =
        '<defs><pattern id="' + patternId + '" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
        '<rect width="8" height="8" fill="#eeeeec"></rect>' +
        '<line x1="0" y1="0" x2="0" y2="8" stroke="#d8d8d4" stroke-width="4"></line></pattern></defs>' +
        '<rect width="72" height="72" fill="url(#' + patternId + ')"></rect>';
    });
  }

  function attachAccordions(root) {
    var items = root.querySelectorAll('.accordion-item');
    items.forEach(function (item) {
      var header = item.querySelector('.accordion-header');
      var body = item.querySelector('.accordion-body');
      var chevron = item.querySelector('.accordion-chevron');
      function toggle() {
        var isOpen = item.classList.toggle('open');
        body.style.display = isOpen ? 'block' : 'none';
        if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      }
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
      var orgLink = header.querySelector('.accordion-org-link');
      if (orgLink) {
        orgLink.addEventListener('click', function (e) { e.stopPropagation(); });
      }
    });
  }

  function attachCarousels(root) {
    root.querySelectorAll('.carousel').forEach(function (carousel) {
      var track = carousel.querySelector('.carousel-track');
      var prev = carousel.querySelector('.carousel-prev');
      var next = carousel.querySelector('.carousel-next');
      if (!track) return;

      function cardStep() {
        var card = track.querySelector(':scope > *');
        return card ? card.getBoundingClientRect().width + 14 : track.clientWidth;
      }

      function maxScroll() {
        return track.scrollWidth - track.clientWidth;
      }

      function updateNavState() {
        var max = maxScroll();
        if (prev) prev.disabled = track.scrollLeft <= 1;
        if (next) next.disabled = track.scrollLeft >= max - 1;
        carousel.classList.toggle('carousel-single-page', max <= 1);
      }

      if (prev) prev.addEventListener('click', function () {
        track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
      });
      if (next) next.addEventListener('click', function () {
        track.scrollBy({ left: cardStep(), behavior: 'smooth' });
      });

      track.addEventListener('scroll', updateNavState);
      window.addEventListener('resize', updateNavState);

      updateNavState();
    });
  }

  var ROLE_ROTATE_INTERVAL_MS = 2500;
  var activeRoleRotatorTimers = [];

  function teardownRoleRotators() {
    activeRoleRotatorTimers.forEach(function (id) { clearInterval(id); });
    activeRoleRotatorTimers = [];
  }

  function attachRoleRotators(root) {
    root.querySelectorAll('.role-rotator').forEach(function (rotator) {
      var items = rotator.querySelectorAll('.role-rotator-item');
      if (items.length === 0) return;
      var index = 0;
      items[0].classList.add('is-active');
      if (items.length < 2) return;

      var timer = setInterval(function () {
        var current = items[index];
        var nextIndex = (index + 1) % items.length;
        var nextItem = items[nextIndex];

        current.classList.remove('is-active');
        current.classList.add('is-exiting');
        nextItem.classList.add('is-active');

        setTimeout(function () {
          current.classList.remove('is-exiting');
        }, 550);

        index = nextIndex;
      }, ROLE_ROTATE_INTERVAL_MS);
      activeRoleRotatorTimers.push(timer);
    });
  }

  function attachPersonaAndJumpLinks(root, goTo) {
    root.querySelectorAll('[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goTo(btn.getAttribute('data-page'));
      });
    });
  }

  // ---- page loading & routing ----------------------------------------------

  var cache = {};

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url);
      return r.json();
    });
  }

  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url);
      return r.text();
    });
  }

  function loadPage(pageId) {
    if (cache[pageId]) return Promise.resolve(cache[pageId]);
    return Promise.all([
      fetchText('pages/' + pageId + '/template.html'),
      fetchJSON('pages/' + pageId + '/data.json')
    ]).then(function (results) {
      cache[pageId] = { template: results[0], data: results[1] };
      return cache[pageId];
    });
  }

  function main() {
    var appEl = document.getElementById('app');
    var brandBtn = document.getElementById('brandBtn');
    var navLinks = document.getElementById('navLinks');
    var overviewBtn = document.getElementById('overviewBtn');
    var siteFooter = document.getElementById('siteFooter');
    var socialRowFooter = document.getElementById('socialRowFooter');

    fetchJSON('site.json').then(function (site) {
      brandBtn.textContent = site.brand;
      renderSocialRow(socialRowFooter, site.socials);

      var validPageIds = site.pages.map(function (p) { return p.id; });

      function render(pageId) {
        loadPage(pageId).then(function (page) {
          teardownRoleRotators();
          appEl.innerHTML = page.template;
          bindDeep(appEl, page.data);
          fillSlots(appEl, { site: site });
          attachStripedSvgs(appEl);
          attachAccordions(appEl);
          attachCarousels(appEl);
          attachRoleRotators(appEl);
          attachPersonaAndJumpLinks(appEl, goTo);

          var isLanding = pageId === site.landingPage;
          appEl.classList.toggle('is-landing', isLanding);
          brandBtn.classList.toggle('invisible', isLanding);
          navLinks.classList.toggle('invisible', isLanding);
          siteFooter.classList.toggle('hidden', isLanding);

          navLinks.querySelectorAll('.jump-link').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
          });

          window.scrollTo(0, 0);
        });
      }

      function goTo(pageId) {
        var targetPath = pageId === site.landingPage ? '/' : '/' + pageId;
        if (location.pathname === targetPath) {
          render(pageId);
        } else {
          history.pushState({ pageId: pageId }, '', targetPath);
          render(pageId);
        }
      }

      function pageIdFromPath() {
        var id = location.pathname.replace(/^\/+|\/+$/g, '');
        return validPageIds.indexOf(id) !== -1 ? id : site.landingPage;
      }

      window.addEventListener('popstate', function () {
        render(pageIdFromPath());
      });

      site.pages.filter(function (p) { return p.showInNav; }).forEach(function (p) {
        var btn = document.createElement('button');
        btn.className = 'jump-link';
        btn.setAttribute('data-page', p.id);
        btn.textContent = p.navLabel;
        btn.addEventListener('click', function () { goTo(p.id); });
        navLinks.appendChild(btn);
      });

      brandBtn.addEventListener('click', function () { goTo(site.landingPage); });
      overviewBtn.addEventListener('click', function () { goTo(site.landingPage); });

      render(pageIdFromPath());
    });
  }

  // ---- theme toggle ----------------------------------------------------

  function initTheme() {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    toggle.querySelectorAll('.theme-toggle-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var choice = btn.getAttribute('data-theme-choice');
        document.documentElement.setAttribute('data-theme', choice);
        localStorage.setItem('theme', choice);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    main();
    initTheme();
  });
})();
