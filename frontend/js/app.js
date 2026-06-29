// Mini CRM Application Logic
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://127.0.0.1:5000/api' 
  : window.location.origin + '/api';

// Global Application State
const state = {
  token: localStorage.getItem('crm_token') || null,
  userEmail: localStorage.getItem('crm_user_email') || null,
  activeTab: 'dashboard',
  
  // Leads management state
  leads: [],
  totalLeads: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  
  // Filters
  search: '',
  statusFilter: '',
  sourceFilter: '',
  sort: 'date_desc',
  
  // Active Lead details
  selectedLead: null,
  
  // Chart instances
  charts: {
    conversionGauge: null,
    monthlyTrend: null,
    leadsStatus: null,
    leadsSource: null
  }
};

// ==================== APP INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Sync UI state based on auth status
  checkAuth();
  
  // Set date label
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date-lbl').textContent = new Date().toLocaleDateString('en-US', dateOptions);

  // Setup event listeners
  setupEventListeners();
  
  // Handle Routing via Hash if set
  handleRouting();
  window.addEventListener('hashchange', handleRouting);
}

// Check if user is logged in
function checkAuth() {
  const loginScreen = document.getElementById('login-screen');
  const appWorkspace = document.getElementById('app-workspace');
  
  if (state.token) {
    loginScreen.classList.add('hidden');
    appWorkspace.classList.remove('hidden');
    
    // Update admin user display
    document.getElementById('admin-user-email').textContent = state.userEmail;
    
    // Generate avatar letters (e.g. admin@crm.com -> AD)
    const emailParts = state.userEmail.split('@')[0];
    const letters = emailParts.substring(0, 2).toUpperCase();
    document.getElementById('avatar-letters').textContent = letters;
    
    // Update contact form integration code URL based on hostname
    const backendHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5000'
      : window.location.origin;
    
    document.getElementById('api-endpoint-url').textContent = `${backendHost}/api/leads`;
    
    const rawSnippet = document.getElementById('integration-snippet').innerHTML;
    document.getElementById('integration-snippet').innerHTML = rawSnippet.replace('YOUR_BACKEND_URL', backendHost);
    
    // Load initial tab data
    loadTabData();
  } else {
    loginScreen.classList.remove('hidden');
    appWorkspace.classList.add('hidden');
    // Stop all charts if user is logged out
    destroyCharts();
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // 1. Password Visibility Toggle
  document.getElementById('toggle-password').addEventListener('click', () => {
    const passwordInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('password-eye-icon');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
    }
  });

  // 2. Auth Actions (Login / Logout)
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);
  
  // 3. Navigation (Sidebar and Mobile Tabs)
  const navLinks = document.querySelectorAll('.sidebar-link, .mobile-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      navigateToTab(tab);
    });
  });
  
  // Mobile Hamburger Trigger
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // 4. Data Refresh Buttons
  document.querySelectorAll('.refresh-data-btn').forEach(btn => {
    btn.addEventListener('click', loadTabData);
  });

  // 5. Leads Filtering & Searching
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  
  // Debounced Search Input
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value.trim();
    if (state.search.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.page = 1;
      fetchLeads();
    }, 450);
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.search = '';
    clearSearchBtn.classList.add('hidden');
    state.page = 1;
    fetchLeads();
  });
  
  // Status filter tabs
  const statusTabs = document.querySelectorAll('.status-tab');
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => t.classList.remove('active', 'bg-white', 'shadow-sm'));
      statusTabs.forEach(t => t.classList.add('text-slate-600'));
      tab.classList.add('active', 'bg-white', 'shadow-sm');
      tab.classList.remove('text-slate-600');
      
      state.statusFilter = tab.getAttribute('data-status-filter');
      state.page = 1;
      fetchLeads();
    });
  });
  
  // Source Filter Select
  document.getElementById('filter-source').addEventListener('change', (e) => {
    state.sourceFilter = e.target.value;
    state.page = 1;
    fetchLeads();
  });
  
  // Sorting Select
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 1;
    fetchLeads();
  });
  
  // Reset Filters button
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    searchInput.value = '';
    state.search = '';
    clearSearchBtn.classList.add('hidden');
    
    statusTabs.forEach(t => t.classList.remove('active', 'bg-white', 'shadow-sm'));
    statusTabs[0].classList.add('active', 'bg-white', 'shadow-sm');
    state.statusFilter = '';
    
    document.getElementById('filter-source').value = '';
    state.sourceFilter = '';
    
    document.getElementById('sort-select').value = 'date_desc';
    state.sort = 'date_desc';
    
    state.page = 1;
    fetchLeads();
  });
  
  // 6. Pagination Triggers
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      fetchLeads();
    }
  });
  
  document.getElementById('next-page-btn').addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      fetchLeads();
    }
  });

  // 7. Modals: Create / Edit Lead Form
  const leadModal = document.getElementById('lead-modal');
  const leadForm = document.getElementById('lead-form');
  
  // Open Add modal
  document.getElementById('add-lead-btn').addEventListener('click', () => openLeadModal());
  document.getElementById('quick-add-btn').addEventListener('click', () => openLeadModal());
  
  // Close triggers
  document.getElementById('modal-close-btn').addEventListener('click', closeLeadModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeLeadModal);
  
  // Lead Form submit
  leadForm.addEventListener('submit', handleLeadFormSubmit);
  
  // 8. Lead Details Slide-over panel actions
  const detailsPanel = document.getElementById('lead-details-panel');
  const detailsOverlay = document.getElementById('lead-details-overlay');
  
  document.getElementById('panel-close-btn').addEventListener('click', closeLeadDetails);
  detailsOverlay.addEventListener('click', closeLeadDetails);
  
  // Change lead status from details panel select
  document.getElementById('det-status-select').addEventListener('change', async (e) => {
    if (!state.selectedLead) return;
    const newStatus = e.target.value;
    await updateLeadStatus(state.selectedLead.id, newStatus);
  });
  
  // Edit Lead from details panel
  document.getElementById('det-edit-btn').addEventListener('click', () => {
    if (!state.selectedLead) return;
    openLeadModal(state.selectedLead);
  });
  
  // Delete Lead from details panel
  document.getElementById('det-delete-btn').addEventListener('click', () => {
    if (!state.selectedLead) return;
    openDeleteConfirmModal(state.selectedLead.id, state.selectedLead.name);
  });

  // 9. Notes Timelines - Add Note Action
  document.getElementById('add-note-form').addEventListener('submit', handleAddNoteSubmit);
  
  // Edit Note cancel
  document.getElementById('edit-note-cancel').addEventListener('click', () => {
    document.getElementById('edit-note-box').classList.add('hidden');
    document.getElementById('edit-note-id').value = '';
    document.getElementById('edit-note-input').value = '';
  });
  
  // Edit Note save trigger
  document.getElementById('edit-note-save-btn').addEventListener('click', handleEditNoteSubmit);
  
  // 10. Delete Lead Confirmation Modal actions
  document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteConfirmModal);
  document.getElementById('delete-confirm-btn').addEventListener('click', handleDeleteLeadConfirm);
  
  // 11. Password Change Form Submission
  document.getElementById('change-pw-form').addEventListener('submit', handleChangePassword);

  // 12. Settings integration text-copy helpers
  document.getElementById('copy-endpoint-btn').addEventListener('click', () => {
    const uri = document.getElementById('api-endpoint-url').textContent;
    navigator.clipboard.writeText(uri).then(() => {
      showToast('API URL copied to clipboard!', 'success');
    });
  });
  
  document.getElementById('copy-snippet-btn').addEventListener('click', () => {
    const code = document.getElementById('integration-snippet').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast('HTML/JS code snippet copied!', 'success');
    });
  });

  // Mock Export Report Button (UX delight)
  document.getElementById('export-mock-btn').addEventListener('click', () => {
    showToast('Exporting lead PDF report...', 'success');
    setTimeout(() => {
      showToast('Report generated! Check your downloads.', 'success');
    }, 1500);
  });
}

