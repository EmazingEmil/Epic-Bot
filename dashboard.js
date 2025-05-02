const urlParams = new URLSearchParams(window.location.search);
const guildId = urlParams.get('guild_id');

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag]));
}

if (guildId) {
    fetch(`https://epic-bot-backend-production.up.railway.app/api/guild-dashboard?guild_id=${guildId}`)
        .then(res => res.json())
        .then(data => {
            // Guild Info
            const guildInfoDiv = document.getElementById('guild-info');
            guildInfoDiv.innerHTML = `<div class="dashboard-card">
                <span class="dashboard-label">Guild ID:</span> <span class="dashboard-value">${escapeHTML(String(data.guild_info.id))}</span>
            </div>`;

            // Moderation Setup
            const modDiv = document.getElementById('moderation-setup');
            modDiv.innerHTML = `<div class="dashboard-card">
                <span class="dashboard-label">Moderation Setup:</span> <span class="dashboard-value">${data.moderation_setup ? '✅ Complete' : '❌ Not Set Up'}</span>
            </div>`;

            // Ticket System
            const ticketDiv = document.getElementById('ticket-system');
            if (data.ticket_system) {
                ticketDiv.innerHTML = `<div class="dashboard-card">
                    <span class="dashboard-label">Panel Channel ID:</span> <span class="dashboard-value">${escapeHTML(String(data.ticket_system.channel_id))}</span><br>
                    <span class="dashboard-label">Log Channel ID:</span> <span class="dashboard-value">${escapeHTML(String(data.ticket_system.log_channel_id))}</span><br>
                    <span class="dashboard-label">Rules:</span> <span class="dashboard-value">${escapeHTML(data.ticket_system.rules_text || '')}</span><br>
                    <span class="dashboard-label">Ticket Message:</span> <span class="dashboard-value">${escapeHTML(data.ticket_system.ticket_msg || '')}</span>
                </div>`;
            } else {
                ticketDiv.innerHTML = `<div class="dashboard-card">Ticket system not set up.</div>`;
            }

            // Leveling Settings
            const levelDiv = document.getElementById('leveling-settings');
            if (data.leveling_settings) {
                levelDiv.innerHTML = `<div class="dashboard-card">
                    <span class="dashboard-label">Level Up Message:</span> <span class="dashboard-value">${escapeHTML(data.leveling_settings.levelup_message || '')}</span><br>
                    <span class="dashboard-label">Channel ID:</span> <span class="dashboard-value">${escapeHTML(String(data.leveling_settings.channel_id))}</span>
                </div>`;
            } else {
                levelDiv.innerHTML = `<div class="dashboard-card">Leveling not configured.</div>`;
            }

            // Leaderboard
            const lbDiv = document.getElementById('leaderboard');
            if (data.leaderboard && data.leaderboard.length > 0) {
                lbDiv.innerHTML = `<div class="dashboard-card">
                    <ul class="dashboard-list">
                        ${data.leaderboard.map((u, i) => `<li>#${i+1} <span class="dashboard-label">User:</span> <span class="dashboard-value">${escapeHTML(String(u.user_id))}</span> <span class="dashboard-label">Level:</span> <span class="dashboard-value">${u.level}</span> <span class="dashboard-label">XP:</span> <span class="dashboard-value">${u.xp}</span></li>`).join('')}
                    </ul>
                </div>`;
            } else {
                lbDiv.innerHTML = `<div class="dashboard-card">No leaderboard data.</div>`;
            }
        })
        .catch(() => {
            document.getElementById('dashboard-root').innerHTML = '<div class="dashboard-card">Failed to load dashboard data.</div>';
        });
} else {
    document.getElementById('dashboard-root').innerText = 'No guild selected.';
}