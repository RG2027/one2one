const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const content = window.ONE2ONE_CONTENT;
const BASE = window.location.pathname.includes("/services/") ? "../" : "";
const PARALLAX = { items: [], inView: new Map(), speeds: new Map(), io: null, raf: 0, bound: false };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function normalizePath(p) {
  if (!p) return "";
  return p.replace(/^(\.\/)+/g, "").replace(/^(\.\.\/)+/g, "").replace(/^\//, "");
}

function ensureMeta() {
  if (!content?.brand) return;
  const head = document.head;

  const ensureMetaTag = (attr, key, contentValue) => {
    let el = head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      head.appendChild(el);
    }
    el.setAttribute("content", contentValue);
  };

  const ensureLink = (rel, href) => {
    let el = head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      head.appendChild(el);
    }
    el.setAttribute("href", href);
  };

  const desc = head.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const baseUrl = (content.brand.website || "").replace(/\/+$/, "");
  const path = window.location.pathname.endsWith("/") ? window.location.pathname + "index.html" : window.location.pathname;
  const canonical = baseUrl ? baseUrl + path : window.location.href;

  const preload = document.body.dataset.preload || "";
  const ogImage = baseUrl ? baseUrl + "/" + normalizePath(preload || "assets/media/hero.webp") : preload;

  ensureMetaTag("name", "robots", "index,follow,max-image-preview:large");
  ensureMetaTag("name", "application-name", content.brand.name);
  ensureMetaTag("name", "author", content.brand.name);
  ensureMetaTag("name", "referrer", "strict-origin-when-cross-origin");
  ensureMetaTag("name", "format-detection", "telephone=no");
  ensureLink("canonical", canonical);

  const page = document.body.dataset.page || "website";
  const ogType = page === "insight" ? "article" : "website";

  ensureMetaTag("property", "og:site_name", content.brand.name);
  ensureMetaTag("property", "og:title", document.title);
  ensureMetaTag("property", "og:description", desc || "ONE 2 ONE DESIGN — luxury interiors and turnkey execution across India.");
  ensureMetaTag("property", "og:type", ogType);
  ensureMetaTag("property", "og:url", canonical);
  ensureMetaTag("property", "og:image", ogImage);

  ensureMetaTag("name", "twitter:card", "summary_large_image");
  ensureMetaTag("name", "twitter:title", document.title);
  ensureMetaTag("name", "twitter:description", desc || "ONE 2 ONE DESIGN — luxury interiors and turnkey execution across India.");
  ensureMetaTag("name", "twitter:image", ogImage);
}

function ensureJsonLd(id, json) {
  if (!id || !json) return;
  const head = document.head;
  let el = head.querySelector(`script[type="application/ld+json"][data-jsonld="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.dataset.jsonld = id;
    head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

function formatSqft(areaSqft) {
  if (areaSqft == null) return "—";
  return Number(areaSqft).toLocaleString("en-IN") + " sq.ft.";
}

function formatDays(days) {
  if (days == null) return "—";
  return `${days} days`;
}

function qsParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function setScrollProgress() {
  const doc = document.documentElement;
  const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
  const p = clamp(window.scrollY / max, 0, 1);
  doc.style.setProperty("--scrollP", p.toFixed(4));
}

function initPointerLight() {
  if (prefersReduced) return;
  const docStyle = document.documentElement.style;
  let raf = 0;
  function setXY(x, y) {
    docStyle.setProperty("--mx", x + "px");
    docStyle.setProperty("--my", y + "px");
  }
  window.addEventListener(
    "pointermove",
    (e) => {
      if (raf) return;
      const x = e.clientX;
      const y = e.clientY;
      raf = requestAnimationFrame(() => {
        setXY(x, y);
        raf = 0;
      });
    },
    { passive: true }
  );
  setXY(window.innerWidth * 0.5, window.innerHeight * 0.35);
}

function initVelocityBlur() {
  if (prefersReduced) return;
  const docStyle = document.documentElement.style;
  let lastY = window.scrollY;
  let lastT = performance.now();
  function tick(now) {
    const y = window.scrollY;
    const dt = Math.max(1, now - lastT);
    const v = Math.abs((y - lastY) / dt);
    const vel = clamp(v * 24, 0, 10);
    docStyle.setProperty("--vel", vel.toFixed(3));
    lastY = y;
    lastT = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initSceneHue() {
  const nodes = $$("[data-scene-hue]");
  if (!nodes.length || prefersReduced) return;

  const docStyle = document.documentElement.style;
  let target = 44;
  let current = 44;

  function computeTarget() {
    const cy = window.innerHeight * 0.5;
    let best = null;
    let bestDist = Infinity;
    nodes.forEach((n) => {
      const r = n.getBoundingClientRect();
      const center = r.top + r.height * 0.5;
      const d = Math.abs(center - cy);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    });
    const hue = best ? Number(best.dataset.sceneHue || "44") : 44;
    if (!Number.isFinite(hue)) return;
    target = hue;
  }

  function tick() {
    current = lerp(current, target, 0.06);
    docStyle.setProperty("--sceneHue", String(current.toFixed(2)));
    requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", computeTarget, { passive: true });
  window.addEventListener("resize", computeTarget, { passive: true });
  computeTarget();
  requestAnimationFrame(tick);
}

function initParallax() {
  const newItems = $$('[data-parallax]:not([data-parallax-init="1"])');
  if ((!newItems.length && PARALLAX.bound) || prefersReduced) return;

  newItems.forEach((el) => {
    el.dataset.parallaxInit = "1";
    const raw = el.getAttribute("data-parallax");
    const speed = raw === "" ? 0.14 : Number(raw);
    PARALLAX.speeds.set(el, Number.isFinite(speed) ? speed : 0.14);
    PARALLAX.inView.set(el, false);
    PARALLAX.items.push(el);
  });

  if (!PARALLAX.io) {
    PARALLAX.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => PARALLAX.inView.set(e.target, e.isIntersecting));
      },
      { rootMargin: "220px 0px 220px 0px", threshold: 0.01 }
    );
  }
  newItems.forEach((el) => PARALLAX.io.observe(el));

  const tick = () => {
    PARALLAX.raf = 0;
    const vh = window.innerHeight || 1;
    PARALLAX.items.forEach((el) => {
      if (!PARALLAX.inView.get(el)) return;
      const r = el.getBoundingClientRect();
      const center = r.top + r.height * 0.5;
      const p = clamp((center - vh * 0.5) / vh, -1, 1);
      const amp = Math.min(64, Math.max(20, r.height * 0.14));
      const ty = -p * amp * (PARALLAX.speeds.get(el) || 0.14);
      el.style.setProperty("--py", `${ty.toFixed(2)}px`);
    });
  };

  const onScroll = () => {
    if (PARALLAX.raf) return;
    PARALLAX.raf = requestAnimationFrame(tick);
  };

  if (!PARALLAX.bound) {
    PARALLAX.bound = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }
  onScroll();
}

function initChapters() {
  const root = $("[data-chapters]");
  if (!root || prefersReduced) {
    const items = $$("[data-chapter]", root || document);
    const media = $$("[data-chapter-media]", root || document);
    items.forEach((n, i) => n.classList.toggle("is-active", i === 0));
    media.forEach((n, i) => n.classList.toggle("is-active", i === 0));
    if (root) root.style.setProperty("--chapP", "0");
    return;
  }

  const items = $$("[data-chapter]", root);
  const media = $$("[data-chapter-media]", root);
  if (!items.length || items.length !== media.length) return;

  const docStyle = document.documentElement.style;
  let raf = 0;
  let inView = false;
  let currentP = 0;
  let targetP = 0;

  const setActive = (idx) => {
    items.forEach((n, i) => n.classList.toggle("is-active", i === idx));
    media.forEach((n, i) => n.classList.toggle("is-active", i === idx));
  };

  const updateTarget = () => {
    const rect = root.getBoundingClientRect();
    const start = window.scrollY + rect.top;
    const end = start + rect.height - window.innerHeight;
    const max = Math.max(1, end - start);
    const p = clamp((window.scrollY - start) / max, 0, 1);
    targetP = p;
    if (!raf && inView) raf = requestAnimationFrame(tick);
  };

  const tick = () => {
    raf = 0;
    currentP = lerp(currentP, targetP, 0.14);
    root.style.setProperty("--chapP", currentP.toFixed(4));
    const n = items.length;
    const s = clamp(currentP * n, 0, n - 0.0001);
    const idx = Math.floor(s);
    setActive(idx);

    media.forEach((m, i) => {
      const d = i - s;
      const o = clamp(1 - Math.abs(d) * 1.15, 0, 1);
      const ty = d * 18;
      const sc = 1.02 + Math.abs(d) * 0.02;
      m.style.opacity = String(o.toFixed(3));
      m.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(3)})`;
    });

    const hue = Number(root.dataset.sceneHue || "44");
    if (Number.isFinite(hue)) docStyle.setProperty("--sceneHue", String(lerp(hue, hue + 12, Math.sin(currentP * Math.PI)).toFixed(2)));

    if (Math.abs(targetP - currentP) > 0.001 && inView) raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        inView = e.isIntersecting;
        if (inView) {
          updateTarget();
          if (!raf) raf = requestAnimationFrame(tick);
        }
      });
    },
    { threshold: 0.1 }
  );
  io.observe(root);

  window.addEventListener("scroll", updateTarget, { passive: true });
  window.addEventListener("resize", updateTarget, { passive: true });
  updateTarget();
  setActive(0);
}

