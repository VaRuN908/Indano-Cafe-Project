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
