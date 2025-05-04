// Minimal helper for ticket panel channel change logic

async function fetchGuildDashboard(guildId) {
    const res = await fetch(`https://epic-bot-backend-production.up.railway.app/api/guild-dashboard?guild_id=${guildId}`);
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return await res.json();
}

async function updateGuildChannels(guildId, updates) {
    const res = await fetch('https://epic-bot-backend-production.up.railway.app/api/update-guild-channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId, updates })
    });
    return await res.json();
}

// Call this when user clicks "Apply" in the ticket section
async function applyTicketPanelChannelChange(guildId, newPanelChannelId) {
    // 1. Fetch current dashboard data
    const data = await fetchGuildDashboard(guildId);
    const ticketSettings = data.ticket_settings || {};
    const oldPanelChannelId = ticketSettings.channel_id;
    const oldPanelMessageId = ticketSettings.panel_message_id; // You must store this in your backend!

    // 2. If channel changed, delete old panel message and post new one
    if (oldPanelChannelId && oldPanelChannelId !== newPanelChannelId) {
        // Call backend endpoint to delete old panel message
        await fetch(`https://epic-bot-backend-production.up.railway.app/api/delete-panel-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guild_id: guildId,
                channel_id: oldPanelChannelId,
                message_id: oldPanelMessageId
            })
        });
    }

    // 3. Update ticket_settings with new channel
    const updates = { ticket_settings: { ...ticketSettings, channel_id: newPanelChannelId } };
    const updateRes = await updateGuildChannels(guildId, updates);

    // 4. Call backend endpoint to post new panel message and save its ID
    if (oldPanelChannelId !== newPanelChannelId) {
        await fetch(`https://epic-bot-backend-production.up.railway.app/api/post-panel-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guild_id: guildId,
                channel_id: newPanelChannelId
            })
        });
    }

    return updateRes;
}

// Example usage (call this from your UI logic):
// await applyTicketPanelChannelChange(guildId, selectedPanelChannelId);

// You will need to add backend endpoints for /api/delete-panel-message and /api/post-panel-message
// that handle deleting and posting the panel message and updating the DB with the new message/channel ID.

// Render the editable ticket categories section
function renderTicketCategoriesEditor(categories, categoryRoles, allRoles) {
    let html = `<div class="dashboard-card" style="margin-bottom:2rem;">
        <span class="dashboard-label">Categories:</span>
        <div id="ticket-categories-edit-list" style="margin-top:1rem;">`;

    categories.forEach((cat, idx) => {
        const catId = `cat-${idx}`;
        const rolesForCat = (categoryRoles && categoryRoles[cat.name]) ? categoryRoles[cat.name] : [];
        const pingRoles = Array.isArray(cat.ping_roles) ? cat.ping_roles : [];
        html += `
        <div class="ticket-category-edit" data-cat-idx="${idx}" style="margin-bottom:1.5rem;padding:1.1rem 1.2rem;background:#23272a;border-radius:10px;border:1.5px solid #5865f2;">
            <div style="display:flex;align-items:center;gap:0.7rem;">
                <input type="text" class="ticket-cat-name-input" id="${catId}-name" value="${escapeHTML(cat.name)}" style="font-size:1.1em;font-weight:600;background:#181b20;color:#fff;border:1.5px solid #5865f2;border-radius:7px;padding:0.3em 0.8em;width:180px;"/>
                <span style="color:#888;font-size:0.97em;">Title</span>
            </div>
            <div style="margin-top:0.7rem;">
                <textarea class="ticket-cat-desc-input" id="${catId}-desc" style="width:100%;min-height:48px;font-size:1em;background:#181b20;color:#fff;border:1.5px solid #5865f2;border-radius:7px;padding:0.5em 0.8em;">${escapeHTML(cat.description)}</textarea>
                <span style="color:#888;font-size:0.97em;">Description</span>
            </div>
            <div style="margin-top:0.7rem;">
                <span style="color:#fff;font-weight:500;">Allowed Roles:</span>
                <select class="ticket-cat-roles-select" id="${catId}-roles" multiple style="margin-left:0.7em;min-width:160px;max-width:340px;background:#181b20;color:#fff;border:1.5px solid #5865f2;border-radius:7px;padding:0.3em 0.8em;">
                    ${Object.entries(allRoles).map(([rid, rname]) =>
                        `<option value="${rid}"${rolesForCat.includes(rid) ? ' selected' : ''}>${escapeHTML(rname)}</option>`
                    ).join('')}
                </select>
            </div>
            <div style="margin-top:0.7rem;">
                <span style="color:#fff;font-weight:500;">Ping Roles:</span>
                <select class="ticket-cat-pingroles-select" id="${catId}-pingroles" multiple style="margin-left:0.7em;min-width:160px;max-width:340px;background:#181b20;color:#fff;border:1.5px solid #f5a524;border-radius:7px;padding:0.3em 0.8em;">
                    ${Object.entries(allRoles).map(([rid, rname]) =>
                        `<option value="${rid}"${pingRoles.includes(rid) ? ' selected' : ''}${!rolesForCat.includes(rid) ? ' disabled' : ''}>${escapeHTML(rname)}</option>`
                    ).join('')}
                </select>
                <span style="color:#f5a524;font-size:0.97em;margin-left:0.7em;">(Only roles allowed above can be pinged)</span>
            </div>
        </div>`;
    });

    html += `</div></div>`;
    return html;
}

// Render the ticket section, including categories editor
function renderTicketSectionV2(data) {
    const ticketDiv = document.getElementById('ticket-system');
    if (!data.ticket_settings) {
        ticketDiv.innerHTML = `<div class="dashboard-card">Ticket system not set up.</div>`;
        return;
    }
    // ...render panel, rules, message editors as needed...

    // --- Categories Editor ---
    let catHtml = '';
    if (data.ticket_categories && data.ticket_categories.length > 0) {
        catHtml = renderTicketCategoriesEditor(
            data.ticket_categories,
            data.ticket_category_roles,
            roleNames
        );
    }
    // ...append catHtml to your main html...
    ticketDiv.innerHTML = /* ...existing html for panel/rules/message... */ + catHtml;

    // --- Attach change listeners for categories ---
    document.querySelectorAll('.ticket-cat-name-input, .ticket-cat-desc-input').forEach(input => {
        input.addEventListener('input', showApplyBar);
    });
    document.querySelectorAll('.ticket-cat-roles-select, .ticket-cat-pingroles-select').forEach(sel => {
        sel.addEventListener('change', showApplyBar);
    });
}

// Collect ticket categories for PATCH
function collectTicketCategories() {
    // Returns [{name, description, roles: [roleId], ping_roles: [roleId]}]
    const cats = [];
    document.querySelectorAll('.ticket-category-edit').forEach(catDiv => {
        const name = catDiv.querySelector('.ticket-cat-name-input').value.trim();
        const desc = catDiv.querySelector('.ticket-cat-desc-input').value.trim();
        const rolesSel = catDiv.querySelector('.ticket-cat-roles-select');
        const pingSel = catDiv.querySelector('.ticket-cat-pingroles-select');
        const roles = Array.from(rolesSel.selectedOptions).map(o => o.value);
        const ping_roles = Array.from(pingSel.selectedOptions).map(o => o.value);
        cats.push({ name, description: desc, roles, ping_roles });
    });
    return cats;
}

// In your apply changes logic, add this to the PATCH payload:
function applyDropdownChangesV2() {
    // ...existing code to collect other updates...
    let updates = {};
    // ...collect ticket_settings, log_settings, etc...
    updates.ticket_categories = collectTicketCategories();
    // ...send PATCH as before...
}
