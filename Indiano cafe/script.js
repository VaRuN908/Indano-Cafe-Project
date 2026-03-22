const navbar = document.getElementById("navbar");
if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// Helper to escape HTML and prevent XSS
const escapeHTML = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
const loginBtn = document.getElementById("login-btn");
const authModal = document.getElementById("auth-modal");
const closeModal = document.getElementById("close-modal");
const showLoginBtn = document.getElementById("show-login");
const showSignupBtn = document.getElementById("show-signup");
const loginForm = document.getElementById("modal-login-form");
const signupForm = document.getElementById("modal-signup-form");

if (loginBtn && authModal) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    authModal.classList.add("show");
    showLoginForm();
  });
}
const closeAuthModal = () => {
  authModal.classList.remove("show");
};

if (closeModal) {
  closeModal.addEventListener("click", closeAuthModal);
}

if (authModal) {
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) {
      closeAuthModal();
    }
  });
}
const showLoginForm = () => {
  showLoginBtn.classList.add("active");
  showSignupBtn.classList.remove("active");
  loginForm.classList.add("active-form");
  loginForm.classList.remove("hidden-form");
  signupForm.classList.remove("active-form");
  signupForm.classList.add("hidden-form");
};

const showSignupForm = () => {
  showSignupBtn.classList.add("active");
  showLoginBtn.classList.remove("active");
  signupForm.classList.add("active-form");
  signupForm.classList.remove("hidden-form");
  loginForm.classList.remove("active-form");
  loginForm.classList.add("hidden-form");
};

if (showLoginBtn && showSignupBtn) {
  showLoginBtn.addEventListener("click", showLoginForm);
  showSignupBtn.addEventListener("click", showSignupForm);
}

// ============================================
// AUTHENTICATION API INTEGRATION
// ============================================

const API_URL = 'http://localhost:3000/auth';

// Helper to show messages in the modal
const showAuthMessage = (formElement, message, isError = false) => {
    let msgContainer = formElement.querySelector('.auth-msg');
    if (!msgContainer) {
        msgContainer = document.createElement('div');
        msgContainer.className = 'auth-msg';
        msgContainer.style.marginTop = '15px';
        msgContainer.style.padding = '10px';
        msgContainer.style.borderRadius = '5px';
        msgContainer.style.fontSize = '0.9rem';
        msgContainer.style.textAlign = 'center';
        formElement.insertBefore(msgContainer, formElement.querySelector('button[type="submit"]'));
    }
    
    msgContainer.textContent = message;
    msgContainer.style.backgroundColor = isError ? 'rgba(255, 50, 50, 0.1)' : 'rgba(50, 255, 50, 0.1)';
    msgContainer.style.color = isError ? '#ff6b6b' : '#51cf66';
    msgContainer.style.border = `1px solid ${isError ? '#ff6b6b' : '#51cf66'}`;
};

// Handle Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('modal-signup-username').value;
        const email = document.getElementById('modal-signup-email').value;
        const password = document.getElementById('modal-signup-password').value;
        const confirm = document.getElementById('modal-signup-confirm').value;

        if (password !== confirm) {
            return showAuthMessage(signupForm, 'Passwords do not match!', true);
        }

        if (password.length < 8) {
            return showAuthMessage(signupForm, 'Password must be at least 8 characters.', true);
        }

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAuthMessage(signupForm, 'Account created successfully! You can now login.', false);
                signupForm.reset();
                setTimeout(() => showLoginForm(), 2000);
            } else {
                showAuthMessage(signupForm, data.error || data.message || 'Registration failed.', true);
            }
        } catch (error) {
            console.error('Signup error:', error);
            showAuthMessage(signupForm, 'Cannot connect to server.', true);
        }
    });
}

// Handle Login
if (loginForm) {
    // Auto-fill from Remember Me on page load
    const savedIdentifier = localStorage.getItem('rememberedIdentifier');
    if (savedIdentifier) {
        const identifierInput = document.getElementById('modal-login-identifier');
        const rememberCheck = document.getElementById('remember-me-check');
        if (identifierInput) identifierInput.value = savedIdentifier;
        if (rememberCheck) rememberCheck.checked = true;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('modal-login-identifier').value;
        const password = document.getElementById('modal-login-password').value;
        const rememberMe = document.getElementById('remember-me-check');

        if (password.length < 8) {
            return showAuthMessage(loginForm, 'Password must be at least 8 characters.', true);
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save or clear Remember Me
                if (rememberMe && rememberMe.checked) {
                    localStorage.setItem('rememberedIdentifier', identifier);
                } else {
                    localStorage.removeItem('rememberedIdentifier');
                }

                showAuthMessage(loginForm, 'Login successful! Welcome back ' + data.user.username, false);
                loginForm.reset();
                setTimeout(() => {
                    closeAuthModal();
                }, 1500);
            } else {
                showAuthMessage(loginForm, data.error || data.message || 'Invalid credentials.', true);
            }
        } catch (error) {
            console.error('Login error:', error);
            showAuthMessage(loginForm, 'Cannot connect to server.', true);
        }
    });
}

// ============================================
// MENU CATEGORY POP-UP LOGIC
// ============================================

// ============================================
// DYNAMIC MENU & SHOPPING CART SYSTEM
// ============================================