function initShowcases() {
  const roots = $$("[data-showcase]");
  if (!roots.length) return;

  roots.forEach((root) => {
    if (root.dataset.showcaseInit === "1") return;
    root.dataset.showcaseInit = "1";
    const cards = $$("[data-showcase-card]", root);
    const media = $$("[data-showcase-media]", root);
    if (!cards.length || cards.length !== media.length) return;

    const setActive = (idx) => {
      cards.forEach((n, i) => n.classList.toggle("is-active", i === idx));
      media.forEach((n, i) => n.classList.toggle("is-active", i === idx));
      const p = cards.length > 1 ? idx / (cards.length - 1) : 0;
      root.style.setProperty("--showP", p.toFixed(4));
    };

    if (prefersReduced) {
      setActive(0);
      return;
    }

    let raf = 0;
    let active = -1;

    const update = () => {
      raf = 0;
      const cy = window.innerHeight * 0.5;
      let best = 0;
      let bestDist = Infinity;

      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const center = r.top + r.height * 0.5;
        const d = Math.abs(center - cy);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });

      if (best !== active) {
        active = best;
        setActive(active);
      }

      const ar = cards[active].getBoundingClientRect();
      const local = clamp((cy - ar.top) / Math.max(1, ar.height), 0, 1);
      root.style.setProperty("--showLocal", local.toFixed(4));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  });
}

function preloadImages(urls) {
  const uniq = Array.from(new Set(urls.filter(Boolean)));
  if (!uniq.length) return Promise.resolve({ loaded: 0, total: 0 });
  let loaded = 0;
  const total = uniq.length;
  const bar = $("#preloaderBar");
  const pct = $("#preloaderPct");

  function update() {
    const p = Math.round((loaded / total) * 100);
    if (bar) bar.style.setProperty("--loadP", p + "%");
    if (pct) pct.textContent = String(p);
  }

  update();

  const tasks = uniq.map(
    (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = () => {
          loaded += 1;
          update();
          resolve();
        };
        img.onerror = () => {
          loaded += 1;
          update();
          resolve();
        };
        img.src = src;
      })
  );

  return Promise.all(tasks).then(() => ({ loaded, total }));
}

function initPreloader() {
  const pre = $("#preloader");
  if (!pre || prefersReduced) {
    if (pre) pre.remove();
    return Promise.resolve();
  }

  const urls = [];
  const pagePreload = document.body.dataset.preload;
  if (pagePreload) urls.push(pagePreload);
  urls.push("logo.jpeg");

  $$("img").slice(0, 6).forEach((img) => {
    const src = img.getAttribute("src");
    if (src) urls.push(src);
  });

  const candidates = content?.gallery?.slice(0, 6).map((x) => x.src) || [];
  urls.push(...candidates);

  return preloadImages(urls).then(() => {
    pre.classList.add("is-done");
    setTimeout(() => pre.remove(), 700);
  });
}

function openMenu(open) {
  document.body.classList.toggle("is-menu-open", open);
  const btn = $("#menuBtn");
  const menu = $("#menu");
  if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  if (menu) menu.setAttribute("aria-hidden", open ? "false" : "true");
}

function initMenu() {
  const btn = $("#menuBtn");
  const close = $("#menuClose");
  const menu = $("#menu");
  if (btn) btn.addEventListener("click", () => openMenu(!document.body.classList.contains("is-menu-open")));
  if (close) close.addEventListener("click", () => openMenu(false));
  if (menu)
    menu.addEventListener("click", (e) => {
      if (e.target === menu) openMenu(false);
    });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openMenu(false);
  });
}

