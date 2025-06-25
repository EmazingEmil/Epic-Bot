console.log('Script loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('Script loaded and DOM fully parsed.');

    // Check for authorization cookie
    const authCookie = document.cookie.split('; ').find(row => row.startsWith('authorization='));

    if (!authCookie) {
        // Create modal elements
        const overlay = document.createElement('div');
        overlay.className = 'authorization-overlay';

        const modal = document.createElement('div');
        modal.className = 'authorization-modal';
        modal.innerHTML = `
            <h2>Cookie Authorization</h2>
            <p>Do you allow the website to store session cookies for authorization purposes?</p>
            <p style="font-size:0.98rem;margin:0.7rem 0 1.2rem 0;color:#a7a9be;">Want to see what cookies we use and why? <a href="cookie-details.html" target="_blank" style="color:#7f5af0;text-decoration:underline;">View cookie details</a></p>
            <button class="allow">Allow</button>
            <button class="deny">Deny</button>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Add event listeners to buttons
        modal.querySelector('.allow').addEventListener('click', () => {
            document.cookie = `authorization=allowed; path=/; max-age=${60 * 60 * 24 * 30}`; // Expires in 30 days
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        modal.querySelector('.deny').addEventListener('click', () => {
            document.cookie = `authorization=denied; path=/; max-age=${60 * 60 * 24 * 30}`; // Expires in 30 days
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });
    }

    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    function showSection(page) {
        const adminGuildsList = document.getElementById('admin-guilds-list');
        // Hide guilds list unless on login/dashboard page
        if (adminGuildsList) {
            if (page === 'login') {
                adminGuildsList.style.display = '';
            } else {
                adminGuildsList.style.display = 'none';
            }
        }
        // Hide or show the login section itself
        const loginSection = document.getElementById('login');
        if (loginSection) {
            if (page === 'login') {
                loginSection.style.display = '';
            } else {
                loginSection.style.display = 'none';
            }
        }
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

    if (window.location.search.includes('code=')) {
        fetch('https://epic-bot-backend-production.up.railway.app/login/callback' + window.location.search)
            .then(response => response.json())
            .then(data => {
                const listDiv = document.getElementById('admin-guilds-list');
                if (listDiv && data.admin_guilds) {
                    if (data.admin_guilds.length === 0) {
                        listDiv.innerHTML = '<p>You are not an admin in any servers.</p>';
                    } else {
                        listDiv.innerHTML = '<h3>Your Admin Servers:</h3>' +
                            '<div class="guilds-list">' +
                            data.admin_guilds.map(g => {
                                const iconUrl = g.icon
                                    ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
                                    : 'https://cdn.discordapp.com/embed/avatars/0.png';
                                return `
                                    <div class="guild-card">
                                        <img class="guild-icon" src="${iconUrl}" alt="Server Icon">
                                        <div class="guild-name">${g.name}</div>
                                    </div>
                                `;
                            }).join('') +
                            '</div>';
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching admin guilds:', error);
            });
    }

    fetch('https://epic-bot-backend-production.up.railway.app/')
        .then(response => response.json())
        .then(data => {
            // Optionally, show it on the page:
        })
        .catch(error => {
            console.error('Error contacting backend:', error);
        });

    handleLoginSection();
});

window.addEventListener('hashchange', handleLoginSection);

function handleLoginSection() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');
    const username = urlParams.get('username');
    const guildsJson = urlParams.get('guilds');
    let guilds = [];
    if (guildsJson) {
        try {
            guilds = JSON.parse(decodeURIComponent(guildsJson));
        } catch (e) {
            guilds = [];
        }
    }

    // --- Hide dashboard title and login button if logged in ---
    if (userId && username) {
        const loginBtn = document.getElementById('discord-login-btn');
        if (loginBtn) loginBtn.style.display = 'none';
        const dashTitle = document.querySelector('#login h2');
        if (dashTitle) dashTitle.style.display = 'none';
    } else {
        // Show them if not logged in
        const loginBtn = document.getElementById('discord-login-btn');
        if (loginBtn) loginBtn.style.display = '';
        const dashTitle = document.querySelector('#login h2');
        if (dashTitle) dashTitle.style.display = '';
    }

    if (userId && username) {
        fetch('https://epic-bot-backend-production.up.railway.app/api/bot-guilds', { credentials: 'include' })
            .then(res => res.json())
            .then(botGuilds => {
                if (!Array.isArray(botGuilds)) {
                    botGuilds = [];
                }
                const botGuildsSet = new Set(botGuilds.map(String));
                const adminGuildsList = document.getElementById('admin-guilds-list');
                if (adminGuildsList) {
                    adminGuildsList.innerHTML = `
                        <h3>Welcome, <strong>${username}</strong>!</h3>
                        <p>You are an admin in <strong>${guilds.length}</strong> servers.</p>
                        <div class="guilds-list"></div>
                    `;
                    const guildsListDiv = adminGuildsList.querySelector('.guilds-list');
                    if (guildsListDiv) {
                        if (guilds.length === 0) {
                            guildsListDiv.innerHTML = '<p>You are not an admin in any servers.</p>';
                        } else {
                            guildsListDiv.innerHTML = guilds.map(g => {
                                const iconUrl = g.icon
                                    ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
                                    : 'https://cdn.discordapp.com/embed/avatars/0.png';
                                const inBot = botGuildsSet.has(String(g.id));
                                return `
                                    <button class="guild-card" data-guild-id="${g.id}" title="Go to dashboard for ${g.name}" style="border: ${inBot ? '2px solid #2cb67d' : '2px solid #7f5af0'}">
                                        <img class="guild-icon" src="${iconUrl}" alt="Server Icon">
                                        <div class="guild-name">${g.name}</div>
                                        ${inBot ? '<div style="color:#2cb67d;font-size:0.95rem;margin-top:0.3rem;">Manage server</div>' : '<div style="color:#7f5af0;font-size:0.95rem;margin-top:0.3rem;">Invite bot</div>'}
                                    </button>
                                `;
                            }).join('');
                            guildsListDiv.querySelectorAll('.guild-card').forEach(card => {
                                card.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    const guildId = String(this.getAttribute('data-guild-id'));
                                    const isInBot = botGuildsSet.has(guildId);
                                    if (isInBot) {
                                        window.location.href = `dashboard.html?guild_id=${guildId}`;
                                    } else {
                                        const clientId = '1337542083493232650';
                                        const permissions = '8';
                                        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=${permissions}&guild_id=${guildId}&disable_guild_select=true`;
                                        window.location.href = inviteUrl;
                                    }
                                });
                            });
                        }
                    }
                }
            });
    }
}
