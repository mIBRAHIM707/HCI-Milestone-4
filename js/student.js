// ========================================
// GIKI Food Ordering System - Student Interface Logic
// ========================================

// Global State Management
const AppState = {
  currentView: "home", // home, menu, search, tracking, history
  selectedOutlet: null,
  selectedCategory: "all",
  cart: [],
  currentOrder: null,
  searchQuery: "",
  theme: "light",
  isLoading: false,
}

// Data and DataHelper declarations
// Use `DATA` and `DataHelper` from `js/data.js` (loaded before this file)

// ========================================
// Toast Notification System
// ========================================

function createToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'success', duration = 3000) {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ========================================
// Theme Management (Spotify-inspired Dark Mode)
// ========================================

function initTheme() {
  const savedTheme = localStorage.getItem('gikiTheme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  AppState.theme = theme;
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
  const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  showToast(`${newTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode activated`, 'info', 2000);
}

// ========================================
// Initialization
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

function initializeApp() {
  console.log("[v0] Starting app initialization")
  console.log("[v0] DATA outlets:", DATA.outlets)
  initTheme()
  loadUserProfile()
  loadOutlets()
  setupEventListeners()
  loadCartFromStorage()
  updateCartUI()
  updateCartPreview()
}

// ========================================
// User Profile
// ========================================

function loadUserProfile() {
  const user = DataHelper.getCurrentUser()
  document.getElementById("userName").textContent = user.name
  document.getElementById("userBalance").textContent = `Rs. ${user.accountBalance.toLocaleString()}`
  document.getElementById("userAvatar").textContent = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
}

// ========================================
// Event Listeners Setup
// ========================================

function setupEventListeners() {
  // Mobile menu toggle
  const menuToggle = document.getElementById("menuToggle")
  const navLinks = document.getElementById("navLinks")
  menuToggle?.addEventListener("click", () => {
    navLinks.classList.toggle("active")
  })

  // Theme toggle
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme)
  
  // Search shortcut in nav
  document.getElementById("navSearchBtn")?.addEventListener("click", () => {
    const searchInput = document.getElementById("globalSearch")
    searchInput?.focus()
    searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  
  // Keyboard shortcut for search (Ctrl+K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      const searchInput = document.getElementById("globalSearch")
      searchInput?.focus()
    }
    // Escape key to close modals
    if (e.key === 'Escape') {
      closeCart()
      closeCheckout()
    }
  })

  // Global search
  const searchInput = document.getElementById("globalSearch")
  searchInput.addEventListener("input", debounce(handleGlobalSearch, 300))

  // Navigation
  document.getElementById("backToHome")?.addEventListener("click", showHomeView)
  document.getElementById("clearSearch")?.addEventListener("click", () => {
    searchInput.value = ""
    showHomeView()
  })
  document.getElementById("backToHomeFromTracking")?.addEventListener("click", showHomeView)
  document.getElementById("backToHomeFromHistory")?.addEventListener("click", showHomeView)
  document.getElementById("ordersLink")?.addEventListener("click", (e) => {
    e.preventDefault()
    showOrderHistory()
  })

  // Cart
  document.getElementById("cartFab")?.addEventListener("click", toggleCart)
  document.getElementById("cartClose")?.addEventListener("click", closeCart)
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart)
  document.getElementById("checkoutBtn")?.addEventListener("click", openCheckout)

  // Checkout
  document.getElementById("checkoutClose")?.addEventListener("click", closeCheckout)
  document.getElementById("checkoutOverlay")?.addEventListener("click", closeCheckout)
  document.getElementById("cancelCheckoutBtn")?.addEventListener("click", closeCheckout)
  document.getElementById("confirmPaymentBtn")?.addEventListener("click", handlePayment)
  
  // Cart preview checkout button
  document.getElementById("cartPreviewCheckout")?.addEventListener("click", () => {
    toggleCart()
  })
}

// ========================================
// View Management
// ========================================

