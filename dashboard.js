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

function createChannelDropdown(selected, allChannels, multi = false, onChange = null) {
    const selectedArr = Array.isArray(selected) ? selected : [selected];
    const dropdownId = 'dropdown-' + Math.random().toString(36).slice(2);
    // Function to calculate width based on selected channel names
    function calcWidth(selectedArr) {
        let baseWidth = 140;
        let maxWidth = 900;
        let minWidth = baseWidth;
        let totalLen = 0;
        if (multi && selectedArr.length > 0) {
            totalLen = selectedArr.reduce((acc, cid) => acc + ((allChannels[cid] || '').length), 0);
            minWidth = Math.min(Math.max(baseWidth, 32 + selectedArr.length * 18 + totalLen * 9 + (selectedArr.length-1)*10), maxWidth);
        } else if (!multi && selectedArr.length === 1) {
            minWidth = Math.min(Math.max(baseWidth, 32 + (allChannels[selectedArr[0]] || '').length * 11), maxWidth);
        }
        return minWidth;
    }
    let width = calcWidth(selectedArr);
    let maxWidth = 900;
    let html = `<div class="channel-dropdown-box" tabindex="0" id="${dropdownId}" style="width:${width}px;min-width:${width}px;max-width:${maxWidth}px;">
        <div class="channel-dropdown-selected" style="width:${width-10}px;max-width:${maxWidth-10}px;">
            ${selectedArr.map(cid => `<span class="channel-pill">${allChannels[cid] || '(unknown)'}</span>`).join(multi ? ', ' : '')}
            <span class="channel-dropdown-arrow">&#9662;</span>
        </div>
        <div class="channel-dropdown-list" style="display:none;width:${width}px;min-width:${width}px;max-width:${maxWidth}px;">
            ${Object.entries(allChannels).map(([cid, name]) => `
                <div class="channel-dropdown-item${selectedArr.includes(cid) ? ' selected' : ''}" data-cid="${cid}">${name}</div>
            `).join('')}
        </div>
    </div>`;
    setTimeout(() => {
        const box = document.getElementById(dropdownId);
        if (!box) return;
        const selectedDiv = box.querySelector('.channel-dropdown-selected');
        const listDiv = box.querySelector('.channel-dropdown-list');
        function updateDropdownWidth(newSelectedArr) {
            const newWidth = calcWidth(newSelectedArr);
            box.style.width = newWidth + 'px';
            box.style.minWidth = newWidth + 'px';
            selectedDiv.style.width = (newWidth-10) + 'px';
            listDiv.style.width = newWidth + 'px';
            listDiv.style.minWidth = newWidth + 'px';
        }
        selectedDiv.onclick = () => {
            listDiv.style.display = listDiv.style.display === 'block' ? 'none' : 'block';
        };
        box.onblur = () => { listDiv.style.display = 'none'; };
        listDiv.querySelectorAll('.channel-dropdown-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                if (multi) {
                    if (item.classList.contains('selected')) {
                        item.classList.remove('selected');
                    } else {
                        item.classList.add('selected');
                    }
                    const selectedCids = Array.from(listDiv.querySelectorAll('.channel-dropdown-item.selected')).map(i => i.getAttribute('data-cid'));
                    if (onChange) onChange(selectedCids);
                    selectedDiv.innerHTML = selectedCids.map(cid => `<span class="channel-pill">${allChannels[cid] || '(unknown)'}</span>`).join(', ') + '<span class="channel-dropdown-arrow">&#9662;</span>';
                    updateDropdownWidth(selectedCids);
                } else {
                    listDiv.querySelectorAll('.channel-dropdown-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    if (onChange) onChange(item.getAttribute('data-cid'));
                    selectedDiv.innerHTML = `<span class="channel-pill">${allChannels[item.getAttribute('data-cid')] || '(unknown)'}</span><span class="channel-dropdown-arrow">&#9662;</span>`;
                    listDiv.style.display = 'none';
                    updateDropdownWidth([item.getAttribute('data-cid')]);
                }
            };
        });
    }, 0);
    return html;
}

