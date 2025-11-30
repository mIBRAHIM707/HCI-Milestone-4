// ========================================
// GIKI Food Ordering System - Staff Dashboard Logic
// ========================================

// Global State for Staff Dashboard
const StaffState = {
  currentView: 'orders',
  filterStatus: 'all',
  inventoryChanges: new Map(),
  theme: 'light'
};

// ========================================
// Theme Management
// ========================================

function initTheme() {
  const savedTheme = localStorage.getItem('gikiTheme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  StaffState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('gikiTheme', theme);
  
  // Update toggle button icons
  const lightIcon = document.querySelector('.theme-icon-light');
  const darkIcon = document.querySelector('.theme-icon-dark');
  
  if (lightIcon && darkIcon) {
    if (theme === 'dark') {
      lightIcon.style.display = 'none';
      darkIcon.style.display = 'inline';
    } else {
      lightIcon.style.display = 'inline';
      darkIcon.style.display = 'none';
    }
  }
}

function toggleTheme() {
  const newTheme = StaffState.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  showStaffNotification(`${newTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode activated`);
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initializeStaffDashboard();
});

function initializeStaffDashboard() {
  initTheme();
  setupStaffEventListeners();
  loadOrdersView();
  updateStats();
  
  // Auto-refresh orders every 10 seconds
  setInterval(() => {
    if (StaffState.currentView === 'orders') {
      loadOrdersView();
      updateStats();
    }
  }, 10000);
}

// ========================================
// Event Listeners
// ========================================

function setupStaffEventListeners() {
  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  
  // Sidebar navigation
  document.querySelectorAll('.sidebar-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const view = link.dataset.view;
      if (view) {
        e.preventDefault();
        switchView(view);
        
        // Update active state
        document.querySelectorAll('.sidebar-nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  mobileMenuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  });
  
  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const filter = tab.dataset.filter;
      
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      StaffState.filterStatus = filter;
      loadOrdersView();
    });
  });

  // Refresh button
  document.getElementById('refreshOrdersBtn')?.addEventListener('click', () => {
    loadOrdersView();
    updateStats();
    showStaffNotification('Orders refreshed');
  });

  // Inventory search
  document.getElementById('inventorySearch')?.addEventListener('input', debounce(handleInventorySearch, 300));

  // Save inventory changes
  document.getElementById('updateStockBtn')?.addEventListener('click', saveInventoryChanges);

  // Order detail modal
  document.getElementById('orderDetailClose')?.addEventListener('click', closeOrderDetail);
  document.getElementById('orderDetailOverlay')?.addEventListener('click', closeOrderDetail);
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('orderDetailModal')?.classList.contains('open')) {
      closeOrderDetail();
    }
  });
}

// ========================================
// View Management
// ========================================

function switchView(viewName) {
  // Hide all views
  ['ordersView', 'inventoryView', 'analyticsView'].forEach(view => {
    document.getElementById(view)?.classList.add('hidden');
  });

  // Show selected view
  const viewId = viewName + 'View';
  document.getElementById(viewId)?.classList.remove('hidden');
  
  StaffState.currentView = viewName;
  
  // Load view-specific data
  switch(viewName) {
    case 'orders':
      loadOrdersView();
      updateStats();
      break;
    case 'inventory':
      loadInventoryView();
      break;
    case 'analytics':
      loadAnalyticsView();
      break;
  }
}

// ========================================
// Stats Update
// ========================================

function updateStats() {
  const orders = DataHelper.getActiveOrders();
  
  const confirmed = orders.filter(o => o.orderStatus === 'confirmed').length;
  const preparing = orders.filter(o => o.orderStatus === 'preparing').length;
  const ready = orders.filter(o => o.orderStatus === 'ready').length;
  
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  
  document.getElementById('statActiveOrders').textContent = orders.length;
  document.getElementById('statPreparing').textContent = preparing;
  document.getElementById('statReady').textContent = ready;
  document.getElementById('statRevenue').textContent = `Rs. ${totalRevenue.toLocaleString()}`;
}

// ========================================
// Orders View
// ========================================