function initDropdowns() {
  const items = $$(".nav-item[data-drop]");
  if (!items.length) return;

  const setExpanded = (it, expanded) => {
    const btn = $(".nav-link", it);
    if (btn && btn.tagName === "BUTTON") btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  const closeAll = () =>
    items.forEach((it) => {
      it.classList.remove("is-open");
      setExpanded(it, false);
    });

  items.forEach((it) => {
    const btn = $(".nav-link", it);
    if (!btn) return;
    const dropdown = $(".dropdown", it);
    const focusFirst = () => {
      const first = dropdown?.querySelector('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
    };

    const open = () => {
      closeAll();
      it.classList.add("is-open");
      setExpanded(it, true);
    };

    const toggle = () => {
      if (it.classList.contains("is-open")) closeAll();
      else open();
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        open();
        focusFirst();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeAll();
        btn.focus();
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item[data-drop]")) closeAll();
  });

  document.addEventListener("focusin", (e) => {
    if (!e.target.closest(".nav-item[data-drop]")) closeAll();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

function initReveal() {
  const nodes = $$("[data-reveal]");
  if (!nodes.length) return;
  if (prefersReduced) {
    nodes.forEach((n) => n.classList.add("in"));
    return;
  }

  const scopeRoots = new Map();
  nodes.forEach((n) => {
    if (n.dataset.revealDelay != null) return;
    const scope = n.closest("[data-reveal-stagger]");
    if (!scope) return;
    if (!scopeRoots.has(scope)) scopeRoots.set(scope, []);
    scopeRoots.get(scope).push(n);
  });
  scopeRoots.forEach((list) => {
    list.forEach((n, i) => {
      const ms = clamp(i * 70, 0, 420);
      n.style.transitionDelay = `${ms}ms`;
    });
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );
  nodes.forEach((n) => io.observe(n));
}

function initAnchors() {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (!hash || hash === "#") return;
      const id = decodeURIComponent(hash.slice(1));
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      openMenu(false);
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navH")) || 78;
      const y = el.getBoundingClientRect().top + window.scrollY - navH + 10;
      if (prefersReduced) window.scrollTo(0, y);
      else window.scrollTo({ top: y, behavior: "smooth" });
      history.pushState(null, "", hash);
    });
  });
}

function initPageTransitions() {
  const isInternal = (href) => {
    if (!href) return false;
    if (href.startsWith("#")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (/^https?:\/\//i.test(href)) return false;
    return true;
  };

  $$("a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!isInternal(href)) return;
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openMenu(false);
      if (prefersReduced) {
        location.href = href;
        return;
      }
      document.body.classList.add("is-leaving");
      setTimeout(() => {
        location.href = href;
      }, 220);
    });
  });
}

function setActiveNav() {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  $$('a[data-nav]').forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    const file = href.split("?")[0];
    const isPage = file === path || (path === "" && file.endsWith("index.html"));
    if (isPage) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function injectShell() {
  const headerRoot = $("#siteHeader");
  const footerRoot = $("#siteFooter");
  if (!content?.brand) return;

  const svcLinks = (content.services || [])
    .map(
      (s) =>
        `<a href="${BASE}services/${s.slug}.html" data-nav><b>${s.title}</b><small>${s.summary}</small></a>`
    )
    .join("");

  const primaryLinks = [
    { href: `${BASE}index.html`, label: "Home" },
    { href: `${BASE}projects.html`, label: "Projects" },
    { href: `${BASE}industries.html`, label: "Industries" },
    { href: `${BASE}process.html`, label: "Process" },
    { href: `${BASE}factory.html`, label: "Factory" },
    { href: `${BASE}team.html`, label: "Team" },
    { href: `${BASE}insights.html`, label: "Insights" },
    { href: `${BASE}careers.html`, label: "Careers" },
    { href: `${BASE}testimonials.html`, label: "Testimonials" },
    { href: `${BASE}gallery.html`, label: "Gallery" },
    { href: `${BASE}contact.html`, label: "Contact" },
  ];

  const menuLinks = primaryLinks
    .map((l) => `<a href="${l.href}" data-nav><span>${l.label}</span><span>↗</span></a>`)
    .join("");

  if (headerRoot) {
    headerRoot.innerHTML = `
      <header>
        <nav class="nav" aria-label="Primary">
          <a class="brand" href="${BASE}index.html" data-nav>
            <img src="${BASE}logo.jpeg" alt="${content.brand.name} logo" width="38" height="38" decoding="async" />
            <span class="txt">
              <strong>${content.brand.name}</strong>
              <span>${content.brand.tagline}</span>
            </span>
          </a>

          <div class="nav-links" aria-label="Site">
            <a class="nav-link" href="${BASE}index.html" data-nav>Home</a>

            <div class="nav-item" data-drop="services">
              <button class="nav-link" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="servicesDropdown">
                Services <span class="icon">⌄</span>
              </button>
              <div class="dropdown" id="servicesDropdown" role="menu" aria-label="Services">
                <div class="dropdown-panel">
                  <div class="dropdown-grid">
                    <div class="drop-links">${svcLinks}</div>
                    <aside class="drop-aside">
                      <h4>Design → Engineering → Execution</h4>
                      <p>Detailed service pages with workflows, feature grids, and premium storytelling modules.</p>
                      <a class="btn primary" href="${BASE}services.html" style="width: fit-content">All Services <span class="icon">→</span></a>
                    </aside>
                  </div>
                </div>
              </div>
            </div>

            <a class="nav-link" href="${BASE}projects.html" data-nav>Projects</a>
            <a class="nav-link" href="${BASE}about.html" data-nav>About</a>
            <a class="nav-link" href="${BASE}contact.html" data-nav>Contact</a>
          </div>

          <div class="nav-actions">
            <a class="btn primary" href="${BASE}contact.html">Let’s Design <span class="icon">→</span></a>
            <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">
              <span class="hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
            </button>
          </div>
        </nav>
      </header>

      <div class="menu" id="menu" aria-hidden="true">
        <div class="menu-panel" role="dialog" aria-modal="true" aria-label="Menu">
          <div class="menu-top">
            <strong>Navigation</strong>
            <button class="x" id="menuClose" aria-label="Close menu">✕</button>
          </div>
          <div class="menu-grid">
            <div class="menu-links">${menuLinks}</div>
            <aside class="menu-aside">
              <h4>${content.brand.shortName} execution platform</h4>
              <p>Luxury interior delivery with disciplined PMO, MEP coordination, and manufacturing mindset.</p>
              <div style="display:grid; gap:10px">
                <a class="btn primary" href="${BASE}contact.html">Request a Consultation <span class="icon">→</span></a>
                <a class="btn" href="${BASE}projects.html">Explore Projects <span class="icon">↘</span></a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    `;
  }

  if (footerRoot) {
    const socials = Object.entries(content.brand.social || {})
      .map(([k, v]) => (v && v !== "#" ? `<a href="${v}" target="_blank" rel="noreferrer">${k}</a>` : ""))
      .filter(Boolean)
      .join("");
    footerRoot.innerHTML = `
      <footer>
        <div class="foot">
          <div>
            <h3>Let’s Design Your Space</h3>
            <p>Premium interior design + execution with cinematic detailing, disciplined planning, and multi-city delivery capability.</p>
            <div class="accordion" style="margin-top: 14px">
              <details>
                <summary>Newsletter <span class="icon">+</span></summary>
                <div class="body">
                  <form class="form" id="newsletterForm" autocomplete="on">
                    <div class="row">
                      <div class="field">
                        <label for="newsletterEmail">Email</label>
                        <input id="newsletterEmail" name="email" type="email" placeholder="you@company.com" required />
                      </div>
                      <div class="field">
                        <label for="newsletterFocus">Focus</label>
                        <select id="newsletterFocus" name="focus">
                          <option value="Turnkey">Turnkey</option>
                          <option value="MEP">MEP</option>
                          <option value="Joinery">Joinery</option>
                          <option value="Workplaces">Workplaces</option>
                        </select>
                      </div>
                    </div>
                    <div class="hero-actions" style="margin-top: 12px">
                      <button class="btn primary" type="submit">Subscribe <span class="icon">→</span></button>
                      <a class="btn" href="${BASE}insights.html">Read insights <span class="icon">↗</span></a>
                    </div>
                  </form>
                </div>
              </details>
            </div>
            <div class="hero-actions" style="margin-top: 16px">
              <a class="btn primary" href="${BASE}contact.html">Start a Project <span class="icon">→</span></a>
              <a class="btn" href="${BASE}projects.html">View Projects <span class="icon">↘</span></a>
            </div>
            <div class="social">${socials}</div>
          </div>
          <div class="foot-meta">
            <div class="item">
              <small>Office</small>
              <div style="color: rgba(255,255,255,0.86); line-height: 1.6; font-size: 13px">
                ${content.brand.addressLine}
              </div>
            </div>
            <div class="item">
              <small>Contact</small>
              <div style="display:grid; gap:8px">
                <a href="tel:${content.brand.phoneE164}" style="color: rgba(255,255,255,0.88)">${content.brand.phoneDisplay}</a>
                <a href="${content.brand.website}" target="_blank" rel="noreferrer" style="color: rgba(255,255,255,0.82)">${content.brand.websiteDisplay}</a>
                <a href="mailto:${content.brand.email}" style="color: rgba(255,255,255,0.82)">${content.brand.email}</a>
              </div>
            </div>
          </div>
        </div>
        <div class="subtle">
          <span>© <span id="year"></span> ${content.brand.name}. All rights reserved.</span>
          <span>Premium cinematic UX • Dark luxury aesthetic</span>
        </div>
      </footer>
    `;
  }
}

function initFloating() {
  if (!content?.brand) return;
  const el = document.createElement("div");
  el.className = "floating";
  el.innerHTML = `
    <a class="fab" href="${content.brand.whatsapp}" target="_blank" rel="noreferrer" aria-label="WhatsApp">
      <strong>WA</strong>
    </a>
    <a class="fab" href="${BASE}contact.html" aria-label="Contact">
      <strong>✦</strong>
    </a>
  `;
  document.body.appendChild(el);
}

function initLightbox() {
  const lb = $("#lightbox");
  if (!lb) return;
  const img = $("#lightboxImg");
  const title = $("#lightboxTitle");
  const caption = $("#lightboxCaption");
  const count = $("#lightboxCount");
  const thumbs = $("#lightboxThumbs");
  const close = $("#lightboxClose");
  const next = $("#lightboxNext");
  const prev = $("#lightboxPrev");
  if (!img || !title || !close || !next || !prev) return;
  if (lb.dataset.lbInit === "1") return;
  lb.dataset.lbInit = "1";

  let idx = 0;
  let lastFocus = null;

  const getTiles = () => $$('.tile[data-src][data-lb="grid"]');

  function buildThumbs(tiles) {
    if (!thumbs) return;
    if (thumbs.dataset.count === String(tiles.length)) return;
    thumbs.dataset.count = String(tiles.length);
    thumbs.innerHTML = tiles
      .map(
        (t, i) => `
          <button class="lightbox-thumb" type="button" data-i="${i}" aria-label="${t.dataset.alt || `Image ${i + 1}`}">
            <img src="${t.dataset.src || ""}" alt="" loading="lazy" decoding="async" />
          </button>
        `
      )
      .join("");
  }

  function setActiveThumb(i) {
    if (!thumbs) return;
    $$(".lightbox-thumb", thumbs).forEach((b) => b.classList.toggle("is-active", Number(b.dataset.i) === i));
    const active = thumbs.querySelector(`.lightbox-thumb[data-i="${i}"]`);
    if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: prefersReduced ? "auto" : "smooth" });
  }

  function show(i, opts = {}) {
    const tiles = getTiles();
    if (!tiles.length) return;
    idx = (i + tiles.length) % tiles.length;
    const t = tiles[idx];
    const src = opts.src || t.dataset.src || "";
    const alt = opts.alt || t.dataset.alt || "Gallery image";
    img.src = src;
    img.alt = alt;
    title.textContent = alt || "Gallery";
    if (caption) caption.textContent = alt || "";
    if (count) count.textContent = `${idx + 1} / ${tiles.length}`;
    buildThumbs(tiles);
    setActiveThumb(idx);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lastFocus = document.activeElement;
    close.focus();
  }

  function hide() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }

  document.addEventListener("click", (e) => {
    const openSrc = e.target.closest("[data-open-src]");
    if (openSrc) {
      const tiles = getTiles();
      const src = openSrc.getAttribute("data-open-src") || "";
      const i = tiles.findIndex((t) => (t.dataset.src || "") === src);
      if (i >= 0) show(i);
      else show(0, { src, alt: openSrc.getAttribute("data-open-alt") || "Gallery" });
      return;
    }
    const tile = e.target.closest('.tile[data-src][data-lb="grid"]');
    if (!tile) return;
    const tiles = getTiles();
    const i = tiles.indexOf(tile);
    if (i >= 0) show(i);
  });

  document.addEventListener("keydown", (e) => {
    if (lb.classList.contains("open")) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    const tile = e.target.closest?.('.tile[data-src][data-lb="grid"]');
    if (!tile) return;
    e.preventDefault();
    const tiles = getTiles();
    const i = tiles.indexOf(tile);
    if (i >= 0) show(i);
  });

  if (thumbs) {
    thumbs.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".lightbox-thumb[data-i]");
      if (!btn) return;
      const i = Number(btn.dataset.i);
      if (!Number.isFinite(i)) return;
      show(i);
    });
  }

  close.addEventListener("click", hide);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) hide();
  });
  next.addEventListener("click", () => show(idx + 1));
  prev.addEventListener("click", () => show(idx - 1));
  window.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") hide();
    if (e.key === "ArrowRight") show(idx + 1);
    if (e.key === "ArrowLeft") show(idx - 1);
  });
}

