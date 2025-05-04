const urlParams = new URLSearchParams(window.location.search);
const guildId = urlParams.get('guild_id');

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag]));
}

// --- Role/User/Channel name mapping for display ---
let roleNames = {};
let userNames = {};
let channelNames = {};

// --- Moderation Commands List (should match backend) ---
let ALL_MOD_COMMANDS = []; // Start empty, will be set by backend

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

function attachFloatingDropdown(box, listDiv, triggerDiv) {
    // Move listDiv to body and position it
    function openDropdown() {
        const rect = triggerDiv.getBoundingClientRect();
        listDiv.style.position = 'fixed';
        listDiv.style.left = rect.left + 'px';
        listDiv.style.top = (rect.bottom + window.scrollY) + 'px';
        listDiv.style.width = rect.width + 'px';
        listDiv.style.display = 'block';
        listDiv.style.zIndex = 999999;
        document.body.appendChild(listDiv);
        // Close on click outside
        function closeDropdown(e) {
            if (!listDiv.contains(e.target) && !triggerDiv.contains(e.target)) {
                listDiv.style.display = 'none';
                window.removeEventListener('mousedown', closeDropdown);
                // Optionally move back to box for cleanup
                box.appendChild(listDiv);
            }
        }
        window.addEventListener('mousedown', closeDropdown);
    }
    triggerDiv.onclick = (e) => {
        e.stopPropagation();
        if (listDiv.style.display === 'block') {
            listDiv.style.display = 'none';
            box.appendChild(listDiv);
        } else {
            openDropdown();
        }
    };
}

function createChannelDropdown(selected, allChannels, multi = false, onChange = null) {
    const selectedArr = Array.isArray(selected) ? selected : [selected];
    const dropdownId = 'dropdown-' + Math.random().toString(36).slice(2);
    // Set a max width for the dropdown; allow wrapping if too many channels
    const maxWidth = 520;
    const minWidth = 140;
    // Instead of calculating width, let CSS handle wrapping and width
    let html = `<div class="channel-dropdown-box" tabindex="0" id="${dropdownId}" style="min-width:${minWidth}px;max-width:${maxWidth}px;">
        <div class="channel-dropdown-selected channel-dropdown-wrap" style="min-width:${minWidth-10}px;max-width:${maxWidth-10}px;">
            ${selectedArr.map(cid => `<span class="channel-pill">${allChannels[cid] || '(unknown)'}</span>`).join(multi ? '' : '')}
            <span class="channel-dropdown-arrow">&#9662;</span>
        </div>
        <div class="channel-dropdown-list" style="display:none;min-width:${minWidth}px;max-width:${maxWidth}px;">
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
        attachFloatingDropdown(box, listDiv, selectedDiv);
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
                    selectedDiv.innerHTML = selectedCids.map(cid => `<span class="channel-pill">${allChannels[cid] || '(unknown)'}</span>`).join('') + '<span class="channel-dropdown-arrow">&#9662;</span>';
                } else {
                    listDiv.querySelectorAll('.channel-dropdown-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    if (onChange) onChange(item.getAttribute('data-cid'));
                    selectedDiv.innerHTML = `<span class="channel-pill">${allChannels[item.getAttribute('data-cid')] || '(unknown)'}</span><span class="channel-dropdown-arrow">&#9662;</span>`;
                    listDiv.style.display = 'none';
                    box.appendChild(listDiv);
                }
            };
        });
    }, 0);
    return html;
}