let allMenuItems = [];
let cart = [];

// DOM Elements
const menuModalOverlay = document.getElementById("menu-modal-overlay");
const closeMenuModalBtn = document.getElementById("close-menu-modal");
const categoryTitle = document.getElementById("menu-category-title");
const itemCountEl = document.getElementById("menu-item-count");
const itemsGrid = document.getElementById("menu-items-container");
const categoryCards = document.querySelectorAll(".menu-spe");

const cartToggle = document.getElementById("cart-toggle");
const cartModalOverlay = document.getElementById("cart-modal-overlay");
const closeCartModalBtn = document.getElementById("close-cart-modal");
const cartItemsContainer = document.getElementById("cart-items-container");
const cartCountEl = document.getElementById("cart-count");
const cartInfoEl = document.getElementById("cart-items-info");
const cartTotalEl = document.getElementById("cart-total-price");
const purchaseBtn = document.getElementById("purchase-btn");

// 1. Fetch Menu from API
const fetchMenu = async () => {
    try {
        const response = await fetch('/api/menu');
        const data = await response.json();
        if (data.success) {
            allMenuItems = data.menu;
        }
    } catch (error) {
        console.error("Error fetching menu:", error);
    }
};

// 2. Render Menu Modal Grid
const showMenuModal = (category) => {
    const items = allMenuItems.filter(item => item.category === category);
    categoryTitle.textContent = category;
    itemCountEl.textContent = `${items.length} items available`;
    
    if (items.length === 0) {
        itemsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.4); padding: 40px;">No items found in this category.</p>`;
    } else {
        itemsGrid.innerHTML = items.map(item => {
            const imgSrc = item.image_url || 'images/logo.png'; // Fallback to logo if no image
            return `
            <div class="menu-card">
                <div class="menu-card-image">
                    <img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(item.name)}" onerror="this.src='images/logo.png'">
                </div>
                <div class="menu-card-name">${escapeHTML(item.name)}</div>
                <div class="menu-card-desc">${escapeHTML(item.description) || 'No description available.'}</div>
                <div class="menu-card-footer">
                    <span class="menu-card-price">${escapeHTML(item.price)}</span>
                    <button class="add-btn" onclick="addToCart(${item.id})">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `;}).join('');
    }
    
    openModal(menuModalOverlay);
};

// 3. Cart Functions
window.addToCart = (id) => {
    const item = allMenuItems.find(i => i.id === id);
    if (!item) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    
    updateCartUI();
    
    // Quick animation on cart icon
    cartToggle.style.transform = "scale(1.2)";
    setTimeout(() => cartToggle.style.transform = "scale(1)", 200);
};

const updateCartUI = () => {
    // Update count badge
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = totalQty;
    cartInfoEl.textContent = `${totalQty} items selected`;

    // Render cart items
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p style="text-align: center; color: rgba(255,255,255,0.3); padding: 20px;">Your cart is empty</p>`;
        cartTotalEl.textContent = "₹0";
    } else {
        let total = 0;
        cartItemsContainer.innerHTML = cart.map(item => {
            const priceVal = parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
            const subtotal = priceVal * item.quantity;
            total += subtotal;

            return `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <h4>${escapeHTML(item.name)}</h4>
                        <p>${escapeHTML(item.price)} x ${item.quantity}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                    </div>
                </div>
            `;
        }).join('');        cartTotalEl.textContent = `₹${total}`;
    }
};

window.changeQty = (id, delta) => {
    const index = cart.findIndex(i => i.id === id);
    if (index === -1) return;

    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
};

const openModal = (modal) => {
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
    document.body.style.overflow = 'hidden';
};

const hideModals = () => {
    menuModalOverlay.classList.remove("show");
    cartModalOverlay.classList.remove("show");
    setTimeout(() => {
        menuModalOverlay.style.display = "none";
        cartModalOverlay.style.display = "none";
        document.body.style.overflow = '';
    }, 300);
};

// 4. Event Listeners
if (categoryCards) {
    categoryCards.forEach(card => {
        card.addEventListener("click", () => {
            const categoryText = card.querySelector("p").innerText;
            showMenuModal(categoryText);
        });
    });
}

if (closeMenuModalBtn) closeMenuModalBtn.addEventListener("click", hideModals);
if (closeCartModalBtn) closeCartModalBtn.addEventListener("click", hideModals);

[menuModalOverlay, cartModalOverlay].forEach(overlay => {
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) hideModals();
        });
    }
});

if (cartToggle) {
    cartToggle.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(cartModalOverlay);
    });
}

// 5. Purchase Logic
if (purchaseBtn) {
    purchaseBtn.addEventListener("click", async () => {
        if (cart.length === 0) return alert("Your cart is empty!");
        
        const total = cartTotalEl.textContent;
        purchaseBtn.disabled = true;
        purchaseBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

        try {
            const res = await fetch('/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart, total })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`Order Successful!\n${data.message}`);
                cart = [];
                updateCartUI();
                closeModals();
            }
        } catch (err) {
            alert("Error processing purchase.");
        } finally {
            purchaseBtn.disabled = false;
            purchaseBtn.innerHTML = `<i class="fa-solid fa-bag-shopping"></i> Complete Purchase`;
        }
    });
}

// Initial Fetch
fetchMenu();