function initSliders() {
  $$("[data-slider]").forEach((root) => {
    const track = $(".slider-track", root);
    const prev = $("[data-prev]", root);
    const next = $("[data-next]", root);
    if (!track || !prev || !next) return;
    const step = () => Math.max(280, track.clientWidth * 0.9);
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: prefersReduced ? "auto" : "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: prefersReduced ? "auto" : "smooth" }));
  });
}

function initContactForm() {
  const form = $("#contactForm");
  const note = $("#formNote");
  if (!form || !content?.brand) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    const subject = encodeURIComponent(`Project enquiry — ${content.brand.name}`);
    const body = encodeURIComponent(
      `Name: ${payload.name || ""}\nPhone: ${payload.phone || ""}\nEmail: ${payload.email || ""}\nCity: ${payload.city || ""}\nService: ${payload.service || ""}\n\nBrief:\n${payload.message || ""}\n`
    );
    window.location.href = `mailto:${content.brand.email}?subject=${subject}&body=${body}`;
    if (note) note.textContent = "Opening your email client with the enquiry details…";
  });
}

function initNewsletterForm() {
  const form = $("#newsletterForm");
  if (!form || !content?.brand) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    const subject = encodeURIComponent(`Newsletter — ${content.brand.name}`);
    const body = encodeURIComponent(`Email: ${payload.email || ""}\nFocus: ${payload.focus || ""}\n`);
    window.location.href = `mailto:${content.brand.email}?subject=${subject}&body=${body}`;
  });
}

