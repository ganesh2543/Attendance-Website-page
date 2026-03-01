// ==================== VIEW SWITCHING ====================
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

function showView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    const view = document.getElementById(`view-${viewId}`);
    const navItem = document.querySelector(`[data-view="${viewId}"]`);
    if (view) view.classList.add('active');
    if (navItem) navItem.classList.add('active');

    const updaters = {
        dashboard: renderDashboard,
        technicians: renderTechnicians,
        attendance: renderAttendanceView,
        leaves: renderLeaves,
        jobs: renderJobs,
        payroll: renderPayroll,
        reports: () => {},
        branches: renderBranches,
        inventory: renderInventory,
        settings: renderSettings
    };
    if (updaters[viewId]) updaters[viewId]();
}

function closeMobileNav() {
    document.body.classList.remove('nav-open');
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        showView(item.dataset.view);
        closeMobileNav();
    });
});

document.querySelector('.logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('dashboard');
    closeMobileNav();
});

document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
    document.querySelector('.sidebar')?.classList.toggle('open');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
});

document.querySelector('.sidebar-overlay')?.addEventListener('click', closeMobileNav);

function updateCurrentDate() {
    const el = document.querySelector('.current-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
updateCurrentDate();

// ==================== MODAL HELPERS ====================
function openModal(id) {
    document.getElementById('modal-overlay').classList.add('active');
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    const modal = document.getElementById(`modal-${id}`);
    if (modal) modal.style.display = 'block';
}

function closeModals() {
    document.getElementById('modal-overlay').classList.remove('active');
}

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModals();
});

// ==================== DASHBOARD ====================
function renderDashboard() {
    const techs = getTechnicians();
    const today = new Date().toISOString().split('T')[0];
    const att = getAttendanceForDate(today);
    const jobs = getJobs();
    const branches = getBranches();

    let present = 0, absent = 0;
    techs.forEach(t => {
        const r = att[t.id];
        if (r?.checkIn) present++;
        else if (r?.status === 'absent') absent++;
    });

    const onsiteJobs = jobs.filter(j => j.status === 'In Progress').length;
    const pendingJobs = jobs.filter(j => j.status === 'Pending').length;

    setEl('d-total-tech', techs.length);
    setEl('d-present', present);
    setEl('d-absent', absent);
    setEl('d-onsite', onsiteJobs);
    setEl('d-pending', pendingJobs);

    // Quick Attendance Summary
    const sumEl = document.getElementById('dash-att-summary');
    if (techs.length === 0) sumEl.innerHTML = '<p class="empty-state">Add technicians first</p>';
    else {
        sumEl.innerHTML = techs.slice(0, 8).map(t => {
            const r = att[t.id];
            const status = r?.checkIn ? 'Present' : r?.status === 'absent' ? 'Absent' : '—';
            const time = r?.checkIn ? ` (${r.checkIn})` : '';
            return `<div class="item"><span>${escapeHtml(t.name)}</span><span>${status}${time}</span></div>`;
        }).join('');
    }

    // Today's Schedule (non-completed jobs)
    const schedEl = document.getElementById('dash-schedule');
    const todayJobs = jobs.filter(j => j.status !== 'Completed' && (!j.scheduledDate || j.scheduledDate === today));
    const otherJobs = jobs.filter(j => j.status !== 'Completed' && j.scheduledDate && j.scheduledDate !== today);
    const toShow = todayJobs.length > 0 ? todayJobs : otherJobs;
    if (toShow.length === 0) schedEl.innerHTML = '<p class="empty-state">No scheduled jobs</p>';
    else {
        schedEl.innerHTML = toShow.slice(0, 5).map(j => {
            const tech = techs.find(t => t.id === j.technicianId);
            const dt = j.scheduledDate ? ` (${j.scheduledDate})` : '';
            return `<div class="item"><span>${escapeHtml(j.customerName || 'Customer')} - ${j.serviceType || 'Service'}${dt}</span><span>${tech?.name || 'Unassigned'}</span></div>`;
        }).join('');
    }
}