function renderModerationSection(data) {
    const modDiv = document.getElementById('moderation-setup');
    let html = `<div class="dashboard-card">
        <span class="dashboard-label">Moderation Setup:</span> <span class="badge ${data.moderation_setup ? 'enabled' : 'disabled'}">${data.moderation_setup ? 'Enabled' : 'Disabled'}</span>
    </div>`;
    if (data.moderation_roles && Object.keys(data.moderation_roles).length > 0) {
        html += `<div class="dashboard-card"><span class="dashboard-label">Role Permissions:</span><table><tr><th>Role</th><th>Allowed Commands</th></tr>`;
        for (const [roleId, cmds] of Object.entries(data.moderation_roles)) {
            const roleName = roleNames[roleId] || roleId;
            html += `<tr><td>${escapeHTML(roleName)}</td><td>${cmds.map(c => `<span class='badge enabled'>${escapeHTML(c)}</span>`).join(' ')}</td></tr>`;
        }
        html += `</table></div>`;
    }
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
    let html = `<div class="dashboard-card" style="margin-bottom:2rem; padding-bottom:1.2rem;">
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Panel Channel:</span> ${createChannelDropdown(data.ticket_settings.channel_id, channelNames)}</div>
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Log Channel:</span> ${createChannelDropdown(data.ticket_settings.log_channel_id, channelNames)}</div>
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Rules:</span> <span class="dashboard-value">${escapeHTML(data.ticket_settings.rules_text || '')}</span></div>
        <div><span class="dashboard-label">Ticket Message:</span> <span class="dashboard-value">${escapeHTML(data.ticket_settings.ticket_msg || '')}</span></div>
    </div>`;
    if (data.ticket_categories && data.ticket_categories.length > 0) {
        html += `<div class="dashboard-card" style="margin-bottom:2rem;"><span class="dashboard-label">Categories:</span><ul class="dashboard-list" style="margin-top:0.7rem; margin-bottom:0.7rem;">`;
        for (const cat of data.ticket_categories) {
            html += `<li style="margin-bottom:0.5rem;"><b>${escapeHTML(cat.name)}</b>: ${escapeHTML(cat.description)}${cat.ping_on_create ? ' <span class="badge warn">Ping on create</span>' : ''}</li>`;
        }
        html += `</ul></div>`;
    }
    if (data.ticket_category_roles && Object.keys(data.ticket_category_roles).length > 0) {
        html += `<div class="dashboard-card" style="margin-bottom:2rem;"><span class="dashboard-label">Category Roles:</span><table style="margin-top:0.7rem;"><tr><th>Category</th><th>Roles</th></tr>`;
        for (const [cat, roles] of Object.entries(data.ticket_category_roles)) {
            const roleNamesList = roles.map(r => roleNames[r] || '').filter(Boolean).join(', ');
            html += `<tr><td>${escapeHTML(cat)}</td><td>${roleNamesList || '<span style=\'color:#888\'>(none)</span>'}</td></tr>`;
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
    let html = `<div class="dashboard-card" style="margin-bottom:2rem; padding-bottom:1.2rem;">
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Log Channel:</span> ${createChannelDropdown(data.log_settings.log_channel_id, channelNames)}</div>
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Mode:</span> <span class="dashboard-value">${escapeHTML(data.log_settings.mode)}</span></div>
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Events:</span> <span class="dashboard-value">${data.log_settings.events.map(e => `<span class='badge enabled'>${escapeHTML(e)}</span>`).join(' ')}</span></div>`;
    if (data.log_settings.selected_channels && data.log_settings.selected_channels.length > 0) {
        html += `<div><span class="dashboard-label">Selected Channels:</span> ${createChannelDropdown(data.log_settings.selected_channels, channelNames, true)}</div>`;
    }
    html += `</div>`;
    logDiv.innerHTML = html;
}

function renderLevelingSection(data) {
    const levelDiv = document.getElementById('leveling-section');
    let html = '';
    let currentPage = 0;
    const perPage = 10;
    let leaderboardData = data.leaderboard ? [...data.leaderboard] : [];
    let userNamesData = { ...userNames };

    function renderLeaderboardPage(page) {
        let out = '';
        if (leaderboardData && leaderboardData.length > 0) {
            const start = page * perPage;
            const end = start + perPage;
            const pageData = leaderboardData.slice(start, end);
            out += `<div class="dashboard-card" style="margin-bottom:2rem;"><span class="dashboard-label">Leaderboard:</span><table style="margin-top:0.7rem;"><tr><th>#</th><th>User</th><th>Level</th><th>XP</th></tr>`;
            pageData.forEach((u, i) => {
                const userName = userNamesData[u.user_id] || u.user_id || '';
                out += `<tr><td>${start + i + 1}</td><td>${escapeHTML(String(userName))}</td><td>${u.level}</td><td>${u.xp}</td></tr>`;
            });
            out += `</table>`;
            out += `<div style="display:flex;justify-content:center;gap:1.5rem;margin-top:1.2rem;">
                <button type="button" id="leaderboard-prev" class="btn glass-btn" ${page === 0 ? 'disabled' : ''}>&#8592;</button>
                <button type="button" id="leaderboard-next" class="btn glass-btn" ${(end >= leaderboardData.length) ? 'disabled' : ''}>&#8594;</button>
            </div>`;
            out += `</div>`;
        } else {
            out += `<div class="dashboard-card">No leaderboard data.</div>`;
        }
        return out;
    }
    function updateLeaderboard(page) {
        leaderboardData = data.leaderboard ? [...data.leaderboard] : [];
        userNamesData = { ...userNames };
        levelDiv.innerHTML = html + renderLeaderboardPage(page);
        setTimeout(() => {
            const prevBtn = document.getElementById('leaderboard-prev');
            const nextBtn = document.getElementById('leaderboard-next');
            if (prevBtn) prevBtn.onclick = () => {
                if (currentPage > 0) {
                    currentPage--;
                    updateLeaderboard(currentPage);
                }
            };
            if (nextBtn) nextBtn.onclick = () => {
                if ((currentPage + 1) * perPage < leaderboardData.length) {
                    currentPage++;
                    updateLeaderboard(currentPage);
                }
            };
        }, 0);
    }
    if (data.leveling_settings) {
        html += `<div class="dashboard-card" style="margin-bottom:2rem; padding-bottom:1.2rem;">
            <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Level Up Message:</span> <span class="dashboard-value">${escapeHTML(data.leveling_settings.levelup_message || '')}</span></div>
            <div><span class="dashboard-label">Channel:</span> ${createChannelDropdown(data.leveling_settings.channel_id, channelNames)}</div>
        </div>`;
    } else {
        html += `<div class="dashboard-card">Leveling not configured.</div>`;
    }
    if (data.level_roles && Object.keys(data.level_roles).length > 0) {
        html += `<div class="dashboard-card" style="margin-bottom:2rem;"><span class="dashboard-label">Level Roles:</span><table style="margin-top:0.7rem;"><tr><th>Level</th><th>Role</th></tr>`;
        for (const [lvl, roleId] of Object.entries(data.level_roles)) {
            html += `<tr><td>${escapeHTML(lvl)}</td><td>${roleNames[roleId] || escapeHTML(String(roleId))}</td></tr>`;
        }
        html += `</table></div>`;
    }
    updateLeaderboard(currentPage);
}

function showSection(section) {
    document.querySelectorAll('.dashboard-page').forEach(page => {
        if (page.id === `page-${section}`) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });
    setTimeout(() => {
        const active = document.querySelector('.dashboard-page.active');
        if (active) {
            active.style.opacity = 1;
            active.style.transform = 'translateY(0)';
        }
    }, 10);
}

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
    link.addEventListener('mouseenter', () => link.classList.add('hovered'));
    link.addEventListener('mouseleave', () => link.classList.remove('hovered'));
});

showSection('overview');

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
            if (data.role_names) roleNames = data.role_names;
            if (data.user_names) userNames = data.user_names;
            if (data.channel_names) channelNames = data.channel_names;
            const guildInfoDiv = document.getElementById('guild-info');
            guildInfoDiv.innerHTML = `<div class="dashboard-card">
                <span class="dashboard-label">Guild ID:</span> <span class="dashboard-value" data-id="${escapeHTML(String(data.guild_info.id))}">${escapeHTML(String(data.guild_info.id))}</span>
                ${data.guild_info.name ? `<br><span class='dashboard-label'>Guild Name:</span> <span class='dashboard-value'>${escapeHTML(data.guild_info.name)}</span>` : ''}
            </div>`;
            renderModerationSection(data);
            renderTicketSection(data);
            renderLoggingSection(data);
            renderLevelingSection(data);
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
