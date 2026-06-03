document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     THEME TOGGLE (IMPROVED)
  ========================= */
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  const savedTheme = localStorage.getItem('cc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const updateThemeIcon = () => {
    if (!themeToggleBtn) return;

    const theme = document.documentElement.getAttribute('data-theme');
    themeToggleBtn.innerHTML =
      theme === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
  };

  updateThemeIcon();

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cc_theme', next);

      updateThemeIcon();
    });
  }

  /* =========================
     MOBILE MENU
  ========================= */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.style.display === 'flex';
      mobileMenu.style.display = isOpen ? 'none' : 'flex';
    });
  }

  /* =========================
     LOGIN HANDLERS (CLEANED)
  ========================= */
  const loginBtn = document.getElementById('loginBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const loginLink = document.getElementById('loginLink');

  const goToLogin = () => {
    window.location.href = '/pages/login.html';
  };

  if (loginBtn) loginBtn.addEventListener('click', goToLogin);
  if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', goToLogin);

  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      goToLogin();
    });
  }

  /* =========================
     GET STARTED CARDS
  ========================= */
  const seekServiceBtn = document.getElementById('seekServiceBtn');
  const offerSkillsBtn = document.getElementById('offerSkillsBtn');
  const seekServiceCard = document.getElementById('seekServiceCard');
  const offerSkillsCard = document.getElementById('offerSkillsCard');

  const goSeekService = () => {
    window.location.href = '/pages/get-started.html?role=buy';
  };

  const goProvideService = () => {
    window.location.href = '/pages/get-started.html?role=sell';
  };

  if (seekServiceBtn) {
    seekServiceBtn.addEventListener('click', goSeekService);
  }

  if (offerSkillsBtn) {
    offerSkillsBtn.addEventListener('click', goProvideService);
  }

  if (seekServiceCard) {
    seekServiceCard.style.cursor = 'pointer';

    seekServiceCard.addEventListener('click', (e) => {
      if (!seekServiceBtn.contains(e.target)) {
        goSeekService();
      }
    });
  }

  if (offerSkillsCard) {
    offerSkillsCard.style.cursor = 'pointer';

    offerSkillsCard.addEventListener('click', (e) => {
      if (!offerSkillsBtn.contains(e.target)) {
        goProvideService();
      }
    });
  }

  /* =========================
     NAVIGATION SCROLL
  ========================= */
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

  const sectionMap = {
    about: 'aboutSection',
    'how-it-works': 'howItWorksSection',
    stories: 'testimonialSection'
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      const page = link.dataset.page;
      const sectionId = sectionMap[page];

      if (!sectionId) return;

      const section = document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });

        // close mobile menu
        if (mobileMenu) {
          mobileMenu.style.display = 'none';
        }
      }
    });
  });

  /* =========================
     STATS ANIMATION (OPTIMISED)
  ========================= */
  const stats = [
    { el: document.getElementById('stat1'), target: 15000, suffix: '+' },
    { el: document.getElementById('stat2'), target: 5000, suffix: '+' },
    { el: document.getElementById('stat3'), target: 25, suffix: '+' }
  ];

  const animateStats = () => {
    stats.forEach(stat => {
      if (!stat.el) return;

      let value = 0;
      const step = Math.ceil(stat.target / 60);

      const timer = setInterval(() => {
        value += step;

        if (value >= stat.target) {
          stat.el.textContent = stat.target.toLocaleString() + stat.suffix;
          clearInterval(timer);
        } else {
          stat.el.textContent = value.toLocaleString() + stat.suffix;
        }
      }, 25);
    });
  };

  const statsSection = document.querySelector('.stats');

  if (statsSection) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateStats();
          obs.disconnect();
        }
      });
    }, { threshold: 0.5 });

    observer.observe(statsSection);
  }

  /* =========================
     TESTIMONIAL CAROUSEL
  ========================= */
  const testimonials = [
    {
      text: "I made R4 500 in my first month selling design work on CampusConnect. It changed how I pay for res.",
      name: "Thabo Mokoena",
      title: "Graphic Design, UJ • Verified Seller"
    },
    {
      text: "Found a web developer on CampusConnect to build my portfolio site. Affordable and professional!",
      name: "Lerato Ndlovu",
      title: "Marketing, Wits • Verified Buyer"
    },
    {
      text: "The best platform for students to earn extra income while studying. Highly recommended!",
      name: "Siyabonga Dlamini",
      title: "Computer Science, UKZN • Top Seller"
    },
    {
      text: "I needed a statistics tutor for my exams. Found one within hours. Passed with distinction!",
      name: "Nosipho Khumalo",
      title: "Economics, UCT • Verified Buyer"
    }
  ];

  let index = 0;

  const testimonialText = document.getElementById('testimonialText');
  const testimonialName = document.getElementById('testimonialName');
  const testimonialTitle = document.getElementById('testimonialTitle');

  const updateTestimonial = () => {
    if (!testimonialText || !testimonialName || !testimonialTitle) return;

    const t = testimonials[index];

    testimonialText.textContent = `“${t.text}”`;
    testimonialName.textContent = t.name;
    testimonialTitle.textContent = t.title;
  };

  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      index = (index - 1 + testimonials.length) % testimonials.length;
      updateTestimonial();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      index = (index + 1) % testimonials.length;
      updateTestimonial();
    });
  }

  updateTestimonial();

  /* =========================
     DEBUG LOGS
  ========================= */
  console.log('✅ CampusConnect loaded successfully');
  console.log({
    seekService: '/pages/get-started.html?role=buy',
    provideService: '/pages/get-started.html?role=sell'
  });
});