function loadOrdersView() {
  const orders = DataHelper.getActiveOrders();
  let filteredOrders = orders;
  
  if (StaffState.filterStatus !== 'all') {
    filteredOrders = orders.filter(o => o.orderStatus === StaffState.filterStatus);
  }
  
  const ordersList = document.getElementById('ordersList');
  
  if (filteredOrders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">No ${StaffState.filterStatus === 'all' ? '' : StaffState.filterStatus} orders</div>
        <div class="empty-state-description">Orders will appear here as they come in</div>
      </div>
    `;
    return;
  }
  
  ordersList.innerHTML = filteredOrders.map(order => createOrderCard(order)).join('');
  
  // Setup order action listeners
  setupOrderActionListeners();
}

function createOrderCard(order) {
  const time = new Date(order.orderDateTime).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `
    <div class="order-card ${order.orderStatus}">
      <div class="order-header-staff">
        <div class="order-id-section">
          <div class="order-id">${order.id}</div>
          <div class="order-customer">👤 ${order.userName}</div>
        </div>
        <div class="order-time">
          <div>${time}</div>
          <span class="order-status-badge ${order.orderStatus}">${order.orderStatus}</span>
        </div>
      </div>
      
      <div class="order-items-list">
        ${order.items.map(item => `
          <div class="order-item-row">
            <div class="order-item-details">
              <span class="order-item-qty">${item.quantity}x</span> ${item.itemName}
              ${item.customizations ? `<span class="order-item-customization-text">(${item.customizations})</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="order-footer-staff">
        <div class="order-total-staff">Rs. ${order.totalAmount}</div>
        <div class="order-actions">
          ${getOrderActions(order)}
        </div>
      </div>
    </div>
  `;
}

function getOrderActions(order) {
  switch(order.orderStatus) {
    case 'confirmed':
      return `
        <button class="order-action-btn accept" data-order-id="${order.id}" data-action="accept">
          ✓ Accept Order
        </button>
        <button class="order-action-btn view" data-order-id="${order.id}" data-action="view">
          👁️ View
        </button>
      `;
    case 'preparing':
      return `
        <button class="order-action-btn complete" data-order-id="${order.id}" data-action="complete">
          ✓ Mark Ready
        </button>
        <button class="order-action-btn view" data-order-id="${order.id}" data-action="view">
          👁️ View
        </button>
      `;
    case 'ready':
      return `
        <button class="order-action-btn view" data-order-id="${order.id}" data-action="view">
          👁️ View Details
        </button>
      `;
    default:
      return '';
  }
}

function setupOrderActionListeners() {
  document.querySelectorAll('.order-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const orderId = btn.dataset.orderId;
      const action = btn.dataset.action;
      
      handleOrderAction(orderId, action);
    });
  });
}

function handleOrderAction(orderId, action) {
  const order = DATA.activeOrders.find(o => o.id === orderId);
  if (!order) return;
  
  switch(action) {
    case 'accept':
      DataHelper.updateOrderStatus(orderId, 'preparing');
      showStaffNotification(`Order ${orderId} accepted`);
      loadOrdersView();
      updateStats();
      break;
      
    case 'complete':
      DataHelper.updateOrderStatus(orderId, 'ready');
      showStaffNotification(`Order ${orderId} is ready for pickup!`);
      loadOrdersView();
      updateStats();
      break;
      
    case 'view':
      showOrderDetail(order);
      break;
  }
}

// ========================================
// Order Detail Modal
// ========================================

function showOrderDetail(order) {
  const modal = document.getElementById('orderDetailModal');
  const overlay = document.getElementById('orderDetailOverlay');
  const content = document.getElementById('orderDetailContent');
  
  const time = new Date(order.orderDateTime).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  content.innerHTML = `
    <div class="mb-lg">
      <h4>Order ${order.id}</h4>
      <p class="text-muted" style="font-size: 0.875rem;">Placed at ${time}</p>
    </div>
    
    <div class="form-group">
      <label class="form-label">Customer</label>
      <div style="padding: var(--spacing-sm); background-color: var(--color-gray-100); border-radius: var(--radius-md);">
        ${order.userName}
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Status</label>
      <div>
        <span class="order-status-badge ${order.orderStatus}">${order.orderStatus}</span>
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Items Ordered</label>
      <div style="padding: var(--spacing-md); background-color: var(--color-gray-100); border-radius: var(--radius-md);">
        ${order.items.map(item => `
          <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm) 0;">
            <span>${item.quantity}x ${item.itemName}</span>
            <span style="font-weight: var(--font-weight-semibold);">Rs. ${item.price * item.quantity}</span>
          </div>
          ${item.customizations ? `<div style="font-size: 0.75rem; color: var(--color-gray-600); font-style: italic; margin-bottom: var(--spacing-xs);">Note: ${item.customizations}</div>` : ''}
        `).join('')}
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Payment</label>
      <div style="padding: var(--spacing-sm); background-color: var(--color-gray-100); border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between;">
          <span>Method:</span>
          <span style="font-weight: var(--font-weight-semibold);">${order.paymentMethod || 'GIKI Account'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: var(--spacing-xs);">
          <span>Status:</span>
          <span class="badge badge-success">${order.paymentStatus}</span>
        </div>
      </div>
    </div>
    
    <div style="display: flex; justify-content: space-between; padding: var(--spacing-md); background-color: var(--color-primary); color: white; border-radius: var(--radius-md); margin-top: var(--spacing-lg);">
      <span style="font-weight: var(--font-weight-bold);">Total Amount</span>
      <span style="font-weight: var(--font-weight-bold);">Rs. ${order.totalAmount}</span>
    </div>
  `;
  
  modal.classList.add('open');
  overlay.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  overlay.setAttribute('aria-hidden', 'false');
  // Prevent background scrolling when modal is open
  document.body.classList.add('modal-open');
  // Focus modal for accessibility
  try { modal.setAttribute('tabindex', '-1'); modal.focus(); } catch (err) { /* ignore */ }
}

function closeOrderDetail() {
  document.getElementById('orderDetailModal').classList.remove('open');
  document.getElementById('orderDetailOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
  const content = document.getElementById('orderDetailContent');
  if (content) content.innerHTML = '';
  const modal = document.getElementById('orderDetailModal');
  const overlay = document.getElementById('orderDetailOverlay');
  if (modal) modal.setAttribute('aria-hidden', 'true');
  if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

// ========================================
// Inventory View (V2 - Separated)
// ========================================

function loadInventoryView() {
  const items = DATA.menuItems.filter(item => item.outletId === 'cafe'); // Filter by current staff's outlet
  
  loadInventoryTable(items);
  checkLowStock(items);
}

function loadInventoryTable(items) {
  const tbody = document.getElementById('inventoryTableBody');
  
  tbody.innerHTML = items.map(item => {
    const stockClass = item.stock <= 5 ? 'low' : item.stock === 0 ? 'out' : '';
    const isAvailable = item.availabilityStatus === 'available' || item.availabilityStatus === 'low-stock';
    
    return `
      <tr>
        <td class="item-name-cell">${item.name}</td>
        <td class="item-category-cell">${item.category}</td>
        <td>Rs. ${item.price}</td>
        <td class="stock-cell ${stockClass}">${item.stock}</td>
        <td>
          <span class="badge ${item.availabilityStatus === 'available' ? 'badge-success' : item.availabilityStatus === 'low-stock' ? 'badge-warning' : 'badge-error'}">
            ${item.availabilityStatus}
          </span>
        </td>
        <td>
          <div 
            class="availability-toggle ${isAvailable ? 'available' : ''}" 
            data-item-id="${item.id}"
            onclick="toggleItemAvailability('${item.id}')"
          ></div>
        </td>
      </tr>
    `;
  }).join('');
}

function checkLowStock(items) {
  const lowStockItems = items.filter(item => item.stock > 0 && item.stock <= 5);
  const alert = document.getElementById('lowStockAlert');
  const container = document.getElementById('lowStockItems');
  
  if (lowStockItems.length === 0) {
    alert.style.display = 'none';
    return;
  }
  
  alert.style.display = 'block';
  container.innerHTML = lowStockItems.map(item => `
    <div style="padding: var(--spacing-sm); background-color: var(--color-gray-100); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">
      <strong>${item.name}</strong> - Only ${item.stock} left
    </div>
  `).join('');
}

function toggleItemAvailability(itemId) {
  const item = DataHelper.getMenuItemById(itemId);
  if (!item) return;
  
  const isCurrentlyAvailable = item.availabilityStatus === 'available' || item.availabilityStatus === 'low-stock';
  const newStatus = isCurrentlyAvailable ? 'unavailable' : (item.stock <= 5 ? 'low-stock' : 'available');
  
  DataHelper.updateItemAvailability(itemId, newStatus);
  StaffState.inventoryChanges.set(itemId, newStatus);
  
  loadInventoryView();
  showStaffNotification(`${item.name} is now ${newStatus}`);
}

function handleInventorySearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (query.length === 0) {
    loadInventoryView();
    return;
  }
  
  const allItems = DATA.menuItems.filter(item => item.outletId === 'cafe');
  const filtered = allItems.filter(item => 
    item.name.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );
  
  loadInventoryTable(filtered);
}

function saveInventoryChanges() {
  if (StaffState.inventoryChanges.size === 0) {
    showStaffNotification('No changes to save');
    return;
  }
  
  // In a real app, this would send changes to the backend
  showStaffNotification(`${StaffState.inventoryChanges.size} items updated successfully`);
  StaffState.inventoryChanges.clear();
}

// ========================================
// Analytics View (Admin Dashboard)
// ========================================

function loadAnalyticsView() {
  const analytics = DATA.analytics;
  
  // Update summary stats
  document.getElementById('analyticsRevenue').textContent = `Rs. ${analytics.todaySales.toLocaleString()}`;
  document.getElementById('analyticsOrders').textContent = analytics.todayOrders;
  
  const avgWait = Math.round(analytics.outletPerformance.reduce((sum, o) => sum + o.avgWait, 0) / analytics.outletPerformance.length);
  document.getElementById('analyticsAvgWait').textContent = `${avgWait} min`;
  
  // Popular items
  const popularList = document.getElementById('popularItemsList');
  popularList.innerHTML = analytics.popularItems.map((item, index) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md); background-color: ${index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'var(--color-gray-100)'}; border-radius: var(--radius-md); margin-bottom: var(--spacing-sm);">
      <div>
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-xs);">
          ${index + 1}. ${item.itemName}
        </div>
        <div style="font-size: 0.875rem; color: var(--color-gray-600);">
          ${item.count} orders
        </div>
      </div>
      <div style="font-size: 1.125rem; font-weight: var(--font-weight-bold); color: var(--color-primary);">
        Rs. ${item.revenue.toLocaleString()}
      </div>
    </div>
  `).join('');
  
  // Outlet performance
  const performanceBody = document.getElementById('outletPerformanceBody');
  performanceBody.innerHTML = analytics.outletPerformance.map(outlet => `
    <tr>
      <td style="font-weight: var(--font-weight-semibold);">${outlet.outletName}</td>
      <td>${outlet.orders}</td>
      <td>Rs. ${outlet.revenue.toLocaleString()}</td>
      <td>${outlet.avgWait} min</td>
    </tr>
  `).join('');
  
  // Low stock items
  const lowStockContainer = document.getElementById('analyticsLowStock');
  if (analytics.lowStockItems.length === 0) {
    lowStockContainer.innerHTML = '<p class="text-muted">All items are well stocked! ✓</p>';
  } else {
    lowStockContainer.innerHTML = analytics.lowStockItems.map(item => `
      <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm); background-color: var(--color-gray-100); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">
        <span><strong>${item.itemName}</strong> at ${item.outlet}</span>
        <span class="badge badge-warning">Stock: ${item.stock}</span>
      </div>
    `).join('');
  }
}

// ========================================
// Utility Functions
// ========================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showStaffNotification(message, type = 'success') {
  // Create toast container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.success}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Make functions globally accessible for inline event handlers
window.toggleItemAvailability = toggleItemAvailability;
