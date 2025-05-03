const urlParams = new URLSearchParams(window.location.search);
const guildId = urlParams.get('guild_id');

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag]));
}

// --- Role/User/Channel name mapping for display ---
let roleNames = {};
let userNames = {};
let channelNames = {};

// --- Loading spinner ---
function showLoadingSpinner() {
    let spinner = document.getElementById('dashboard-loading-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'dashboard-loading-spinner';
        spinner.innerHTML = `<div class="spinner-glass"><div class="spinner"></div></div>`;
        document.getElementById('dashboard-root').appendChild(spinner);
    }
    spinner.style.display = 'flex';
}
function hideLoadingSpinner() {
    const spinner = document.getElementById('dashboard-loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

function renderModerationSection(data) {
    const modDiv = document.getElementById('moderation-setup');
    let html = `<div class="dashboard-card">
        <span class="dashboard-label">Moderation Setup:</span> <span class="badge ${data.moderation_setup ? 'enabled' : 'disabled'}">${data.moderation_setup ? 'Enabled' : 'Disabled'}</span>
    </div>`;
    // Moderation roles/commands
    if (data.moderation_roles && Object.keys(data.moderation_roles).length > 0) {
        html += `<div class="dashboard-card"><span class="dashboard-label">Role Permissions:</span><table><tr><th>Role</th><th>Allowed Commands</th></tr>`;
        for (const [roleId, cmds] of Object.entries(data.moderation_roles)) {
            const roleName = roleNames[roleId] || roleId;
            html += `<tr><td>${escapeHTML(roleName)}</td><td>${cmds.map(c => `<span class='badge enabled'>${escapeHTML(c)}</span>`).join(' ')}</td></tr>`;
        }
        html += `</table></div>`;
    }
    // Warnings
    if (data.warnings && data.warnings.length > 0) {
        html += `<button class="collapsible">Show Warnings (${data.warnings.length})</button><div class="collapsible-content"><table><tr><th>User</th><th>Moderator</th><th>Reason</th><th>Date</th><th>ID</th></tr>`;
        for (const w of data.warnings) {
            const userName = userNames[w.user_id] || w.user_id;
            const modName = userNames[w.moderator_id] || w.moderator_id;
            html += `<tr><td>${escapeHTML(String(userName))}</td><td>${escapeHTML(String(modName))}</td><td>${escapeHTML(w.reason)}</td><td>${w.created_at ? `<span class='dashboard-value'>${new Date(Number(w.created_at)*1000).toLocaleString()}</span>` : ''}</td><td>${w.warn_id}</td></tr>`;
        }
        html += `</table></div>`;
    }
    modDiv.innerHTML = html;
}

function renderTicketSection(data) {
    const ticketDiv = document.getElementById('ticket-system');
    if (!data.ticket_settings) {
        ticketDiv.innerHTML = `<div class="dashboard-card">Ticket system not set up.</div>`;
        return;
    }
    let html = `<div class="dashboard-card">
        <span class="dashboard-label">Panel Channel:</span> <span class="dashboard-value">${channelNames[data.ticket_settings.channel_id] || ''}</span><br>
        <span class="dashboard-label">Log Channel:</span> <span class="dashboard-value">${channelNames[data.ticket_settings.log_channel_id] || ''}</span><br>
        <span class="dashboard-label">Rules:</span> <span class="dashboard-value">${escapeHTML(data.ticket_settings.rules_text || '')}</span><br>
        <span class="dashboard-label">Ticket Message:</span> <span class="dashboard-value">${escapeHTML(data.ticket_settings.ticket_msg || '')}</span>
    </div>`;
    // Categories
    if (data.ticket_categories && data.ticket_categories.length > 0) {
        html += `<div class="dashboard-card"><span class="dashboard-label">Categories:</span><ul class="dashboard-list">`;
        for (const cat of data.ticket_categories) {
            html += `<li><b>${escapeHTML(cat.name)}</b>: ${escapeHTML(cat.description)}${cat.ping_on_create ? ' <span class="badge warn">Ping on create</span>' : ''}</li>`;
        }
        html += `</ul></div>`;
    }
    // Category roles
    if (data.ticket_category_roles && Object.keys(data.ticket_category_roles).length > 0) {
        html += `<div class="dashboard-card"><span class="dashboard-label">Category Roles:</span><table><tr><th>Category</th><th>Roles</th></tr>`;
        for (const [cat, roles] of Object.entries(data.ticket_category_roles)) {
            html += `<tr><td>${escapeHTML(cat)}</td><td>${roles.map(r => roleNames[r] || escapeHTML(String(r))).join(', ')}</td></tr>`;
        }
        html += `</table></div>`;
    }
    ticketDiv.innerHTML = html;
}

function renderLoggingSection(data) {
    const logDiv = document.getElementById('logging-section');
    if (!data.log_settings) {
        logDiv.innerHTML = `<div class="dashboard-card">Logging not set up.</div>`;
        return;
    }
    let html = `<div class="dashboard-card">
        <span class="dashboard-label">Log Channel:</span> <span class="dashboard-value">${channelNames[data.log_settings.log_channel_id] || ''}</span><br>
        <span class="dashboard-label">Mode:</span> <span class="dashboard-value">${escapeHTML(data.log_settings.mode)}</span><br>
        <span class="dashboard-label">Events:</span> <span class="dashboard-value">${data.log_settings.events.map(e => `<span class='badge enabled'>${escapeHTML(e)}</span>`).join(' ')}</span><br>`;
    if (data.log_settings.selected_channels && data.log_settings.selected_channels.length > 0) {
        html += `<span class="dashboard-label">Selected Channels:</span> <span class="dashboard-value">${data.log_settings.selected_channels.map(c => channelNames[c] || '').join(', ')}</span>`;
    }
    html += `</div>`;
    logDiv.innerHTML = html;
}

function renderLevelingSection(data) {
    const levelDiv = document.getElementById('leveling-section');
    let html = '';
    if (data.leveling_settings) {
        html += `<div class="dashboard-card">
            <span class="dashboard-label">Level Up Message:</span> <span class="dashboard-value">${escapeHTML(data.leveling_settings.levelup_message || '')}</span><br>
            <span class="dashboard-label">Channel:</span> <span class="dashboard-value">${channelNames[data.leveling_settings.channel_id] || ''}</span>
        </div>`;
    } else {
        html += `<div class="dashboard-card">Leveling not configured.</div>`;
    }
    // Level roles
    if (data.level_roles && Object.keys(data.level_roles).length > 0) {
        html += `<div class="dashboard-card"><span class="dashboard-label">Level Roles:</span><table><tr><th>Level</th><th>Role</th></tr>`;
        for (const [lvl, roleId] of Object.entries(data.level_roles)) {
            html += `<tr><td>${escapeHTML(lvl)}</td><td>${roleNames[roleId] || escapeHTML(String(roleId))}</td></tr>`;
        }
        html += `</table></div>`;
    }
    // Leaderboard
    if (data.leaderboard && data.leaderboard.length > 0) {
        html += `<div class="dashboard-card"><span class="dashboard-label">Leaderboard:</span><table><tr><th>#</th><th>User</th><th>Level</th><th>XP</th></tr>`;
        data.leaderboard.forEach((u, i) => {
            const userName = userNames[u.user_id] || '';
            html += `<tr><td>${i+1}</td><td>${escapeHTML(String(userName))}</td><td>${u.level}</td><td>${u.xp}</td></tr>`;
        });
        html += `</table></div>`;
    } else {
        html += `<div class="dashboard-card">No leaderboard data.</div>`;
    }
    levelDiv.innerHTML = html;
}

function showSection(section) {
    document.querySelectorAll('.dashboard-page').forEach(page => {
        if (page.id === `page-${section}`) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });
    // Animate section fade-in
    setTimeout(() => {
        const active = document.querySelector('.dashboard-page.active');
        if (active) {
            active.style.opacity = 1;
            active.style.transform = 'translateY(0)';
        }
    }, 10);
}

// Sidebar navigation logic
const sidebar = document.querySelector('.dashboard-nav');
const sidebarToggle = document.getElementById('sidebar-toggle');
const navLinks = document.querySelectorAll('.dashboard-nav a[data-page]');
const pages = document.querySelectorAll('.dashboard-page');

function closeSidebar() {
    sidebar.classList.add('collapsed');
    sidebar.classList.remove('open');
}
function openSidebar() {
    sidebar.classList.remove('collapsed');
    sidebar.classList.add('open');
}

sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    } else {
        sidebar.classList.toggle('collapsed');
    }
});