// ==================== ROUTING SYSTEM ====================
function handleRouting() {
  let hash = window.location.hash.substring(1) || 'dashboard';
  
  // Check if authorized
  if (!state.token) {
    hash = 'login';
  }
  
  if (hash === 'login') {
    return;
  }
  
  // Split hash parameters (e.g. leads?status=New)
  const parts = hash.split('?');
  const tab = parts[0];
  
  // Highlight sidebar link
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    if (link.getAttribute('data-tab') === tab) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update tabs display
  const sections = ['dashboard', 'leads', 'analytics', 'settings'];
  sections.forEach(s => {
    const secEl = document.getElementById(`section-${s}`);
    if (s === tab) {
      secEl.classList.remove('hidden');
    } else {
      secEl.classList.add('hidden');
    }
  });

  state.activeTab = tab;
  
  // Parse parameters if any (e.g., hash filter updates)
  if (parts[1]) {
    const params = new URLSearchParams(parts[1]);
    const statusParam = params.get('status');
    if (statusParam && tab === 'leads') {
      state.statusFilter = statusParam;
      // Also update the filter tabs visual style
      const statusTabs = document.querySelectorAll('.status-tab');
      statusTabs.forEach(t => {
        t.classList.remove('active', 'bg-white', 'shadow-sm');
        t.classList.add('text-slate-600');
        if (t.getAttribute('data-status-filter') === statusParam) {
          t.classList.add('active', 'bg-white', 'shadow-sm');
          t.classList.remove('text-slate-600');
        }
      });
    }
  }
  
  // Close any slide-overs on route shift
  closeLeadDetails();
  
  // Fetch data
  loadTabData();
  
  // Close mobile navigation if open
  document.getElementById('mobile-menu').classList.add('hidden');
}