function showView(viewName) {
  // Hide all views
  ;["homeView", "menuView", "searchView", "trackingView", "historyView"].forEach((view) => {
    document.getElementById(view)?.classList.add("hidden")
  })

  // Show selected view
  const viewId = viewName + "View"
  document.getElementById(viewId)?.classList.remove("hidden")

  AppState.currentView = viewName

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function showHomeView() {
  showView("home")
  AppState.selectedOutlet = null
  AppState.selectedCategory = "all"
}

function showMenuView(outletId) {
  const outlet = DataHelper.getOutletById(outletId)
  if (!outlet) return

  AppState.selectedOutlet = outletId
  AppState.selectedCategory = "all"

  document.getElementById("menuViewTitle").textContent = outlet.name + " Menu"

  loadMenuCategories(outletId)
  loadMenuItems(outletId)

  showView("menu")
}

function showSearchView(results) {
  const grid = document.getElementById("searchResultsGrid")

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No items found</div>
        <div class="empty-state-description">We couldn't find any items matching your search. Try different keywords or browse our outlets.</div>
        <button class="empty-state-cta" onclick="showHomeView()">
          <span aria-hidden="true">🏠</span> Browse Outlets
        </button>
      </div>
    `
  } else {
    grid.innerHTML = results.map((item) => createMenuItemCard(item)).join("")
    setupMenuItemListeners()
  }

  showView("search")
}

function showOrderTracking(order) {
  AppState.currentOrder = order

  document.getElementById("currentOrderNumber").textContent = order.id
  document.getElementById("estimatedMinutes").textContent = order.estimatedTime || 15

  // Populate order items
  const itemsContainer = document.getElementById("trackingOrderItems")
  itemsContainer.innerHTML = order.items
    .map(
      (item) => `
    <div class="order-item">
      <div>
        <div class="order-item-name">${item.itemName} <span class="order-item-quantity">x${item.quantity}</span></div>
        ${item.customizations ? `<div class="cart-item-customization">${item.customizations}</div>` : ""}
      </div>
      <div class="order-item-price">Rs. ${item.price * item.quantity}</div>
    </div>
  `,
    )
    .join("")

  document.getElementById("trackingOrderTotal").textContent = `Rs. ${order.totalAmount}`

  // Simulate order status progression
  simulateOrderProgress()

  showView("tracking")
}

function showOrderHistory() {
  const historyList = document.getElementById("orderHistoryList")
  const history = DATA.orderHistory

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">No orders yet</div>
        <div class="empty-state-description">Your order history will appear here once you place your first order. Ready to explore our delicious menu?</div>
        <button class="empty-state-cta" onclick="showHomeView()">
          <span aria-hidden="true">🍽️</span> Start Ordering
        </button>
      </div>
    `
  } else {
    historyList.innerHTML = history.map((order) => createOrderHistoryCard(order)).join("")
  }

  showView("history")
}

// ========================================
// Outlets Loading
// ========================================

function loadOutlets() {
  const grid = document.getElementById("outletsGrid")
  console.log("[v0] outletsGrid element found:", !!grid)
  const outlets = DATA.outlets
  console.log("[v0] Number of outlets:", outlets.length)

  grid.innerHTML = outlets
    .map(
      (outlet) => `
    <div class="outlet-card" data-outlet-id="${outlet.id}" onclick="handleOutletClick('${outlet.id}')">
      <div class="outlet-card-image">
        <img src="${outlet.image}" alt="${outlet.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null;this.src='images/food/placeholder.svg'">
      </div>
      <div class="outlet-card-content">
        <div class="outlet-header">
          <div>
            <h3 class="outlet-name">${outlet.name}</h3>
            <div class="outlet-location">📍 ${outlet.location}</div>
          </div>
          <span class="outlet-status ${outlet.status}">${outlet.status === "open" ? "Open" : "Closed"}</span>
        </div>
        <div class="outlet-info">
          <div class="outlet-timing">🕐 ${outlet.openingTime} - ${outlet.closingTime}</div>
          <div class="outlet-wait ${outlet.averageWaitTime > 12 ? "high" : ""}">⏱️ ${outlet.averageWaitTime} min wait</div>
        </div>
      </div>
    </div>
  `,
    )
    .join("")

  console.log("[v0] Grid innerHTML after render:", grid.innerHTML.substring(0, 100))
}

