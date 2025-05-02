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

    const heroButtons = document.querySelectorAll('.hero-buttons [data-page]');
    heroButtons.forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const page = btn.dataset.page;
            window.location.hash = page;
            showSection(page);
        });
    });

    // Enable footer quick links navigation
    const footerLinks = document.querySelectorAll('.footer-link');
    footerLinks.forEach(link => {
        link.addEventListener('click', e => {
            const page = link.getAttribute('href').replace('#', '');
            if (document.getElementById(page)) {
                e.preventDefault();
                window.location.hash = page;
                showSection(page);
            }
        });
    });

    const initialPage = window.location.hash.replace('#', '') || 'home';
    showSection(initialPage);

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

    const botAvatar = document.querySelector('.bot-avatar');
    if (botAvatar) {
        botAvatar.addEventListener('mouseenter', () => {
            botAvatar.style.boxShadow = '0 0 64px #7f5af0cc, 0 0 32px #2cb67dcc';
        });
        botAvatar.addEventListener('mouseleave', () => {
            botAvatar.style.boxShadow = '0 0 32px #7f5af055';
        });
    }

    const loginBtn = document.getElementById('discord-login-btn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            window.location.href = 'https://epic-bot-backend-production.up.railway.app/login/discord';
        };
    }

    // If redirected back from Discord OAuth2, fetch and display admin guilds
    if (window.location.search.includes('code=')) {
        fetch('https://epic-bot-backend-production.up.railway.app/login/callback' + window.location.search)
            .then(response => response.json())
            .then(data => {
                console.log('Discord user:', data.user);
                console.log('Admin guilds:', data.admin_guilds);
                const listDiv = document.getElementById('admin-guilds-list');
                if (listDiv && data.admin_guilds) {
                    listDiv.innerHTML = '<h3>Your Admin Guilds:</h3>' +
                        '<ul>' +
                        data.admin_guilds.map(g => `<li>${g.name} (${g.id})</li>`).join('') +
                        '</ul>';
                }
            })
            .catch(error => {
                console.error('Error fetching admin guilds:', error);
            });
    }

    fetch('https://epic-bot-backend-production.up.railway.app/')
        .then(response => response.json())
        .then(data => {
            console.log('Backend response:', data);
            // Optionally, show it on the page:
            document.body.insertAdjacentHTML('beforeend', `<pre>${JSON.stringify(data, null, 2)}</pre>`);
        })
        .catch(error => {
            console.error('Error contacting backend:', error);
        });
});