function navigateToTab(tabName, statusFilterValue = '') {
  let hash = tabName;
  if (statusFilterValue) {
    hash += `?status=${statusFilterValue}`;
    state.statusFilter = statusFilterValue;
  } else {
    // Reset status filter if navigating explicitly without one
    if (tabName === 'leads') {
      state.statusFilter = '';
    }
  }
  window.location.hash = hash;
}

function loadTabData() {
  if (!state.token) return;
  
  if (state.activeTab === 'dashboard') {
    fetchDashboardMetrics();
  } else if (state.activeTab === 'leads') {
    fetchLeads();
  } else if (state.activeTab === 'analytics') {
    fetchAnalyticsData();
  }
}

// ==================== AUTHENTICATION API CALLS ====================

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const loginBtn = document.getElementById('login-btn');
  const spinner = document.getElementById('login-spinner');
  
  // Loading state
  loginBtn.disabled = true;
  spinner.classList.remove('hidden');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Login failed!');
    }
    
    // Save tokens
    state.token = result.token;
    state.userEmail = result.user.email;
    localStorage.setItem('crm_token', result.token);
    localStorage.setItem('crm_user_email', result.user.email);
    
    showToast('Logged in successfully!', 'success');
    
    // Refresh auth view
    checkAuth();
    window.location.hash = 'dashboard';
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loginBtn.disabled = false;
    spinner.classList.add('hidden');
  }
}

function handleLogout() {
  state.token = null;
  state.userEmail = null;
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user_email');
  
  showToast('Logged out successfully.', 'info');
  checkAuth();
}

