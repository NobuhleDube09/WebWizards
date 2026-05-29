document.addEventListener('DOMContentLoaded', async () => {
  // ===== NAVIGATION & UI ELEMENTS =====
  
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.style.display = mobileMenu.style.display === 'flex' ? 'none' : 'flex';
    });
  }
  
  // ===== BUTTON HANDLERS =====
  
  // Login buttons
  const loginBtn = document.getElementById('loginBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const loginLink = document.getElementById('loginLink');
  
  const handleLoginRedirect = () => {
    window.location.href = '/pages/login.html';
  };
  
  if (loginBtn) loginBtn.addEventListener('click', handleLoginRedirect);
  if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', handleLoginRedirect);
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/pages/login.html';
    });
  }
  
  // ===== GET STARTED CARDS (Redirect to get-started page with role parameter) =====
  const seekServiceBtn = document.getElementById('seekServiceBtn');
  const offerSkillsBtn = document.getElementById('offerSkillsBtn');
  const seekServiceCard = document.getElementById('seekServiceCard');
  const offerSkillsCard = document.getElementById('offerSkillsCard');
  
  // Seek for a Service - redirect to get-started page with role=buy
  const handleSeekService = () => {
    window.location.href = '/pages/get-started.html?role=buy';
  };
  
  // Provide a Service - redirect to get-started page with role=sell
  const handleProvideService = () => {
    window.location.href = '/pages/get-started.html?role=sell';
  };
  
  if (seekServiceBtn) {
    seekServiceBtn.addEventListener('click', handleSeekService);
  }
  
  // Also make the whole card clickable
  if (seekServiceCard) {
    seekServiceCard.addEventListener('click', (e) => {
      // Don't trigger if the button was clicked (prevents double)
      if (e.target !== seekServiceBtn && !seekServiceBtn.contains(e.target)) {
        handleSeekService();
      }
    });
    seekServiceCard.style.cursor = 'pointer';
  }
  
  if (offerSkillsBtn) {
    offerSkillsBtn.addEventListener('click', handleProvideService);
  }
  
  // Also make the whole card clickable
  if (offerSkillsCard) {
    offerSkillsCard.addEventListener('click', (e) => {
      if (e.target !== offerSkillsBtn && !offerSkillsBtn.contains(e.target)) {
        handleProvideService();
      }
    });
    offerSkillsCard.style.cursor = 'pointer';
  }
  
  // ===== NAVIGATION LINKS (Smooth Scroll) =====
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      const sectionMap = {
        'about': 'aboutSection',
        'how-it-works': 'howItWorksSection',
        'stories': 'testimonialSection'
      };
      
      const sectionId = sectionMap[page];
      if (sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
          // Close mobile menu if open
          if (mobileMenu && mobileMenu.style.display === 'flex') {
            mobileMenu.style.display = 'none';
          }
        }
      }
    });
  });
  
  // ===== STATS COUNTER ANIMATION =====
  const statNumbers = [
    { element: document.getElementById('stat1'), target: 15000, suffix: '+' },
    { element: document.getElementById('stat2'), target: 5000, suffix: '+' },
    { element: document.getElementById('stat3'), target: 25, suffix: '+' }
  ];
  
  const animateNumbers = () => {
    statNumbers.forEach(stat => {
      if (!stat.element) return;
      let current = 0;
      const increment = Math.ceil(stat.target / 50);
      const timer = setInterval(() => {
        current += increment;
        if (current >= stat.target) {
          stat.element.textContent = stat.target.toLocaleString() + stat.suffix;
          clearInterval(timer);
        } else {
          stat.element.textContent = current.toLocaleString() + stat.suffix;
        }
      }, 30);
    });
  };
  
  // Trigger animation when stats come into view
  const statsSection = document.querySelector('.stats');
  if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateNumbers();
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    observer.observe(statsSection);
  }
  
  // ===== TESTIMONIAL CAROUSEL =====
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
  
  let currentTestimonial = 0;
  const testimonialText = document.getElementById('testimonialText');
  const testimonialName = document.getElementById('testimonialName');
  const testimonialTitle = document.getElementById('testimonialTitle');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');
  
  const updateTestimonial = () => {
    if (testimonialText && testimonialName && testimonialTitle) {
      testimonialText.textContent = `“${testimonials[currentTestimonial].text}”`;
      testimonialName.textContent = testimonials[currentTestimonial].name;
      testimonialTitle.textContent = testimonials[currentTestimonial].title;
    }
  };
  
  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
      updateTestimonial();
    });
    
    nextBtn.addEventListener('click', () => {
      currentTestimonial = (currentTestimonial + 1) % testimonials.length;
      updateTestimonial();
    });
  }
  
  updateTestimonial();
  
  console.log('✅ CampusConnect homepage loaded successfully!');
  console.log('Button redirects:', {
    'Seek Service': '/pages/get-started.html?role=buy',
    'Provide Service': '/pages/get-started.html?role=sell'
  });
});