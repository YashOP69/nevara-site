        // =================== DATA & STATE ===================
        let currentUser = null;
        let currentPage = 'home';
        let currentFilter = 'all';
        let browseFilter = 'all';
        let bookingFilter = 'all';
        let searchQuery = '';
        let editingListingId = null;
        let selectedListingId = null;
        let notifications = [];

        const baseListings = [
            {
                id: 1,
                title: "Canon EOS Mirrorless Camera",
                type: "item",
                category: "equipment",
                price: 500,
                unit: "/day",
                location: "Bangalore, Koramangala",
                distance: "1.2 km",
                rating: 4.8,
                reviews: 24,
                description: "Professional mirrorless camera with lenses. Perfect for photography projects, content creation, or learning photography. Includes carrying case.",
                owner: "Rakesh K.",
                ownerInitial: "R",
                verified: true,
                gradientFrom: "#667eea",
                gradientTo: "#764ba2",
                image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85"
            },
            {
                id: 2,
                title: "IIIT Data Structures Textbook",
                type: "item",
                category: "books",
                price: 50,
                unit: "/day",
                location: "Bangalore, Whitefield",
                distance: "2.1 km",
                rating: 4.9,
                reviews: 18,
                description: "Latest edition data structures textbook. Great condition, perfect for semester exams or learning DSA. Annotated with solutions.",
                owner: "Priya S.",
                ownerInitial: "P",
                verified: true,
                gradientFrom: "#f093fb",
                gradientTo: "#f5576c",
                image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85"
            },
            {
                id: 3,
                title: "Creative Studio Space",
                type: "space",
                category: "spaces",
                price: 600,
                unit: "/hour",
                location: "Bangalore, Indiranagar",
                distance: "1.8 km",
                rating: 4.7,
                reviews: 31,
                description: "Fully equipped studio with lighting, backdrop, and basic props. Available for photography, video, or online classes. High-speed internet.",
                owner: "Sophia R.",
                ownerInitial: "S",
                verified: true,
                gradientFrom: "#4facfe",
                gradientTo: "#00f2fe",
                image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85"
            },
            {
                id: 4,
                title: "Professional Laptop Stand",
                type: "item",
                category: "equipment",
                price: 30,
                unit: "/month",
                location: "Bangalore, MG Road",
                distance: "0.9 km",
                rating: 4.6,
                reviews: 12,
                description: "Adjustable aluminum laptop stand. Ergonomic and sturdy, great for working from home setups. Fits all laptop sizes.",
                owner: "Arun J.",
                ownerInitial: "A",
                verified: true,
                gradientFrom: "#fa709a",
                gradientTo: "#fee140",
                image: "https://images.unsplash.com/photo-1593642532400-2682810df593?auto=format&fit=crop&w=900&q=85"
            },
            {
                id: 5,
                title: "Meeting Room - 6 Seater",
                type: "space",
                category: "spaces",
                price: 300,
                unit: "/hour",
                location: "Bangalore, Brickwork",
                distance: "2.3 km",
                rating: 4.8,
                reviews: 42,
                description: "Professional meeting space with projector, whiteboard, and high-speed internet. Perfect for client meetings or team sessions.",
                owner: "Vikram M.",
                ownerInitial: "V",
                verified: true,
                gradientFrom: "#a8edea",
                gradientTo: "#fed6e3",
                image: "https://content.booqablecdn.com/uploads/6013dd95a10f2c7e2dbe431c0209d7ec/photo/photo/e6d2a819-06c4-429b-83c6-adaa6bda6544/1743926907-231343336637404-0130-1169/upload.jpeg"
            },
            {
                id: 6,
                title: "Python & ML Textbooks Bundle",
                type: "item",
                category: "books",
                price: 80,
                unit: "/month",
                location: "Bangalore, Jayanagar",
                distance: "2.8 km",
                rating: 4.9,
                reviews: 15,
                description: "Set of 3 books: Introduction to Python, Machine Learning Basics, and Deep Learning. Excellent for AI/ML learning.",
                owner: "Ananya P.",
                ownerInitial: "A",
                verified: true,
                gradientFrom: "#ff9a9e",
                gradientTo: "#fecfef",
                image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=85"
            }
        ];

        let listings = [...baseListings];
        let bookings = [];
        let myListings = [];
        let reviews = {};
        let allUsers = [];
        let verificationQueue = [];
        let disputes = [];

        // =================== BACKEND (claude.ai db capability; falls back to in-memory demo) ===================
        let dbm = null, viewerId = null, isAdmin = true;
        let dbListings = [], dbBookings = [], dbReviews = [], dbUsers = [];

        const acctId = email => 'u_' + Array.from(new TextEncoder().encode(email.trim().toLowerCase())).map(x => x.toString(16).padStart(2, '0')).join('');
        function persist(col, obj) {
            if (!dbm) return;
            const data = JSON.parse(JSON.stringify(obj)); delete data._id;
            dbm.doc(col + '/' + String(obj.id)).set(data).catch(() => showNotification('Could not save changes', 'error'));
        }
        function unpersist(col, id) {
            if (dbm) dbm.doc(col + '/' + String(id)).delete().catch(() => showNotification('Could not delete', 'error'));
        }
        function applyRemote() {
            listings = [...baseListings, ...dbListings];
            bookings = dbBookings; allUsers = dbUsers;
            verificationQueue = dbUsers.filter(u => u.verified === false).map(u => ({ userId: u.id, name: u.name, email: u.email, status: 'pending' }));
            reviews = {};
            dbReviews.forEach(r => (reviews[r.listingId] = reviews[r.listingId] || []).push(r));
            if (currentUser) {
                const me = dbUsers.find(u => u.id === currentUser.id);
                if (me) Object.assign(currentUser, me);
                myListings = listings.filter(l => l.ownerId === currentUser.id);
                renderBookings(); renderMyListings(); updateDashboard();
                if (currentPage === 'admin') updateAdmin();
            }
            renderListings();
        }
        async function initBackend() {
            try {
                if (!window.claude || !claude.use) return;
                const [d, u] = await Promise.all([claude.use('db'), claude.use('user')]);
                if (!d || !u) return;
                viewerId = await u.id();
                if (!viewerId) return;
                isAdmin = await u.isOwner();
                dbm = d;
                const sub = (c, set) => d.collection(c).onSnapshot(sn => { set(sn.docs.map(x => x.data())); applyRemote(); }, () => {});
                sub('nv_listings', a => dbListings = a);
                sub('nv_bookings', a => dbBookings = a);
                sub('nv_reviews', a => dbReviews = a);
                sub('nv_users', a => dbUsers = a);
                const saved = localStorage.getItem('nevara_acct');
                if (saved) {
                    const sn = await d.doc('nv_users/' + saved).get();
                    if (sn.exists && sn.data().viewer === viewerId) finishLogin(sn.data(), true);
                }
            } catch (e) { /* stay in demo mode */ }
        }
        function finishLogin(u, silent) {
            currentUser = { ...u };
            try { if (dbm) localStorage.setItem('nevara_acct', u.id); } catch (e) {}
            document.body.classList.remove('auth-required');
            updateUserAvatar();
            const adminNav = [...document.querySelectorAll('.sidebar .nav-item')].find(n => n.textContent.trim() === 'Admin Panel');
            if (adminNav) adminNav.style.display = isAdmin ? '' : 'none';
            applyRemote();
            goToPage('home');
            if (!silent) showNotification(u.verified === true ? 'Logged in successfully!' : 'Logged in. Your identity verification is pending.', 'success');
        }
        async function loginDb(email, password) {
            const sn = await dbm.doc('nv_users/' + acctId(email)).get();
            if (!sn.exists || sn.data().viewer !== viewerId) {
                document.getElementById('login-email-error').textContent = 'No account found for this email. Please sign up.';
                return;
            }
            finishLogin(sn.data());
        }
        async function signupDb(name, email, phone) {
            const id = acctId(email);
            const sn = await dbm.doc('nv_users/' + id).get();
            if (sn.exists) { document.getElementById('signup-email-error').textContent = 'An account with this email already exists'; return; }
            const u = { id, name, email, initial: name.charAt(0).toUpperCase(), verified: false, createdAt: new Date().toISOString(), viewer: viewerId };
            await dbm.doc('nv_users/' + id).set(u);
            finishLogin(u, true);
            showNotification('Account created! Please verify your identity.', 'warning');
        }

        // =================== AUTH FUNCTIONS ===================
        function toggleAuthForm() {
            const loginForm = document.getElementById('login-form');
            const signupForm = document.getElementById('signup-form');
            loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
            signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
        }

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function handleLogin() {
            if (!dbm) return handleLoginLocal();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
            let ok = true;
            if (!validateEmail(email)) { document.getElementById('login-email-error').textContent = 'Please enter a valid email'; ok = false; }
            if (password.length < 6) { document.getElementById('login-password-error').textContent = 'Password must be at least 6 characters'; ok = false; }
            if (ok) loginDb(email, password).catch(() => showNotification('Login failed. Please try again.', 'error'));
        }

        function handleLoginLocal() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            let valid = true;

            document.querySelectorAll('.form-error').forEach(e => e.textContent = '');

            if (!validateEmail(email)) {
                document.getElementById('login-email-error').textContent = 'Please enter a valid email';
                valid = false;
            }

            if (password.length < 6) {
                document.getElementById('login-password-error').textContent = 'Password must be at least 6 characters';
                valid = false;
            }

            if (valid) {
                currentUser = {
                    id: 'user_' + Date.now(),
                    name: email.split('@')[0],
                    email,
                    initial: email.charAt(0).toUpperCase(),
                    verified: true,
                    createdAt: new Date().toISOString()
                };
                
                allUsers.push(currentUser);
                document.body.classList.remove('auth-required');
                updateUserAvatar();
                goToPage('home');
                showNotification('Logged in successfully!', 'success');
            }
        }

        function handleSignup() {
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const phone = document.getElementById('signup-phone').value;
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            let valid = true;

            document.querySelectorAll('.form-error').forEach(e => e.textContent = '');

            if (name.length < 3) {
                document.getElementById('signup-name-error').textContent = 'Name must be at least 3 characters';
                valid = false;
            }

            if (!validateEmail(email)) {
                document.getElementById('signup-email-error').textContent = 'Please enter a valid email';
                valid = false;
            }

            if (phone.length < 10) {
                document.getElementById('signup-phone-error').textContent = 'Please enter a valid phone number';
                valid = false;
            }

            if (password.length < 6) {
                document.getElementById('signup-password-error').textContent = 'Password must be at least 6 characters';
                valid = false;
            }

            if (password !== confirm) {
                document.getElementById('signup-confirm-error').textContent = 'Passwords do not match';
                valid = false;
            }

            if (valid && dbm) {
                signupDb(name, email, phone).catch(() => showNotification('Signup failed. Please try again.', 'error'));
            } else if (valid) {
                currentUser = {
                    id: 'user_' + Date.now(),
                    name,
                    email,
                    phone,
                    initial: name.charAt(0).toUpperCase(),
                    verified: false,
                    createdAt: new Date().toISOString()
                };

                allUsers.push(currentUser);
                verificationQueue.push({
                    userId: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    status: 'pending'
                });

                document.body.classList.remove('auth-required');
                updateUserAvatar();
                goToPage('home');
                showNotification('Account created! Please verify your identity.', 'warning');
            }
        }

        function handleLogout() {
            openModal('logout-modal');
        }

        function confirmLogout() {
            closeModal('logout-modal');
            currentUser = null; myListings = [];
            try { localStorage.removeItem('nevara_acct'); } catch (e) {}
            document.body.classList.add('auth-required');
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('signup-form').style.display = 'none';
            ['login-email', 'login-password'].forEach(id => document.getElementById(id).value = '');
            goToPage('home');
            showNotification('Logged out successfully', 'success');
        }

        function updateUserAvatar() {
            const avatar = document.getElementById('user-avatar');
            if (currentUser) {
                avatar.textContent = currentUser.initial;
            }
        }

        // =================== NAVIGATION ===================
        function goToPage(pageName) {
            if (pageName === 'admin' && !isAdmin) { showNotification('Admin access is limited to the site owner', 'error'); return; }
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageName).classList.add('active');
            currentPage = pageName;

            const titles = {
                home: 'NEVARA',
                browse: 'Browse Listings',
                detail: 'Listing Details',
                list: 'List Item',
                dashboard: 'Your Dashboard',
                bookings: 'My Bookings',
                listings: 'My Listings',
                admin: 'Admin Panel'
            };
            document.getElementById('page-title').textContent = titles[pageName] || 'NEVARA';

            // Keep sidebar highlight in sync
            const navMap = { home: 0, browse: 2, detail: 2, dashboard: 5, bookings: 6, listings: 7, list: 8, admin: 9 };
            document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
            const navItems = document.querySelectorAll('.sidebar .nav-item');
            if (navMap[pageName] !== undefined && navItems[navMap[pageName]]) {
                navItems[navMap[pageName]].classList.add('active');
            }

            // Refresh data for the page being opened
            if (currentUser) {
                if (pageName === 'dashboard') updateDashboard();
                if (pageName === 'bookings') renderBookings();
                if (pageName === 'listings') renderMyListings();
                if (pageName === 'admin') updateAdmin();
            }
            if (pageName === 'browse') renderListings();
            const contentEl = document.querySelector('.content');
            if (contentEl) contentEl.scrollTop = 0;
            window.scrollTo(0, 0);
        }

        // =================== SEARCH & FILTER ===================
        function performSearch() {
            const what = document.getElementById('search-what').value.toLowerCase();
            const radius = parseInt(document.getElementById('search-radius').value) || 5;
            const date = document.getElementById('search-date').value;

            searchQuery = what.trim();
            browseFilter = 'all';
            syncFilterButtons('browse', 'all');

            goToPage('browse');
            renderListings();
            const found = getVisibleListings().length;
            showNotification(`Found ${found} listings`, 'success');
        }

        // Highlight the matching filter button inside a given page
        function syncFilterButtons(pageId, value) {
            document.querySelectorAll(`#${pageId} .filter`).forEach(f => {
                const m = (f.getAttribute('onclick') || '').match(/\('([^']+)'\)/);
                f.classList.toggle('active', !!m && m[1] === value);
            });
        }

        function getVisibleListings() {
            let filtered = listings;
            if (browseFilter !== 'all') {
                // 'items' / 'spaces' are the plural filter names for type 'item' / 'space'
                const typeMap = { items: 'item', spaces: 'space' };
                const t = typeMap[browseFilter] || browseFilter;
                filtered = filtered.filter(l => l.type === t || l.category === browseFilter);
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filtered = filtered.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
            }
            return filtered;
        }

        function filterListings(category) {
            browseFilter = category;
            searchQuery = '';
            renderListings();
            syncFilterButtons('browse', category);
        }

        function filterAndBrowse(type) {
            browseFilter = type;
            searchQuery = '';
            goToPage('browse');
            syncFilterButtons('browse', type);
            renderListings();
        }

        function filterBookings(status) {
            bookingFilter = status;
            renderBookings();
            syncFilterButtons('bookings', status);
        }

        // =================== RENDERING ===================
        function generateImageSVG(gradient1, gradient2, text) {
            return `<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${gradient1};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${gradient2};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="300" height="180" fill="url(#grad)"/>
                <text x="50%" y="50%" font-size="48" fill="rgba(255,255,255,0.3)" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${text}</text>
            </svg>`;
        }

        function renderListings() {
            const grid = document.getElementById('listings-grid');
            const filtered = getVisibleListings();

            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-secondary);">No listings found</div>';
                return;
            }

            grid.innerHTML = filtered.map(l => `
                <div class="listing-card" onclick="showDetail(${l.id})">
                    <div class="listing-image" style="background: linear-gradient(135deg, ${l.gradientFrom} 0%, ${l.gradientTo} 100%);">
                        ${l.image ? `<img src="${l.image}" alt="${l.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="180" fill="url(#grad${l.id})"/><text x="50%" y="90" font-size="56" fill="rgba(255,255,255,0.2)" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${l.title.substring(0, 2)}</text></svg>`}
                    </div>
                    <div class="listing-info">
                        <div class="listing-title">${l.title}</div>
                        <div class="listing-meta">
                            <span>${l.distance}</span>
                            <span>★ ${l.rating}</span>
                        </div>
                        <div class="listing-price">₹${l.price}<span style="font-size: 0.8rem;">${l.unit}</span></div>
                        <div class="listing-desc">${l.description.substring(0, 60)}...</div>
                    </div>
                </div>
            `).join('');
        }

        function showDetail(id) {
            selectedListingId = id;
            const listing = listings.find(l => l.id === id);
            if (!listing) return;

            const reviewsForListing = reviews[id] || [];

            const detailContent = document.getElementById('detail-content');
            detailContent.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-image" style="background: linear-gradient(135deg, ${listing.gradientFrom} 0%, ${listing.gradientTo} 100%);">
                        ${listing.image ? `<img src="${listing.image}" alt="${listing.title}" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="400" fill="${listing.gradientFrom}"/><text x="50%" y="200" font-size="120" fill="rgba(255,255,255,0.15)" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${listing.title.substring(0, 2)}</text></svg>`}
                    </div>
                    <div>
                        <h1>${listing.title}</h1>
                        <div class="meta-grid">
                            <div class="meta-item">
                                <div class="meta-label">Location</div>
                                <div class="meta-value">${listing.location}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Rating</div>
                                <div class="meta-value">★ ${listing.rating} (${listing.reviews})</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Type</div>
                                <div class="meta-value">${listing.type === 'item' ? 'Item' : 'Space'}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Distance</div>
                                <div class="meta-value">${listing.distance}</div>
                            </div>
                        </div>
                        <div class="detail-price">₹${listing.price}${listing.unit}</div>
                        <div class="detail-desc">${listing.description}</div>
                        <button class="btn btn-primary btn-lg" onclick="openModal('booking-modal')" style="width: 100%; margin: 2rem 0;">Book Now</button>

                        <div class="owner-card">
                            <div class="owner-header">
                                <div class="owner-avatar">${listing.ownerInitial}</div>
                                <div>
                                    <div class="owner-name">${listing.owner}</div>
                                    <div class="owner-status">${listing.verified ? '✓ Verified' : 'User'}</div>
                                </div>
                            </div>
                            <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="contactOwner(${listing.id})">Contact Owner</button>
                        </div>
                    </div>
                </div>

                <div class="reviews-section">
                    <h3>Reviews (${reviewsForListing.length})</h3>
                    ${reviewsForListing.length === 0 ? '<p style="color: var(--text-secondary);">No reviews yet</p>' : ''}
                    ${reviewsForListing.map(r => `
                        <div class="review-item">
                            <div class="review-header">
                                <div class="review-author">${r.author}</div>
                                <div style="display: flex; gap: 1rem;">
                                    <span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                                    <span class="review-date">${new Date(r.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div class="review-text">${r.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            goToPage('detail');
        }

        function renderBookings() {
            const list = document.getElementById('bookings-list');
            if (!currentUser) { list.innerHTML = ''; return; }
            let filtered = bookings.filter(b => b.userId === currentUser.id || b.ownerId === currentUser.id);

            if (bookingFilter !== 'all') {
                filtered = filtered.filter(b => b.status === bookingFilter);
            }

            if (filtered.length === 0) {
                list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No bookings yet</div>';
                return;
            }

            list.innerHTML = filtered.map(b => {
                const listing = listings.find(l => l.id === b.listingId);
                const isCompleted = b.status === 'completed';
                return `
                    <div class="item-row">
                        <div class="item-details">
                            <h4>${listing?.title || 'Unknown'}</h4>
                            <div class="item-status">${b.ownerId === currentUser.id ? 'Received • ' : ''}${b.from} to ${b.to} • ₹${b.total}</div>
                        </div>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <span class="status-badge status-${b.status}">${b.status}</span>
                            ${b.status === 'confirmed' ? `<button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="completeBooking('${b.id}')">Mark Completed</button>` : ''}
                            ${isCompleted && b.userId === currentUser.id ? `<button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="openReviewModal(${b.listingId})">Leave Review</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderMyListings() {
            const grid = document.getElementById('my-listings-grid');
            grid.innerHTML = myListings.map(l => `
                <div class="listing-card">
                    <div class="listing-image" style="background: linear-gradient(135deg, ${l.gradientFrom} 0%, ${l.gradientTo} 100%);">
                        <svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">
                            <rect width="300" height="180" fill="url(#myListGrad)"/>
                            <text x="50%" y="90" font-size="56" fill="rgba(255,255,255,0.2)" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${l.title.substring(0, 2)}</text>
                        </svg>
                    </div>
                    <div class="listing-info">
                        <div class="listing-title">${l.title}</div>
                        <div class="listing-meta">
                            <span>${l.location}</span>
                            <span>${l.reviews || 0} reviews</span>
                        </div>
                        <div class="listing-price">₹${l.price}${l.unit}</div>
                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="flex: 1; padding: 0.5rem; font-size: 0.85rem;" onclick="editListing(${l.id})">Edit</button>
                            <button class="btn btn-secondary" style="flex: 1; padding: 0.5rem; font-size: 0.85rem;" onclick="deleteListing(${l.id})">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // =================== BOOKING ===================
        function completeBooking(bookingId) {
            const b = bookings.find(x => x.id === bookingId);
            if (b) {
                b.status = 'completed';
                persist('nv_bookings', b);
                renderBookings();
                updateDashboard();
                showNotification('Booking marked as completed. You can now leave a review.', 'success');
            }
        }

        function confirmBooking() {
            const from = document.getElementById('booking-from').value;
            const to = document.getElementById('booking-to').value;
            const notes = document.getElementById('booking-notes').value;

            if (!from || !to) {
                showNotification('Please select dates', 'error');
                return;
            }

            const listing = listings.find(l => l.id === selectedListingId);
            if (listing.ownerId && listing.ownerId === currentUser.id) { showNotification('You cannot book your own listing', 'error'); return; }
            const fromDate = new Date(from);
            const toDate = new Date(to);
            if (toDate < fromDate) {
                showNotification('End date must be on or after the start date', 'error');
                return;
            }
            const days = Math.max(1, Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)));
            const clash = bookings.some(b => b.listingId === selectedListingId && b.status !== 'completed' && from <= b.to && to >= b.from);
            if (clash) { showNotification('Those dates are already booked. Please pick other dates.', 'error'); return; }
            const subtotal = listing.price * days;
            const fee = Math.floor(subtotal * 0.1);
            const total = subtotal + fee;

            const booking = {
                id: 'booking_' + Date.now(),
                userId: currentUser.id,
                listingId: selectedListingId,
                ownerId: listing.ownerId || null,
                from,
                to,
                notes,
                subtotal,
                fee,
                total,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            };

            bookings.push(booking);
            persist('nv_bookings', booking);
            document.getElementById('booking-from').value = '';
            document.getElementById('booking-to').value = '';
            document.getElementById('booking-notes').value = '';
            closeModal('booking-modal');
            showNotification('Booking confirmed! Check your bookings.', 'success');
            goToPage('bookings');
            renderBookings();
        }

        // =================== LISTING ===================
        function submitListing() {
            const title = document.getElementById('listTitle').value;
            const type = document.getElementById('listType').value;
            const price = document.getElementById('listPrice').value;
            const unit = document.getElementById('listUnit').value;
            const area = document.getElementById('listArea').value;
            const desc = document.getElementById('listDesc').value;

            if (!title || !price || !area) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            const gradients = [
                ['#667eea', '#764ba2'],
                ['#f093fb', '#f5576c'],
                ['#4facfe', '#00f2fe'],
                ['#fa709a', '#fee140'],
                ['#a8edea', '#fed6e3'],
                ['#ff9a9e', '#fecfef']
            ];
            const grad = gradients[Math.floor(Math.random() * gradients.length)];

            const newListing = {
                id: Date.now(),
                ownerId: currentUser.id,
                title,
                type,
                category: type === 'item' ? 'equipment' : 'spaces',
                price: parseFloat(price),
                unit,
                location: area,
                distance: '0 km',
                rating: 5,
                reviews: 0,
                description: desc || 'Description coming soon.',
                owner: currentUser.name,
                ownerInitial: currentUser.initial,
                verified: currentUser.verified === true,
                gradientFrom: grad[0],
                gradientTo: grad[1]
            };

            if (editingListingId !== null) {
                const existing = listings.find(l => l.id === editingListingId);
                if (existing) {
                    Object.assign(existing, { title, type, category: newListing.category, price: newListing.price, unit, location: area, description: desc || existing.description });
                }
                persist('nv_listings', existing);
                editingListingId = null;
                document.querySelector('#list h2').textContent = 'Turn Unused Into Useful';
                document.querySelector('#list .btn-lg').textContent = 'List Now';
                document.getElementById('listTitle').value = '';
                document.getElementById('listDesc').value = '';
                document.getElementById('listPrice').value = '';
                document.getElementById('listArea').value = '';
                showNotification('Listing updated successfully!', 'success');
                goToPage('listings');
                return;
            }
            myListings.push(newListing);
            listings.push(newListing);
            persist('nv_listings', newListing);

            document.getElementById('listTitle').value = '';
            document.getElementById('listDesc').value = '';
            document.getElementById('listPrice').value = '';
            document.getElementById('listArea').value = '';

            showNotification('Listing created successfully!', 'success');
            renderMyListings();
            goToPage('dashboard');
        }

        function editListing(id) {
            const l = listings.find(x => x.id === id);
            if (!l) return;
            editingListingId = id;
            document.getElementById('listType').value = l.type;
            document.getElementById('listTitle').value = l.title;
            document.getElementById('listDesc').value = l.description;
            document.getElementById('listPrice').value = l.price;
            document.getElementById('listUnit').value = l.unit;
            document.getElementById('listArea').value = l.location;
            goToPage('list');
            document.querySelector('#list h2').textContent = 'Edit Your Listing';
            document.querySelector('#list .btn-lg').textContent = 'Save Changes';
        }

        function deleteListing(id) {
            myListings = myListings.filter(l => l.id !== id);
            listings = listings.filter(l => l.id !== id);
            unpersist('nv_listings', id);
            renderMyListings();
            renderListings();
            updateDashboard();
            showNotification('Listing deleted', 'warning');
        }

        function contactOwner(id) {
            const l = listings.find(x => x.id === id);
            if (l) showNotification(`Message sent to ${l.owner}. They will reply soon.`, 'success');
        }

        // =================== DASHBOARD ===================
        function updateDashboard() {
            if (!currentUser) return;
            const mine = bookings.filter(b => b.ownerId === currentUser.id && b.status !== 'pending');
            const myIds = myListings.map(l => l.id);
            const rs = myIds.flatMap(id => reviews[id] || []);
            document.getElementById('stat-listings').textContent = myListings.length;
            document.getElementById('stat-earnings').textContent = '₹' + mine.reduce((t, b) => t + b.subtotal, 0);
            document.getElementById('stat-rating').textContent = rs.length ? (rs.reduce((t, r) => t + r.rating, 0) / rs.length).toFixed(1) : '-';
            const rented = bookings.filter(b => b.userId === currentUser.id);
            document.getElementById('stat-completed').textContent = rented.filter(b => b.status === 'completed').length;
            document.getElementById('stat-upcoming').textContent = rented.filter(b => b.status === 'confirmed').length;
            document.getElementById('stat-since').textContent = new Date(currentUser.createdAt).toLocaleDateString();
        }

        // =================== ADMIN ===================
        function updateAdmin() {
            if (!currentUser) return;
            document.getElementById('admin-users').textContent = allUsers.length;
            document.getElementById('admin-listings').textContent = listings.length;
            document.getElementById('admin-pending').textContent = verificationQueue.length;
            document.getElementById('admin-revenue').textContent = '₹' + (bookings.reduce((sum, b) => sum + b.fee, 0));

            const verQueue = document.getElementById('verification-queue');
            verQueue.innerHTML = verificationQueue.map(v => `
                <div class="item-row">
                    <div class="item-details">
                        <h4>${v.name}</h4>
                        <div class="item-status">${v.email}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="approveUser('${v.userId}')">Approve</button>
                        <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem; color: var(--danger); border-color: var(--danger);" onclick="rejectUser('${v.userId}')">Reject</button>
                    </div>
                </div>
            `).join('');

            const reportsList = document.getElementById('reports-list');
            reportsList.innerHTML = `
                <div class="item-row">
                    <div class="item-details">
                        <h4>Item Damage Report</h4>
                        <div class="item-status">Booking #1: Camera returned damaged</div>
                    </div>
                    <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="handleDispute()">Review</button>
                </div>
                <div class="item-row">
                    <div class="item-details">
                        <h4>Late Return Report</h4>
                        <div class="item-status">Booking #2: Item not returned on time</div>
                    </div>
                    <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="handleDispute()">Review</button>
                </div>
            `;
        }

        function approveUser(userId) {
            const user = allUsers.find(u => u.id === userId);
            if (user) {
                user.verified = true;
                if (dbm) dbm.doc('nv_users/' + userId).update({ verified: true });
                verificationQueue = verificationQueue.filter(v => v.userId !== userId);
                updateAdmin();
                showNotification(`${user.name} verified successfully!`, 'success');
            }
        }

        function rejectUser(userId) {
            if (dbm) dbm.doc('nv_users/' + userId).update({ verified: 'rejected' });
            verificationQueue = verificationQueue.filter(v => v.userId !== userId);
            updateAdmin();
            showNotification('User verification rejected', 'warning');
        }

        function handleDispute() {
            showNotification('Dispute investigation started', 'warning');
        }

        // =================== REVIEWS ===================
        function openReviewModal(listingId) {
            selectedListingId = listingId;
            openModal('review-modal');
        }

        function submitReview() {
            const rating = parseInt(document.getElementById('star-rating').getAttribute('data-selected')) || 5;
            const text = document.getElementById('review-text').value;

            if (!text) {
                showNotification('Please write a review', 'error');
                return;
            }

            if (!reviews[selectedListingId]) {
                reviews[selectedListingId] = [];
            }

            const rv = {
                id: 'r_' + Date.now(),
                listingId: selectedListingId,
                author: currentUser.name,
                rating,
                text,
                date: new Date().toISOString()
            };
            reviews[selectedListingId].push(rv);
            persist('nv_reviews', rv);

            document.getElementById('review-text').value = '';
            document.getElementById('star-rating').setAttribute('data-selected', '5');
            document.querySelectorAll('#star-rating [data-rating]').forEach(st => st.style.color = '');
            closeModal('review-modal');
            showNotification('Review submitted! Thank you', 'success');
        }

        // =================== MODAL ===================
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
            
            if (modalId === 'booking-modal') {
                const listing = listings.find(l => l.id === selectedListingId);
                document.getElementById('booking-subtotal').textContent = '₹' + listing.price;
                document.getElementById('booking-fee').textContent = '₹' + Math.floor(listing.price * 0.1);
                document.getElementById('booking-total').textContent = '₹' + Math.floor(listing.price * 1.1);
            }
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        // Avatar click -> profile toast
        function showProfile() {
            if (!currentUser) return;
            showNotification(`${currentUser.name} • ${currentUser.email}`, 'success');
        }

        // =================== NOTIFICATIONS ===================
        function showNotification(message, type = 'success') {
            const container = document.getElementById('notification-container');
            const notif = document.createElement('div');
            notif.className = `notification ${type}`;
            notif.textContent = message;
            container.appendChild(notif);

            setTimeout(() => notif.remove(), 4000);
        }

        function toggleNotifications() {
            showNotification(notifications.length ? `You have ${notifications.length} notifications` : 'You have no new notifications', 'success');
        }

        // =================== INITIALIZATION ===================
        document.addEventListener('DOMContentLoaded', () => {
            // Star rating
            const starRating = document.getElementById('star-rating');
            if (starRating) {
                starRating.addEventListener('click', (e) => {
                    const rating = e.target.getAttribute('data-rating');
                    if (rating) {
                        starRating.setAttribute('data-selected', rating);
                        for (let i = 1; i <= 5; i++) {
                            const star = starRating.querySelector(`[data-rating="${i}"]`);
                            if (i <= rating) {
                                star.style.color = 'var(--warning)';
                            } else {
                                star.style.color = 'var(--text-tertiary)';
                            }
                        }
                    }
                });
            }

            renderListings();
            renderBookings();
            renderMyListings();
            updateDashboard();

            initBackend();

            // Enter key submits the auth forms
            ['login-email', 'login-password'].forEach(id => {
                document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
            });
            ['signup-name', 'signup-email', 'signup-phone', 'signup-password', 'signup-confirm'].forEach(id => {
                document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });
            });
        });

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