async function handleChangePassword(e) {
  e.preventDefault();
  const old_password = document.getElementById('old-password').value;
  const new_password = document.getElementById('new-password').value;
  const confirm_password = document.getElementById('confirm-password').value;
  
  if (new_password !== confirm_password) {
    showToast('New passwords do not match!', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ old_password, new_password })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Error updating password!');
    }
    
    showToast(result.message, 'success');
    document.getElementById('change-pw-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==================== DASHBOARD METRICS API ====================

async function fetchDashboardMetrics() {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        handleLogout();
        return;
      }
      throw new Error('Could not fetch metrics data.');
    }
    
    const data = await response.json();
    
    // Update numerical cards
    document.getElementById('metric-total').textContent = data.summary.totalLeads;
    document.getElementById('metric-new').textContent = data.summary.newLeads;
    document.getElementById('metric-contacted').textContent = data.summary.contactedLeads;
    document.getElementById('metric-converted').textContent = data.summary.convertedLeads;
    
    document.getElementById('gauge-lbl-converted').textContent = data.summary.convertedLeads;
    document.getElementById('gauge-lbl-rate').textContent = `${data.summary.conversionRate}%`;
    
    // Build Gauge Chart
    renderConversionGauge(data.summary.conversionRate);
    
    // Load recent leads for table
    fetchRecentLeadsForDashboard();
    
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchRecentLeadsForDashboard() {
  const tbody = document.getElementById('dashboard-recent-leads-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-6 text-center text-slate-400">
        <div class="flex justify-center items-center gap-2">
          <div class="loader-spinner !w-5 !h-5 border-t-transparent border-slate-300"></div>
          <span>Loading recent prospects...</span>
        </div>
      </td>
    </tr>`;
    
  try {
    const response = await fetch(`${API_BASE_URL}/leads?limit=5&sort=date_desc`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) throw new Error();
    const result = await response.json();
    
    tbody.innerHTML = '';
    
    if (result.leads.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400 text-xs font-medium">
            No leads in the database. Add a lead to get started!
          </td>
        </tr>`;
      return;
    }
    
    result.leads.forEach(lead => {
      const statusClass = getStatusBadgeClass(lead.status);
      const phoneText = lead.phone || 'No phone';
      const companyText = lead.company || 'Private Lead';
      
      const tr = document.createElement('tr');
      tr.className = "border-b border-slate-100 text-xs font-medium hover:bg-slate-50/50 cursor-pointer transition-all";
      tr.onclick = (e) => {
        // Prevent opening if clicked on an action button
        if (e.target.closest('.action-btn')) return;
        viewLeadDetails(lead.id);
      };
      
      tr.innerHTML = `
        <td class="py-3.5 px-6 font-bold text-slate-900">${escapeHtml(lead.name)}</td>
        <td class="py-3.5 px-4 font-semibold text-slate-600">
          <div>${escapeHtml(lead.email)}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(phoneText)}</div>
        </td>
        <td class="py-3.5 px-4 text-slate-500 font-semibold">${escapeHtml(companyText)}</td>
        <td class="py-3.5 px-4">
          <span class="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-600 font-bold border border-slate-200 rounded">
            ${escapeHtml(lead.source)}
          </span>
        </td>
        <td class="py-3.5 px-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClass}">
            ${escapeHtml(lead.status)}
          </span>
        </td>
        <td class="py-3.5 px-6 text-right">
          <button class="action-btn w-7 h-7 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 rounded-lg text-slate-500 transition-all" onclick="viewLeadDetails('${lead.id}')">
            <i class="fa-solid fa-folder-open"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-red-500 text-xs font-bold">
          Error loading recent activity.
        </td>
      </tr>`;
  }
}

// ==================== LEADS MANAGEMENT API ====================

async function fetchLeads() {
  const tbody = document.getElementById('leads-table-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="py-12 text-center text-slate-400">
        <div class="flex justify-center items-center gap-2.5">
          <div class="loader-spinner border-t-transparent border-slate-300"></div>
          <span class="text-xs font-bold">Querying CRM database...</span>
        </div>
      </td>
    </tr>`;
    
  const queryParams = new URLSearchParams({
    search: state.search,
    status: state.statusFilter,
    source: state.sourceFilter,
    sort: state.sort,
    page: state.page,
    limit: state.limit
  });
  
  try {
    const response = await fetch(`${API_BASE_URL}/leads?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error retrieving leads.');
    }
    
    const result = await response.json();
    
    // Save to state
    state.leads = result.leads;
    state.totalPages = result.pages;
    state.totalLeads = result.total;
    
    renderLeadsTable(result);
    renderPagination(result);
    
  } catch (err) {
    showToast(err.message, 'error');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-red-500 text-xs font-extrabold">
          Failed to fetch database leads. Connection error.
        </td>
      </tr>`;
  }
}

function renderLeadsTable(data) {
  const tbody = document.getElementById('leads-table-tbody');
  tbody.innerHTML = '';
  
  if (data.leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-16 text-center text-slate-400 text-xs font-bold">
          <div class="max-w-xs mx-auto space-y-2">
            <i class="fa-solid fa-face-meh text-3xl text-slate-300"></i>
            <div>No matching leads found for active filter configuration.</div>
          </div>
        </td>
      </tr>`;
    return;
  }
  
  data.leads.forEach(lead => {
    const statusClass = getStatusBadgeClass(lead.status);
    const dateFormatted = formatDate(lead.createdAt);
    const phoneVal = lead.phone || '-';
    const companyVal = lead.company || '-';
    
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-150 hover:bg-slate-50/50 cursor-pointer text-xs transition-all";
    tr.onclick = (e) => {
      if (e.target.closest('.action-btn')) return;
      viewLeadDetails(lead.id);
    };
    
    tr.innerHTML = `
      <td class="py-4 px-6 font-bold text-slate-900">${escapeHtml(lead.name)}</td>
      <td class="py-4 px-4 font-semibold text-slate-600">
        <div>${escapeHtml(lead.email)}</div>
        <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(phoneVal)}</div>
      </td>
      <td class="py-4 px-4 text-slate-500 font-semibold">${escapeHtml(companyVal)}</td>
      <td class="py-4 px-4">
        <span class="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-600 font-bold border border-slate-200 rounded">
          ${escapeHtml(lead.source)}
        </span>
      </td>
      <td class="py-4 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClass}">
          ${escapeHtml(lead.status)}
        </span>
      </td>
      <td class="py-4 px-4 font-semibold text-slate-500">${dateFormatted}</td>
      <td class="py-4 px-6 text-right space-x-1 whitespace-nowrap">
        <button class="action-btn w-7 h-7 bg-slate-100 hover:bg-slate-250 text-slate-500 hover:text-slate-800 rounded-lg transition-all" onclick="viewLeadDetails('${lead.id}')" title="Open notes & details">
          <i class="fa-solid fa-bars-staggered"></i>
        </button>
        <button class="action-btn w-7 h-7 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg transition-all" onclick="openLeadModal(null, '${lead.id}')" title="Edit lead info">
          <i class="fa-solid fa-pen-to-square text-[10.5px]"></i>
        </button>
        <button class="action-btn w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all" onclick="openDeleteConfirmModal('${lead.id}', '${lead.name}')" title="Delete lead from CRM">
          <i class="fa-solid fa-trash text-[10.5px]"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPagination(data) {
  // Label controls
  const start = data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;
  const end = Math.min(data.page * data.limit, data.total);
  
  document.getElementById('pag-start-lbl').textContent = start;
  document.getElementById('pag-end-lbl').textContent = end;
  document.getElementById('pag-total-lbl').textContent = data.total;
  
  document.getElementById('pag-current-lbl').textContent = data.page;
  document.getElementById('pag-total-pages-lbl').textContent = data.pages;
  
  // Disabled state
  document.getElementById('prev-page-btn').disabled = data.page === 1;
  document.getElementById('next-page-btn').disabled = data.page === data.pages;
}

// ----------------- LEAD CRUD ACTIONS -----------------

// Status change update directly from dropdown
async function updateLeadStatus(id, status) {
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) throw new Error('Status change failed.');
    const result = await response.json();
    
    showToast(`Lead status updated to ${status}`, 'success');
    
    // Update local lead memory
    state.selectedLead = result.lead;
    
    // Refresh background list
    loadTabData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open Details Slideover Panel
async function viewLeadDetails(id) {
  const panelOverlay = document.getElementById('lead-details-overlay');
  const panel = document.getElementById('lead-details-panel');
  
  panelOverlay.classList.remove('hidden');
  panel.classList.add('active');
  
  // Render loading skeleton inside details
  document.getElementById('det-name').textContent = 'Loading...';
  document.getElementById('det-company').textContent = 'Fetching details...';
  document.getElementById('notes-timeline').innerHTML = '<div class="text-xs text-slate-400">Loading timeline...</div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) throw new Error('Could not find lead details.');
    const lead = await response.json();
    
    // Cache current lead
    state.selectedLead = lead;
    
    // Bind UI
    document.getElementById('det-name').textContent = lead.name;
    document.getElementById('det-company').textContent = lead.company || 'Independent Lead';
    document.getElementById('det-email').textContent = lead.email;
    document.getElementById('det-email').href = `mailto:${lead.email}`;
    document.getElementById('det-phone').textContent = lead.phone || 'No phone provided';
    document.getElementById('det-created').textContent = formatDateTime(lead.createdAt);
    document.getElementById('det-updated').textContent = formatDateTime(lead.updatedAt);
    
    document.getElementById('det-source-badge').textContent = lead.source;
    document.getElementById('det-status-select').value = lead.status;
    document.getElementById('det-notes-count').textContent = `${lead.notes.length} Notes`;
    
    // Render timeline
    renderNotesTimeline(lead.notes);
    
  } catch (err) {
    showToast(err.message, 'error');
    closeLeadDetails();
  }
}

function closeLeadDetails() {
  document.getElementById('lead-details-overlay').classList.add('hidden');
  document.getElementById('lead-details-panel').classList.remove('active');
  state.selectedLead = null;
  // Reset note boxes
  document.getElementById('edit-note-box').classList.add('hidden');
}

// Handle Form Submission for Create or Edit
async function handleLeadFormSubmit(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const spinner = document.getElementById('modal-spinner');
  
  const id = document.getElementById('lead-form-id').value;
  const name = document.getElementById('lead-name').value.trim();
  const email = document.getElementById('lead-email').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  const company = document.getElementById('lead-company').value.trim();
  const source = document.getElementById('lead-source').value;
  const status = document.getElementById('lead-status').value;
  const initialNote = document.getElementById('lead-initial-note').value.trim();
  
  const isEdit = id.length > 0;
  
  submitBtn.disabled = true;
  spinner.classList.remove('hidden');
  
  const payload = { name, email, phone, company, source, status };
  
  // Append initial message if it is a new creation
  if (!isEdit && initialNote.length > 0) {
    payload.message = initialNote;
  }
  
  try {
    let url = `${API_BASE_URL}/leads`;
    let method = 'POST';
    let headers = { 'Content-Type': 'application/json' };
    
    // Authentic headers for CRUD in admin area
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    if (isEdit) {
      url = `${API_BASE_URL}/leads/${id}`;
      method = 'PUT';
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Error saving lead records.');
    }
    
    showToast(result.message, 'success');
    closeLeadModal();
    
    // Refresh appropriate views
    loadTabData();
    
    // If details panel is open and we edited the active lead, sync the details
    if (state.selectedLead && state.selectedLead.id === id) {
      viewLeadDetails(id);
    }
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add('hidden');
  }
}

// Modal Toggle helpers
function openLeadModal(leadData = null, fetchId = null) {
  const modal = document.getElementById('lead-modal');
  const title = document.getElementById('modal-title');
  const submitLbl = document.getElementById('modal-submit-lbl');
  const initialNoteBlock = document.getElementById('initial-note-container');
  
  document.getElementById('lead-form').reset();
  document.getElementById('lead-form-id').value = '';
  
  modal.classList.remove('hidden');
  
  if (leadData || fetchId) {
    title.textContent = "Edit CRM Lead Details";
    submitLbl.textContent = "Save Changes";
    initialNoteBlock.classList.add('hidden'); // Notes CRUD handles notes, do not show during Edit
    
    if (leadData) {
      populateLeadModal(leadData);
    } else {
      // Async fetch lead details first
      fetchSingleLeadToModal(fetchId);
    }
  } else {
    title.textContent = "Create New CRM Lead";
    submitLbl.textContent = "Create Lead";
    initialNoteBlock.classList.remove('hidden');
  }
}

async function fetchSingleLeadToModal(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    if (!response.ok) throw new Error();
    const lead = await response.json();
    populateLeadModal(lead);
  } catch (err) {
    showToast('Failed to fetch details for editing.', 'error');
    closeLeadModal();
  }
}

function populateLeadModal(lead) {
  document.getElementById('lead-form-id').value = lead.id;
  document.getElementById('lead-name').value = lead.name;
  document.getElementById('lead-email').value = lead.email;
  document.getElementById('lead-phone').value = lead.phone || '';
  document.getElementById('lead-company').value = lead.company || '';
  document.getElementById('lead-source').value = lead.source;
  document.getElementById('lead-status').value = lead.status;
}

function closeLeadModal() {
  document.getElementById('lead-modal').classList.add('hidden');
}

// Delete Confirmation Modals
let activeDeleteId = null;

function openDeleteConfirmModal(id, name) {
  activeDeleteId = id;
  document.getElementById('delete-lead-name').textContent = name;
  document.getElementById('delete-confirm-modal').classList.remove('hidden');
}

function closeDeleteConfirmModal() {
  document.getElementById('delete-confirm-modal').classList.add('hidden');
  activeDeleteId = null;
}

async function handleDeleteLeadConfirm() {
  if (!activeDeleteId) return;
  const deleteBtn = document.getElementById('delete-confirm-btn');
  const spinner = document.getElementById('delete-spinner');
  
  deleteBtn.disabled = true;
  spinner.classList.remove('hidden');
  
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${activeDeleteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) throw new Error('Deletion failed.');
    
    showToast('Lead deleted from database.', 'success');
    closeDeleteConfirmModal();
    
    // If the slide-over details panel of this lead is open, close it
    if (state.selectedLead && state.selectedLead.id === activeDeleteId) {
      closeLeadDetails();
    }
    
    loadTabData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    deleteBtn.disabled = false;
    spinner.classList.add('hidden');
  }
}

// ==================== NOTES TIMELINE CRUD ACTIONS ====================

function renderNotesTimeline(notes) {
  const container = document.getElementById('notes-timeline');
  container.innerHTML = '';
  
  if (!notes || notes.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-400 italic py-2 pl-2">
        No notes found on this client. Add the first note above.
      </div>`;
    return;
  }
  
  // Sort notes: Newest notes first in the timeline
  const sortedNotes = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  sortedNotes.forEach(note => {
    const timeFormatted = formatDateTime(note.createdAt);
    
    const div = document.createElement('div');
    div.className = "relative mb-5 bg-white p-3.5 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group";
    div.innerHTML = `
      <!-- Timeline point dot -->
      <span class="absolute -left-[30px] top-4 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white ring-4 ring-slate-100 flex items-center justify-center z-5"></span>
      
      <div class="flex items-start justify-between">
        <div class="text-slate-400 font-bold text-[10px] uppercase tracking-wider">${timeFormatted}</div>
        
        <!-- Hover actions for notes -->
        <div class="opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
          <button class="text-slate-400 hover:text-slate-700 text-[10px] font-bold py-0.5 px-1.5 bg-slate-50 border border-slate-100 rounded" onclick="initNoteEdit('${note.id}', '${escapeJs(note.text)}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="text-red-400 hover:text-red-600 text-[10px] font-bold py-0.5 px-1.5 bg-slate-50 border border-slate-100 rounded" onclick="deleteNote('${note.id}')">
            <i class="fa-solid fa-trash"></i> Del
          </button>
        </div>
      </div>
      
      <p class="text-xs font-semibold text-slate-800 mt-2 leading-relaxed whitespace-pre-wrap">${escapeHtml(note.text)}</p>
    `;
    container.appendChild(div);
  });
}

// Add Note Submit handler
async function handleAddNoteSubmit(e) {
  e.preventDefault();
  if (!state.selectedLead) return;
  
  const textInput = document.getElementById('note-input');
  const text = textInput.value.trim();
  const spinner = document.getElementById('note-submit-spinner');
  
  if (text.length === 0) return;
  
  spinner.classList.remove('hidden');
  
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${state.selectedLead.id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ text })
    });
    
    const result = await response.json();
    
    if (!response.ok) throw new Error(result.message || 'Failed to add note.');
    
    showToast('Follow-up note added.', 'success');
    textInput.value = '';
    
    // Update local note context and reload details view
    viewLeadDetails(state.selectedLead.id);
    
    // Refresh background leads table (notes search keywords or metrics change)
    loadTabData();
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    spinner.classList.add('hidden');
  }
}

