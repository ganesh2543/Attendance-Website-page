// Centralized Data Storage - AC Company Field Service Management
const STORAGE = {
    technicians: 'ac_technicians',
    branches: 'ac_branches',
    jobs: 'ac_jobs',
    attendance: 'ac_attendance',
    leaves: 'ac_leaves',
    payroll: 'ac_payroll',
    inventory: 'ac_inventory',
    settings: 'ac_settings'
};

function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : (key === STORAGE.attendance || key === STORAGE.settings ? {} : []);
}

function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Technicians
function getTechnicians() {
    return getData(STORAGE.technicians);
}

function saveTechnician(tech) {
    const list = getTechnicians();
    if (tech.id) {
        const i = list.findIndex(t => t.id === tech.id);
        if (i >= 0) list[i] = { ...list[i], ...tech };
    } else {
        tech.id = 'T' + Date.now();
        list.push(tech);
    }
    setData(STORAGE.technicians, list);
    return tech;
}

function deleteTechnician(id) {
    setData(STORAGE.technicians, getTechnicians().filter(t => t.id !== id));
}

// Branches
function getBranches() {
    let b = getData(STORAGE.branches);
    if (!b.length) {
        b = [{ id: 'B1', name: 'Main Branch', address: 'Head Office', isDefault: true }];
        setData(STORAGE.branches, b);
    }
    return b;
}

function saveBranch(branch) {
    const list = getBranches();
    if (branch.id) {
        const i = list.findIndex(b => b.id === branch.id);
        if (i >= 0) list[i] = { ...list[i], ...branch };
    } else {
        branch.id = 'B' + Date.now();
        list.push(branch);
    }
    setData(STORAGE.branches, list);
    return branch;
}

// Jobs
function getJobs() {
    return getData(STORAGE.jobs);
}

function saveJob(job) {
    const list = getJobs();
    if (job.id) {
        const i = list.findIndex(j => j.id === job.id);
        if (i >= 0) list[i] = { ...list[i], ...job };
    } else {
        job.id = 'J' + Date.now();
        job.createdAt = new Date().toISOString();
        list.push(job);
    }
    setData(STORAGE.jobs, list);
    return job;
}

// Attendance - { date: { techId: { checkIn, checkOut, status, lat, lng } } }
function getAttendance() {
    return getData(STORAGE.attendance);
}

function getAttendanceForDate(date) {
    const data = getAttendance();
    return data[date] || {};
}

function setAttendanceForDate(date, records) {
    const data = getAttendance();
    data[date] = records;
    setData(STORAGE.attendance, data);
}

function saveAttendanceRecord(date, techId, record) {
    const records = getAttendanceForDate(date);
    records[techId] = { ...(records[techId] || {}), ...record };
    setAttendanceForDate(date, records);
}

// Leaves
function getLeaves() {
    return getData(STORAGE.leaves);
}

function saveLeave(leave) {
    const list = getLeaves();
    if (leave.id) {
        const i = list.findIndex(l => l.id === leave.id);
        if (i >= 0) list[i] = { ...list[i], ...leave };
    } else {
        leave.id = 'L' + Date.now();
        leave.createdAt = new Date().toISOString();
        list.push(leave);
    }
    setData(STORAGE.leaves, list);
    return leave;
}

// Leave balances - { techId: { sick: n, casual: n } }
function getLeaveBalances() {
    const s = getData('ac_leave_balances');
    return s || {};
}

function setLeaveBalance(techId, type, count) {
    const b = getLeaveBalances();
    if (!b[techId]) b[techId] = { sick: 12, casual: 12 };
    b[techId][type] = (b[techId][type] || 12) + count;
    setData('ac_leave_balances', b);
}

// Payroll
function getPayroll() {
    return getData(STORAGE.payroll);
}

function savePayrollRecord(record) {
    const list = getPayroll();
    const i = list.findIndex(r => r.technicianId === record.technicianId && r.month === record.month);
    if (i >= 0) list[i] = { ...list[i], ...record };
    else list.push(record);
    setData(STORAGE.payroll, list);
}

// Inventory
function getInventory() {
    let inv = getData(STORAGE.inventory);
    if (!inv.acUnits) inv = { acUnits: [], gasCylinders: [], spareParts: [], toolsIssued: [] };
    return inv;
}

function saveInventory(key, items) {
    const inv = getInventory();
    inv[key] = items;
    setData(STORAGE.inventory, inv);
}

// Settings
function getSettings() {
    let s = getData(STORAGE.settings);
    if (!s.company) s = {
        company: { name: 'AC Service Co', address: '', phone: '' },
        workingHours: { start: '09:00', end: '18:00', lateThreshold: 15 },
        holidays: [],
        roles: { admin: ['Admin'], supervisor: ['Supervisor'], technician: ['Technician'] }
    };
    return s;
}

function saveSettings(settings) {
    setData(STORAGE.settings, { ...getSettings(), ...settings });
}
