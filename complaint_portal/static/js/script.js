document.addEventListener('DOMContentLoaded', function() {
    // API endpoints for interacting with the server
    const API_ENDPOINTS = {
        ADMIN_LOGIN: '/api/admin_login',
        USER_LOGIN: '/api/user_login',
        SAVE_GENERAL_INFO: '/api/save_general_info',
        SAVE_SUSPECT_INFO: '/api/save_suspect_info',
        SEARCH_CASES: '/api/search_cases',
        GET_STATS: '/api/get_stats',
        DOWNLOAD_REPORT: '/api/download_report',
        UPLOAD_DOCUMENT: '/api/upload',
        LOGOUT: '/api/logout',
        CHANGE_PASSWORD: '/api/change_password',
        SAVE_CASE: '/api/save_case',
    };

    // DOM element selectors
    const DOM_IDS = {
        homeIcon: 'home',
        saveBtns: ['save-btn1', 'save-btn2', 'save-btn3', 'save-btn4'],
        submitBtn: 'submit-btn',
        registerBtn: 'register-btn',
        logoutBtn: 'logout-btn',
        searchForm: 'searchForm',
        searchResults: 'search-results',
        passwordInput: 'password',
        togglePassword: 'togglePassword',
        userBtn: 'user-btn',
        adminBtn: 'admin-btn',
        mobileNumbersDiv: 'mobile-numbers',
        addressFieldsDiv: 'address-fields',
        complaintCategory: 'cat-of-complaint',
        subCategory: 'sub-cat-of-complaint',
        customSubCategory: 'custom-sub-cat',
        dateOfComplaint: 'date-of-complaint',
        dateOfIncident: 'date-of-incident',
        forwardDate: 'forward-date',
        timeOfIncident: 'time-of-incident',
        amPm: 'am-pm',
        suspectInfoBtn: 'suspect_info', // Ensure the ID matches the HTML button ID
        generalInfoBtn: 'general_info',
        policeStation: 'police-station',
        investigationOfficer: 'investigation-officer',
        accNoBtn: 'add-acc-btn', // ID for account number button
    };

    // Hardcoded credentials for testing (Remove in production)
    const HARDCODED_CREDENTIALS = {
        username: 'admin',
        password: 'admin123',
    };

    // Cache frequently used DOM elements
    const cachedElements = {};
    function getDOMElement(id) {
        if (!cachedElements[id]) {
            cachedElements[id] = document.getElementById(id);
        }
        return cachedElements[id];
    }

    // Show message utility function
    function showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;
        document.querySelector('.container')?.prepend(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    // API request with authentication
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(`Error ${response.status}: ${errorMessage}`);
            }

            const contentType = response.headers.get('Content-Type');
            return contentType && contentType.includes('application/json') ? await response.json() : {};
        } catch (error) {
            showMessage(error.message, 'error');
            throw error;
        }
    }

    // Update subcategories based on selected category
    function updateSubcategories() {
        const categorySelect = getDOMElement(DOM_IDS.complaintCategory);
        const subcategorySelect = getDOMElement(DOM_IDS.subCategory);
        const customSubcategory = getDOMElement(DOM_IDS.customSubCategory);

        if (!categorySelect || !subcategorySelect) return;

        const selectedCategory = categorySelect.value;
        subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';

        if (selectedCategory === 'other') {
            subcategorySelect.style.display = 'none';
            customSubcategory.style.display = 'block';
            customSubcategory.required = true;
        } else {
            subcategorySelect.style.display = 'block';
            customSubcategory.style.display = 'none';
            customSubcategory.required = false;

            const subcategories = {
                financial: ['Online Task', 'Share/Trading', 'Fedex Parcel', 'MNGL Gas', 'Loan App',
                            'Video Call On Social Media', 'Credit/Debit Card Related', 'Matrimonial Related',
                            'Digital Arrest', 'Insurance', 'Other'],
                'social-media': ['Social Media Account Hack', 'Posting Abusive Content', 'Other'],
            }[selectedCategory] || [];

            subcategories.forEach(subcat => {
                const option = document.createElement('option');
                option.value = subcat.toLowerCase().replace(/\s+/g, '-');
                option.textContent = subcat;
                subcategorySelect.appendChild(option);
            });
        }
    }

    // Sets the current date and time in the respective fields
    function setCurrentDateTime() {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const formattedTime = `${(now.getHours() % 12 || 12).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const amPm = now.getHours() >= 12 ? 'PM' : 'AM';

        ['date-of-complaint', 'date-of-incident', 'forward-date', 'date-from', 'date-to', 'start-date', 'end-date'].forEach(id => {
            const element = getDOMElement(id);
            if (element) element.value = currentDate;
        });

        const timeInput = getDOMElement(DOM_IDS.timeOfIncident);
        const amPmSelect = getDOMElement(DOM_IDS.amPm);
        if (timeInput) timeInput.value = formattedTime;
        if (amPmSelect) amPmSelect.value = amPm;

        updateSubcategories();
    }

    // Handle "Other" option in dropdowns
    function handleOtherOption(selectId, placeholder) {
        const selectElement = getDOMElement(selectId);
        if (selectElement) {
            selectElement.addEventListener('change', function () {
                const selectedValue = selectElement.value;
                if (selectedValue === 'other') {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = placeholder;
                    input.style.width = '95%';

                    // Replace the selected option with the input field
                    const inputWrapper = document.createElement('div');
                    inputWrapper.appendChild(input);
                    selectElement.parentNode.insertBefore(inputWrapper, selectElement.nextSibling);
                    selectElement.style.display = 'none';

                    input.addEventListener('blur', () => {
                        if (!input.value.trim()) {
                            selectElement.style.display = '';
                            inputWrapper.remove();
                        }
                    });
                }
            });
        }
    }

    // Handle login logic
    async function handleLogin(e) {
        e.preventDefault();
        const username = getDOMElement('username').value.trim();
        const password = getDOMElement('password').value.trim();
        const userType = document.querySelector('.tab-btn.active')?.dataset.type;

        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }

        const loginEndpoint = userType === 'admin' ? API_ENDPOINTS.ADMIN_LOGIN : API_ENDPOINTS.USER_LOGIN;
        showMessage('Logging in...', 'info');

        try {
            if (username === HARDCODED_CREDENTIALS.username && password === HARDCODED_CREDENTIALS.password) {
                sessionStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('token', 'dummy-token');
                showMessage('Login successful!', 'success');
                setTimeout(() => window.location.href = './dashboard.html', 1500);
            } else {
                const response = await fetchWithAuth(loginEndpoint, {
                    method: 'POST',
                    body: JSON.stringify({ username, password }),
                });

                if (response.success) {
                    sessionStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('token', response.token);
                    showMessage('Login successful!', 'success');
                    setTimeout(() => window.location.href = './dashboard.html', 1500);
                } else {
                    showMessage('Invalid username or password', 'error');
                }
            }
        } catch (error) {
            showMessage('Login failed. Please try again later.', 'error');
        }
    }

    // Handle logout logic
    async function handleLogout() {
        try {
            await fetchWithAuth(API_ENDPOINTS.LOGOUT, { method: 'POST' });
            sessionStorage.removeItem('isAuthenticated');
            localStorage.removeItem('token');
            showMessage('Logged out successfully', 'success');
            setTimeout(() => window.location.href = './login.html', 1000);
        } catch (error) {
            showMessage('Logout failed.', 'error');
        }
    }

    // Check if the user is authenticated
    function checkAuthentication() {
        if (!sessionStorage.getItem('isAuthenticated')) {
            window.location.href = './login.html';
        }
    }

    // Redirect to the dashboard on home icon click
    function setupHomeIconRedirect() {
        const homeIcons = document.querySelectorAll(`.${DOM_IDS.homeIcon}`);
        homeIcons.forEach(icon => {
            icon.addEventListener('click', () => window.location.href = './dashboard.html');
        });
    }

    // Initialize dashboard page
    async function initializeDashboard() {
        checkAuthentication();
        setupHomeIconRedirect();

        try {
            const stats = {
                totalCases: 50,
                pendingCases: 20,
                resolvedCases: 30
            };

            getDOMElement('total-cases').textContent = stats.totalCases;
            getDOMElement('pending-cases').textContent = stats.pendingCases;
            getDOMElement('resolved-cases').textContent = stats.resolvedCases;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }

        const buttons = {
            'register-btn': './general_info.html',
            'edit-btn': './edit.html',
            'search-btn': './search.html',
            'download-btn': './download.html',
            'upload-btn': './upload.html',
            'logout-btn': './login.html',
        };

        Object.entries(buttons).forEach(([id, path]) => {
            const button = getDOMElement(id);
            if (button) {
                button.addEventListener('click', () => window.location.href = path);
            }
        });
    }

    // Handle dynamic field addition (e.g., mobile numbers, social handles)
    function setupDynamicFields() {
        document.querySelectorAll('.action-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const fieldType = event.target.closest('button').id;
                let container, input, wrapper;

                switch (fieldType) {
                    case 'add-mobile-btn':
                        container = getDOMElement(DOM_IDS.mobileNumbersDiv);
                        input = document.createElement('input');
                        input.type = 'tel';
                        input.className = 'mobile-input';
                        input.placeholder = 'Enter Mobile Number';
                        break;

                    case 'add-handle-btn':
                        container = getDOMElement('social-handles');
                        input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'handle-input';
                        input.placeholder = 'Enter Social Media Handle';
                        break;

                    case 'add-acc-btn':
                        container = document.getElementById('acc.-no.');
                        input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'mobile-input';
                        input.placeholder = 'Enter Bank Acc. No.';
                        break;

                    case 'add-ifc-btn':
                        container = getDOMElement('ifsc-container');
                        input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'ifsc-input';
                        input.placeholder = 'Enter IFSC Code';
                        break;

                    case 'add-description-btn':
                        container = getDOMElement('description-container');
                        input = document.createElement('textarea');
                        input.className = 'description-input';
                        input.placeholder = 'Enter Description';
                        break;

                    default:
                        return;
                }

                wrapper = document.createElement('div');
                wrapper.className = 'dynamic-field-wrapper';

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.style.color = '#f44336';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.fontSize = '16px';
                deleteBtn.onclick = () => wrapper.remove();

                wrapper.appendChild(input);
                wrapper.appendChild(deleteBtn);

                container.appendChild(wrapper);
            });
        });
    }

    // General Info form initialization
    function initializeGeneralInfoForm() {
        checkAuthentication();
        setupHomeIconRedirect();

        const form = getDOMElement('generalInfoForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const formData = new FormData(form);
                const requestData = Object.fromEntries(formData);
                const response = await fetchWithAuth(API_ENDPOINTS.SAVE_GENERAL_INFO, {
                    method: 'POST',
                    body: JSON.stringify(requestData),
                });

                if (response) {
                    localStorage.setItem('case_id', response.caseId || '');
                    showMessage('General Info saved successfully!', 'success');
                    window.location.href = './suspect_info.html';
                } else {
                    showMessage('Failed to save general info.', 'error');
                }
            } catch (error) {
                showMessage('An error occurred while saving general info.', 'error');
            }
        });

        updateSubcategories();
        setCurrentDateTime();

        const categorySelect = getDOMElement(DOM_IDS.complaintCategory);
        if (categorySelect) {
            categorySelect.addEventListener('change', updateSubcategories);
        }

        handleOtherOption(DOM_IDS.policeStation, 'Enter police station');
        handleOtherOption(DOM_IDS.investigationOfficer, 'Enter investigation officer');
    }

    // Suspect Info form initialization
    function initializeSuspectInfoForm() {
        checkAuthentication();
        setupHomeIconRedirect();

        const form = getDOMElement('suspectInfoForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const formData = new FormData(form);
                const requestData = Object.fromEntries(formData);
                const response = await fetchWithAuth(API_ENDPOINTS.SAVE_SUSPECT_INFO, {
                    method: 'POST',
                    body: JSON.stringify(requestData),
                });

                if (response) {
                    showMessage('Suspect info saved successfully!', 'success');
                    window.location.href = './preview.html';
                } else {
                    showMessage('Failed to save suspect info.', 'error');
                }
            } catch (error) {
                showMessage('An error occurred while saving suspect info.', 'error');
            }
        });

        setupDynamicFields();
    }

    // Search page initialization
    function initializeSearchPage() {
        checkAuthentication();
        setupHomeIconRedirect();

        const searchForm = getDOMElement(DOM_IDS.searchForm);
        searchForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(searchForm);
            try {
                const results = await fetchWithAuth(API_ENDPOINTS.SEARCH_CASES, {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(formData)),
                });

                displaySearchResults(results);
            } catch (error) {
                showMessage('Search failed.', 'error');
            }
        });

        handleOtherOption('police-station', 'Enter police station');
        handleOtherOption('investigation-officer', 'Enter investigation officer');
    }

    // Display search results
    function displaySearchResults(results) {
        const resultsContainer = getDOMElement(DOM_IDS.searchResults);
        resultsContainer.innerHTML = '';

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.textContent = `Case ID: ${result.caseId}, Status: ${result.status}`;
            resultsContainer.appendChild(resultItem);
        });
    }

    // File upload page initialization
    function initializeUploadPage() {
        checkAuthentication();
        setupHomeIconRedirect();

        const uploadForm = getDOMElement('upload-form');
        uploadForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            try {
                await fetchWithAuth(API_ENDPOINTS.UPLOAD_DOCUMENT, {
                    method: 'POST',
                    body: formData,
                });

                showMessage('File uploaded successfully!', 'success');
            } catch (error) {
                showMessage('Upload failed.', 'error');
            }
        });
    }

    // Password visibility toggle
    function setupPasswordToggle() {
        const passwordInput = getDOMElement(DOM_IDS.passwordInput);
        const togglePassword = getDOMElement(DOM_IDS.togglePassword);

        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const inputType = passwordInput.getAttribute('type');
                if (inputType === 'password') {
                    passwordInput.setAttribute('type', 'text');
                    togglePassword.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    passwordInput.setAttribute('type', 'password');
                    togglePassword.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        }
    }

    // Toggle between user and admin types
    function setupUserTypeSelection() {
        const userBtn = getDOMElement(DOM_IDS.userBtn);
        const adminBtn = getDOMElement(DOM_IDS.adminBtn);

        if (userBtn && adminBtn) {
            userBtn.addEventListener('click', () => {
                userBtn.classList.add('active');
                adminBtn.classList.remove('active');
            });

            adminBtn.addEventListener('click', () => {
                adminBtn.classList.add('active');
                userBtn.classList.remove('active');
            });
        }
    }

    // Initialize the login page logic
    function initializeLoginPage() {
        const loginForm = getDOMElement('loginForm');
        loginForm?.addEventListener('submit', handleLogin);

        setupPasswordToggle();
        setupUserTypeSelection();
    }

    // Initialize pages based on URL
    const path = window.location.pathname;

    if (path.includes('login.html')) initializeLoginPage();
    else if (path.includes('dashboard.html')) initializeDashboard();
    else if (path.includes('general_info.html')) initializeGeneralInfoForm();
    else if (path.includes('suspect_info.html')) initializeSuspectInfoForm();
    else if (path.includes('search.html')) initializeSearchPage();
    else if (path.includes('upload.html')) initializeUploadPage();

    // Button redirection for General Info and Suspect Info
    const generalInfoButton = getDOMElement(DOM_IDS.generalInfoBtn);
    if (generalInfoButton) {
        generalInfoButton.addEventListener('click', () => {
            window.location.href = './general_info.html';
        });
    }

    const suspectInfoButton = getDOMElement(DOM_IDS.suspectInfoBtn); // Ensure this ID matches the button ID in HTML
    if (suspectInfoButton) {
        suspectInfoButton.addEventListener('click', () => {
            window.location.href = './suspect_info.html'; // Redirect to suspect_info.html
        });
    }

    // Add Account Number Button Functionality
    const accNoBtn = getDOMElement(DOM_IDS.accNoBtn); // Get the account number button
    if (accNoBtn) {
        accNoBtn.addEventListener('click', () => {
            const container = getDOMElement('account-numbers'); // Adjust this div ID as necessary
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'acc-input';
            input.placeholder = 'Enter Bank Acc. No.';

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.onclick = () => inputWrapper.remove(); // Remove input when delete button is clicked

            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'dynamic-field-wrapper';
            inputWrapper.appendChild(input);
            inputWrapper.appendChild(deleteBtn);
            container.appendChild(inputWrapper);
        });
    }

    // Edit Complaint Form Initialization
    function initializeEditComplaintForm() {
        checkAuthentication();
        setupHomeIconRedirect();

        const searchComplaintBtn = getDOMElement('search-complaint-btn');
        const complaintDetails = getDOMElement('complaint-details');
        const searchInput = getDOMElement('complaint-search');

        if (searchComplaintBtn) {
            searchComplaintBtn.addEventListener('click', async () => {
                const complaintNumber = searchInput.value.trim();
                if (!complaintNumber) {
                    showMessage('Please enter a complaint number.', 'error');
                    return;
                }

                try {
                    const response = await fetchWithAuth(`/api/search_complaint/${complaintNumber}`);
                    if (response.complaint) {
                        complaintDetails.style.display = 'block';
                        getDOMElement('victim-name-edit').value = response.complaint.victim_name;
                        getDOMElement('complaint-type-edit').value = response.complaint.complaint_type;
                        getDOMElement('complaint-description-edit').value = response.complaint.description;
                    } else {
                        showMessage('Complaint not found.', 'error');
                    }
                } catch (error) {
                    showMessage('Failed to fetch complaint details.', 'error');
                }
            });
        }

        const updateComplaintBtn = getDOMElement('update-complaint-btn');
        if (updateComplaintBtn) {
            updateComplaintBtn.addEventListener('click', async () => {
                const formData = {
                    victim_name: getDOMElement('victim-name-edit').value,
                    complaint_type: getDOMElement('complaint-type-edit').value,
                    description: getDOMElement('complaint-description-edit').value,
                    complaint_number: searchInput.value.trim(),
                };

                try {
                    const response = await fetchWithAuth(`/api/update_complaint`, {
                        method: 'POST',
                        body: JSON.stringify(formData),
                    });

                    if (response.success) {
                        showMessage('Complaint updated successfully!', 'success');
                    } else {
                        showMessage('Failed to update complaint.', 'error');
                    }
                } catch (error) {
                    showMessage('An error occurred while updating the complaint.', 'error');
                }
            });
        }

        const cancelEditBtn = getDOMElement('cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                searchInput.value = '';
                complaintDetails.style.display = 'none';
                getDOMElement('victim-name-edit').value = '';
                getDOMElement('complaint-type-edit').value = '';
                getDOMElement('complaint-description-edit').value = '';
            });
        }
    }

    // Initialize Edit Complaint Page
    if (path.includes('edit.html')) initializeEditComplaintForm();

    // Initialize Download Page
    function initializeDownloadPage() {
        checkAuthentication();
        setupHomeIconRedirect();

        const applyFilterBtn = getDOMElement('apply-filter');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                // Implement filter logic here
                showMessage('Filter applied successfully!', 'success');
            });
        }

        const downloadPDFBtn = getDOMElement('download-pdf');
        if (downloadPDFBtn) {
            downloadPDFBtn.addEventListener('click', async () => {
                try {
                    const response = await fetchWithAuth(API_ENDPOINTS.DOWNLOAD_REPORT, {
                        method: 'POST',
                        body: JSON.stringify({ format: 'pdf' }),
                    });

                    const blob = new Blob([response], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'report.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } catch (error) {
                    showMessage('Failed to download PDF.', 'error');
                }
            });
        }

        const downloadExcelBtn = getDOMElement('download-excel');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', async () => {
                try {
                    const response = await fetchWithAuth(API_ENDPOINTS.DOWNLOAD_REPORT, {
                        method: 'POST',
                        body: JSON.stringify({ format: 'excel' }),
                    });

                    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'report.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } catch (error) {
                    showMessage('Failed to download Excel.', 'error');
                }
            });
        }
    }

    // Initialize Download Page
    if (path.includes('download.html')) initializeDownloadPage();

    // Check if the current page is the edit complaint page and initialize it
    if (path.includes('edit.html')) initializeEditComplaintForm();
});