// ==================== TECHNICIANS ====================
function renderTechnicians() {
    const techs = getTechnicians();
    const branches = getBranches();
    const listEl = document.getElementById('technician-list');
    if (!listEl) return;

    if (techs.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No technicians. Click Add Technician to add.</p>';
        return;
    }
    listEl.innerHTML = `
        <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Branch</th><th>Actions</th></tr></thead>
            <tbody>${techs.map(t => {
                const branch = branches.find(b => b.id === t.branchId);
                return `<tr>
                    <td>${escapeHtml(t.name)}</td>
                    <td>${t.phone || '—'}</td>
                    <td>${t.role || 'Technician'}</td>
                    <td>${branch?.name || '—'}</td>
                    <td>
                        <button class="btn-secondary btn-small edit-tech" data-id="${t.id}">Edit</button>
                        <button class="btn-secondary btn-small btn-danger delete-tech" data-id="${t.id}">Delete</button>
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

    listEl.querySelectorAll('.edit-tech').forEach(btn => {
        btn.onclick = () => openTechModal(btn.dataset.id);
    });
    listEl.querySelectorAll('.delete-tech').forEach(btn => {
        btn.onclick = () => { if (confirm('Delete technician?')) { deleteTechnician(btn.dataset.id); renderTechnicians(); } };
    });
}

function openTechModal(id) {
    const branches = getBranches();
    document.getElementById('tech-branch').innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    if (id) {
        const t = getTechnicians().find(x => x.id === id);
        if (t) {
            document.getElementById('tech-id').value = t.id;
            document.getElementById('tech-name').value = t.name;
            document.getElementById('tech-phone').value = t.phone || '';
            document.getElementById('tech-role').value = t.role || 'Technician';
            document.getElementById('tech-exp').value = t.experience || '';
            document.getElementById('tech-branch').value = t.branchId || branches[0]?.id;
            document.getElementById('tech-idcard').value = t.idCard || '';
        }
    } else {
        document.getElementById('tech-id').value = '';
        document.getElementById('tech-name').value = '';
        document.getElementById('tech-phone').value = '';
        document.getElementById('tech-role').value = 'Technician';
        document.getElementById('tech-exp').value = '';
        document.getElementById('tech-branch').value = branches[0]?.id || '';
        document.getElementById('tech-idcard').value = '';
    }
    openModal('technician');
}

document.getElementById('btn-add-technician')?.addEventListener('click', () => openTechModal(null));

document.getElementById('btn-save-tech')?.addEventListener('click', () => {
    const id = document.getElementById('tech-id').value;
    saveTechnician({
        id: id || undefined,
        name: document.getElementById('tech-name').value.trim(),
        phone: document.getElementById('tech-phone').value.trim(),
        role: document.getElementById('tech-role').value,
        experience: parseInt(document.getElementById('tech-exp').value) || 0,
        branchId: document.getElementById('tech-branch').value,
        idCard: document.getElementById('tech-idcard').value.trim()
    });
    closeModals();
    renderTechnicians();
    renderDashboard();
});

document.getElementById('btn-cancel-tech')?.addEventListener('click', closeModals);

// ==================== ATTENDANCE ====================
const attDateEl = document.getElementById('att-date');
if (attDateEl) attDateEl.value = new Date().toISOString().split('T')[0];

