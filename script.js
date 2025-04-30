// SPA navigation and animations for Epic Bot Website

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    function showSection(page) {
        sections.forEach(section => {
            if (section.id === page) {
                section.classList.add('active');
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            } else {
                section.classList.remove('active');
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const page = link.dataset.page;
            window.location.hash = page;
            showSection(page);
        });
    });

    // Also handle SPA navigation for hero buttons
    const heroButtons = document.querySelectorAll('.hero-buttons [data-page]');
    heroButtons.forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const page = btn.dataset.page;
            window.location.hash = page;
            showSection(page);
        });
    });

    // Handle hash navigation on load
    const initialPage = window.location.hash.replace('#', '') || 'home';
    showSection(initialPage);

    // Animate feature cards on section show
    const featuresSection = document.getElementById('features');
    const featureCards = featuresSection.querySelectorAll('.feature-card');
    featuresSection.addEventListener('transitionend', () => {
        if (featuresSection.classList.contains('active')) {
            featureCards.forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        }
    });

    // Animate hero avatar on hover
    const botAvatar = document.querySelector('.bot-avatar');
    if (botAvatar) {
        botAvatar.addEventListener('mouseenter', () => {
            botAvatar.style.boxShadow = '0 0 64px #7f5af0cc, 0 0 32px #2cb67dcc';
        });
        botAvatar.addEventListener('mouseleave', () => {
            botAvatar.style.boxShadow = '0 0 32px #7f5af055';
        });
    }
});