function handleOutletClick(outletId) {
  const outlet = DataHelper.getOutletById(outletId)

  if (outlet.status === "closed") {
    alert(`${outlet.name} is currently closed. Opens at ${outlet.openingTime}.`)
    return
  }

  showMenuView(outletId)
}

// ========================================
// Menu Loading
// ========================================

function loadMenuCategories(outletId) {
  const menuItems = DataHelper.getMenuByOutlet(outletId)
  const categories = ["all", ...new Set(menuItems.map((item) => item.category))]

  const filterContainer = document.getElementById("categoryFilter")
  filterContainer.innerHTML = categories
    .map(
      (category) => `
    <button class="category-pill ${category === "all" ? "active" : ""}" data-category="${category}">
      ${category === "all" ? "All Items" : category}
    </button>
  `,
    )
    .join("")

  // Add click listeners
  filterContainer.querySelectorAll(".category-pill").forEach((pill) => {
    pill.addEventListener("click", (e) => {
      filterContainer.querySelectorAll(".category-pill").forEach((p) => p.classList.remove("active"))
      e.target.classList.add("active")

      const category = e.target.dataset.category
      AppState.selectedCategory = category
      loadMenuItems(outletId, category)
    })
  })
}

function loadMenuItems(outletId, category = "all") {
  let items = DataHelper.getMenuByOutlet(outletId)

  if (category !== "all") {
    items = items.filter((item) => item.category === category)
  }

  const grid = document.getElementById("menuItemsGrid")

  if (items.length === 0) {
    grid.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div class="empty-state-title">No items in this category</div></div>'
    return
  }

  grid.innerHTML = items.map((item) => createMenuItemCard(item)).join("")
  setupMenuItemListeners()
}

function createMenuItemCard(item) {
  const isAvailable = item.availabilityStatus === "available" || item.availabilityStatus === "low-stock"
  const isLowStock = item.availabilityStatus === "low-stock"

  return `
    <div class="menu-item-card" data-item-id="${item.id}">
      <div class="menu-item-image">
        <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null;this.src='images/food/placeholder.svg'">
        <div class="item-badges">
          ${isLowStock ? `<span class="stock-badge low">Only ${item.stock} left!</span>` : ""}
          ${!isAvailable ? '<span class="stock-badge out">Sold Out</span>' : ""}
          ${item.isVegetarian ? '<span class="badge badge-success">🌱 Veg</span>' : ""}
        </div>
      </div>
      <div class="menu-item-content">
        <div class="menu-item-header">
          <h4 class="menu-item-name">${item.name}</h4>
          <p class="menu-item-description">${item.description}</p>
        </div>
        <div class="menu-item-meta">
          ${item.spiceLevel !== "none" ? `<span class="meta-badge">🌶️ ${item.spiceLevel}</span>` : ""}
          <span class="meta-badge">⏱️ ${item.preparationTime} min</span>
        </div>
        <div class="menu-item-footer">
          <div class="menu-item-price">Rs. ${item.price}</div>
          <button 
            class="add-to-cart-btn" 
            data-item-id="${item.id}"
            ${!isAvailable ? "disabled" : ""}
          >
            ${isAvailable ? "+ Add" : "Unavailable"}
          </button>
        </div>
      </div>
    </div>
  `
}

function setupMenuItemListeners() {
  document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const itemId = btn.dataset.itemId
      addToCart(itemId)
    })
  })
}

// ========================================
// Global Search
// ========================================