// Init Note Edit Box
window.initNoteEdit = function(id, text) {
  const editBox = document.getElementById('edit-note-box');
  document.getElementById('edit-note-id').value = id;
  document.getElementById('edit-note-input').value = text;
  editBox.classList.remove('hidden');
  editBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Submit Note Edit
async function handleEditNoteSubmit() {
  if (!state.selectedLead) return;
  
  const noteId = document.getElementById('edit-note-id').value;
  const text = document.getElementById('edit-note-input').value.trim();
  
  if (text.length === 0) {
    showToast('Note cannot be empty!', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${state.selectedLead.id}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ text })
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Note update failed.');
    
    showToast('Note updated.', 'success');
    
    // Reset Edit Box
    document.getElementById('edit-note-box').classList.add('hidden');
    document.getElementById('edit-note-id').value = '';
    document.getElementById('edit-note-input').value = '';
    
    // Reload active lead details
    viewLeadDetails(state.selectedLead.id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete Note Action
window.deleteNote = async function(noteId) {
  if (!state.selectedLead) return;
  if (!confirm('Are you sure you want to delete this note?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${state.selectedLead.id}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to delete note.');
    
    showToast('Note deleted.', 'info');
    
    // Reload active lead details
    viewLeadDetails(state.selectedLead.id);
    
    // Refresh background leads table
    loadTabData();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ==================== ANALYTICS REPORTS API ====================

async function fetchAnalyticsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) throw new Error();
    
    const data = await response.json();
    
    // Update summary values
    document.getElementById('an-total').textContent = data.summary.totalLeads;
    document.getElementById('an-new').textContent = data.summary.newLeads;
    document.getElementById('an-contacted').textContent = data.summary.contactedLeads;
    document.getElementById('an-converted').textContent = data.summary.convertedLeads;
    document.getElementById('an-rate').textContent = `${data.summary.conversionRate}%`;
    
    // Draw Charts
    renderAnalyticsCharts(data);
    
  } catch (err) {
    showToast('Could not reload analytics charts.', 'error');
  }
}

// ==================== APEXCHARTS HANDLERS ====================

function destroyCharts() {
  Object.keys(state.charts).forEach(c => {
    if (state.charts[c]) {
      state.charts[c].destroy();
      state.charts[c] = null;
    }
  });
}

// Dashboard conversion gauge chart
function renderConversionGauge(rate) {
  const container = document.getElementById('dashboard-conversion-gauge');
  container.innerHTML = '';
  
  const options = {
    chart: {
      type: 'radialBar',
      height: 220,
      sparkline: { enabled: true }
    },
    colors: ['#3b82f6'],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: '#f1f5f9',
          strokeWidth: '97%',
          margin: 5
        },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: -2,
            fontSize: '24px',
            fontWeight: '800',
            color: '#1e293b'
          }
        }
      }
    },
    grid: { padding: { top: -10 } },
    series: [rate],
    labels: ['Conversion Rate']
  };

  if (state.charts.conversionGauge) {
    state.charts.conversionGauge.updateSeries([rate]);
  } else {
    state.charts.conversionGauge = new ApexCharts(container, options);
    state.charts.conversionGauge.render();
  }
}