function renderAttendanceView() {
    const date = attDateEl?.value || new Date().toISOString().split('T')[0];
    const techs = getTechnicians();
    const records = getAttendanceForDate(date);

    const listEl = document.getElementById('attendance-tech-list');
    const dailyEl = document.getElementById('daily-attendance-view');

    if (!listEl) return;

    if (techs.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Add technicians first</p>';
        dailyEl.innerHTML = '';
        return;
    }

    listEl.innerHTML = techs.map(t => {
        const r = records[t.id] || {};
        const hasCheckIn = !!r.checkIn;
        const hasCheckOut = !!r.checkOut;
        const isAbsent = r.status === 'absent';
        return `<div class="tech-row" data-tech="${t.id}">
            <div>
                <strong>${escapeHtml(t.name)}</strong>
                <div class="time-display">${r.checkIn ? `In: ${r.checkIn}` : ''} ${r.checkOut ? `Out: ${r.checkOut}` : ''} ${isAbsent ? '(Absent)' : ''}</div>
            </div>
            <div>
                ${!hasCheckIn && !isAbsent ? `<button class="check-in-btn" data-tech="${t.id}">Check In</button>` : ''}
                ${hasCheckIn && !hasCheckOut ? `<button class="check-out-btn" data-tech="${t.id}">Check Out</button>` : ''}
                ${!hasCheckIn && !isAbsent ? `<button class="btn-secondary btn-small mark-absent" data-tech="${t.id}">Absent</button>` : ''}
                ${isAbsent ? `<button class="btn-secondary btn-small mark-present" data-tech="${t.id}">Mark Present</button>` : ''}
            </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.check-in-btn').forEach(btn => {
        btn.onclick = () => {
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            saveAttendanceRecord(date, btn.dataset.tech, { checkIn: now, status: 'present' });
            renderAttendanceView();
        };
    });
    listEl.querySelectorAll('.check-out-btn').forEach(btn => {
        btn.onclick = () => {
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const r = getAttendanceForDate(date)[btn.dataset.tech] || {};
            saveAttendanceRecord(date, btn.dataset.tech, { ...r, checkOut: now });
            renderAttendanceView();
        };
    });
    listEl.querySelectorAll('.mark-absent').forEach(btn => {
        btn.onclick = () => {
            saveAttendanceRecord(date, btn.dataset.tech, { status: 'absent' });
            renderAttendanceView();
        };
    });
    listEl.querySelectorAll('.mark-present').forEach(btn => {
        btn.onclick = () => {
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            saveAttendanceRecord(date, btn.dataset.tech, { checkIn: now, status: 'present' });
            renderAttendanceView();
        };
    });

    // Daily view table
    dailyEl.innerHTML = `
        <table>
            <thead><tr><th>Technician</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
            <tbody>${techs.map(t => {
                const r = records[t.id] || {};
                return `<tr><td>${escapeHtml(t.name)}</td><td>${r.checkIn || '—'}</td><td>${r.checkOut || '—'}</td><td>${r.status || '—'}</td></tr>`;
            }).join('')}</tbody>
        </table>`;
}

attDateEl?.addEventListener('change', renderAttendanceView);

// ==================== LEAVES ====================
function renderLeaves() {
    const leaves = getLeaves();
    const techs = getTechnicians();
    const balances = getLeaveBalances();

    document.getElementById('leave-history-list').innerHTML = leaves.length === 0
        ? '<p class="empty-state">No leave records</p>'
        : `<table><thead><tr><th>Technician</th><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Reason</th></tr></thead><tbody>${leaves.slice(0, 20).map(l => {
            const tech = techs.find(t => t.id === l.technicianId);
            return `<tr><td>${tech?.name || '—'}</td><td>${l.type || '—'}</td><td>${l.from || '—'}</td><td>${l.to || '—'}</td><td><span class="badge badge-${l.status?.toLowerCase()}">${l.status || 'Pending'}</span></td><td>${escapeHtml(l.reason || '')}</td></tr>`;
        }).join('')}</tbody></table>`;

    document.getElementById('leave-balance-list').innerHTML = techs.length === 0
        ? '<p class="empty-state">No technicians</p>'
        : techs.map(t => {
            const b = balances[t.id] || { sick: 12, casual: 12 };
            return `<div class="inv-item"><strong>${escapeHtml(t.name)}</strong> — Sick: ${b.sick}, Casual: ${b.casual}</div>`;
        }).join('');
}

function openLeaveModal(id) {
    const techs = getTechnicians();
    document.getElementById('leave-technician').innerHTML = techs.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    if (id) {
        const l = getLeaves().find(x => x.id === id);
        if (l) {
            document.getElementById('leave-id').value = l.id;
            document.getElementById('leave-technician').value = l.technicianId;
            document.getElementById('leave-type').value = l.type || 'Sick Leave';
            document.getElementById('leave-from').value = l.from || '';
            document.getElementById('leave-to').value = l.to || '';
            document.getElementById('leave-reason').value = l.reason || '';
            document.getElementById('leave-status').value = l.status || 'Pending';
        }
    } else {
        document.getElementById('leave-id').value = '';
        document.getElementById('leave-from').value = '';
        document.getElementById('leave-to').value = '';
        document.getElementById('leave-reason').value = '';
        document.getElementById('leave-status').value = 'Pending';
    }
    openModal('leave');
}

document.getElementById('btn-apply-leave')?.addEventListener('click', () => openLeaveModal(null));

document.getElementById('btn-save-leave')?.addEventListener('click', () => {
    saveLeave({
        id: document.getElementById('leave-id').value || undefined,
        technicianId: document.getElementById('leave-technician').value,
        type: document.getElementById('leave-type').value,
        from: document.getElementById('leave-from').value,
        to: document.getElementById('leave-to').value,
        reason: document.getElementById('leave-reason').value,
        status: document.getElementById('leave-status').value
    });
    closeModals();
    renderLeaves();
});

document.getElementById('btn-cancel-leave')?.addEventListener('click', closeModals);

// ==================== JOBS ====================
function renderJobs() {
    const jobs = getJobs();
    const techs = getTechnicians();
    const listEl = document.getElementById('job-list');

    if (jobs.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No service requests. Create one to get started.</p>';
        return;
    }
    listEl.innerHTML = `
        <table>
            <thead><tr><th>Customer</th><th>Service</th><th>Technician</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${jobs.map(j => {
                const tech = techs.find(t => t.id === j.technicianId);
                return `<tr>
                    <td>${escapeHtml(j.customerName)}</td>
                    <td>${j.serviceType || '—'}</td>
                    <td>${tech?.name || 'Unassigned'}</td>
                    <td><span class="badge badge-${(j.status || '').toLowerCase().replace(' ', '-')}">${j.status || 'Pending'}</span></td>
                    <td>
                        <button class="btn-secondary btn-small edit-job" data-id="${j.id}">Edit</button>
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

    listEl.querySelectorAll('.edit-job').forEach(btn => {
        btn.onclick = () => openJobModal(btn.dataset.id);
    });
}

function openJobModal(id) {
    const techs = getTechnicians();
    document.getElementById('job-technician').innerHTML = '<option value="">-- Select --</option>' + techs.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    if (id) {
        const j = getJobs().find(x => x.id === id);
        if (j) {
            document.getElementById('job-id').value = j.id;
            document.getElementById('job-customer').value = j.customerName || '';
            document.getElementById('job-address').value = j.address || '';
            document.getElementById('job-phone').value = j.phone || '';
            document.getElementById('job-type').value = j.serviceType || 'Installation';
            document.getElementById('job-date').value = j.scheduledDate || new Date().toISOString().split('T')[0];
            document.getElementById('job-technician').value = j.technicianId || '';
            document.getElementById('job-status').value = j.status || 'Pending';
        }
    } else {
        document.getElementById('job-id').value = '';
        document.getElementById('job-customer').value = '';
        document.getElementById('job-address').value = '';
        document.getElementById('job-phone').value = '';
        document.getElementById('job-type').value = 'Installation';
        document.getElementById('job-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('job-technician').value = '';
        document.getElementById('job-status').value = 'Pending';
    }
    openModal('job');
}

document.getElementById('btn-create-job')?.addEventListener('click', () => openJobModal(null));

document.getElementById('btn-save-job')?.addEventListener('click', () => {
    saveJob({
        id: document.getElementById('job-id').value || undefined,
        customerName: document.getElementById('job-customer').value.trim(),
        address: document.getElementById('job-address').value.trim(),
        phone: document.getElementById('job-phone').value.trim(),
        serviceType: document.getElementById('job-type').value,
        scheduledDate: document.getElementById('job-date').value,
        technicianId: document.getElementById('job-technician').value || null,
        status: document.getElementById('job-status').value
    });
    closeModals();
    renderJobs();
    renderDashboard();
});

document.getElementById('btn-cancel-job')?.addEventListener('click', closeModals);

// ==================== PAYROLL ====================
function renderPayroll() {
    const payroll = getPayroll();
    const techs = getTechnicians();
    document.getElementById('payroll-list').innerHTML = payroll.length === 0
        ? '<p class="empty-state">No payroll records. Based on attendance & overtime.</p>'
        : payroll.slice(0, 15).map(p => {
            const tech = techs.find(t => t.id === p.technicianId);
            return `<div class="inv-item">${tech?.name || p.technicianId} — ${p.month}: ₹${p.salary || 0} (OT: ${p.overtime || 0})</div>`;
        }).join('');
}

// ==================== REPORTS ====================
document.getElementById('btn-daily-report')?.addEventListener('click', () => {
    const date = document.getElementById('report-daily-date')?.value;
    if (!date) return;
    const records = getAttendanceForDate(date);
    const techs = getTechnicians();
    const rows = techs.map(t => {
        const r = records[t.id] || {};
        return [t.name, r.checkIn || '—', r.checkOut || '—', r.status || '—'];
    });
    document.getElementById('report-daily').innerHTML = `<table><thead><tr><th>Name</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
});

document.getElementById('btn-monthly-report')?.addEventListener('click', () => {
    const [y, m] = (document.getElementById('report-monthly')?.value || '').split('-');
    if (!y || !m) return;
    const techs = getTechnicians();
    const days = new Date(parseInt(y), parseInt(m), 0).getDate();
    const summary = techs.map(t => {
        let present = 0;
        for (let d = 1; d <= days; d++) {
            const dk = `${y}-${m.padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const r = getAttendanceForDate(dk)[t.id];
            if (r?.checkIn) present++;
        }
        return [t.name, present, days];
    });
    document.getElementById('report-monthly').innerHTML = `<table><thead><tr><th>Technician</th><th>Present Days</th><th>Total Days</th></tr></thead><tbody>${summary.map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td></tr>`).join('')}</tbody></table>`;
});

document.getElementById('btn-export-excel')?.addEventListener('click', () => {
    const date = document.getElementById('report-daily-date')?.value || new Date().toISOString().split('T')[0];
    const records = getAttendanceForDate(date);
    const techs = getTechnicians();
    const rows = [['Name', 'Check In', 'Check Out', 'Status']];
    techs.forEach(t => {
        const r = records[t.id] || {};
        rows.push([t.name, r.checkIn || '', r.checkOut || '', r.status || '']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `attendance_${date}.csv`;
    a.click();
});

document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    const date = document.getElementById('report-daily-date')?.value || new Date().toISOString().split('T')[0];
    const records = getAttendanceForDate(date);
    const techs = getTechnicians();
    let html = '<h2>Attendance Report - ' + date + '</h2><table border="1"><tr><th>Name</th><th>Check In</th><th>Check Out</th><th>Status</th></tr>';
    techs.forEach(t => {
        const r = records[t.id] || {};
        html += `<tr><td>${t.name}</td><td>${r.checkIn || '—'}</td><td>${r.checkOut || '—'}</td><td>${r.status || '—'}</td></tr>`;
    });
    html += '</table>';
    const w = window.open('', '_blank');
    w.document.write('<html><body>' + html + '</body></html>');
    w.document.close();
    w.print();
});

// ==================== BRANCHES ====================
function renderBranches() {
    const branches = getBranches();
    document.getElementById('branch-list').innerHTML = branches.map(b => `
        <div class="inv-item" style="display:flex;justify-content:space-between;">
            <div><strong>${escapeHtml(b.name)}</strong> — ${escapeHtml(b.address || '')}</div>
            <div>
                <button class="btn-secondary btn-small edit-branch" data-id="${b.id}">Edit</button>
                ${!b.isDefault ? `<button class="btn-secondary btn-small btn-danger delete-branch" data-id="${b.id}">Delete</button>` : ''}
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.edit-branch').forEach(btn => {
        btn.onclick = () => {
            const b = branches.find(x => x.id === btn.dataset.id);
            if (b) {
                document.getElementById('branch-id').value = b.id;
                document.getElementById('branch-name').value = b.name;
                document.getElementById('branch-address').value = b.address || '';
                openModal('branch');
            }
        };
    });
    document.querySelectorAll('.delete-branch').forEach(btn => {
        btn.onclick = () => {
            if (confirm('Delete this branch?')) {
                const list = getBranches().filter(b => b.id !== btn.dataset.id);
                setData('ac_branches', list);
                renderBranches();
            }
        };
    });
}

document.getElementById('btn-add-branch')?.addEventListener('click', () => {
    document.getElementById('branch-id').value = '';
    document.getElementById('branch-name').value = '';
    document.getElementById('branch-address').value = '';
    openModal('branch');
});

document.getElementById('btn-save-branch')?.addEventListener('click', () => {
    const id = document.getElementById('branch-id').value;
    if (id) {
        const list = getBranches();
        const i = list.findIndex(b => b.id === id);
        if (i >= 0) list[i] = { ...list[i], name: document.getElementById('branch-name').value, address: document.getElementById('branch-address').value };
        setData('ac_branches', list);
    } else {
        saveBranch({ name: document.getElementById('branch-name').value, address: document.getElementById('branch-address').value });
    }
    closeModals();
    renderBranches();
});

document.getElementById('btn-cancel-branch')?.addEventListener('click', closeModals);

// ==================== INVENTORY ====================
function renderInventory() {
    const inv = getInventory();
    document.getElementById('inv-ac').innerHTML = (inv.acUnits || []).length === 0 ? '<p class="empty-state">No AC units</p>' : inv.acUnits.map((i, idx) => `<div class="inv-item"><span>${escapeHtml(i.name || 'Unit')} - Qty: ${i.qty || 0}</span><button class="btn-small btn-danger" onclick="removeInvItem('acUnits',${idx})">×</button></div>`).join('');
    document.getElementById('inv-gas').innerHTML = (inv.gasCylinders || []).length === 0 ? '<p class="empty-state">No gas cylinders</p>' : inv.gasCylinders.map((i, idx) => `<div class="inv-item"><span>${escapeHtml(i.name || 'Cylinder')} - Qty: ${i.qty || 0}</span><button class="btn-small btn-danger" onclick="removeInvItem('gasCylinders',${idx})">×</button></div>`).join('');
    document.getElementById('inv-parts').innerHTML = (inv.spareParts || []).length === 0 ? '<p class="empty-state">No spare parts</p>' : inv.spareParts.map((i, idx) => `<div class="inv-item"><span>${escapeHtml(i.name || 'Part')} - Qty: ${i.qty || 0}</span><button class="btn-small btn-danger" onclick="removeInvItem('spareParts',${idx})">×</button></div>`).join('');
    document.getElementById('inv-tools').innerHTML = (inv.toolsIssued || []).length === 0 ? '<p class="empty-state">No tools issued</p>' : inv.toolsIssued.map((i, idx) => `<div class="inv-item"><span>${escapeHtml(i.name || 'Tool')} → ${escapeHtml(i.technicianName || i.technician || '—')}</span><button class="btn-small btn-danger" onclick="removeInvItem('toolsIssued',${idx})">×</button></div>`).join('');

    const techOpt = document.getElementById('inv-tools-tech');
    if (techOpt) techOpt.innerHTML = '<option value="">Select Technician</option>' + getTechnicians().map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function removeInvItem(key, idx) {
    const inv = getInventory();
    inv[key] = (inv[key] || []).filter((_, i) => i !== idx);
    saveInventory(key, inv[key]);
    renderInventory();
}

document.getElementById('btn-add-ac')?.addEventListener('click', () => {
    const n = document.getElementById('inv-ac-name')?.value?.trim();
    const q = parseInt(document.getElementById('inv-ac-qty')?.value) || 1;
    if (!n) return;
    const inv = getInventory();
    inv.acUnits = inv.acUnits || [];
    inv.acUnits.push({ name: n, qty: q });
    saveInventory('acUnits', inv.acUnits);
    document.getElementById('inv-ac-name').value = '';
    document.getElementById('inv-ac-qty').value = '';
    renderInventory();
});
document.getElementById('btn-add-gas')?.addEventListener('click', () => {
    const n = document.getElementById('inv-gas-name')?.value?.trim();
    const q = parseInt(document.getElementById('inv-gas-qty')?.value) || 1;
    if (!n) return;
    const inv = getInventory();
    inv.gasCylinders = inv.gasCylinders || [];
    inv.gasCylinders.push({ name: n, qty: q });
    saveInventory('gasCylinders', inv.gasCylinders);
    document.getElementById('inv-gas-name').value = '';
    document.getElementById('inv-gas-qty').value = '';
    renderInventory();
});
document.getElementById('btn-add-parts')?.addEventListener('click', () => {
    const n = document.getElementById('inv-parts-name')?.value?.trim();
    const q = parseInt(document.getElementById('inv-parts-qty')?.value) || 1;
    if (!n) return;
    const inv = getInventory();
    inv.spareParts = inv.spareParts || [];
    inv.spareParts.push({ name: n, qty: q });
    saveInventory('spareParts', inv.spareParts);
    document.getElementById('inv-parts-name').value = '';
    document.getElementById('inv-parts-qty').value = '';
    renderInventory();
});
document.getElementById('btn-add-tools')?.addEventListener('click', () => {
    const n = document.getElementById('inv-tools-name')?.value?.trim();
    const tid = document.getElementById('inv-tools-tech')?.value;
    const tech = getTechnicians().find(t => t.id === tid);
    if (!n || !tid) return;
    const inv = getInventory();
    inv.toolsIssued = inv.toolsIssued || [];
    inv.toolsIssued.push({ name: n, technician: tid, technicianName: tech?.name });
    saveInventory('toolsIssued', inv.toolsIssued);
    document.getElementById('inv-tools-name').value = '';
    renderInventory();
});

// ==================== SETTINGS ====================
function renderSettings() {
    const s = getSettings();
    document.getElementById('set-company-name').value = s.company?.name || '';
    document.getElementById('set-company-addr').value = s.company?.address || '';
    document.getElementById('set-company-phone').value = s.company?.phone || '';
    document.getElementById('set-work-start').value = s.workingHours?.start || '09:00';
    document.getElementById('set-work-end').value = s.workingHours?.end || '18:00';
    document.getElementById('set-late-thresh').value = s.workingHours?.lateThreshold || 15;
    document.getElementById('holiday-list').innerHTML = (s.holidays || []).map((h, i) => `<li>${h.date} - ${h.name} <button class="btn-small btn-danger remove-holiday" data-i="${i}">Remove</button></li>`).join('');

    document.querySelectorAll('.remove-holiday').forEach(btn => {
        btn.onclick = () => {
            const s2 = getSettings();
            s2.holidays = (s2.holidays || []).filter((_, i) => i !== parseInt(btn.dataset.i));
            saveSettings(s2);
            renderSettings();
        };
    });
}

document.getElementById('btn-add-holiday')?.addEventListener('click', () => {
    const s = getSettings();
    s.holidays = s.holidays || [];
    s.holidays.push({ date: document.getElementById('holiday-date').value, name: document.getElementById('holiday-name').value });
    saveSettings(s);
    renderSettings();
});

document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    saveSettings({
        company: {
            name: document.getElementById('set-company-name').value,
            address: document.getElementById('set-company-addr').value,
            phone: document.getElementById('set-company-phone').value
        },
        workingHours: {
            start: document.getElementById('set-work-start').value,
            end: document.getElementById('set-work-end').value,
            lateThreshold: parseInt(document.getElementById('set-late-thresh').value) || 15
        }
    });
    alert('Settings saved');
});

// ==================== UTILITIES ====================
function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// Init
getBranches(); // ensure default branch
document.getElementById('report-daily-date') && (document.getElementById('report-daily-date').value = new Date().toISOString().split('T')[0]);
document.getElementById('report-monthly') && (document.getElementById('report-monthly').value = new Date().toISOString().slice(0, 7));
renderDashboard();