function handleGlobalSearch(e) {
  const query = e.target.value.trim()
  AppState.searchQuery = query

  if (query.length === 0) {
    showHomeView()
    return
  }

  if (query.length < 2) return

  const results = DataHelper.searchMenuItems(query)
  showSearchView(results)
}

// ========================================
// Shopping Cart
// ========================================

function addToCart(itemId) {
  const item = DataHelper.getMenuItemById(itemId)
  if (!item) return

  // Check if cart has items from different outlet
  if (AppState.cart.length > 0) {
    const firstItemOutlet = DataHelper.getMenuItemById(AppState.cart[0].itemId).outletId
    if (firstItemOutlet !== item.outletId) {
      const confirmChange = confirm("Your cart contains items from a different outlet. Clear cart and add this item?")
      if (confirmChange) {
        AppState.cart = []
      } else {
        return
      }
    }
  }

  const existingItem = AppState.cart.find((cartItem) => cartItem.itemId === itemId)

  if (existingItem) {
    existingItem.quantity++
  } else {
    AppState.cart.push({
      itemId: itemId,
      quantity: 1,
      customizations: "",
    })
  }

  saveCartToStorage()
  updateCartUI()

  // Visual feedback
  showNotification(`${item.name} added to cart!`)
}

function removeFromCart(itemId) {
  AppState.cart = AppState.cart.filter((item) => item.itemId !== itemId)
  saveCartToStorage()
  updateCartUI()
}

function updateCartQuantity(itemId, change) {
  const cartItem = AppState.cart.find((item) => item.itemId === itemId)
  if (!cartItem) return

  cartItem.quantity += change

  if (cartItem.quantity <= 0) {
    removeFromCart(itemId)
  } else {
    saveCartToStorage()
    updateCartUI()
  }
}

