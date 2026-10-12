// ==========================================
// АВТОРИЗАЦИЯ (выезжающая панель + localStorage)
// ==========================================
const AUTH_STORAGE_KEY = 'zhivi_users';
const SESSION_STORAGE_KEY = 'zhivi_current_user';

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function updateHeaderAuth() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userGreeting = document.getElementById('userGreeting');
    const userNameEl = document.getElementById('userName');

    // ДОБАВЛЕНЫ ПРОВЕРКИ: если элементов нет в HTML, код не упадёт
    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userGreeting) {
            userGreeting.style.display = 'flex';
            if (userNameEl) userNameEl.textContent = `Привет, ${user.name}!`;
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userGreeting) userGreeting.style.display = 'none';
    }
}

// Панель авторизации
const authPanel = document.getElementById('authPanel');
const authOverlay = document.getElementById('authOverlay');
const authClose = document.getElementById('authClose');
const openLoginBtn = document.getElementById('openLoginBtn');
const openRegisterBtn = document.getElementById('openRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');

const tabs = document.querySelectorAll('.auth-panel__tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const authTitle = document.getElementById('authTitle');

function openAuthPanel(tab = 'login') {
    if (!authPanel) return;
    authPanel.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchTab(tab);
}

function closeAuthPanel() {
    if (!authPanel) return;
    authPanel.classList.remove('active');
    document.body.style.overflow = '';
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
}

function switchTab(tab) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'flex';
        if (registerForm) registerForm.style.display = 'none';
        if (authTitle) authTitle.textContent = 'Добро пожаловать';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'flex';
        if (authTitle) authTitle.textContent = 'Создать аккаунт';
    }
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
}

if (openLoginBtn) openLoginBtn.addEventListener('click', () => openAuthPanel('login'));
if (openRegisterBtn) openRegisterBtn.addEventListener('click', () => openAuthPanel('register'));
if (authClose) authClose.addEventListener('click', closeAuthPanel);
if (authOverlay) authOverlay.addEventListener('click', closeAuthPanel);

tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authPanel && authPanel.classList.contains('active')) {
        closeAuthPanel();
    }
});

// Вход
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginError) loginError.textContent = '';

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;

        if (!isValidEmail(email)) {
            if (loginError) loginError.textContent = 'Некорректный формат email';
            return;
        }
        if (password.length < 6) {
            if (loginError) loginError.textContent = 'Пароль должен быть минимум 6 символов';
            return;
        }

        const users = getUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            if (loginError) loginError.textContent = 'Пользователь не найден. Зарегистрируйтесь!';
            return;
        }

        const hashedPassword = await hashPassword(password);
        if (user.passwordHash !== hashedPassword) {
            if (loginError) loginError.textContent = 'Неверный пароль';
            return;
        }

        setCurrentUser({ name: user.name, email: user.email });
        updateHeaderAuth();
        closeAuthPanel();
        console.log('✅ Вход выполнен:', user.email);
    });
}

// Регистрация
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (registerError) registerError.textContent = '';

        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;

        if (name.length < 2) {
            if (registerError) registerError.textContent = 'Имя должно быть минимум 2 символа';
            return;
        }
        if (!isValidEmail(email)) {
            if (registerError) registerError.textContent = 'Некорректный формат email';
            return;
        }
        if (password.length < 6) {
            if (registerError) registerError.textContent = 'Пароль должен быть минимум 6 символов';
            return;
        }
        if (password !== passwordConfirm) {
            if (registerError) registerError.textContent = 'Пароли не совпадают';
            return;
        }

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            if (registerError) registerError.textContent = 'Этот email уже зарегистрирован';
            return;
        }

        const hashedPassword = await hashPassword(password);
        const newUser = {
            id: Date.now(),
            name,
            email,
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        setCurrentUser({ name: newUser.name, email: newUser.email });
        updateHeaderAuth();
        closeAuthPanel();
        console.log('✅ Регистрация:', newUser.email);
    });
}

// Выход
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        updateHeaderAuth();
    });
}

// Проверка сессии при загрузке
updateHeaderAuth();