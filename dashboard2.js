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