function updateCartUI() {
  const cartItemsContainer = document.getElementById("cartItems")
  const cartCount = document.getElementById("cartCount")
  const cartFooter = document.getElementById("cartFooter")

  const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0)

  // Update cart count badge
  if (totalItems > 0) {
    cartCount.textContent = totalItems
    cartCount.classList.remove("hidden")
  } else {
    cartCount.classList.add("hidden")
  }

  // Update cart items
  if (AppState.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p class="cart-empty-title">Your cart is empty</p>
        <p class="cart-empty-description">Looks like you haven't added anything yet. Explore our delicious menu!</p>
        <button class="cart-empty-cta" onclick="closeCart(); showHomeView();">
          <span aria-hidden="true">🍽️</span> Browse Menu
        </button>
      </div>
    `
    cartFooter.style.display = "none"
    return
  }

  cartFooter.style.display = "block"

  cartItemsContainer.innerHTML = AppState.cart
    .map((cartItem) => {
      const item = DataHelper.getMenuItemById(cartItem.itemId)
      const subtotal = item.price * cartItem.quantity

      return `
      <div class="cart-item">
        <div class="cart-item-image" aria-hidden="true">🍽</div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          ${cartItem.customizations ? `<div class="cart-item-customization">${cartItem.customizations}</div>` : ""}
          <div class="cart-item-price">Rs. ${item.price} × ${cartItem.quantity} = Rs. ${subtotal}</div>
          <div class="cart-item-controls">
            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)" aria-label="Decrease quantity of ${item.name}">-</button>
            <span class="quantity-display" aria-label="Quantity: ${cartItem.quantity}">${cartItem.quantity}</span>
            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)" aria-label="Increase quantity of ${item.name}">+</button>
            <button class="remove-item-btn" onclick="removeFromCart('${item.id}')" aria-label="Remove ${item.name} from cart">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `
    })
    .join("")

  // Update totals
  const subtotal = calculateCartTotal()
  document.getElementById("cartSubtotal").textContent = `Rs. ${subtotal}`
  document.getElementById("cartTotal").textContent = `Rs. ${subtotal}`
  document.getElementById("checkoutTotal").textContent = `Rs. ${subtotal}`
}

function calculateCartTotal() {
  return AppState.cart.reduce((total, cartItem) => {
    const item = DataHelper.getMenuItemById(cartItem.itemId)
    return total + item.price * cartItem.quantity
  }, 0)
}

function toggleCart() {
  const sidebar = document.getElementById("cartSidebar")
  const overlay = document.getElementById("cartOverlay")
  const fab = document.getElementById("cartFab")

  const isOpen = sidebar.classList.toggle("open")
  overlay.classList.toggle("active")
  
  // Update accessibility attributes
  sidebar.setAttribute('aria-hidden', !isOpen)
  overlay.setAttribute('aria-hidden', !isOpen)
  fab?.setAttribute('aria-expanded', isOpen)
  
  // Prevent body scroll when cart is open
  document.body.classList.toggle('modal-open', isOpen)
  
  // Focus management
  if (isOpen) {
    document.getElementById('cartClose')?.focus()
  }
}

function closeCart() {
  const sidebar = document.getElementById("cartSidebar")
  const overlay = document.getElementById("cartOverlay")
  const fab = document.getElementById("cartFab")
  
  sidebar.classList.remove("open")
  overlay.classList.remove("active")
  sidebar.setAttribute('aria-hidden', 'true')
  overlay.setAttribute('aria-hidden', 'true')
  fab?.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('modal-open')
}

function saveCartToStorage() {
  localStorage.setItem("gikiCart", JSON.stringify(AppState.cart))
  updateCartPreview()
}

function loadCartFromStorage() {
  const saved = localStorage.getItem("gikiCart")
  if (saved) {
    AppState.cart = JSON.parse(saved)
  }
}

// ========================================
// Cart Preview (Hover)
// ========================================

function updateCartPreview() {
  const previewItems = document.getElementById("cartPreviewItems")
  const previewFooter = document.getElementById("cartPreviewFooter")
  const previewTotal = document.getElementById("cartPreviewTotal")
  
  if (!previewItems) return
  
  if (AppState.cart.length === 0) {
    previewItems.innerHTML = `
      <div class="cart-preview-empty">
        <div class="cart-preview-empty-icon">🛒</div>
        <p>Your cart is empty</p>
      </div>
    `
    if (previewFooter) previewFooter.style.display = 'none'
    return
  }
  
  if (previewFooter) previewFooter.style.display = 'flex'
  
  // Show up to 3 items in preview
  const itemsToShow = AppState.cart.slice(0, 3)
  const remainingCount = AppState.cart.length - 3
  
  previewItems.innerHTML = itemsToShow.map(cartItem => {
    const item = DataHelper.getMenuItemById(cartItem.itemId)
    return `
      <div class="cart-preview-item">
        <span class="cart-preview-item-icon" aria-hidden="true">🍽</span>
        <div class="cart-preview-item-details">
          <div class="cart-preview-item-name">${item.name}</div>
          <div class="cart-preview-item-qty">×${cartItem.quantity}</div>
        </div>
        <span class="cart-preview-item-price">Rs. ${item.price * cartItem.quantity}</span>
      </div>
    `
  }).join('')
  
  if (remainingCount > 0) {
    previewItems.innerHTML += `
      <div class="cart-preview-item" style="justify-content: center; color: var(--color-text-secondary);">
        +${remainingCount} more item${remainingCount > 1 ? 's' : ''}
      </div>
    `
  }
  
  if (previewTotal) {
    previewTotal.textContent = `Rs. ${calculateCartTotal()}`
  }
}

// ========================================
// Checkout & Payment
// ========================================

function openCheckout() {
  closeCart()

  setTimeout(() => {
    document.getElementById("checkoutModal").classList.add("open")
    document.getElementById("checkoutOverlay").classList.add("active")
  }, 300)
}

function closeCheckout() {
  document.getElementById("checkoutModal").classList.remove("open")
  document.getElementById("checkoutOverlay").classList.remove("active")
}

function handlePayment() {
  if (AppState.cart.length === 0) {
    alert("Your cart is empty!")
    return
  }

  const deliveryType = document.getElementById("deliveryType").value
  const paymentMethod = document.getElementById("paymentMethod").value
  const specialInstructions = document.getElementById("specialInstructions").value

  // Create order object
  const firstItem = DataHelper.getMenuItemById(AppState.cart[0].itemId)
  const order = {
    id: "ORD" + Math.floor(Math.random() * 10000),
    userId: DATA.currentUser.id,
    outletId: firstItem.outletId,
    orderDateTime: new Date().toISOString(),
    orderStatus: "confirmed",
    totalAmount: calculateCartTotal(),
    deliveryType: deliveryType,
    estimatedTime: 15,
    items: AppState.cart.map((cartItem) => {
      const item = DataHelper.getMenuItemById(cartItem.itemId)
      return {
        itemId: item.id,
        itemName: item.name,
        quantity: cartItem.quantity,
        price: item.price,
        customizations: cartItem.customizations || specialInstructions,
      }
    }),
    paymentMethod: paymentMethod,
    paymentStatus: "paid",
  }

  // Clear cart
  AppState.cart = []
  saveCartToStorage()
  updateCartUI()

  // Close checkout
  closeCheckout()

  // Show tracking view
  setTimeout(() => {
    showOrderTracking(order)
  }, 300)
}

// ========================================
// Order Tracking Simulation
// ========================================

function simulateOrderProgress() {
  // Reset timeline
  document.getElementById("stepConfirmed").className = "timeline-step completed"
  document.getElementById("stepPreparing").className = "timeline-step active"
  document.getElementById("stepReady").className = "timeline-step"

  // After 8 seconds, mark as ready
  setTimeout(() => {
    document.getElementById("stepPreparing").className = "timeline-step completed"
    document.getElementById("stepReady").className = "timeline-step active"
    document.getElementById("estimatedMinutes").textContent = "0"

    showNotification("🎉 Your order is ready for pickup!")
  }, 8000)
}

// ========================================
// Order History
// ========================================

function createOrderHistoryCard(order) {
  const outlet = DataHelper.getOutletById(order.outletId)
  const date = new Date(order.orderDateTime)
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return `
    <div class="card mb-lg">
      <div class="card-body">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-md);">
          <div>
            <h3 style="margin-bottom: var(--spacing-xs);">${outlet.name}</h3>
            <p class="text-muted" style="font-size: 0.875rem; margin-bottom: 0;">
              ${formattedDate} at ${formattedTime}
            </p>
          </div>
          <span class="badge badge-${order.orderStatus === "delivered" ? "success" : "info"}">
            ${order.orderStatus}
          </span>
        </div>
        
        <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-md); background-color: var(--color-gray-100); border-radius: var(--radius-md);">
          ${order.items
            .map(
              (item) => `
            <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; font-size: 0.875rem;">
              <span>${item.quantity}x ${item.itemName}</span>
              <span style="font-weight: var(--font-weight-semibold);">Rs. ${item.price * item.quantity}</span>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--spacing-md); border-top: 2px solid var(--color-gray-300);">
          <span style="font-size: 1.125rem; font-weight: var(--font-weight-bold);">Total: Rs. ${order.totalAmount}</span>
          ${order.rating ? `<span style="font-size: 0.875rem;">⭐ ${order.rating}/5</span>` : ""}
        </div>
        
        ${order.feedback ? `<p style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background-color: var(--color-gray-100); border-radius: var(--radius-sm); font-size: 0.875rem; font-style: italic;">"${order.feedback}"</p>` : ""}
      </div>
    </div>
  `
}

// ========================================
// Utility Functions
// ========================================

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function showNotification(message, type = 'success') {
  showToast(message, type)
}

// Make functions globally accessible for inline event handlers
window.handleOutletClick = handleOutletClick
window.updateCartQuantity = updateCartQuantity
window.removeFromCart = removeFromCart
window.showHomeView = showHomeView
window.closeCart = closeCart