// Helper for styled multi-select command dropdown
function createCommandDropdown(selected, allCommands, id = '', onChange = null) {
    const dropdownId = id || 'cmd-dropdown-' + Math.random().toString(36).slice(2);
    const selectedArr = Array.isArray(selected) ? selected : [selected];
    let html = `<div class="command-dropdown-box" tabindex="0" id="${dropdownId}">
        <div class="command-dropdown-selected command-dropdown-wrap">
            ${selectedArr.map(cmd => `<span class="command-pill">${cmd}</span>`).join('')}
            <span class="command-dropdown-arrow">&#9662;</span>
        </div>
        <div class="command-dropdown-list" style="display:none;">
            ${allCommands.map(cmd =>
                `<div class="command-dropdown-item${selectedArr.includes(cmd) ? ' selected' : ''}" data-cmd="${cmd}">${cmd}</div>`
            ).join('')}
        </div>
    </div>`;
    setTimeout(() => {
        const box = document.getElementById(dropdownId);
        if (!box) return;
        const selectedDiv = box.querySelector('.command-dropdown-selected');
        const listDiv = box.querySelector('.command-dropdown-list');
        attachFloatingDropdown(box, listDiv, selectedDiv);
        listDiv.querySelectorAll('.command-dropdown-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                item.classList.toggle('selected');
                const selectedCmds = Array.from(listDiv.querySelectorAll('.command-dropdown-item.selected')).map(i => i.getAttribute('data-cmd'));
                if (onChange) onChange(selectedCmds);
                selectedDiv.innerHTML = selectedCmds.map(cmd => `<span class="command-pill">${cmd}</span>`).join('') + '<span class="command-dropdown-arrow">&#9662;</span>';
                showApplyBar();
            };
        });
    }, 0);
    return html;
}

// Helper for styled role dropdown
function createRoleDropdown(selected, allRoles, id = '', onChange = null) {
    const dropdownId = id || 'role-dropdown-' + Math.random().toString(36).slice(2);
    const selectedVal = selected || '';
    let html = `<div class="role-dropdown-box" tabindex="0" id="${dropdownId}">
        <div class="role-dropdown-selected role-dropdown-wrap">
            ${selectedVal ? `<span class="role-pill">${allRoles[selectedVal] || '(unknown)'}</span>` : ''}
            <span class="role-dropdown-arrow">&#9662;</span>
        </div>
        <div class="role-dropdown-list" style="display:none;">
            ${Object.entries(allRoles).map(([rid, name]) =>
                `<div class="role-dropdown-item${selectedVal === rid ? ' selected' : ''}" data-role-id="${rid}">${name}</div>`
            ).join('')}
        </div>
    </div>`;
    setTimeout(() => {
        const box = document.getElementById(dropdownId);
        if (!box) return;
        const selectedDiv = box.querySelector('.role-dropdown-selected');
        const listDiv = box.querySelector('.role-dropdown-list');
        attachFloatingDropdown(box, listDiv, selectedDiv);
        listDiv.querySelectorAll('.role-dropdown-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                listDiv.querySelectorAll('.role-dropdown-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                if (onChange) onChange(item.getAttribute('data-role-id'));
                selectedDiv.innerHTML = `<span class="role-pill">${allRoles[item.getAttribute('data-role-id')] || '(unknown)'}</span><span class="role-dropdown-arrow">&#9662;</span>`;
                listDiv.style.display = 'none';
                box.appendChild(listDiv);
            };
        });
    }, 0);
    return html;
}

// --- Apply Changes Bar Logic ---
let originalDropdownState = {};
let pendingDropdownState = {};
let applyBarVisible = false;

function getDropdownState() {
    // Collect current dropdown selections by dropdown id
    const dropdowns = document.querySelectorAll('.channel-dropdown-box');
    const state = {};
    dropdowns.forEach(drop => {
        const selected = Array.from(drop.querySelectorAll('.channel-pill')).map(e => e.textContent);
        state[drop.id] = selected;
    });
    return state;
}

