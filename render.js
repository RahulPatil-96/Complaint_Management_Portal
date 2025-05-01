document.addEventListener('DOMContentLoaded', () => {
    const currentPage = document.title;

    // Utility functions
    const Utils = {
        redirectTo: (page) => window.electronAPI.navigateToFile(page),
        showNotification: (message, type = 'info') => {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        },
        resetForm: (form) => {
            form.reset();
            const filePreview = form.querySelector('#file-preview');
            if (filePreview) filePreview.innerHTML = '';
        }
    };

    const formatCellValue = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
    
        const stringValue = String(value).trim();
    
        // Clean special characters first (brackets, quotes, slashes)
        let cleanedValue = stringValue.replace(/[\[\]"\/\\]/g, '');
    
        // Check for empty patterns after cleaning
        if (
            cleanedValue === '?' || 
            cleanedValue === '|' || 
            /^(\s*)+$/.test(cleanedValue) ||  // Empty after cleaning
            /^(\\?)+$/.test(cleanedValue)     // Backslash patterns
        ) {
            return '';
        }
    
        // Mobile number pattern detection (works with cleaned values)
        const mobileNumberPattern = /(\d{10,})/g;  // Simplified pattern
        const matches = cleanedValue.match(mobileNumberPattern);
    
        if (matches) {
            return matches.join('<br>');
        }
    
        // Preserve existing line breaks from original value
        const withLineBreaks = stringValue
            .replace(/<br\s*\/?>/gi, '__BR__')
            .replace(/\n/g, '__BR__')
            .replace(/__BR__/g, '<br>');
    
        // Final cleaning of any remaining special characters
        return withLineBreaks.replace(/[\[\]"\/\\]/g, '');
    };

    const createFileButton = (className, text, filePath, onClick) => {
        const button = document.createElement('button');
        button.classList.add(className);
        button.type = 'button';
        button.innerHTML = text === 'View' ? `<i class="fa fa-eye"></i> ${text}` : `<i class="fa fa-trash delete-doc"></i>`;
        button.style.marginRight = '10px';
        button.setAttribute('data-file', filePath);

        if (onClick) {
            button.addEventListener('click', onClick);
        } else {
            button.addEventListener('click', (event) => {
                const filePath = event.target.getAttribute('data-file');
                window.open(filePath, '_blank');
            });
        }
        return button;
    };

      // Handle "Other" option logic
      const handleOtherOption = (selectId, placeholder) => {
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            selectElement.addEventListener('change', function () {
                const selectedValue = selectElement.value;
                const inputElementId = `${selectId}-input`;
                let inputElement = document.getElementById(inputElementId);

                if (selectedValue === 'other') {
                    // Create input field if it doesn't exist
                    if (!inputElement) {
                        inputElement = document.createElement('input');
                        inputElement.type = 'text';
                        inputElement.id = inputElementId;
                        inputElement.placeholder = placeholder;
                        inputElement.style.marginTop = '8px'; // Add spacing for better UI
                        selectElement.parentNode.insertBefore(inputElement, selectElement.nextSibling);
                    }
                    inputElement.style.display = 'block'; // Show the input field
                } else {
                    // Hide or remove the input field if another option is selected
                    if (inputElement) {
                        inputElement.style.display = 'none';
                        inputElement.value = ''; // Clear the input value
                    }
                }
            });
        }
    };

    // Update subcategories based on selected category
    const updateSubcategories = () => {
        const categorySelect = document.getElementById('cat-of-complaint');
        const subcategorySelect = document.getElementById('sub-cat-of-complaint');
        const customSubcategory = document.getElementById('custom-sub-cat');
    
        if (!categorySelect || !subcategorySelect) return;
    
        const selectedCategory = categorySelect.value;
        subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>'; // Reset subcategories
    
        // Default case: show subcategory dropdown
        subcategorySelect.style.display = 'block';
        customSubcategory.style.display = 'none'; // Hide custom input
    
        const subcategories = {
            'Financial Fraud': ['Online Task', 'Share/Trading', 'Fedex Parcel', 'MNGL Gas', 'Loan App', 'Video Call On Social Media', 'Credit/Debit Card Related', 'Matrimonial Related', 'Digital Arrest', 'Insurance', 'Apk download', 'OTP shared', 'Man in the middle', 'OLX purchase/sell', 'Other'],
            'Social Media Related': ['Social Media Account Hack', 'Posting Abusive Content', 'Other'],
        }[selectedCategory] || [];
    
        // Add the subcategories to the dropdown
        subcategories.forEach(subcat => {
            const option = document.createElement('option');
            option.value = subcat.toLowerCase().replace(/\s+/g, ' ');
            option.textContent = subcat;
            subcategorySelect.appendChild(option);
        });
    };

    // Set up tab navigation
    const setupTabNavigation = () => {
        document.querySelectorAll('.tab-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const page = button.dataset.page;
                if (page) {
                   Utils.redirectTo(page);
                } else {
                    console.warn('No page specified in data-page attribute.');
                }
            });
        });
    };

    // Home navigation button handler
    const setupHomeNavigation = () => {
        document.querySelectorAll('.home').forEach((icon) => {
            icon.addEventListener('click', () => {
                Utils.redirectTo('dashboard.html');
                
                // const currentPage = window.location.pathname;
                // if (!currentPage.includes('login.html')) {
                //     Utils.redirectTo('dashboard.html');
                // }
            });
        });
    };    

    // Set the current date and time in the appropriate inputs
    const setCurrentDateTime = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const formattedTime = `${(now.getHours() % 12 || 12).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const amPm = now.getHours() >= 12 ? 'PM' : 'AM';

        ['date-of-complaint', 'date-of-incident', 'forward-date'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = currentDate;
        });

        const timeInput = document.getElementById('time');
        const amPmSelect = document.getElementById('am-pm');
        if (timeInput) timeInput.value = formattedTime;
        if (amPmSelect) amPmSelect.value = amPm;
    };

    // Setup login page logic
    const setupLoginPage = () => {
        const loginForm = document.getElementById('loginForm');
        const passwordToggle = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        const userTypeButtons = document.querySelectorAll('.tab-btn');
        const rememberMeCheckbox = document.getElementById('rememberMe');

        // Get user credentials from localStorage if available
        const savedUsername = localStorage.getItem('username');
        const savedPassword = localStorage.getItem('password');
        
        // Pre-fill login form if credentials are found
        if (savedUsername) {
            document.getElementById('username').value = savedUsername;
        }
        if (savedPassword) {
            document.getElementById('password').value = savedPassword;
            rememberMeCheckbox.checked = true; // Check the "Remember Me" checkbox
        }

        userTypeButtons.forEach((button) => {
            button.addEventListener('click', function () {
                userTypeButtons.forEach((btn) => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });

        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            passwordToggle.classList.toggle('fa-eye');
            passwordToggle.classList.toggle('fa-eye-slash');
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const userType = document.querySelector('.tab-btn.active').dataset.type;

            try {
                const result = await window.electronAPI.login({ username, password, userType });
                if (result.success) Utils.redirectTo('dashboard.html');
                else Utils.showNotification(result.message, 'error');
            } catch (error) {
                Utils.showNotification('Login failed. Please try again.', 'error');
            }
        });
    };

    // Setup the dashboard page
    const setupDashboardPage = () => {
        document.getElementById('register-btn').dataset.page = 'register.html';
        document.getElementById('edit-btn').dataset.page = 'edit.html';
        document.getElementById('search-btn').dataset.page = 'search.html';

        const loadDashboardStats = async () => {
            try {
                const stats = await window.electronAPI.fetchDashboardStats();
                document.getElementById('total-cases').textContent = stats.totalCases;
                document.getElementById('pending-cases').textContent = stats.pendingCases;
                document.getElementById('resolved-cases').textContent = stats.resolvedCases;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        };       

        const setupLogoutButton = () => {
            const logoutButton = document.getElementById('logout-btn');
            if (logoutButton) {
                logoutButton.addEventListener('click', () => {
                    window.location.href = 'login.html';
                });
            }
        };

        loadDashboardStats();
        setupLogoutButton();
    };

    const setupRegisterPage = () => {
        const RegisterForm = document.getElementById('registerForm');
        const fileUpload = document.getElementById('file-upload');
        const filePreview = document.getElementById('file-preview'); // Assuming you have a file preview container
    
        let filePath = null;
        let fileName = null;
    
        // Function to handle "other" option input fields
        handleOtherOption('police-station', 'Enter police station name');
        handleOtherOption('investigation-officer', 'Enter officer name');
        handleOtherOption('cat-of-complaint', 'Enter category of complaint');
        handleOtherOption('sub-cat-of-complaint', 'Enter subcategory of complaint');
    
        // Update subcategories based on category selection
        updateSubcategories();
        const categorySelect = document.getElementById('cat-of-complaint');
        if (categorySelect) {
            categorySelect.addEventListener('change', updateSubcategories);
        }
    
        // Handle form submission
        RegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
    
            // Collecting form data
            const formData = {
                victimName: document.getElementById('victim-name').value,
                victimGender: document.getElementById('victim-gender').value,
                victimAge: document.getElementById('victim-age').value,
                victimEmail: document.getElementById('victim-email').value,
                victimMobileNumbers: JSON.stringify(Array.from(document.querySelectorAll('#victim-mobile-numbers input.mobile-input')).map(input => input.value).filter(value => value.trim() !== '')), // Ensure no empty values are included
                acknowledgmentNo: document.getElementById('ack-no').value,
                cctnsNo: document.getElementById('cctns-no').value,
                firNo: document.getElementById('fir-no').value,
                dateOfComplaint: document.getElementById('date-of-complaint').value,
                dateOfIncident: document.getElementById('date-of-incident').value,
                time: `${document.getElementById('time').value} ${document.getElementById('am-pm').value}`,
                categoryOfComplaint: document.getElementById('cat-of-complaint').value === 'other' ? document.getElementById('cat-of-complaint-input').value : document.getElementById('cat-of-complaint').value,
                subCategoryOfComplaint: document.getElementById('sub-cat-of-complaint').value === 'other' ? document.getElementById('sub-cat-of-complaint-input').value : document.getElementById('sub-cat-of-complaint').value,
                policeStation: document.getElementById('police-station').value === 'other' ? document.getElementById('police-station-input').value : document.getElementById('police-station').value,
                investigationOfficer: document.getElementById('investigation-officer').value === 'other' ? document.getElementById('investigation-officer-input').value : document.getElementById('investigation-officer').value,
                lostAmount: document.getElementById('lost-amt').value,
                lienAmount: document.getElementById('lien-amt').value,
                itAct: document.getElementById('it-act').value,
                bns: document.getElementById('bns').value,
                actionTaken: document.getElementById('action').value,
                forwardDate: document.getElementById('action').value === 'Forward To PS' ? document.getElementById('forward-date').value : '', // Save forward date only if action is "Forward To PS"
                outNo: document.getElementById('out-no').value,
                suspectName: document.getElementById('suspect-name').value,
                suspectGender: document.getElementById('suspect-gender').value,
                suspectAge: document.getElementById('suspect-age').value,
                suspectEmail: document.getElementById('suspect-email').value,
                suspectMobileNumbers: JSON.stringify(Array.from(document.querySelectorAll('#mobile-numbers input')).map(input => input.value).filter(value => value.trim() !== '')), // Ensure no empty values are included
                suspectSocialHandles: JSON.stringify(Array.from(document.querySelectorAll('#social-handles input')).map(input => input.value)),
                suspectAccNo: JSON.stringify(Array.from(document.querySelectorAll('#acc-no input')).map(input => input.value)),
                ifscCode: JSON.stringify(Array.from(document.querySelectorAll('#ifsc-code input')).map(input => input.value)),
                suspectAddress: document.getElementById('suspect_address').value,
                Description: document.getElementById('description').value,
                fileName: fileName || '', // Use file name or empty if no file
                filePath: filePath || '', // Use file path or empty if no file
            };
            console.log("form data before insertion:", formData);
    
            try {
                // Call the Electron API to save the complaint
                const result = await window.electronAPI.saveComplaint(formData);
                if (result.success) {
                    Utils.showNotification('Complaint saved successfully!', 'success');
                    setTimeout(() => Utils.redirectTo('dashboard.html'), 300);

                } else {
                    Utils.showNotification(result.message, 'error');
                }
            } catch (error) {
                Utils.showNotification('Failed to save complaint.', 'error');
            }
        });
    
        // File upload handler
        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Update file details only when a new file is uploaded
                filePath = file.path;
                fileName = file.name;
    
                // Create and show the preview buttons
                const viewDocButton = createFileButton('view-doc', 'View', file.path);
                const deleteDocButton = createFileButton('delete-case', 'Delete', file.path, () => {
                    // Reset file details when the file is deleted
                    filePreview.innerHTML = '';
                    fileUpload.value = ''; // Reset the file input
                    filePath = null; // Reset file path
                    fileName = null; // Reset file name
                    Utils.showNotification('Document deleted successfully!', 'success');
                });
    
                // Clear any previous file preview and display new buttons
                filePreview.innerHTML = '';
                filePreview.appendChild(viewDocButton);
                filePreview.appendChild(deleteDocButton);
            }
        });
    
        // Function to add dynamic input fields
        function addInputField(buttonId, containerId, inputType, className, placeholder) {
            document.getElementById(buttonId).addEventListener('click', () => {
                const container = document.getElementById(containerId);
    
                const newInput = inputType === 'textarea' ? document.createElement('textarea') : document.createElement('input');
                newInput.type = inputType === 'textarea' ? 'text' : 'tel'; // Default to 'tel' for mobile input
                newInput.classList.add(className);
                newInput.placeholder = placeholder;
    
                // Ensure textarea has proper size
                if (inputType === 'textarea') {
                    newInput.style.width = '100%';
                    newInput.style.height = '100px';
                    newInput.style.resize = 'vertical'; // Allow vertical resizing
                }
    
                // Create the delete icon
                const deleteIcon = document.createElement('i');
                deleteIcon.classList.add('fa', 'fa-trash'); // FontAwesome trash icon
                deleteIcon.classList.add('delete-case');
                deleteIcon.style.cursor = 'pointer';
                deleteIcon.style.marginLeft = '10px';
                deleteIcon.style.alignSelf = 'center'; // Align vertically in the center of the input field
    
                // Create a wrapper for the input field and the delete icon
                const fieldWrapper = document.createElement('div');
                fieldWrapper.classList.add('input-wrapper');
                fieldWrapper.style.display = 'flex';
                fieldWrapper.style.alignItems = 'center'; // Align items horizontally
                fieldWrapper.style.marginBottom = '10px'; // Optional: Add space between fields
    
                // Append the new input field and the delete icon inside the wrapper
                fieldWrapper.appendChild(newInput);
                fieldWrapper.appendChild(deleteIcon);
    
                // Append the field wrapper to the container
                container.appendChild(fieldWrapper);
    
                // Delete the field when the icon is clicked
                deleteIcon.addEventListener('click', () => {
                    container.removeChild(fieldWrapper);
                });
            });
        }
    
        // Add buttons for mobile, social handles, bank account number, IFSC code
        addInputField('add-mobile-btn', 'mobile-numbers', 'tel', 'mobile-input', 'Enter Mobile Number');
        addInputField('add-handle-btn', 'social-handles', 'text', 'handle-input', 'Enter Social Media Handle');
        addInputField('add-acc-btn', 'acc-no', 'text', 'acc-input', 'Enter Bank Acc. No.');
        addInputField('add-ifc-btn', 'ifsc-code', 'text', 'ifsc-input', 'Enter IFSC Code');
        addInputField('add-victim-mobile-btn', 'victim-mobile-numbers', 'tel', 'mobile-input', 'Enter Mobile Number');
    
        // Toggle visibility of Date of Forward and Outward No. fields based on Action Taken
        const actionSelect = document.getElementById('action');
        const forwardDateGroup = document.getElementById('forward-date-group');
        const outNoGroup = document.getElementById('out-no-group');
    
        // Function to handle visibility of Date of Forward and Outward No. based on Action Taken
        function toggleFieldsBasedOnAction() {
            if (actionSelect.value === 'Forward To PS') {
                forwardDateGroup.style.display = 'block';
                outNoGroup.style.display = 'block';
            } else {
                forwardDateGroup.style.display = 'none';
                outNoGroup.style.display = 'none';
            }
        }
    
        // Initial visibility check
        toggleFieldsBasedOnAction();
    
        // Add event listener to Action Taken field
        actionSelect.addEventListener('change', toggleFieldsBasedOnAction);
        
    };    

    const setupSearchPage = () => {
        const searchForm = document.getElementById('searchForm');
        const resetBtn = document.getElementById('reset-btn');
        const searchResults = document.getElementById('search-results');
        const downloadButton = document.getElementById('download-btn');
        const downloadOptions = document.getElementById('download-options');
        const mergeSection = document.getElementById('merge-section');
        let selectedComplaints = new Set();
        let currentResults = [];
        let currentFilters = {};
     
        class HistoryManager {
            constructor() {
                this.undoStack = [];
            }
     
            push(action) {
                this.undoStack.push(action);
            }
     
            async undo() {
                if (this.undoStack.length === 0) return;
                const action = this.undoStack.pop();
                await action.undo();
            }
        }
     
        const historyManager = new HistoryManager();
     
        const handleOtherOption = (selectId, placeholder) => {
            const selectElement = document.getElementById(selectId);
            if (selectElement && !selectElement.dataset.listenerAdded) {
                selectElement.dataset.listenerAdded = 'true';
                console.log(`Event listener added to select element with ID: ${selectId}`);
     
                selectElement.addEventListener('change', function () {
                    const selectedValue = selectElement.value;
                    const inputElementId = `${selectId}-input`;
                    let inputElement = document.getElementById(inputElementId);
     
                    console.log(`Dropdown with ID: ${selectId} changed. Selected value: ${selectedValue}`);
     
                    if (selectedValue === 'other') {
                        if (!inputElement) {
                            inputElement = document.createElement('input');
                            inputElement.type = 'text';
                            inputElement.id = inputElementId;
                            inputElement.placeholder = placeholder;
                            inputElement.style.marginTop = '8px';
                            selectElement.parentNode.insertBefore(inputElement, selectElement.nextSibling);
                            console.log(`Input field created for select ID: ${selectId} with placeholder: "${placeholder}"`);
                        }
                        inputElement.style.display = 'block';
                        console.log(`Input field for select ID: ${selectId} is now visible`);
                    } else {
                        if (inputElement) {
                            inputElement.style.display = 'none';
                            inputElement.value = '';
                            console.log(`Input field for select ID: ${selectId} hidden and cleared`);
                        }
                    }
                });
            } else if (selectElement) {
                console.log(`Event listener already exists for select element with ID: ${selectId}`);
            } else {
                console.warn(`No select element found with ID: ${selectId}`);
            }
        };
     
        handleOtherOption('cat-of-complaint', 'Enter custom category');
        handleOtherOption('sub-cat-of-complaint', 'Enter custom sub-category');
     
        const categorySelect = document.getElementById('cat-of-complaint');
        if (categorySelect) {
            categorySelect.addEventListener('change', updateSubcategories);
        }
     
        downloadButton.style.display = 'none';
     
        if (searchForm) {
            searchForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                downloadButton.style.display = 'none';
     
                const formData = getFormData();
                await performSearch(formData);
            });
     
            resetBtn.addEventListener('click', () => {
                resetSearchFilters();
                searchResults.innerHTML = '';
                downloadButton.style.display = 'none';
            });
     
            document.getElementById('cat-of-complaint').addEventListener('change', function () {
                toggleCustomInput(this.value, 'sub-cat-of-complaint', 'custom-sub-cat');
            });
     
            document.getElementById('police-station').addEventListener('change', function () {
                toggleCustomInput(this.value, 'police-station', 'other-police-station');
            });
     
            document.getElementById('investigation-officer').addEventListener('change', function () {
                toggleCustomInput(this.value, 'investigation-officer', 'other-officer');
            });
        }
     
        const toggleCustomInput = (selectedValue, selectId, inputId) => {
            const inputField = document.getElementById(inputId);
            if (inputField) {
                if (selectedValue === 'other') {
                    inputField.style.display = 'block';
                } else {
                    inputField.style.display = 'none';
                    inputField.value = '';
                }
            }
        };
     
        const getFormData = () => {
            return {
                dateFrom: document.getElementById('date-from').value,
                dateTo: document.getElementById('date-to').value,
                lostAmount: document.getElementById('lost-amount').value,
                lienAmount: document.getElementById('line-amt').value ? Number(document.getElementById('line-amt').value) : null,
                victimMobileNumbers: document.querySelector('#victim-mobile-numbers input.mobile-input')?.value.trim() || null,
                acknowledgmentNo: document.getElementById('ack-no').value,
                category: document.getElementById('cat-of-complaint').value === 'other' ? document.getElementById('cat-of-complaint-input').value : document.getElementById('cat-of-complaint').value,
                subCategory: document.getElementById('sub-cat-of-complaint').value === 'other' ? document.getElementById('sub-cat-of-complaint-input').value : document.getElementById('sub-cat-of-complaint').value,
                policeStation: document.getElementById('police-station').value === 'other' ? document.getElementById('police-station-input').value : document.getElementById('police-station').value,
                investigationOfficer: document.getElementById('investigation-officer').value === 'other' ? document.getElementById('investigation-officer-input').value : document.getElementById('investigation-officer').value,
                bnsSection: document.getElementById('bns').value,
                itActSection: document.getElementById('it-act').value,
                caseNumber: document.getElementById('complaint-number').value,
                victimName: document.getElementById('victim-name').value,
                sortBy: document.getElementById('sort-by').value,
                actionTaken: document.getElementById('action').value
            };
        };
     
        const resetSearchFilters = () => {
            const formElements = searchForm.elements;
            for (let element of formElements) {
                if (element.tagName === 'SELECT' || element.tagName === 'INPUT') {
                    element.value = '';
                }
            }
            document.getElementById('custom-sub-cat').style.display = 'none';
            document.getElementById('other-police-station').style.display = 'none';
            document.getElementById('other-officer').style.display = 'none';
        };
     
        function addLoaderStyles() {
            if (!document.getElementById('loader-styles')) {
                const style = document.createElement('style');
                style.id = 'loader-styles';
                style.textContent = `
                    .loader {
                        --background: linear-gradient(135deg, #23C4F8, #275EFE);
                        --shadow: rgba(39, 94, 254, 0.28);
                        --text: #6C7486;
                        --page: rgba(255, 255, 255, 0.36);
                        --page-fold: rgba(255, 255, 255, 0.52);
                        --duration: 3s;
                        width: 200px;
                        height: 140px;
                        position: relative;
                        margin: 20px auto;
                    }
        
                    .loader:before, .loader:after {
                        --r: -6deg;
                        content: "";
                        position: absolute;
                        bottom: 8px;
                        width: 120px;
                        top: 80%;
                        box-shadow: 0 16px 12px var(--shadow);
                        transform: rotate(var(--r));
                    }
        
                    .loader:before { left: 4px; }
                    .loader:after { --r: 6deg; right: 4px; }
        
                    .loader div {
                        width: 100%;
                        height: 100%;
                        border-radius: 13px;
                        position: relative;
                        z-index: 1;
                        perspective: 600px;
                        box-shadow: 0 4px 6px var(--shadow);
                        background-image: var(--background);
                    }
        
                    .loader div ul {
                        margin: 0;
                        padding: 0;
                        list-style: none;
                        position: relative;
                    }
        
                    .loader div ul li {
                        --r: 180deg;
                        --o: 0;
                        --c: var(--page);
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        transform-origin: 100% 50%;
                        color: var(--c);
                        opacity: var(--o);
                        transform: rotateY(var(--r));
                        animation: var(--duration) ease infinite;
                    }
        
                    .loader div ul li:nth-child(2) { --c: var(--page-fold); animation-name: page-2; }
                    .loader div ul li:nth-child(3) { --c: var(--page-fold); animation-name: page-3; }
                    .loader div ul li:nth-child(4) { --c: var(--page-fold); animation-name: page-4; }
                    .loader div ul li:nth-child(5) { --c: var(--page-fold); animation-name: page-5; }
                    .loader div ul li svg { width: 90px; height: 120px; display: block; }
                    .loader div ul li:first-child { --r: 0deg; --o: 1; }
                    .loader div ul li:last-child { --o: 1; }
                    .loader span { display: block; left: 0; right: 0; top: 100%; margin-top: 20px; text-align: center; color: var(--text); }
        
                    @keyframes page-2 {
                        0% { transform: rotateY(180deg); opacity: 0; }
                        20% { opacity: 1; }
                        35%, 100% { opacity: 0; }
                        50%, 100% { transform: rotateY(0deg); }
                    }
                    @keyframes page-3 {
                        15% { transform: rotateY(180deg); opacity: 0; }
                        35% { opacity: 1; }
                        50%, 100% { opacity: 0; }
                        65%, 100% { transform: rotateY(0deg); }
                    }
                    @keyframes page-4 {
                        30% { transform: rotateY(180deg); opacity: 0; }
                        50% { opacity: 1; }
                        65%, 100% { opacity: 0; }
                        80%, 100% { transform: rotateY(0deg); }
                    }
                    @keyframes page-5 {
                        45% { transform: rotateY(180deg); opacity: 0; }
                        65% { opacity: 1; }
                        80%, 100% { opacity: 0; }
                        95%, 100% { transform: rotateY(0deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        const performSearch = async (formData, storeHistory = true) => {
            try {
                addLoaderStyles();
        
                if (storeHistory) {
                    const previousFilters = { ...currentFilters };
                    const action = {
                        undo: async () => await performSearch(previousFilters, false),
                    };
                    historyManager.push(action);
                }
        
                // Show loader animation
                searchResults.innerHTML = `
                     <div class="loader">
                    <div>
                        <ul>
                            ${[...Array(5)].map(() => `
                                <li>
                                    <svg fill="currentColor" viewBox="0 0 90 120">
                                        <path d="M90,0 L90,120 L11,120 C4.92,120 0,115.08 0,109 L0,11 C0,4.92 4.92,0 11,0 H90 Z M71.5,81 H18.5 C17.12,81 16,82.12 16,83.5 C16,84.83 17.03,85.91 18.34,85.99 H71.5 C72.88,86 74,84.88 74,83.5 C74,82.17 72.97,81.09 71.66,81.01 Z M71.5,57 H18.5 C17.12,57 16,58.12 16,59.5 C16,60.83 17.03,61.91 18.34,61.99 H71.5 C72.88,62 74,60.88 74,59.5 C74,58.12 72.88,57 71.5,57 Z M71.5,33 H18.5 C17.12,33 16,34.12 16,35.5 C16,36.83 17.03,37.91 18.34,37.99 H71.5 C72.88,38 74,36.88 74,35.5 C74,34.12 72.88,33 71.5,33 Z"/>
                                    </svg>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <span>Loading</span>
                </div>
            `;
        
                await new Promise(resolve => setTimeout(resolve, 1000));
        
                currentFilters = formData;
                currentResults = await window.electronAPI.fetchComplaints(formData);
                displaySearchResults(currentResults);
        
            } catch (error) {
                console.error('Search error:', error);
                searchResults.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            }
        };
        
        const handleMerge = async (complaintIds) => {
            try {
                const mergeResult = await window.electronAPI.mergeComplaints(complaintIds);
                if (!mergeResult.success) {
                    Utils.showNotification(mergeResult.message, 'error');
                    return;
                }
        
                const mergedCaseId = mergeResult.mergedCaseId;
                console.log("merged case id",mergedCaseId);
        
                Utils.showNotification('Complaints merged successfully!', 'success');
                selectedComplaints.clear();
                toggleMergeButton();
                await performSearch(currentFilters); // Refresh UI
        
                // Push to historyManager for Undo
                historyManager.push({
                    async undo() {
                        console.log("Undo triggered for merged case:", mergedCaseId);
                        const response = await window.electronAPI.unmergeComplaints(mergedCaseId);
                        if (response.success) {
                            Utils.showNotification('Complaints unmerged successfully', 'success');
                        } else {
                            Utils.showNotification(response.message, 'error');
                        }
                        await performSearch(currentFilters);
                    },
                });
        
            } catch (error) {
                console.error('Error merging complaints:', error);
                Utils.showNotification('Failed to merge complaints.', 'error');
            }
        };

        const getSubcategories = (category) => {
            const subcategories = {
                'Financial Fraud': ['Online Task', 'Share/Trading', 'Fedex Parcel', 'MNGL Gas', 'Loan App', 'Video Call On Social Media', 'Credit/Debit Card Related', 'Matrimonial Related', 'Digital Arrest', 'Insurance', 'Apk download', 'OTP shared', 'Man in the middle', 'OLX purchase/sell', 'Other'],
                'Social Media Related': ['Social Media Account Hack', 'Posting Abusive Content', 'Other'],
            };
            return subcategories[category] || [];
        };
        
     
        const displaySearchResults = (results) => {
            console.log("Clearing previous results...");
            searchResults.innerHTML = '';
        
            if (results.length === 0) {
                searchResults.innerHTML = '<p>No matching cases found.</p>';
                return;
            }
        
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';
        
            const table = document.createElement('table');
            table.classList.add('results-table');
        
            // Table header
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th class="fixed-left">Sr No</th>
                <th>Comp No</th>
                <th>Victim Name</th>
                <th>Ack No</th>
                <th>Victim Mobile No</th>
                <th>Action Taken</th>
                <th>Forward Date</th>
                <th>Out No</th>
                <th>Comp Date</th>
                <th>Lost Amt</th>
                <th>Lien Amt</th>
                <th>Sub Category</th>
                <th>Police Station</th>
                <th>Investigation Officer</th>
                <th>FIR No</th>
                <th>Incident Date</th>
                <th>Time</th>
                <th>Victim Gender</th>
                <th>Victim Age</th>
                <th>Victim Email</th>
                <th>Category</th>
                <th>CCTNS No</th>
                <th>IT Act</th>
                <th>BNS</th>
                <th>Suspect Name</th>
                <th>Suspect Gender</th>
                <th>Suspect Age</th>
                <th>Suspect Email</th>
                <th>Suspect Mobile</th>
                <th>Suspect Social Handles</th>
                <th>Suspect Acc No</th>
                <th>IFSC Code</th>
                <th>Suspect Address</th>
                <th>Description</th>
                <th class="fixed-right">Action</th>
            `;
            table.appendChild(headerRow);
        
            // Table rows
            results.forEach((result, index) => {
                const resultRow = document.createElement('tr');
                resultRow.innerHTML = `
                    <td class="fixed-left">${index + 1}</td>
                    <td>${formatCellValue(result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.victim_name), 'victim_name',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.acknowledgment_no), 'acknowledgment_no',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.victim_mobile_numbers), 'victim_mobile_numbers',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.action_taken), 'action_taken', true, ['Forward To PS', 'Transferred To Other', 'Closed'],result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.forward_date), 'forward_date',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.out_no), 'out_no',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.date_of_complaint), 'date_of_complaint',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.lost_amount), 'lost_amount',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.lien_amount), 'lien_amount',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.sub_category_of_complaint), 'sub_category_of_complaint', true, getSubcategories(result.category_of_complaint),result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.police_station), 'police_station', true, [
                        'Pimpri PS', 'Chinchwad PS', 'Nigdi PS', 'Bhosari PS', 'Bhosari MIDC PS',
                        'Chakan PS', 'Alandi PS', 'Dighi PS', 'Sangvi PS', 'Wakad PS',
                        'Hinjewadi PS', 'Dehuroad PS', 'Chikhali PS', 'Talegoan Dabhade PS',
                        'Talegoan MIDC PS', 'Sant Tukaram Nagar PS', 'Dapodi PS', 'Kalewadi PS',
                        'Bavdhan PS', 'Other'
                    ],result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.investigation_officer), 'investigation_officer', true, [
                        'API Swami', 'API Munde', 'PSI Poman', 'PSI V. Patil', 'WPSI Vidya Patil', 'PSI Katkade', 'Other'
                    ],result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.fir_no), 'fir_no',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.date_of_incident), 'date_of_incident',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.time), 'time',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.victim_gender), 'victim_gender', true, ['Male', 'Female', 'Other'],result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.victim_age), 'victim_age',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.victim_email), 'victim_email',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.category_of_complaint), 'category_of_complaint', true, [
                        'Financial Fraud', 'Social Media Related', 'Other'
                    ],result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.cctns_no), 'cctns_no',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.it_act), 'it_act',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.bns), 'bns',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_name), 'suspect_name',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_gender), 'suspect_gender', true, ['Male', 'Female', 'Other'],result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_age), 'suspect_age',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_email), 'suspect_email',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_mobile_numbers), 'suspect_mobile_numbers',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_social_handles), 'suspect_social_handles',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_acc_no), 'suspect_acc_no',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.ifsc_code), 'ifsc_code',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.suspect_address), 'suspect_address',result.id)}</td>
                    <td>${createEditableCell(formatCellValue(result.description), 'description',result.id)}</td>
                    <td class="fixed-right button-container">
                        ${result.file_path ? `
                            <button class="view-doc" data-id="${result.id}" data-file="${result.file_path}">
                                <i class="fa fa-eye"></i>
                            </button>
                        ` : '<span class="no-file"></span>'}
        
                        <button class="delete-case" data-id="${result.id}">
                            <i class="fa fa-trash"></i> 
                        </button>
                    </td>
                `;
                table.appendChild(resultRow);
        
                // Double-click selection
                resultRow.addEventListener('dblclick', () => {
                    if (selectedComplaints.has(result.id)) {
                        selectedComplaints.delete(result.id);
                        resultRow.style.backgroundColor = '';
                    } else {
                        selectedComplaints.add(result.id);
                        resultRow.style.backgroundColor = '#d3d3d3';
                    }
                    toggleMergeButton();
                });
        
                // View Document Button Event Listener
                const viewButton = resultRow.querySelector('.view-doc');
                if (viewButton) {
                    viewButton.addEventListener('click', () => {
                        const filePathString = viewButton.getAttribute('data-file');
                        console.log(`Viewing documents: ${filePathString}`);
        
                        if (!filePathString) {
                            Utils.showNotification('No file available');
                            return;
                        }
        
                        const filePaths = filePathString.split(',').map(file => file.trim());
                        filePaths.forEach(filePath => {
                            console.log(`Opening: ${filePath}`);
                            window.open(`file://${filePath}`, '_blank');
                        });
                    });
                }
        
                // Delete Case Button Event Listener
                const deleteButton = resultRow.querySelector('.delete-case');
                deleteButton.addEventListener('click', async () => {
                    const caseId = result.id;
                    Utils.showNotification(`Deleting case ${caseId}...`, 'warning');
        
                    try {
                        const deleteResult = await handleDelete(caseId, resultRow);
                        if (!deleteResult.success) {
                            Utils.showNotification('Failed to delete complaint.', 'error');
                            return;
                        }
        
                        resultRow.remove();
                        Utils.showNotification('Case deleted successfully.', 'success');
                    } catch (error) {
                        console.error('Failed to delete complaint:', error);
                        Utils.showNotification('Failed to delete complaint.', 'error');
                    }
                });
            });
        
            // Add Total Row
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td colspan="35" style="text-align: left; font-weight: bold; padding-left: 13%;">
                    Total Complaints: ${results.length}
                </td>
            `;
            table.appendChild(totalRow);
        
            searchResults.appendChild(table);
            downloadButton.style.display = 'block';
        };
        const createEditableCell = (value, fieldName, isDropdown = false, options = [], rowId) => {
            const safeValue = value || '';
            const displayContent = safeValue 
                ? safeValue
                    .replace(/<br\s*\/?>/gi, '__BR__PLACEHOLDER__')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/__BR__PLACEHOLDER__/g, '<br>')
                : '<span class="placeholder">Click to edit</span>';
        
            if (isDropdown && options.length > 0) {
                const optionsHTML = options.map(option =>
                    `<option value="${option}" ${option === safeValue ? 'selected' : ''}>${option}</option>`
                ).join('');
        
                return `
                    <div class="editable-cell" data-id="${rowId || ''}" data-field="${fieldName}">
                        <span class="cell-value">${displayContent}</span>
                        <select class="cell-input" style="display: none;">
                            <option value="">Select...</option>
                            ${optionsHTML}
                        </select>
                    </div>
                `;
            } else {
                const editableValue = safeValue.replace(/<br\s*\/?>/gi, '\n');
                return `
                    <div class="editable-cell" data-id="${rowId || ''}" data-field="${fieldName}">
                        <span class="cell-value">${displayContent}</span>
                        <textarea class="cell-input" style="display: none;" placeholder="Enter ${fieldName.replace(/_/g, ' ')}">${editableValue}</textarea>
                    </div>
                `;
            }
        };
        
        // ✅ Inline editing logic
        searchResults.addEventListener("click", async (event) => {
            const cell = event.target.closest(".editable-cell");
            if (!cell || cell.querySelector(".edit-container")) return;
        
            const span = cell.querySelector(".cell-value");
            const fieldName = cell.dataset.field;
            const existingSelect = cell.querySelector("select.cell-input");
            const isDropdown = !!existingSelect;
            const dropdownOptions = existingSelect
                ? Array.from(existingSelect.options).map(opt => opt.value).filter(v => v !== "")
                : null;
        
            let editContainer = document.createElement("div");
            editContainer.classList.add("edit-container");
            const originalValue = span.innerHTML;
        
            const confirmAndSave = async (newValue) => {
                const confirmed = await window.electronAPI.confirmUpdate();
                if (!confirmed) {
                    span.style.display = "block";
                    if (cell.contains(editContainer)) cell.removeChild(editContainer);
                    return;
                }
        
                span.innerHTML = newValue;
                span.style.display = "block";
                if (cell.contains(editContainer)) cell.removeChild(editContainer);
        
                await window.electronAPI.updateCell(cell.dataset.id, {
                    [fieldName]: newValue
                });
            };
        
            const cancel = () => {
                span.style.display = "block";
                if (cell.contains(editContainer)) cell.removeChild(editContainer);
            };
        
            if (isDropdown && span.innerHTML.includes("<br>")) {
                const values = span.innerHTML.split("<br>").map(v => v.trim());
                const selects = [];
        
                values.forEach(val => {
                    const select = document.createElement("select");
                    select.classList.add("cell-select");
        
                    dropdownOptions.forEach(optionValue => {
                        const option = document.createElement("option");
                        option.value = optionValue;
                        option.textContent = optionValue;
                        if (val === optionValue) option.selected = true;
                        select.appendChild(option);
                    });
        
                    editContainer.appendChild(select);
                    selects.push(select);
                });
        
                cell.appendChild(editContainer);
                selects[0].focus();
        
                editContainer.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        const updated = selects.map(s => s.value.trim()).filter(v => v !== "");
                        confirmAndSave(updated.join("<br>"));
                    }
                });
        
                editContainer.addEventListener("focusout", (e) => {
                    if (!editContainer.contains(e.relatedTarget)) cancel();
                });
        
            } else if (isDropdown) {
                const select = document.createElement("select");
                select.classList.add("cell-select");
        
                dropdownOptions.forEach(optionValue => {
                    const option = document.createElement("option");
                    option.value = optionValue;
                    option.textContent = optionValue;
                    if (span.textContent.trim() === optionValue) option.selected = true;
                    select.appendChild(option);
                });
        
                editContainer.appendChild(select);
                cell.appendChild(editContainer);
                select.focus();
        
                select.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        const updatedValue = select.value.trim();
                        confirmAndSave(updatedValue);
                    }
                });
        
                select.addEventListener("blur", (e) => {
                    setTimeout(() => {
                        if (!editContainer.contains(document.activeElement)) cancel();
                    }, 50);
                });
        
            } else {
                const values = span.innerHTML.includes("<br>")
                    ? span.innerHTML.split("<br>").map(v => v.trim())
                    : [span.textContent.trim()];
        
                const inputs = values.map(val => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.classList.add("cell-input");
                    input.value = val;
                    return input;
                });
        
                inputs.forEach(input => editContainer.appendChild(input));
                cell.appendChild(editContainer);
                inputs[0].focus();
        
                editContainer.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        const updated = inputs.map(input => input.value.trim()).filter(v => v !== "");
                        confirmAndSave(updated.join("<br>"));
                    }
                });
        
                editContainer.addEventListener("focusout", (e) => {
                    if (!editContainer.contains(e.relatedTarget)) cancel();
                });
            }
        
            span.style.display = "none";
        });        
        
        const toggleMergeButton = () => {
            if (selectedComplaints.size > 1) {
                mergeSection.style.display = 'block';
            } else {
                mergeSection.style.display = 'none';
            }
        };
     
        document.getElementById('merge-btn').addEventListener('click', async () => {
            if (selectedComplaints.size < 2) {
                Utils.showNotification('Please select at least two complaints to merge.', 'warning');
                return;
            }
        
            const complaintIds = Array.from(selectedComplaints);
            await handleMerge(complaintIds);  // Call handleMerge() here
        });
        
        // Keyboard shortcut for merging complaints (Ctrl + M)
        document.addEventListener('keydown', async (event) => {
            if (event.ctrlKey && event.key.toLowerCase() === 'm') {
                event.preventDefault(); // Prevent default browser behavior (e.g., opening menu)
        
                if (selectedComplaints.size < 2) {
                    Utils.showNotification('Please select at least two complaints to merge.', 'warning');
                    return;
                }
        
                const complaintIds = Array.from(selectedComplaints);
                await handleMerge(complaintIds);  // Call handleMerge() here
            }
        });
        
     
        downloadButton.addEventListener('click', () => {
            const isDropdownVisible = window.getComputedStyle(downloadOptions).display === 'block';
            downloadOptions.style.display = isDropdownVisible ? 'none' : 'block';
        });
     
        const downloadOptionsButtons = document.querySelectorAll('.download-option');
        downloadOptionsButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                const format = event.target.getAttribute('data-value');
                const filters = getFormData();
     
                try {
                    const result = await window.electronAPI.downloadSearchResults(filters, format);
                    if (result.success) {
                        Utils.showNotification(`Documents downloaded successfully! Path: ${result.path}`, 'success');
                        downloadOptions.style.display = 'none'; // Hide the dropdown after download
                    } else {
                        Utils.showNotification(result.message, 'error');
                    }
                } catch (error) {
                    Utils.showNotification('Download failed.', 'error');
                }
            });
        });
     
        // Undo functionality
        document.getElementById('undo-btn').addEventListener('click', async() => await historyManager.undo());

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                historyManager.undo();
            }
        });
     };
    
     const setupEditPage = () => {
        const editForm = document.getElementById('edit-complaint-form');
        const searchButton = document.getElementById('search-complaint-btn');
        const complaintDetails = document.getElementById('complaint-details');
        const tabsContainer = document.getElementById('tabs');
        let complaintsData = [];
        let activeTabIndex = 0;
    
        // Handle search functionality
        const performSearch = async () => {
            const complaintId = document.getElementById('complaint-search').value.trim();
            try {
                const complaints = await window.electronAPI.fetchComplaints({ id: complaintId });
                if (complaints.length > 0) {
                    createTabs(complaints);
                    loadComplaintData(complaints[0]);
                    complaintDetails.style.display = 'block';
                } else {
                    complaintDetails.style.display = 'none';
                }
                complaintsData = complaints;
            } catch (error) {
                console.error('Error fetching complaint:', error);
                Utils.showNotification('Error fetching complaint.', 'error');
            }
        };
    
        function createTabs(complaints) {
            tabsContainer.innerHTML = '';
            complaints.forEach((complaint, index) => {
                const tab = document.createElement('div');
                tab.className = `tab ${index === 0 ? 'active' : ''}`;
                tab.textContent = `Complaint ${complaint.complaintNumber}`;
                tab.dataset.index = index;
    
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    activeTabIndex = index;
                    loadComplaintData(complaints[index]);
                });
    
                tabsContainer.appendChild(tab);
            });
    
            document.getElementById('tab-container').style.display = 'block';
        }
    
        function loadComplaintData(complaint) {
            const fields = [
                { id: 'victim-name', value: complaint.victimName },
                { id: 'victim-gender', value: complaint.victimGender },
                { id: 'victim-age', value: complaint.victimAge },
                { id: 'victim-email', value: complaint.victimEmail },
                { id: 'victim-mobile-numbers', value: complaint.victimMobileNumber },
                { id: 'ack-no', value: complaint.ackNo },
                { id: 'cctns-no', value: complaint.cctnsNo },
                { id: 'fir-no', value: complaint.firNo },
                { id: 'date-of-complaint', value: complaint.dateOfComplaint },
                { id: 'date-of-incident', value: complaint.dateOfIncident },
                { id: 'time', value: complaint.time },
                { id: 'am-pm', value: complaint.amPm },
                { id: 'cat-of-complaint', value: complaint.category },
                { id: 'sub-cat-of-complaint', value: complaint.subCategory },
                { id: 'police-station', value: complaint.policeStation },
                { id: 'investigation-officer', value: complaint.investigationOfficer },
                { id: 'lost-amt', value: complaint.lostAmount },
                { id: 'lien-amt', value: complaint.lienAmount },
                { id: 'it-act', value: complaint.itActSection },
                { id: 'bns', value: complaint.bnsSection },
                { id: 'action', value: complaint.actionTaken },
                { id: 'forward-date', value: complaint.forwardDate },
                { id: 'out-no', value: complaint.outwardNo },
                { id: 'suspect-name', value: complaint.suspectName },
                { id: 'suspect-gender', value: complaint.suspectGender },
                { id: 'suspect-age', value: complaint.suspectAge },
                { id: 'suspect-email', value: complaint.suspectEmail },
                { id: 'mobile-numbers', value: complaint.suspectMobileNumber },
                { id: 'social-handles', value: complaint.socialMediaHandles },
                { id: 'acc-no', value: complaint.bankAccNo },
                { id: 'ifsc-code', value: complaint.ifscCode },
                { id: 'suspect_address', value: complaint.suspectAddress },
                { id: 'description', value: complaint.description }
            ];
    
            fields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element) {
                    element.value = field.value || '';
                }
            });
        }
    
        searchButton.addEventListener('click', performSearch);
        document.getElementById('complaint-search').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch();
            }
        });
    
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentComplaint = complaintsData[activeTabIndex];
            // Update currentComplaint properties with form values
            currentComplaint.victimName = document.getElementById('victim-name').value;
            currentComplaint.victimGender = document.getElementById('victim-gender').value;
            currentComplaint.victimAge = document.getElementById('victim-age').value;
            currentComplaint.victimEmail = document.getElementById('victim-email').value;
            currentComplaint.victimMobileNumber = document.getElementById('victim-mobile-numbers').querySelector('.mobile-input').value;
            currentComplaint.ackNo = document.getElementById('ack-no').value;
            currentComplaint.cctnsNo = document.getElementById('cctns-no').value;
            currentComplaint.firNo = document.getElementById('fir-no').value;
            currentComplaint.dateOfComplaint = document.getElementById('date-of-complaint').value;
            currentComplaint.dateOfIncident = document.getElementById('date-of-incident').value;
            currentComplaint.time = document.getElementById('time').value;
            currentComplaint.amPm = document.getElementById('am-pm').value;
            currentComplaint.category = document.getElementById('cat-of-complaint').value;
            currentComplaint.subCategory = document.getElementById('sub-cat-of-complaint').value;
            currentComplaint.policeStation = document.getElementById('police-station').value;
            currentComplaint.investigationOfficer = document.getElementById('investigation-officer').value;
            currentComplaint.lostAmount = document.getElementById('lost-amt').value;
            currentComplaint.lienAmount = document.getElementById('lien-amt').value;
            currentComplaint.itActSection = document.getElementById('it-act').value;
            currentComplaint.bnsSection = document.getElementById('bns').value;
            currentComplaint.actionTaken = document.getElementById('action').value;
            currentComplaint.forwardDate = document.getElementById('forward-date').value;
            currentComplaint.outwardNo = document.getElementById('out-no').value;
            currentComplaint.suspectName = document.getElementById('suspect-name').value;
            currentComplaint.suspectGender = document.getElementById('suspect-gender').value;
            currentComplaint.suspectAge = document.getElementById('suspect-age').value;
            currentComplaint.suspectEmail = document.getElementById('suspect-email').value;
            currentComplaint.suspectMobileNumber = document.getElementById('mobile-numbers').querySelector('.mobile-input').value;
            currentComplaint.socialMediaHandles = document.getElementById('social-handles').querySelector('.handle-input').value;
            currentComplaint.bankAccNo = document.getElementById('acc-no').querySelector('.acc-input').value;
            currentComplaint.ifscCode = document.getElementById('ifsc-code').querySelector('.ifsc-input').value;
            currentComplaint.suspectAddress = document.getElementById('suspect_address').value;
            currentComplaint.description = document.getElementById('description').value;
    
            console.log('Updated data:', currentComplaint);
        });
    
        document.getElementById('cancel-btn').addEventListener('click', () => {
            editForm.reset();
            complaintDetails.style.display = 'none';
            tabsContainer.style.display = 'none';
        });
    };
    
    // Initialize the Edit Page setup after the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', setupEditPage);
        

    // Initialize the page based on the title
    const initializePage = () => {
        switch (currentPage) {
            case 'Login':
                setupLoginPage();
                break;
            case 'Dashboard':
                setupDashboardPage();
                break;
            case 'Register':
                setupRegisterPage();
                break;
            case 'Search':
                setupSearchPage();
                break;
            case 'Edit':
                setupEditPage();
                break;
            case 'Upload':
                setupUploadPage();
                break;
            default:
                console.error('Unknown page title:', currentPage);
        }
    };

    // Initialize navigation and page setup
    setupTabNavigation();
    setupHomeNavigation();
    setCurrentDateTime();
    initializePage();
});