// Close sidebar on nav click (mobile)
navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const page = link.getAttribute('data-page');
        showSection(page);
        if (window.innerWidth <= 900) {
            closeSidebar();
        }
    });
    // Add smooth highlight for active link
    link.addEventListener('mouseenter', () => link.classList.add('hovered'));
    link.addEventListener('mouseleave', () => link.classList.remove('hovered'));
});

// On load, show only the overview section
showSection('overview');

// Example: Set guild name (replace with actual data fetch)
document.getElementById('guild-name').textContent = 'Your Server Name';

if (guildId) {
    showLoadingSpinner();
    fetch(`https://epic-bot-backend-production.up.railway.app/api/guild-dashboard?guild_id=${guildId}`)
        .then(res => {
            if (!res.ok) throw new Error('API response not ok: ' + res.status);
            return res.json();
        })
        .then(data => {
            hideLoadingSpinner();
            // --- Collect role, user, and channel names if available ---
            if (data.role_names) roleNames = data.role_names;
            if (data.user_names) userNames = data.user_names;
            if (data.channel_names) channelNames = data.channel_names;
            // Guild Info
            const guildInfoDiv = document.getElementById('guild-info');
            guildInfoDiv.innerHTML = `<div class="dashboard-card">
                <span class="dashboard-label">Guild ID:</span> <span class="dashboard-value" data-id="${escapeHTML(String(data.guild_info.id))}">${escapeHTML(String(data.guild_info.id))}</span>
                ${data.guild_info.name ? `<br><span class='dashboard-label'>Guild Name:</span> <span class='dashboard-value'>${escapeHTML(data.guild_info.name)}</span>` : ''}
            </div>`;
            renderModerationSection(data);
            renderTicketSection(data);
            renderLoggingSection(data);
            renderLevelingSection(data);
            // Collapsible logic for warnings
            document.querySelectorAll('.collapsible').forEach(btn => {
                btn.onclick = function() {
                    this.classList.toggle("active");
                    const content = this.nextElementSibling;
                    content.style.display = content.style.display === "block" ? "none" : "block";
                };
            });
        })
        .catch((err) => {
            hideLoadingSpinner();
            console.error('Dashboard fetch error:', err);
            document.getElementById('dashboard-root').innerHTML = '<div class="dashboard-card">Failed to load dashboard data.<br>' + err + '</div>';
        });
} else {
    document.getElementById('dashboard-root').innerText = 'No guild selected.';
}

// --- Tooltip for IDs on hover ---
document.addEventListener('mouseover', function(e) {
    if (e.target && e.target.classList.contains('dashboard-value') && e.target.dataset.id) {
        let tooltip = document.getElementById('dashboard-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'dashboard-tooltip';
            tooltip.className = 'dashboard-tooltip';
            document.body.appendChild(tooltip);
        }
        tooltip.textContent = e.target.dataset.id;
        tooltip.style.display = 'block';
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + window.scrollX + 'px';
        tooltip.style.top = rect.bottom + window.scrollY + 4 + 'px';
    }
});
document.addEventListener('mouseout', function(e) {
    if (e.target && e.target.classList.contains('dashboard-value')) {
        const tooltip = document.getElementById('dashboard-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }
});