function renderServicesIndex() {
  const root = $("#servicesGrid");
  if (!root || !content?.services?.length) return;
  root.innerHTML = content.services
    .map(
      (s) => `
        <article class="card" data-reveal>
          <div class="in">
            <div class="chips"><span class="chip">${s.title}</span></div>
            <h3 style="margin-top: 12px">${s.title}</h3>
            <p>${s.summary}</p>
            <div class="hero-actions" style="margin-top: 14px">
              <a class="btn primary" href="${BASE}services/${s.slug}.html">View Service <span class="icon">→</span></a>
              <a class="btn" href="${BASE}contact.html">Enquire <span class="icon">↗</span></a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
  initReveal();
}

function renderProjectsPage() {
  const grid = $("#projectsGrid");
  const filters = $("#projectFilters");
  if (!grid || !filters || !content?.projects?.length) return;

  if (content?.brand?.website) {
    const baseUrl = content.brand.website.replace(/\/+$/, "");
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: content.projects.slice(0, 60).map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: p.title,
        url: `${baseUrl}/project-details.html?id=${encodeURIComponent(p.id)}`,
      })),
    };
    ensureJsonLd("projects-list", itemList);
  }

  const cats = Array.from(new Set(content.projects.map((p) => p.category))).sort();
  const all = ["All", ...cats];
  let active = "All";

  function card(p) {
    const area = formatSqft(p.areaSqft);
    const dur = formatDays(p.durationDays);
    const loc = p.location || "—";
    return `
      <article class="card project-card" data-tilt data-id="${p.id}" tabindex="0" role="link" aria-label="${p.title}">
        <div class="project-thumb">
          <span class="badge">${p.category}</span>
          <img src="${p.cover}" alt="${p.title}" loading="lazy" decoding="async" />
        </div>
        <div class="in">
          <h3>${p.title}</h3>
          <p>${p.scope}</p>
          <div class="kv">
            <small>Area <span>${area}</span></small>
            <small>Location <span>${loc}</span></small>
            <small>Timeline <span>${dur}</span></small>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const items = active === "All" ? content.projects : content.projects.filter((p) => p.category === active);
    grid.innerHTML = items.map(card).join("");
    initTilt(grid);
    initProjectLinks(grid);
    initReveal();
  }

  filters.innerHTML = all
    .map((c) => `<button class="filter${c === active ? " is-active" : ""}" type="button" data-cat="${c}">${c}</button>`)
    .join("");

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    active = btn.dataset.cat;
    $$("button[data-cat]", filters).forEach((b) => b.classList.toggle("is-active", b.dataset.cat === active));
    render();
  });

  render();
}

