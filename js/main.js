/* ============================================
   CHECKRACE — Main JavaScript
   Navigation, Animations, Counter, FAQ, Theme
   ============================================ */

/* Apply saved day/night theme ASAP (before paint) to avoid a flash */
(function () {
  try {
    if (localStorage.getItem('cr-theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
  initCalendarNav();
  initBlogNav();
  initNavbar();
  initDropdowns();
  initScrollAnimations();
  initCounters();
  initFAQ();
  initI18n();
  initTheme();
});

/* --- Inject a top-level "ปฏิทินวิ่ง" (Calendar) link into the navbar on every page --- */
function initCalendarNav() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks || navLinks.querySelector('a[href="calendar.html"]')) return;
  const LABELS = { th: 'ปฏิทินวิ่ง', en: 'Calendar', jp: 'カレンダー', cn: '赛历' };
  const a = document.createElement('a');
  a.href = 'calendar.html';
  if (/\/calendar(\.html)?$/.test(location.pathname)) a.className = 'active';
  const setLabel = () => { a.textContent = LABELS[localStorage.getItem('cr-lang') || 'th'] || LABELS.th; };
  setLabel();
  const home = navLinks.querySelector('a[href="index.html"]');
  if (home) home.insertAdjacentElement('afterend', a);
  else navLinks.insertAdjacentElement('afterbegin', a);
  document.querySelectorAll('.lang-switcher button').forEach((btn) =>
    btn.addEventListener('click', () => setTimeout(setLabel, 0)));
}

/* --- Inject a "บทความ" (Blog) link into the About dropdown on every page --- */
function initBlogNav() {
  const menu = document.querySelector('.nav-dropdown[data-page="about"] .nav-dropdown-menu');
  if (!menu || menu.querySelector('a[href="blog.html"]')) return;
  const LABELS = { th: 'บทความ', en: 'Blog', jp: 'ブログ', cn: '博客' };
  const a = document.createElement('a');
  a.href = 'blog.html';
  const setLabel = () => { a.textContent = LABELS[localStorage.getItem('cr-lang') || 'th'] || LABELS.th; };
  setLabel();
  const portfolio = menu.querySelector('a[href="portfolio.html"]');
  if (portfolio) portfolio.insertAdjacentElement('afterend', a);
  else menu.appendChild(a);
  document.querySelectorAll('.lang-switcher button').forEach((btn) =>
    btn.addEventListener('click', () => setTimeout(setLabel, 0)));
}

/* --- Day / Night theme toggle (injected into the navbar) --- */
function initTheme() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks || navLinks.querySelector('.theme-toggle')) return;

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Toggle night / day mode');
  btn.setAttribute('title', 'Night / Day mode');
  btn.innerHTML =
    '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
    '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('cr-theme', 'light'); } catch (e) {}
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('cr-theme', 'dark'); } catch (e) {}
    }
  });

  const langSwitcher = navLinks.querySelector('.lang-switcher');
  if (langSwitcher) navLinks.insertBefore(btn, langSwitcher);
  else navLinks.appendChild(btn);
}

/* --- Dropdown menus (desktop hover + mobile click) --- */
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  const mq = window.matchMedia('(max-width: 768px)');

  dropdowns.forEach(dd => {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
      // On mobile (or any click) toggle .open
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = dd.classList.contains('open');
      // Close other dropdowns
      dropdowns.forEach(d => d.classList.remove('open'));
      if (!wasOpen) dd.classList.add('open');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      dropdowns.forEach(d => d.classList.remove('open'));
    }
  });

  // Mark active dropdown based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  dropdowns.forEach(dd => {
    const hasActive = Array.from(dd.querySelectorAll('a')).some(a => {
      const href = a.getAttribute('href');
      return href === currentPage;
    });
    if (hasActive) {
      dd.classList.add('has-active');
      dd.querySelectorAll('a').forEach(a => {
        if (a.getAttribute('href') === currentPage) a.classList.add('active');
      });
    }
  });
}

/* --- Navbar --- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile menu
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // Active page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach(el => {
    observer.observe(el);
  });
}

/* --- Animated Counters (works on both .stat-number and .kpi-number) --- */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number, .kpi-number');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-target'), 10);
  const suffix = el.getAttribute('data-suffix') || '';
  const prefix = el.getAttribute('data-prefix') || '';
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);

    el.textContent = prefix + current.toLocaleString() + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = prefix + target.toLocaleString() + suffix;
    }
  }

  requestAnimationFrame(update);
}

/* --- FAQ Accordion --- */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* --- Contact Form --- */
function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const origText = btn.textContent;

  btn.textContent = '...';
  btn.disabled = true;

  // Simulate submission
  setTimeout(() => {
    btn.textContent = '✓';
    btn.style.background = '#4CAF50';
    setTimeout(() => {
      form.reset();
      btn.textContent = origText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
  }, 1000);
}