// Big Analytics page reports
function renderAnalyticsCharts(data) {
  
  // 1. Monthly acquisition line chart
  const months = data.byMonth.map(m => m.month);
  const counts = data.byMonth.map(m => m.count);
  
  const monthlyOptions = {
    chart: {
      type: 'area',
      height: 280,
      fontFamily: 'Outfit, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#3b82f6'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    series: [{
      name: 'Leads Registered',
      data: counts
    }],
    xaxis: {
      categories: months,
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } }
    },
    grid: { borderColor: '#f1f5f9' }
  };
  
  const trendContainer = document.getElementById('chart-monthly-trend');
  trendContainer.innerHTML = '';
  if (state.charts.monthlyTrend) {
     state.charts.monthlyTrend.destroy();
  }
  state.charts.monthlyTrend = new ApexCharts(trendContainer, monthlyOptions);
  state.charts.monthlyTrend.render();

  // 2. Leads status distribution bar chart
  const statusCats = data.byStatus.map(s => s.status);
  const statusCounts = data.byStatus.map(s => s.count);
  
  const statusOptions = {
    chart: {
      type: 'bar',
      height: 280,
      fontFamily: 'Outfit, sans-serif',
      toolbar: { show: false }
    },
    colors: ['#4f46e5'],
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '45%',
        distributed: true
      }
    },
    dataLabels: { enabled: false },
    series: [{
      name: 'Leads Count',
      data: statusCounts
    }],
    xaxis: {
      categories: statusCats,
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } }
    },
    legend: { show: false },
    grid: { borderColor: '#f1f5f9' }
  };
  
  const statusContainer = document.getElementById('chart-leads-status');
  statusContainer.innerHTML = '';
  if (state.charts.leadsStatus) {
     state.charts.leadsStatus.destroy();
  }
  state.charts.leadsStatus = new ApexCharts(statusContainer, statusOptions);
  state.charts.leadsStatus.render();

  // 3. Leads source acquisition pie/donut chart
  const sourceCats = data.bySource.map(s => s.source);
  const sourceCounts = data.bySource.map(s => s.count);
  
  const sourceOptions = {
    chart: {
      type: 'donut',
      height: 300,
      fontFamily: 'Outfit, sans-serif'
    },
    colors: ['#3b82f6', '#3b82f6', '#ec4899', '#4f46e5', '#f59e0b', '#64748b'],
    series: sourceCounts,
    labels: sourceCats,
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: '#475569' }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              fontSize: '14px',
              fontWeight: 700,
              label: 'Total Pipelines',
              color: '#94a3b8'
            }
          }
        }
      }
    }
  };
  
  const sourceContainer = document.getElementById('chart-leads-source');
  sourceContainer.innerHTML = '';
  if (state.charts.leadsSource) {
     state.charts.leadsSource.destroy();
  }
  state.charts.leadsSource = new ApexCharts(sourceContainer, sourceOptions);
  state.charts.leadsSource.render();
}

