// ============================================
// CAMPUSCONNECT - LANDING PAGE JAVASCRIPT
// ============================================

// ✅ REDIRECT LOGGED-IN USERS TO DASHBOARD
(function() {
    const session = localStorage.getItem('cc_session');
    if (session) {
        const profile = JSON.parse(localStorage.getItem('cc_profile') || '{}');
        if (profile?.account_type === 'seller') {
            window.location.href = '/pages/provider-dashboard.html';
        } else {
            window.location.href = '/pages/dashboard.html';
        }
        return; // Stop execution
    }
})();

// ========== COUNTING ANIMATION ==========
// ... rest of your code continues here ...

// ========== COUNTING ANIMATION ==========
function animateNumber(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString() + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString() + '+';
        }
    }, 30);
}

// Start counting when page loads
setTimeout(() => {
    animateNumber(document.getElementById('stat1'), 12000);
    animateNumber(document.getElementById('stat2'), 4800);
    animateNumber(document.getElementById('stat3'), 35);
}, 500);

// ========== TESTIMONIALS DATA ==========
const testimonials = [
    {
        text: "“I made R4 500 in my first month selling design work on CampusConnect. It changed how I pay for res.”",
        name: "Thabo Mokoena",
        title: "Graphic Design, UJ • Verified Seller"
    },
    {
        text: "“Found a tutor for my coding exam in under 2 hours. The platform is super easy to use!”",
        name: "Lerato Sithole",
        title: "Computer Science, Wits • Verified Buyer"
    },
    {
        text: "“As a photography student, I've earned over R8,000 doing grad shoots. Best decision ever!”",
        name: "Lindiwe Ndlovu",
        title: "Photography, TUT • Top Seller"
    },
    {
        text: "“CampusConnect helped me find a graphic designer for my startup. Quality work, fair prices.”",
        name: "Zara ",
        title: "Business, UCT • Small Business Owner"
    }
];

let currentTestimonial = 0;

function updateTestimonial(index) {
    const t = testimonials[index];
    document.getElementById('testimonialText').textContent = t.text;
    document.getElementById('testimonialName').textContent = t.name;
    document.getElementById('testimonialTitle').textContent = t.title;
}

document.getElementById('prevTestimonial')?.addEventListener('click', () => {
    currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
    updateTestimonial(currentTestimonial);
});

document.getElementById('nextTestimonial')?.addEventListener('click', () => {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    updateTestimonial(currentTestimonial);
});

// ========== MOBILE MENU ==========
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        if (mobileMenu.style.display === 'flex') {
            mobileMenu.style.display = 'none';
        } else {
            mobileMenu.style.display = 'flex';
        }
    });
}

document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenu) mobileMenu.style.display = 'none';
    });
});

// ========== SMOOTH SCROLL TO SECTION ==========
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ========== NAVIGATION LINKS ==========
document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        
        if (page === 'about') {
            scrollToSection('aboutSection');
        } else if (page === 'how-it-works') {
            scrollToSection('howItWorksSection');
        } else if (page === 'stories') {
            scrollToSection('testimonialSection');
        }
    });
});

// ========== CARD NAVIGATION ==========

// Seek Service Card
document.getElementById('seekServiceCard')?.addEventListener('click', () => {
    window.location.href = 'pages/get-started.html?role=buy';
});

// Offer Skills Card
document.getElementById('offerSkillsCard')?.addEventListener('click', () => {
    window.location.href = 'pages/get-started.html?role=sell';
});

// ========== LOGIN NAVIGATION ==========

document.getElementById('loginBtn')?.addEventListener('click', () => {
    window.location.href = 'pages/login.html';
});

document.getElementById('mobileLoginBtn')?.addEventListener('click', () => {
    window.location.href = 'pages/login.html';
});

// ========== SCROLL EFFECT ==========
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 10, 10, 0.98)';
    } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.8)';
    }
});

// ========== SCROLL ANIMATIONS ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.about-section, .howitworks-section, .testimonial, .cta-section').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

console.log('CampusConnect loaded successfully!');