function initProjectLinks(root = document) {
  $$("[data-id]", root).forEach((el) => {
    const open = () => {
      const id = el.dataset.id;
      if (!id) return;
      window.location.href = `${BASE}project-details.html?id=${encodeURIComponent(id)}`;
    };
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function renderProjectDetails() {
  const id = qsParam("id") || document.body.dataset.projectId;
  if (!id || !content?.projects?.length) return;
  const p = content.projects.find((x) => x.id === id);
  if (!p) return;

  document.title = `${p.title} — ${content.brand.name}`;
  const d = document.head.querySelector('meta[name="description"]');
  if (d) d.setAttribute("content", `${p.title} — ${p.category}. ${p.scope}`);
  ensureMeta();
  if (content?.brand?.website) {
    const baseUrl = content.brand.website.replace(/\/+$/, "");
    const imgs = Array.from(
      new Set(
        [p.cover, ...((content.gallery || []).map((g) => g.src) || [])]
          .filter(Boolean)
          .slice(0, 8)
          .map((src) => (src.startsWith("http") ? src : `${baseUrl}/${normalizePath(src)}`))
      )
    );
    ensureJsonLd("project", {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: p.title,
      description: `${p.category}. ${p.scope}`,
      url: `${baseUrl}/project-details.html?id=${encodeURIComponent(p.id)}`,
      image: imgs,
      provider: {
        "@type": "Organization",
        name: content.brand.name,
        url: baseUrl,
      },
    });
  }
  const hero = $("#projectHero");
  const body = $("#projectBody");
  if (!hero || !body) return;

  hero.innerHTML = `
    <div class="hero-bg" aria-hidden="true">
      <canvas id="scene"></canvas>
    </div>
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <div class="kicker" data-reveal><i></i><span>${p.category}</span></div>
          <div class="h1 blur-on-scroll" data-reveal>${p.title}</div>
          <p class="lead" data-reveal>${p.scope}</p>
          <div class="hero-actions" data-reveal>
            <a class="btn primary" href="${BASE}contact.html">Build a similar space <span class="icon">→</span></a>
            <a class="btn" href="${BASE}projects.html">Back to projects <span class="icon">↘</span></a>
          </div>
        </div>
        <aside class="glass" data-reveal>
          <div class="in">
            <div class="stats">
              <div class="stat"><b>${formatSqft(p.areaSqft)}</b><span>Project area</span></div>
              <div class="stat"><b>${formatDays(p.durationDays)}</b><span>Execution timeline</span></div>
              <div class="stat"><b>${p.city || content.brand.city}</b><span>Location</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  body.innerHTML = `
    <section class="section tight">
      <div class="wrap">
        <div class="eyebrow">
          <div>
            <h2 data-reveal>Case Study</h2>
            <p data-reveal>Scope, coordination, and execution highlights—presented as a cinematic, build-ready narrative.</p>
          </div>
          <div class="rule" aria-hidden="true"></div>
        </div>
        <div class="grid two">
          <div class="card" data-reveal>
            <div class="project-thumb">
              <span class="badge">Preview</span>
              <img src="${p.cover}" alt="${p.title} preview" loading="lazy" decoding="async" />
            </div>
            <div class="in">
              <h3>Execution scope</h3>
              <p>${p.scope}</p>
              <div class="kv">
                <small>Area <span>${formatSqft(p.areaSqft)}</span></small>
                <small>Location <span>${p.location || "—"}</span></small>
                <small>Timeline <span>${formatDays(p.durationDays)}</span></small>
              </div>
            </div>
          </div>
          <div class="card" data-reveal>
            <div class="in">
              <h3>Workflow</h3>
              <p>A disciplined system designed for premium outcomes and predictable handover.</p>
              <div class="timeline" style="margin-top: 12px">
                <div class="step">
                  <div class="num">01</div>
                  <div class="txt">
                    <h4>Discovery + Site Read</h4>
                    <p>Brief alignment, site constraints, and execution intent locked early.</p>
                  </div>
                </div>
                <div class="step">
                  <div class="num">02</div>
                  <div class="txt">
                    <h4>MEP Coordination</h4>
                    <p>Services routing to reduce clashes and preserve clean ceiling lines.</p>
                  </div>
                </div>
                <div class="step">
                  <div class="num">03</div>
                  <div class="txt">
                    <h4>Execution + Finishing</h4>
                    <p>Sequenced delivery with quality controls and snag closure for handover.</p>
                  </div>
                </div>
              </div>
              <div class="hero-actions" style="margin-top: 14px">
                <a class="btn primary" href="${BASE}contact.html">Request a quotation <span class="icon">→</span></a>
                <a class="btn" href="${BASE}services.html">Explore services <span class="icon">↗</span></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="proj-gallery" data-showcase data-reveal-stagger>
      <div class="wrap">
        <div class="eyebrow">
          <div>
            <h2 id="proj-gallery" data-reveal>Gallery</h2>
            <p data-reveal>Scroll-driven scenes with parallax depth and premium transitions.</p>
          </div>
          <div class="rule" aria-hidden="true"></div>
        </div>

        <div class="showcase-shell" data-reveal>
          <div class="showcase-stage" aria-label="Project scenes">
            <div class="showcase-media">
              ${(() => {
                const pool = [
                  "assets/portfolio/p14.webp",
                  "assets/portfolio/p15.webp",
                  "assets/portfolio/p16.webp",
                  "assets/portfolio/p17.webp",
                  "assets/portfolio/p18.webp",
                  "assets/portfolio/p19.webp",
                  "assets/portfolio/p20.webp",
                  "assets/portfolio/p21.webp",
                  "assets/portfolio/p22.webp",
                  "assets/portfolio/p23.webp",
                  "assets/portfolio/p24.webp",
                  "assets/portfolio/p25.webp",
                  "assets/portfolio/p26.webp",
                  "assets/portfolio/p27.webp",
                ];
                const base = p.cover || pool[0];
                const start = Math.abs(
                  String(p.id)
                    .split("")
                    .reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) % 997, 7)
                );
                const picks = [base];
                for (let i = 0; picks.length < 5 && i < pool.length; i++) {
                  const src = pool[(start + i * 3) % pool.length];
                  if (!picks.includes(src)) picks.push(src);
                }
                return picks
                  .map(
                    (src, i) => `
                      <div class="showcase-media-item${i === 0 ? " is-active" : ""}" data-showcase-media>
                        <img src="${src}" alt="${p.title} scene ${i + 1}" loading="lazy" decoding="async" data-parallax="0.16" />
                      </div>
                    `
                  )
                  .join("");
              })()}
            </div>
            <div class="showcase-ui" aria-hidden="true">
              <div class="showcase-progress"><i></i></div>
              <div class="showcase-hint">Scroll</div>
            </div>
          </div>

          <div class="showcase-cards" aria-label="Scene notes">
            ${(() => {
              const notes = [
                { t: "Spatial composition", d: "Primary axes, clean circulation, and controlled sightlines for a calm premium feel." },
                { t: "Material rhythm", d: "A restrained palette with metallic warmth and soft specular highlights." },
                { t: "Lighting intent", d: "Layered lighting with glare control for a cinematic yet comfortable mood." },
                { t: "Execution intelligence", d: "Sequencing and coordination that reduces rework and protects finish quality." },
                { t: "Handover discipline", d: "Snag closure, detailing checks, and readiness for occupancy." },
              ];
              return notes
                .map(
                  (n, i) => `
                    <article class="showcase-card${i === 0 ? " is-active" : ""}" data-showcase-card>
                      <div class="in">
                        <div class="top"><b>${String(i + 1).padStart(2, "0")}</b><small>Scene</small></div>
                        <h3>${n.t}</h3>
                        <p>${n.d}</p>
                        <div class="hero-actions" style="margin-top: 14px">
                          <a class="btn primary" href="${BASE}contact.html">Discuss this style <span class="icon">→</span></a>
                          <a class="btn" href="${BASE}projects.html">More projects <span class="icon">↗</span></a>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("");
            })()}
          </div>
        </div>
      </div>
    </section>

    <section class="section tight" aria-labelledby="proj-next" data-reveal-stagger>
      <div class="wrap">
        <div class="eyebrow">
          <div>
            <h2 id="proj-next" data-reveal>Next projects</h2>
            <p data-reveal>More work with metrics and case-study storytelling.</p>
          </div>
          <div class="rule" aria-hidden="true"></div>
        </div>
        <div class="slider" data-slider data-reveal>
          <div class="slider-track">
            ${(() => {
              const list = content.projects.filter((x) => x.id !== p.id).slice(0, 8);
              return list
                .map(
                  (x) => `
                    <div class="slide">
                      <article class="card project-card" data-tilt data-id="${x.id}" tabindex="0" role="link" aria-label="${x.title}">
                        <div class="project-thumb">
                          <span class="badge">${x.category}</span>
                          <img src="${x.cover}" alt="${x.title}" loading="lazy" decoding="async" />
                        </div>
                        <div class="in">
                          <h3>${x.title}</h3>
                          <p>${x.scope}</p>
                          <div class="kv">
                            <small>Area <span>${formatSqft(x.areaSqft)}</span></small>
                            <small>Location <span>${x.location || "—"}</span></small>
                            <small>Timeline <span>${formatDays(x.durationDays)}</span></small>
                          </div>
                        </div>
                      </article>
                    </div>
                  `
                )
                .join("");
            })()}
          </div>
          <div class="slider-controls" aria-hidden="true">
            <button class="btn" type="button" data-prev>←</button>
            <button class="btn" type="button" data-next>→</button>
          </div>
        </div>
      </div>
    </section>
  `;

  initReveal();
  initShowcases();
  initParallax();
  initScene();
  initSliders();
  initTilt(body);
  initProjectLinks(body);
}

function renderServiceDetails() {
  const slug = document.body.dataset.slug;
  if (!slug || !content?.services?.length) return;
  const s = content.services.find((x) => x.slug === slug);
  if (!s) return;

  document.title = `${s.title} — ${content.brand.name}`;
  const d = document.head.querySelector('meta[name="description"]');
  if (d) d.setAttribute("content", s.summary);
  ensureMeta();
  const hero = $("#serviceHero");
  const body = $("#serviceBody");
  if (!hero || !body) return;

  hero.innerHTML = `
    <div class="hero-bg" aria-hidden="true">
      <canvas id="scene"></canvas>
    </div>
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <div class="kicker" data-reveal><i></i><span>Service</span></div>
          <div class="h1 blur-on-scroll" data-reveal>${s.title}</div>
          <p class="lead" data-reveal>${s.summary}</p>
          <div class="hero-actions" data-reveal>
            <a class="btn primary" href="${BASE}contact.html">Start a project <span class="icon">→</span></a>
            <a class="btn" href="${BASE}services.html">All services <span class="icon">↘</span></a>
          </div>
        </div>
        <aside class="glass" data-reveal>
          <div class="in">
            <div class="stats">
              <div class="stat"><b>${content.team.execution.headline}</b><span>Delivery capacity</span></div>
              <div class="stat"><b>Pan-India</b><span>Multi-city execution</span></div>
              <div class="stat"><b>MEP-ready</b><span>Engineering integration</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  const feats = (s.features || []).map((f) => `<span class="chip">${f}</span>`).join("");
  const flow = (s.workflow || [])
    .map((t, i) => {
      const n = String(i + 1).padStart(2, "0");
      return `
        <div class="step" data-reveal>
          <div class="num">${n}</div>
          <div class="txt">
            <h4>${t}</h4>
            <p>Disciplined delivery with clean coordination and premium finishing.</p>
          </div>
        </div>
      `;
    })
    .join("");

  body.innerHTML = `
    <section class="section tight">
      <div class="wrap">
        <div class="eyebrow">
          <div>
            <h2 data-reveal>What You Get</h2>
            <p data-reveal>Premium outputs designed for clarity, speed, and consistent finish quality.</p>
          </div>
          <div class="rule" aria-hidden="true"></div>
        </div>
        <div class="grid two">
          <div class="card" data-reveal>
            <div class="project-thumb">
              <span class="badge">Cinematic</span>
              <img src="../${s.banner}" alt="${s.title} banner" loading="lazy" decoding="async" />
            </div>
            <div class="in">
              <h3>Feature set</h3>
              <p>Designed to scale from boutique interiors to large office rollouts.</p>
              <div class="chips">${feats}</div>
            </div>
          </div>
          <div class="card" data-reveal>
            <div class="in">
              <h3>Workflow</h3>
              <p>A clear process that reduces rework and keeps quality consistent across teams and sites.</p>
              <div class="timeline" style="margin-top: 12px">${flow}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  initReveal();
  initScene();
}

function renderIndustries() {
  const root = $("#industriesGrid");
  if (!root || !content?.industries?.length) return;
  root.innerHTML = content.industries
    .map(
      (i) => `
        <article class="card" data-reveal>
          <div class="in">
            <h3>${i.title}</h3>
            <p>${i.summary}</p>
            <div class="hero-actions" style="margin-top: 12px">
              <a class="btn" href="projects.html">View relevant work <span class="icon">↗</span></a>
              <a class="btn primary" href="contact.html">Enquire <span class="icon">→</span></a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTeam() {
  const root = $("#teamGrid");
  if (!root || !content?.team) return;

  const sections = [
    { title: "Leadership", list: content.team.leadership },
    { title: "Partners", list: content.team.partners },
    { title: "Design Team", list: content.team.design },
    { title: "Project Management", list: content.team.pmo },
    { title: "Operations", list: content.team.ops },
  ];

  root.innerHTML = sections
    .map(
      (s) => `
        <div class="card" data-reveal>
          <div class="in">
            <h3>${s.title}</h3>
            <div style="display:grid; gap:10px; margin-top: 12px">
              ${(s.list || [])
                .map(
                  (p) => `
                    <div style="display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:10px 0; border-top: 1px solid rgba(255,255,255,0.06)">
                      <div style="color: rgba(255,255,255,0.9); font-weight: 600">${p.name}</div>
                      <div style="color: rgba(255,255,255,0.62); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase">${p.role}</div>
                    </div>
                  `
                )
                .join("")}
            </div>
            <div class="kv" style="margin-top: 12px">
              <small>Execution <span>${content.team.execution.headline}</span></small>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderCareers() {
  const root = $("#careersGrid");
  if (!root || !content?.careers?.length) return;
  root.innerHTML = content.careers
    .map(
      (c) => `
        <article class="card" data-reveal>
          <div class="in">
            <h3>${c.title}</h3>
            <p>${c.summary}</p>
            <div class="kv">
              <small>Location <span>${c.location}</span></small>
              <small>Type <span>${c.type}</span></small>
            </div>
            <div class="hero-actions" style="margin-top: 14px">
              <a class="btn primary" href="mailto:${content.brand.email}?subject=${encodeURIComponent(`Career — ${c.title}`)}">Apply <span class="icon">→</span></a>
              <a class="btn" href="contact.html">Contact HR <span class="icon">↗</span></a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderInsights() {
  const root = $("#insightsGrid");
  if (!root || !content?.insights?.length) return;
  root.innerHTML = content.insights
    .map((p) => {
      const tags = (p.tags || []).map((t) => `<span class="chip">${t}</span>`).join("");
      return `
        <article class="card" data-reveal>
          <div class="in">
            <div class="kicker"><i></i><span>${p.date}</span></div>
            <h3 style="margin-top: 12px">${p.title}</h3>
            <p>${p.summary}</p>
            <div class="chips">${tags}</div>
            <div class="hero-actions" style="margin-top: 14px">
              <a class="btn primary" href="insight.html?slug=${encodeURIComponent(p.slug)}">Read <span class="icon">→</span></a>
              <a class="btn" href="contact.html">Discuss a project <span class="icon">↗</span></a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderInsightPost() {
  const slug = qsParam("slug");
  if (!slug || !content?.insights?.length) return;
  const p = content.insights.find((x) => x.slug === slug);
  if (!p) return;
  document.title = `${p.title} — ${content.brand.name}`;
  const d = document.head.querySelector('meta[name="description"]');
  if (d) d.setAttribute("content", p.summary);
  ensureMeta();
  const root = $("#insightBody");
  if (!root) return;
  const tags = (p.tags || []).map((t) => `<span class="chip">${t}</span>`).join("");
  root.innerHTML = `
    <div class="kicker" data-reveal><i></i><span>${p.date}</span></div>
    <div class="h1 blur-on-scroll" data-reveal>${p.title}</div>
    <p class="lead" data-reveal>${p.summary}</p>
    <div class="chips" data-reveal>${tags}</div>
    <div class="grid two" style="margin-top: 16px">
      <div class="card" data-reveal>
        <div class="in">
          <h3>Key points</h3>
          <p>Structured execution reduces rework. Align scope, MEP, procurement, and sequencing early.</p>
          <div class="kv">
            <small>Outcome <span>Cleaner finishes</span></small>
            <small>Benefit <span>Predictable handover</span></small>
            <small>Focus <span>Coordination discipline</span></small>
          </div>
        </div>
      </div>
      <div class="card" data-reveal>
        <div class="in">
          <h3>Next step</h3>
          <p>Send a brief and we’ll recommend the right service stack and delivery workflow.</p>
          <div class="hero-actions" style="margin-top: 14px">
            <a class="btn primary" href="${BASE}contact.html">Request consultation <span class="icon">→</span></a>
            <a class="btn" href="${BASE}insights.html">Back to insights <span class="icon">↘</span></a>
          </div>
        </div>
      </div>
    </div>
  `;
  initReveal();
}

function renderTestimonials() {
  const root = $("#testimonialsGrid");
  if (!root || !content?.testimonials?.length) return;
  root.innerHTML = content.testimonials
    .map(
      (t) => `
        <div class="slide">
          <article class="card" data-reveal>
            <div class="in">
              <div class="kicker"><i></i><span>${t.company}</span></div>
              <h3 style="margin-top: 12px">${t.name}</h3>
              <p>“${t.quote}”</p>
            </div>
          </article>
        </div>
      `
    )
    .join("");
}

function renderHomeTestimonials() {
  const root = $("#homeTestimonials");
  if (!root || !content?.testimonials?.length) return;
  root.innerHTML = content.testimonials
    .slice(0, 6)
    .map(
      (t) => `
        <div class="slide">
          <article class="card" data-reveal>
            <div class="in">
              <div class="kicker"><i></i><span>${t.company}</span></div>
              <h3 style="margin-top: 12px">${t.name}</h3>
              <p>“${t.quote}”</p>
            </div>
          </article>
        </div>
      `
    )
    .join("");
  initReveal();
}

function renderGallery() {
  const root = $("#galleryGrid");
  if (!root || !content?.gallery?.length) return;

  const filtersEl = $("#galleryFilters");
  const viewsEl = $("#galleryViews");
  const countEl = $("#galleryCount");
  const stripEl = $("#galleryStrip");

  const items = content.gallery.map((g, i) => {
    const src = g.src || "";
    const alt = g.alt || "Gallery";
    const cat = src.includes("assets/portfolio/") ? "Projects" : "Studio";
    const s = (src + alt)
      .split("")
      .reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) % 997, i + 7);
    const variant = s % 10;
    const sizeClass = variant < 2 ? "tile-big" : variant < 5 ? "tile-wide" : variant < 7 ? "tile-tall" : "";
    return { src, alt, cat, sizeClass, i };
  });

  let active = "All";
  let view = "mosaic";

  const renderStrip = () => {
    if (!stripEl) return;
    const picks = items.slice(0, 12);
    stripEl.innerHTML = picks
      .map(
        (g) => `
          <button class="strip-tile" type="button" data-open-src="${g.src}" data-open-alt="${g.alt}" aria-label="${g.alt}">
            <img src="${g.src}" alt="${g.alt}" loading="lazy" decoding="async" data-parallax="0.12" />
            <span>${g.alt}</span>
          </button>
        `
      )
      .join("");
  };

  const ensureControls = () => {
    if (filtersEl && !filtersEl.dataset.bound) {
      const cats = ["All", "Projects", "Studio"];
      filtersEl.innerHTML = cats
        .map((c) => `<button class="filter${c === active ? " is-active" : ""}" type="button" data-cat="${c}">${c}</button>`)
        .join("");
      filtersEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-cat]");
        if (!btn) return;
        active = btn.dataset.cat || "All";
        $$("button[data-cat]", filtersEl).forEach((b) => b.classList.toggle("is-active", b.dataset.cat === active));
        renderGrid();
      });
      filtersEl.dataset.bound = "1";
    }

    if (viewsEl && !viewsEl.dataset.bound) {
      const views = [
        { k: "mosaic", label: "Mosaic" },
        { k: "grid", label: "Grid" },
      ];
      viewsEl.innerHTML = views
        .map((v) => `<button class="filter${v.k === view ? " is-active" : ""}" type="button" data-view="${v.k}">${v.label}</button>`)
        .join("");
      viewsEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-view]");
        if (!btn) return;
        view = btn.dataset.view || "mosaic";
        $$("button[data-view]", viewsEl).forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
        renderGrid();
      });
      viewsEl.dataset.bound = "1";
    }
  };

  const renderGrid = () => {
    const visible = active === "All" ? items : items.filter((x) => x.cat === active);
    root.classList.toggle("mosaic", view === "mosaic");
    root.innerHTML = visible
      .map(
        (g) => `
          <div class="tile ${g.sizeClass}" data-lb="grid" data-src="${g.src}" data-alt="${g.alt}" tabindex="0" role="button" aria-label="${g.alt}" data-reveal>
            <img src="${g.src}" alt="${g.alt}" loading="lazy" decoding="async" data-parallax="0.16" />
            <div class="cap">
              <span class="cap-tag">${g.cat}</span>
              <span class="cap-title">${g.alt}</span>
            </div>
          </div>
        `
      )
      .join("");

    if (countEl) countEl.textContent = `${visible.length} / ${items.length} images`;
    initReveal();
    initParallax();
  };

  renderStrip();
  ensureControls();
  renderGrid();
}

function initTilt(root = document) {
  if (prefersReduced) return;
  const els = $$("[data-tilt]", root);
  els.forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * 8;
      const ry = (px - 0.5) * 10;
      el.style.transform = `translate3d(0,-2px,0) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

function initScene() {
  const canvas = $("#scene");
  if (!canvas || prefersReduced) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0;
  let h = 0;
  let t = 0;
  let pts = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.floor(rect.width * dpr);
    h = Math.floor(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;
    pts = Array.from({ length: 64 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.32 * dpr,
      vy: (Math.random() - 0.5) * 0.32 * dpr,
    }));
  }

  function draw() {
    t += 0.008;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "rgba(255,255,255,0.04)");
    grad.addColorStop(0.5, "rgba(223,191,79,0.07)");
    grad.addColorStop(1, "rgba(160,180,210,0.05)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    pts.forEach((p) => {
      p.x += p.vx + Math.sin(t + p.y * 0.002) * 0.08 * dpr;
      p.y += p.vy + Math.cos(t + p.x * 0.002) * 0.08 * dpr;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    });

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 190 * dpr) continue;
        const alpha = (1 - dist / (190 * dpr)) * 0.16;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    pts.forEach((p) => {
      ctx.fillStyle = "rgba(223,191,79,0.18)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.35 * dpr, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(draw);
}

function boot() {
  ensureMeta();
  injectShell();
  document.getElementById("year")?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  setActiveNav();
  initMenu();
  initDropdowns();
  initAnchors();
  initReveal();
  initPointerLight();
  initVelocityBlur();
  initSceneHue();
  initChapters();
  initShowcases();
  initParallax();
  initFloating();
  initTilt();
  initSliders();

  const page = document.body.dataset.page || "";
  initScene();
  if (page === "services") renderServicesIndex();
  if (page === "projects") renderProjectsPage();
  if (page === "project") renderProjectDetails();
  if (page === "service") renderServiceDetails();
  if (page === "industries") renderIndustries();
  if (page === "team") renderTeam();
  if (page === "careers") renderCareers();
  if (page === "insights") renderInsights();
  if (page === "insight") renderInsightPost();
  if (page === "testimonials") renderTestimonials();
  if (page === "gallery") renderGallery();
  renderHomeTestimonials();

  initLightbox();
  initContactForm();
  initNewsletterForm();
  initPageTransitions();

  setScrollProgress();
  window.addEventListener("scroll", setScrollProgress, { passive: true });

  initPreloader().finally(() => {
    document.body.classList.add("is-ready");
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