// ==================== TOAST MESSAGES NOTIFIER ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl pointer-events-auto border transition-all duration-300 transform translate-y-2 opacity-0 text-xs font-semibold max-w-sm`;
  
  let icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'success') {
    toast.className += ' bg-emerald-50 text-emerald-800 border-emerald-100';
    icon = '<i class="fa-solid fa-circle-check text-emerald-500 text-sm"></i>';
  } else if (type === 'error') {
    toast.className += ' bg-red-50 text-red-800 border-red-100';
    icon = '<i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>';
  } else if (type === 'info') {
    toast.className += ' bg-blue-50 text-blue-800 border-blue-100';
    icon = '<i class="fa-solid fa-circle-info text-blue-500 text-sm"></i>';
  }
  
  toast.innerHTML = `
    ${icon}
    <div class="flex-1">${escapeHtml(message)}</div>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation next tick
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);
  
  // Auto remove toast
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ==================== HELPER FORMATTING FUNCTIONS ====================

function getStatusBadgeClass(status) {
  if (status === 'New') return 'badge-new';
  if (status === 'Contacted') return 'badge-contacted';
  if (status === 'Converted') return 'badge-converted';
  return 'bg-slate-100 text-slate-700';
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${date} at ${time}`;
}

// XSS Sanitizer Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