function setDropdownState(state) {
    // For each dropdown, set its selected channels
    Object.entries(state).forEach(([id, selectedArr]) => {
        const drop = document.getElementById(id);
        if (!drop) return;
        const selectedDiv = drop.querySelector('.channel-dropdown-selected');
        if (selectedDiv) {
            selectedDiv.innerHTML = selectedArr.map(name => `<span class="channel-pill">${name}</span>`).join('') + '<span class="channel-dropdown-arrow">&#9662;</span>';
        }
        // Also update the dropdown list items
        const listDiv = drop.querySelector('.channel-dropdown-list');
        if (listDiv) {
            listDiv.querySelectorAll('.channel-dropdown-item').forEach(item => {
                if (selectedArr.includes(item.textContent)) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
    });
}

function showApplyBar() {
    if (applyBarVisible) return;
    document.getElementById('apply-changes-bar').style.display = 'flex';
    document.getElementById('apply-changes-bar').className = 'apply-changes-bar';
    document.getElementById('apply-changes-message').style.display = '';
    document.getElementById('apply-changes-loading').style.display = 'none';
    document.getElementById('apply-changes-apply').style.display = '';
    document.getElementById('apply-changes-cancel').style.display = '';
    applyBarVisible = true;
}
function hideApplyBar() {
    document.getElementById('apply-changes-bar').style.display = 'none';
    applyBarVisible = false;
}
function showApplyBarSuccess(msg) {
    const bar = document.getElementById('apply-changes-bar');
    bar.className = 'apply-changes-bar success';
    document.getElementById('apply-changes-message').textContent = msg;
    document.getElementById('apply-changes-message').style.display = '';
    document.getElementById('apply-changes-loading').style.display = 'none';
    document.getElementById('apply-changes-apply').style.display = 'none';
    document.getElementById('apply-changes-cancel').style.display = 'none';
    setTimeout(hideApplyBar, 3000);
}
function showApplyBarError(msg) {
    const bar = document.getElementById('apply-changes-bar');
    bar.className = 'apply-changes-bar error';
    document.getElementById('apply-changes-message').textContent = msg;
    document.getElementById('apply-changes-message').style.display = '';
    document.getElementById('apply-changes-loading').style.display = 'none';
    document.getElementById('apply-changes-apply').style.display = '';
    document.getElementById('apply-changes-cancel').style.display = '';
}
function showApplyBarLoading() {
    document.getElementById('apply-changes-message').style.display = 'none';
    document.getElementById('apply-changes-loading').style.display = '';
    document.getElementById('apply-changes-apply').style.display = 'none';
    document.getElementById('apply-changes-cancel').style.display = 'none';
}

function setupDropdownChangeDetection() {
    originalDropdownState = getDropdownState();
    // Remove any previous observers
    if (window._dropdownObservers) {
        window._dropdownObservers.forEach(obs => obs.disconnect());
    }
    window._dropdownObservers = [];
    // Attach a MutationObserver to each dropdown's selected area
    document.querySelectorAll('.channel-dropdown-selected').forEach(selectedDiv => {
        const observer = new MutationObserver(() => {
            pendingDropdownState = getDropdownState();
            if (JSON.stringify(pendingDropdownState) !== JSON.stringify(originalDropdownState)) {
                showApplyBar();
            }
        });
        observer.observe(selectedDiv, { childList: true, subtree: true });
        window._dropdownObservers.push(observer);
    });
}

function resetDropdownsToOriginal() {
    setDropdownState(originalDropdownState);
    hideApplyBar();
}

function collectModerationRoles() {
    const roles = {};
    document.querySelectorAll('#mod-roles-table tr[data-role-id]').forEach(tr => {
        const roleId = tr.getAttribute('data-role-id');
        // Get selected commands from command dropdown
        const cmdBox = tr.querySelector('.command-dropdown-box');
        let cmds = [];
        if (cmdBox) {
            cmds = Array.from(cmdBox.querySelectorAll('.command-dropdown-item.selected')).map(i => i.getAttribute('data-cmd'));
        }
        if (roleId && cmds.length > 0) roles[roleId] = cmds;
    });
    return roles;
}

function applyDropdownChanges() {
    showApplyBarLoading();
    // Collect the current dropdown selections by dropdown id
    const dropdowns = document.querySelectorAll('.channel-dropdown-box');
    let updates = {};
    let ticket_settings = {};
    let log_settings = {};
    let leveling_settings = {};
    // Map dropdowns to their settings by label
    dropdowns.forEach(drop => {
        const label = drop.parentElement && drop.parentElement.querySelector('.dashboard-label')
            ? drop.parentElement.querySelector('.dashboard-label').textContent.trim().toLowerCase()
            : '';
        const selected = Array.from(drop.querySelectorAll('.channel-pill')).map(e => e.textContent);
        // Find channel ID by name
        const selectedIds = selected.map(name => {
            for (const [cid, cname] of Object.entries(channelNames)) {
                if (cname === name) return cid;
            }
            return null;
        }).filter(Boolean);
        // --- Fix: Use .ticket-log-dropdown to identify the ticket log channel dropdown ---
        if (drop.parentElement && drop.parentElement.classList.contains('ticket-log-dropdown')) {
            ticket_settings.log_channel_id = selectedIds[0] || null;
        } else if (label.includes('panel channel')) {
            ticket_settings.channel_id = selectedIds[0] || null;
        } else if (label.includes('log channel')) {
            log_settings.log_channel_id = selectedIds[0] || null;
        } else if (label.includes('selected channels')) {
            log_settings.selected_channels = selectedIds;
        } else if (label.includes('channel')) {
            leveling_settings.channel_id = selectedIds[0] || null;
        }
    });
    // Get extra info for ticket, log, leveling if available
    const ticketSection = document.getElementById('ticket-system');
    if (ticketSection) {
        const rules = ticketSection.querySelector('.dashboard-value');
        if (rules) ticket_settings.rules_text = rules.textContent;
        const msg = ticketSection.querySelectorAll('.dashboard-value');
        if (msg && msg.length > 1) ticket_settings.ticket_msg = msg[1].textContent;
    }
    const loggingSection = document.getElementById('logging-section');
    if (loggingSection) {
        const mode = loggingSection.querySelector('.dashboard-value');
        if (mode) log_settings.mode = mode.textContent;
        const events = Array.from(loggingSection.querySelectorAll('.badge.enabled')).map(e => e.textContent);
        if (events.length) log_settings.events = events;
    }
    const levelingSection = document.getElementById('leveling-section');
    if (levelingSection) {
        const msg = levelingSection.querySelector('.dashboard-value');
        if (msg) leveling_settings.levelup_message = msg.textContent;
    }
    if (Object.keys(ticket_settings).length) updates.ticket_settings = ticket_settings;
    if (Object.keys(log_settings).length) updates.log_settings = log_settings;
    if (Object.keys(leveling_settings).length) updates.leveling_settings = leveling_settings;
    // Moderation roles
    if (document.getElementById('mod-roles-table')) {
        const modRoles = collectModerationRoles();
        if (Object.keys(modRoles).length) updates.moderation_roles = modRoles;
    }
    // Send PATCH request
    fetch('https://epic-bot-backend-production.up.railway.app/api/update-guild-channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId, updates })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            originalDropdownState = JSON.parse(JSON.stringify(pendingDropdownState));
            showApplyBarSuccess('Changes saved successfully!');
        } else {
            showApplyBarError('Failed to save: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(err => {
        showApplyBarError('Failed to save: ' + err);
    });
}

function renderModerationSection(data) {
    const modDiv = document.getElementById('moderation-setup');
    let html = `<div class="dashboard-card">
        <span class="dashboard-label">Moderation Setup:</span> <span class="badge ${data.moderation_setup ? 'enabled' : 'disabled'}">${data.moderation_setup ? 'Enabled' : 'Disabled'}</span>
    </div>`;
    html += `<div class="dashboard-card" id="mod-roles-edit"><span class="dashboard-label">Role Permissions:</span>
        <table id="mod-roles-table"><tr><th>Role</th><th>Allowed Commands</th><th>Actions</th></tr>`;
    // Existing roles
    const usedRoleIds = Object.keys(data.moderation_roles || {});
    for (const [roleId, cmds] of Object.entries(data.moderation_roles || {})) {
        const rowId = `mod-role-row-${roleId}`;
        html += `<tr data-role-id="${roleId}" id="${rowId}">
            <td>
                ${createRoleDropdown(roleId, roleNames, `role-dropdown-${roleId}`, function(newRoleId) {
                    // This callback will be attached after rendering below
                })}
            </td>
            <td>
                ${createCommandDropdown(cmds, ALL_MOD_COMMANDS, `cmd-dropdown-${roleId}`)}
            </td>
            <td>
                <button class="mod-role-remove-btn styled-btn" data-role-id="${roleId}" title="Remove role">&#10060;</button>
            </td>
        </tr>`;
    }
    // Add new role row
    html += `<tr id="mod-role-add-row">
        <td>
            ${createRoleDropdown('', roleNames, 'role-dropdown-add', function(newRoleId) {
                // This callback will be attached after rendering below
            })}
        </td>
        <td>
            ${createCommandDropdown([], ALL_MOD_COMMANDS, 'mod-role-add-cmds')}
        </td>
        <td>
            <button id="mod-role-add-btn" class="styled-btn" title="Add role">&#43;</button>
        </td>
    </tr>`;
    html += `</table></div>`;
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

    // --- Moderation Role Editing Logic ---

    // Attach onChange for all role dropdowns to update row and show apply bar
    document.querySelectorAll('.role-dropdown-box').forEach(box => {
        const tr = box.closest('tr');
        box.querySelectorAll('.role-dropdown-item').forEach(item => {
            item.addEventListener('click', function() {
                const newRoleId = this.getAttribute('data-role-id');
                if (tr) {
                    tr.setAttribute('data-role-id', newRoleId);
                    tr.id = `mod-role-row-${newRoleId}`;
                    // Update remove button
                    const btn = tr.querySelector('.mod-role-remove-btn');
                    if (btn) btn.setAttribute('data-role-id', newRoleId);
                    showApplyBar();
                }
            });
        });
    });

    // Add new role
    document.getElementById('mod-role-add-btn').onclick = function() {
        const addRoleDropdownBox = document.getElementById('role-dropdown-add');
        const addCmdDropdownBox = document.getElementById('mod-role-add-cmds');
        // Get selected role
        const selectedRoleId = addRoleDropdownBox.querySelector('.role-dropdown-item.selected')?.getAttribute('data-role-id');
        // Get selected commands
        const cmds = Array.from(addCmdDropdownBox.querySelectorAll('.command-dropdown-item.selected')).map(i => i.getAttribute('data-cmd'));
        if (!selectedRoleId || cmds.length === 0) return;
        const table = document.getElementById('mod-roles-table');
        if (table.querySelector(`tr[data-role-id="${selectedRoleId}"]`)) return;
        const tr = document.createElement('tr');
        tr.setAttribute('data-role-id', selectedRoleId);
        tr.id = `mod-role-row-${selectedRoleId}`;
        tr.innerHTML = `<td>
                ${createRoleDropdown(selectedRoleId, roleNames, `role-dropdown-${selectedRoleId}`)}
            </td>
            <td>
                ${createCommandDropdown(cmds, ALL_MOD_COMMANDS, `cmd-dropdown-${selectedRoleId}`)}
            </td>
            <td>
                <button class="mod-role-remove-btn styled-btn" data-role-id="${selectedRoleId}" title="Remove role">&#10060;</button>
            </td>`;
        table.insertBefore(tr, document.getElementById('mod-role-add-row'));
        // Reset add role dropdown
        if (addRoleDropdownBox) {
            const sel = addRoleDropdownBox.querySelector('.role-dropdown-selected');
            if (sel) sel.innerHTML = '<span class="role-dropdown-arrow">&#9662;</span>';
            addRoleDropdownBox.querySelectorAll('.role-dropdown-item.selected').forEach(i => i.classList.remove('selected'));
        }
        // Reset add command dropdown
        if (addCmdDropdownBox) {
            addCmdDropdownBox.querySelectorAll('.command-dropdown-item.selected').forEach(i => i.classList.remove('selected'));
            const sel = addCmdDropdownBox.querySelector('.command-dropdown-selected');
            if (sel) sel.innerHTML = '<span class="command-dropdown-arrow">&#9662;</span>';
        }
        showApplyBar();

        // Attach onChange for the new row's role dropdown
        const newBox = tr.querySelector('.role-dropdown-box');
        if (newBox) {
            newBox.querySelectorAll('.role-dropdown-item').forEach(item => {
                item.addEventListener('click', function() {
                    const newRoleId = this.getAttribute('data-role-id');
                    tr.setAttribute('data-role-id', newRoleId);
                    tr.id = `mod-role-row-${newRoleId}`;
                    const btn = tr.querySelector('.mod-role-remove-btn');
                    if (btn) btn.setAttribute('data-role-id', newRoleId);
                    showApplyBar();
                });
            });
        }
    };

    setTimeout(setupDropdownChangeDetection, 0);
}

function renderTicketSection(data) {
    const ticketDiv = document.getElementById('ticket-system');
    if (!data.ticket_settings) {
        ticketDiv.innerHTML = `<div class="dashboard-card">Ticket system not set up.</div>`;
        return;
    }
    // --- Editable Rules Field ---
    let rulesHtml = `
        <div style="display:flex;align-items:flex-start;gap:0.7rem;">
            <pre id="ticket-rules-pre" class="dashboard-value" style="white-space:pre-wrap;word-break:break-word;flex:1 1 auto;margin:0;min-width:0;">${escapeHTML(data.ticket_settings.rules_text || '')}</pre>
            <button id="edit-ticket-rules-btn" class="dashboard-btn" style="flex:0 0 auto;">Edit</button>
        </div>
        <div id="ticket-rules-edit-wrap" style="display:none;flex-direction:column;gap:0.5rem;">
            <textarea id="ticket-rules-edit" style="width:100%;min-height:120px;font-family:inherit;font-size:1rem;resize:vertical;">${escapeHTML(data.ticket_settings.rules_text || '')}</textarea>
            <button id="save-ticket-rules-btn" class="dashboard-btn" style="align-self:flex-end;">Save</button>
        </div>
    `;

    let html = `<div class="dashboard-card" style="margin-bottom:2rem; padding-bottom:1.2rem;">
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Panel Channel:</span> ${createChannelDropdown(data.ticket_settings.channel_id, channelNames)}</div>
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Log Channel:</span> <span class="ticket-log-dropdown">${createChannelDropdown(data.ticket_settings.log_channel_id, channelNames)}</span></div>
        <div style="margin-bottom:1.1rem;"><span class="dashboard-label">Rules:</span> <span style="flex:1 1 auto;min-width:0;display:block;">${rulesHtml}</span></div>
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
    setTimeout(setupDropdownChangeDetection, 0);

    // --- Rules Edit Logic ---
    const editBtn = document.getElementById('edit-ticket-rules-btn');
    const pre = document.getElementById('ticket-rules-pre');
    const editWrap = document.getElementById('ticket-rules-edit-wrap');
    const textarea = document.getElementById('ticket-rules-edit');
    const saveBtn = document.getElementById('save-ticket-rules-btn');
    let originalRules = data.ticket_settings.rules_text || '';

    if (editBtn && pre && editWrap && textarea && saveBtn) {
        editBtn.onclick = () => {
            pre.style.display = 'none';
            editBtn.style.display = 'none';
            editWrap.style.display = 'flex';
            textarea.value = originalRules;
            textarea.focus();
        };
        textarea.oninput = () => {
            // Show save button only if changed
            saveBtn.style.display = (textarea.value !== originalRules) ? '' : 'none';
        };
        saveBtn.onclick = () => {
            const newRules = textarea.value;
            if (newRules !== originalRules) {
                // Update the pre block and the dashboard-value for rules
                pre.textContent = newRules;
                originalRules = newRules;
                // Update the ticket_settings.rules_text in the DOM for applyDropdownChanges
                // (the .dashboard-value is used by applyDropdownChanges to collect the value)
                pre.classList.add('dashboard-value');
                // Find the .dashboard-value for rules and update its textContent
                pre.textContent = newRules;
                // Also update the hidden .dashboard-value for applyDropdownChanges
                // (if you use a hidden input, update that too)
                // Show apply bar
                showApplyBar();
            }
            pre.style.display = '';
            editBtn.style.display = '';
            editWrap.style.display = 'none';
            saveBtn.style.display = 'none';
        };
        // Hide save button initially
        saveBtn.style.display = 'none';
    }
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
    setTimeout(setupDropdownChangeDetection, 0);
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
    setTimeout(setupDropdownChangeDetection, 0);
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
            // Use backend-provided list if available
            if (data.all_mod_commands && Array.isArray(data.all_mod_commands)) {
                ALL_MOD_COMMANDS = data.all_mod_commands;
            }
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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupDropdownChangeDetection, 1000);
    document.getElementById('apply-changes-cancel').onclick = resetDropdownsToOriginal;
    document.getElementById('apply-changes-apply').onclick = applyDropdownChanges;
});
