/* ============================================
   CHECKRACE — Main JavaScript
   Navigation, Animations, Counter, FAQ
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initDropdowns();
  initScrollAnimations();
  initCounters();
  initFAQ();
  initI18n();
});

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

/* --- Animated Counters --- */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

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
