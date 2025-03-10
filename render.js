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
    
        // Check for empty patterns like ["\"] or multiple instances
        if (
            stringValue === '?' || 
            stringValue === '|' || 
            /^(\[\"\"\])+$/.test(stringValue) // Regex to match ["\"] repeated
        ) {
            return '';
        }
    
        const mobileNumberPattern = /\["(\d+)"\]/g; 
        const matches = stringValue.match(mobileNumberPattern);
    
        if (matches) {
            const extractedNumbers = matches.map(match => 
                match.replace(/\["|"\]/g, '')
            );
            return extractedNumbers.join('<br>'); // Line breaks for numbers
        }
    
        return stringValue;
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
                this.redoStack = [];
            }
     
            push(action) {
                this.undoStack.push(action);
                this.redoStack = [];
            }
     
            async undo() {
                if (this.undoStack.length === 0) return;
                const action = this.undoStack.pop();
                await action.undo();
                this.redoStack.push(action);
            }
     
            async redo() {
                if (this.redoStack.length === 0) return;
                const action = this.redoStack.pop();
                await action.redo();
                this.undoStack.push(action);
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
     
        const performSearch = async (formData, storeHistory = true) => {
            try {
                if (storeHistory) {
                    const previousFilters = { ...currentFilters }; // Capture current filters before updating
                    const action = {
                        undo: async () => await performSearch(previousFilters, false),
                        redo: async () => await performSearch(formData, false)
                    };
                    historyManager.push(action);
                }
     
                searchResults.innerHTML = 'Loading results...';
                currentFilters = formData;
                currentResults = await window.electronAPI.fetchComplaints(formData);
                displaySearchResults(currentResults);
     
            } catch (error) {
                console.error('Search error:', error);
                searchResults.innerHTML = `<p>Error: ${error.message}</p>`;
            }
        };
     
        const handleDelete = async (caseId, resultRow) => {
            try {
                const deleteResult = await window.electronAPI.deleteCase(caseId);
                if (!deleteResult.success) throw new Error(deleteResult.message);
     
                resultRow.remove();
                currentResults = currentResults.filter(r => r.id !== caseId);
     
                // Capture currentFilters at the time of deletion
                const filtersAtDeletion = { ...currentFilters };
     
                historyManager.push({
                    undo: async () => {
                        await window.electronAPI.restoreCase(caseId);
                        await performSearch(filtersAtDeletion, false);
                    },
                    redo: async () => {
                        await window.electronAPI.deleteCase(caseId);
                        await performSearch(filtersAtDeletion, false);
                    }
                });
     
            } catch (error) {
                Utils.showNotification(`Delete failed: ${error.message}`, 'error');
            }
        };
     
        const handleMerge = async (complaintIds) => {
            try {
                const mergeResult = await window.electronAPI.mergeComplaints(complaintIds);
                if (!mergeResult.success) throw new Error(mergeResult.message);
     
                const originalIds = [...complaintIds];
                const mergedId = mergeResult.mergedId;
     
                historyManager.push({
                    undo: async () => {
                        await window.electronAPI.unmergeComplaint(mergedId);
                        await performSearch(currentFilters);
                    },
                    redo: async () => {
                        await window.electronAPI.mergeComplaints(originalIds);
                        await performSearch(currentFilters);
                    }
                });
     
                selectedComplaints.clear();
                toggleMergeButton();
                await performSearch(currentFilters);
     
            } catch (error) {
                Utils.showNotification(`Merge failed: ${error.message}`, 'error');
            }
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
     
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th class="fixed-left">Comp No</th>
                <th>Victim Name</th>
                <th>Victim Gender</th>
                <th>Victim Mobile No</th>
                <th>Ack No</th>
                <th>Comp Date</th>
                <th>Incident Date</th>
                <th>Time</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Police Station</th>
                <th>Investigation Officer</th>
                <th>Lost Amt</th>
                <th>Lien Amt</th>
                <th>Victim Age</th>
                <th>Victim Email</th>
                <th>CCTNS No</th>
                <th>FIR No</th>
                <th>IT Act</th>
                <th>BNS</th>
                <th>Action Taken</th>
                <th>Forward Date</th>
                <th>Out No</th>
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
     
            results.forEach((result) => {
                const resultRow = document.createElement('tr');
                resultRow.innerHTML = `
                    <td class="fixed-left">${result.id}</td>
                    <td>${formatCellValue(result.victim_name)}</td>
                    <td>${formatCellValue(result.victim_gender)}</td>
                    <td>${formatCellValue(result.victim_mobile_numbers)}</td>
                    <td>${formatCellValue(result.acknowledgment_no)}</td>
                    <td>${formatCellValue(result.date_of_complaint)}</td>
                    <td>${formatCellValue(result.date_of_incident)}</td>
                    <td>${formatCellValue(result.time)}</td>
                    <td>${formatCellValue(result.category_of_complaint)}</td>
                    <td>${formatCellValue(result.sub_category_of_complaint)}</td>
                    <td>${formatCellValue(result.police_station)}</td>
                    <td>${formatCellValue(result.investigation_officer)}</td>
                    <td>${formatCellValue(result.lost_amount)}</td>
                    <td>${formatCellValue(result.lien_amount)}</td>
                    <td>${formatCellValue(result.victim_age)}</td>
                    <td>${formatCellValue(result.victim_email)}</td>
                    <td>${formatCellValue(result.cctns_no)}</td>
                    <td>${formatCellValue(result.fir_no)}</td>
                    <td>${formatCellValue(result.it_act)}</td>
                    <td>${formatCellValue(result.bns)}</td>
                    <td>${formatCellValue(result.action_taken)}</td>
                    <td>${formatCellValue(result.forward_date)}</td>
                    <td>${formatCellValue(result.out_no)}</td>
                    <td>${formatCellValue(result.suspect_name)}</td>
                    <td>${formatCellValue(result.suspect_gender)}</td>
                    <td>${formatCellValue(result.suspect_age)}</td>
                    <td>${formatCellValue(result.suspect_email)}</td>
                    <td>${formatCellValue(result.suspect_mobile_numbers)}</td>
                    <td>${formatCellValue(result.suspect_social_handles)}</td>
                    <td>${formatCellValue(result.suspect_acc_no)}</td>
                    <td>${formatCellValue(result.ifsc_code)}</td>
                    <td>${formatCellValue(result.suspect_address)}</td>
                    <td>${formatCellValue(result.description)}</td>
                    <td class="fixed-right">
                    ${result.file_path ? `
                        <button class="view-doc" data-id="${result.id}" data-file="${result.file_path}">
                            <i class="fa fa-eye"></i> View
     </button>
                    ` : '<span class="no-file"></span>'}
                        <button class="delete-case" data-id="${result.id}">
                            <i class="fa fa-trash"></i> 
                        </button>
                    </td>
                `;
                table.appendChild(resultRow);
     
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
     
                const deleteButton = resultRow.querySelector('.delete-case');
                deleteButton.addEventListener('click', async () => {
                    const caseId = result.id;
                    Utils.showNotification(`Deleting case ${caseId}...`, 'warning');
     
                    try {
                        const deleteResult = await window.electronAPI.deleteCase(caseId);
                        if (deleteResult.success) {
                            Utils.showNotification('Complaint deleted successfully!', 'success');
                            resultRow.remove();
     
                            const deletedCaseData = result; // Store the deleted case data
                            const filtersAtDeletion = { ...currentFilters }; // Capture filters at deletion
                            const deleteAction = {
                                async undo() {
                                    const restoreResult = await window.electronAPI.createCase(deletedCaseData);
                                    if (restoreResult.success) {
                                        const newRow = createResultRow(deletedCaseData);
                                        table.insertBefore(newRow, totalRow); // Insert before total row
                                    }
                                },
                                async redo() {
                                    await window.electronAPI.deleteCase(deletedCaseData.id);
                                    const row = document.querySelector(`tr[data-id="${deletedCaseData.id}"]`);
                                    if (row) row.remove();
                                }
                            };
                            historyManager.push(deleteAction);
                        } else {
                            Utils.showNotification(deleteResult.message, 'error');
                        }
                    } catch (error) {
                        console.error('Failed to delete complaint:', error);
                        Utils.showNotification('Failed to delete complaint.', 'error');
                    }
                });
            });
     
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td colspan="10" style="text-align: center; font-weight: bold;">
                    Total Complaints: ${results.length}
                </td>
            `;
            table.appendChild(totalRow);
     
            searchResults.appendChild(table);
            downloadButton.style.display = 'block';
        };
     
        const createResultRow = (result) => {
            const resultRow = document.createElement('tr');
            resultRow.innerHTML = `
                <td class="fixed-left">${result.id}</td>
                <td>${formatCellValue(result.victim_name)}</td>
                <td>${formatCellValue(result.victim_gender)}</td>
                <td>${formatCellValue(result.victim_mobile_numbers)}</td>
                <td>${formatCellValue(result.acknowledgment_no)}</td>
                <td>${formatCellValue(result.date_of_complaint)}</td>
                <td>${formatCellValue(result.date_of_incident)}</td>
                <td>${formatCellValue(result.time)}</td>
                <td>${formatCellValue(result.category_of_complaint)}</td>
                <td>${formatCellValue(result.sub_category_of_complaint)}</td>
                <td>${formatCellValue(result.police_station)}</td>
                <td>${formatCellValue(result.investigation_officer)}</td>
                <td>${formatCellValue(result.lost_amount)}</td>
                <td>${formatCellValue(result.lien_amount)}</td>
                <td>${formatCellValue(result.victim_age)}</td>
                <td>${formatCellValue(result.victim_email)}</td>
                <td>${formatCellValue(result.cctns_no)}</td>
                <td>${formatCellValue(result.fir_no)}</td>
                <td>${formatCellValue(result.it_act)}</td>
                <td>${formatCellValue(result.bns)}</td>
                <td>${formatCellValue(result.action_taken)}</td>
                <td>${formatCellValue(result.forward_date)}</td>
                <td>${formatCellValue(result.out_no)}</td>
                <td>${formatCellValue(result.suspect_name)}</td>
                <td>${formatCellValue(result.suspect_gender)}</td>
                <td>${formatCellValue(result.suspect_age)}</td>
                <td>${formatCellValue(result.suspect_email)}</td>
                <td>${formatCellValue(result.suspect_mobile_numbers)}</td>
                <td>${formatCellValue(result.suspect_social_handles)}</td>
                <td>${formatCellValue(result.suspect_acc_no)}</td>
                <td>${formatCellValue(result.ifsc_code)}</td>
                <td>${formatCellValue(result.suspect_address)}</td>
                <td>${formatCellValue(result.description)}</td <td class="fixed-right">
                    ${result.file_path ? `
                        <button class="view-doc" data-id="${result.id}" data-file="${result.file_path}">
                            <i class="fa fa-eye"></i> View
                        </button>
                    ` : '<span class="no-file"></span>'}
                    <button class="delete-case" data-id="${result.id}">
                        <i class="fa fa-trash"></i> 
                    </button>
                </td>
            `;
            return resultRow;
        };
     
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
            try {
                const mergeResult = await window.electronAPI.mergeComplaints(complaintIds);
                if (mergeResult.success) {
                    Utils.showNotification('Complaints merged successfully!', 'success');
                    selectedComplaints.clear();
                    toggleMergeButton();
                    const mergeAction = {
                        async undo() {
                            await window.electronAPI.unmergeComplaints(mergeResult.mergedCaseId);
                            await performSearch(currentFilters);
                        },
                        async redo() {
                            await window.electronAPI.mergeComplaints(complaintIds);
                            await performSearch(currentFilters);
                        }
                    };
                    historyManager.push(mergeAction);
                } else {
                    Utils.showNotification(mergeResult.message, 'error');
                }
            } catch (error) {
                console.error('Error merging complaints:', error);
                Utils.showNotification('Failed to merge complaints.', 'error');
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
     
        // Undo and Redo functionality
        document.getElementById('undo-btn').addEventListener('click', () => historyManager.undo());
        document.getElementById('redo-btn').addEventListener('click', () => historyManager.redo());
     
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                historyManager.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                historyManager.redo();
            }
        });
     };
    
    const setupEditPage = () => {
        const editForm = document.getElementById('edit-complaint-form');
        const searchButton = document.getElementById('search-complaint-btn');
        const complaintDetails = document.getElementById('complaint-details');
        const currentFilePreview = document.getElementById('current-file-preview');
        const newFile = document.getElementById('new-file');
        const filePreview = document.getElementById('file-preview');
    
        handleOtherOption('police-station', 'Enter police station name');
        handleOtherOption('investigation-officer', 'Enter officer name');
        handleOtherOption('cat-of-complaint', 'Enter category of complaint');
        handleOtherOption('sub-cat-of-complaint', 'Enter subcategory of complaint');
    
        // Update subcategories based on category selection
        const categorySelect = document.getElementById('cat-of-complaint');
        if (categorySelect) {
            categorySelect.addEventListener('change', updateSubcategories);
            updateSubcategories(); // Initial call to populate subcategories
        }
    
        // Toggle visibility of Date of Forward and Outward No. fields based on Action Taken
        const actionSelect = document.getElementById('action');
        const forwardDateGroup = document.getElementById('forward-date-group');
        const outNoGroup = document.getElementById('out-no-group');
    
        const toggleFieldsBasedOnAction = (actionValue) => {
            const isForwardToPS = actionValue === 'Forward To PS';
            forwardDateGroup.style.display = isForwardToPS ? 'block' : 'none';
            outNoGroup.style.display = isForwardToPS ? 'block' : 'none';
        };
    
        if (actionSelect) {
            actionSelect.addEventListener('change', () => toggleFieldsBasedOnAction(actionSelect.value));
        }
    
        // Check if searchButton exists
        if (!searchButton) {
            console.error("Search button not found. Please check the HTML for the element with ID 'search-complaint-btn'.");
            return; // Exit the function if the button is not found
        }
    
        // Handle search functionality
        const performSearch = async () => {
            const complaintId = document.getElementById('complaint-search').value.trim();
        try {
            const complaints = await window.electronAPI.fetchComplaints({ id: complaintId });
            const complaint = complaints.find(c => c.id === parseInt(complaintId));

    
                if (complaint) {
                    complaintDetails.style.display = 'block';
                    populateComplaintDetails(complaint);
                } else {
                    Utils.showNotification('Complaint not found.', 'error');
                }
            } catch (error) {
                console.error('Error fetching complaint:', error);
                Utils.showNotification('Error fetching complaint.', 'error');
            }
        };
    
        // Populate the form with fetched complaint data
        const populateComplaintDetails = (complaint) => {
            console.log("Fetched data:", JSON.stringify(complaint, null, 2));

            const fields = [
                { id: 'ack-no', value: complaint.acknowledgment_no },
                { id: 'lost-amt', value: complaint.lost_amount },
                { id: 'lien-amt', value: complaint.lien_amount },
                { id: 'cat-of-complaint', value: complaint.category_of_complaint },
                { id: 'victim-mobile-numbers', value: complaint.victim_mobile_numbers },
                { id: 'social-handles', value: complaint.suspect_social_handles },
                { id: 'sub-cat-of-complaint', value: complaint.sub_category_of_complaint },
                { id: 'action', value: complaint.action_taken },
            ];
    
            fields.forEach(field => {
        const element = document.getElementById(field.id);

        if (element) {
            if (element.tagName === "SELECT") {
                const options = element.getElementsByTagName("option");
                let optionFound = false;

                // Check if the value matches any option in the select dropdown
                for (let option of options) {
                    if (option.value === field.value) {
                        option.selected = true;
                        optionFound = true;
                        break;
                    }
                }

                // If it's the 'category' select element, trigger subcategory population
                if (field.id === 'cat-of-complaint' && field.value) {
                    element.value = field.value; // Set category value
                    updateSubcategories();  // Call this to populate the subcategories

                    // Set the subcategory if it matches
                    const subcategorySelect = document.getElementById('sub-cat-of-complaint');
                    const customSubcategory = document.getElementById('custom-sub-cat');

                    if (field.value === 'other') {
                        customSubcategory.style.display = 'block';
                        customSubcategory.value = complaint.sub_category_of_complaint; // Set custom subcategory value
                    } else {
                        subcategorySelect.value = complaint.sub_category_of_complaint; // Set subcategory from dropdown
                    }
                }
            }
            // Handle other field types (input, textarea, etc.)
            else if (field.id === 'custom-sub-cat') {
                // Handle custom subcategory field separately
                element.value = complaint.sub_category_of_complaint;
            } else {
                element.value = field.value; // For other fields
            }
        }
    });

    // Handle case when category is 'other' and show custom sub-category input
    if (complaint.category_of_complaint === 'other' || !complaint.category_of_complaint) {
        const customSubCategory = document.getElementById('custom-sub-cat');
        if (customSubCategory) {
            customSubCategory.style.display = 'block';
            customSubCategory.value = complaint.sub_category_of_complaint || ""; // Set custom sub-category value
        }
    }
    
            const additionalFields = [
                'victim-name', 'victim-gender', 'victim-age', 'victim-email', 'cctns-no', 'fir-no', 
                'date-of-complaint', 'date-of-incident', 'am-pm', 'police-station', 'investigation-officer', 
                'it-act', 'bns', 'forward-date', 'out-no', 'suspect-name', 'suspect-gender', 
                'suspect-age', 'suspect-email', 'suspect_address', 'description'
            ];
    
            additionalFields.forEach(field => {
                const element = document.getElementById(field);
                if (element && complaint[field.replace(/-/g, '_')] !== undefined) {
                    element.value = complaint[field.replace(/-/g, '_')] || '';
                }
            });
    
            // Handle file preview if file exists
            if (complaint.file_path) {
                const viewFileButton = createFileButton('view-doc', 'View', complaint.file_path);
    
                currentFilePreview.innerHTML = ''; // Clear any previous content
                currentFilePreview.appendChild(viewFileButton);
            }
    
            toggleFieldsBasedOnAction(complaint.action_taken);
            populateDynamicFields('victim-mobile-numbers', JSON.parse(complaint.victim_mobile_numbers || '[]'));
            populateDynamicFields('mobile-numbers', JSON.parse(complaint.suspect_mobile_numbers || '[]'));
            populateDynamicFields('social-handles', JSON.parse(complaint.suspect_social_handles || '[]'));
            populateDynamicFields('acc-no', JSON.parse(complaint.suspect_acc_no || '[]'));
            populateDynamicFields('ifsc-code', JSON.parse(complaint.ifsc_code || '[]'));
        };

        document.getElementById('cancel-btn').addEventListener('click', () => {
            Utils.resetForm(editForm);
            complaintDetails.style.display = 'none';
        });

        const populateDynamicFields = (containerId, values) => {
            console.log(`Populating dynamic fields for container: ${containerId}`);
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container with id '${containerId}' not found.`);
                return;
            }
    
            // Ensure values is an array
            if (!Array.isArray(values)) {
                try {
                    values = JSON.parse(values || '[]'); // Parse only if it's not an array
                } catch (error) {
                    console.error(`Failed to parse values for ${containerId}:`, error);
                    values = []; // Default to an empty array if parsing fails
                }
            }
    
            container.innerHTML = ''; // Clear previous values
    
            values.forEach(value => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'dynamic-input';
                input.value = value;
                container.appendChild(input);
            });
        };
    
        // Event Listener for the Search Button
        searchButton.addEventListener('click', performSearch);
    
        // Handle the Enter key press in the complaint number input
        document.getElementById('complaint-search').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                performSearch(); // Call the search function
            }
        });
    
        // Handle form submission for complaint update
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const complaintNumber = document.getElementById('complaint-search').value.trim();
            const updateData = {
                victimName: document.getElementById('victim-name').value.trim() || null,
                victimGender: document.getElementById('victim-gender').value.trim() || null,
                victimAge: document.getElementById('victim-age').value.trim() || null,
                victimEmail: document.getElementById('victim-email').value.trim() || null,
                victimMobileNumbers: JSON.stringify(Array.from(document.querySelectorAll('#victim-mobile-numbers input.dynamic-input')).map(input => input.value).filter(value => value.trim() !== '')),
                acknowledgmentNo: document.getElementById('ack-no').value.trim() || null,
                cctnsNo: document.getElementById('cctns-no').value.trim() || null,
                firNo: document.getElementById('fir-no').value.trim() || null,
                dateOfComplaint: document.getElementById('date-of-complaint').value.trim() || null,
                dateOfIncident: document.getElementById('date-of-incident').value.trim() || null,
                time: document.getElementById('time').value.trim() || null,
                amPm: document.getElementById('am-pm').value.trim() || null,
                categoryOfComplaint: document.getElementById('cat-of-complaint').value.trim() || null,
                subCategoryOfComplaint: document.getElementById('sub-cat-of-complaint').value.trim() || null,
                policeStation: document.getElementById('police-station').value.trim() || null,
                investigationOfficer: document.getElementById('investigation-officer').value.trim() || null,
                lostAmount: document.getElementById('lost-amt').value.trim() || null,
                lienAmount: document.getElementById('lien-amt').value.trim() || null,
                itAct: document.getElementById('it-act').value.trim() || null,
                bns: document.getElementById('bns').value.trim() || null,
                actionTaken: document.getElementById('action').value.trim() || null,
                forwardDate: document.getElementById('forward-date').value.trim() || null,
                outNo: document.getElementById('out-no').value.trim() || null,
                suspectName: document.getElementById('suspect-name').value.trim() || null,
                suspectGender: document.getElementById('suspect-gender').value.trim() || null,
                suspectAge: document.getElementById('suspect-age').value.trim() || null,
                suspectEmail: document.getElementById('suspect-email').value.trim() || null,
                suspectMobileNumbers: JSON.stringify(Array.from(document.querySelectorAll('#mobile-numbers input.dynamic-input')).map(input => input.value.trim()).filter(value => value.trim() !== '')),
                suspectSocialHandles: JSON.stringify(Array.from(document.querySelectorAll('#social-handles input.dynamic-input')).map(input => input.value.trim()).filter(value => value.trim() !== '')),
                suspectAccNo: JSON.stringify(Array.from(document.querySelectorAll('#acc-no input.dynamic-input')).map(input => input.value.trim()).filter(value => value.trim() !== '')),
                ifscCode: JSON.stringify(Array.from(document.querySelectorAll('#ifsc-code input.dynamic-input')).map(input => input.value.trim()).filter(value => value.trim() !== '')),
                suspectAddress: document.getElementById('suspect_address').value.trim() || null,
                description: document.getElementById('description').value.trim() || null,
                fileContent: await getFileContent(newFile.files[0]), // Get file content
                fileName: newFile.files[0]?.name || null,
                filePath: newFile.files[0]?.path || null,
            };
      
            try {
                console.log("Update Data: ", JSON.stringify(updateData, null, 2)); // Log entire data

                const result = await window.electronAPI.updateComplaint(complaintNumber, updateData);
                if (result.success) {
                    Utils.showNotification('Complaint updated successfully!', 'success');
                    setTimeout(() => Utils.redirectTo('dashboard.html'), 300);

                } else {
                    Utils.showNotification(result.message, 'error');
                }
            } catch (error) {
                Utils.showNotification('Failed to update complaint.', 'error');
            }
        });
    
        // Handle file input change event to create "View" and "Delete" buttons for the new file
        newFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Clear any previous file preview content
                filePreview.innerHTML = '';
    
                // Create "View" and "Delete" buttons for the new file
                const viewFileButton = createFileButton('view-doc', 'View', file.path);
                const deleteFileButton = createFileButton('delete-case', 'Delete', file.path, () => {
                    filePreview.innerHTML = ''; // Clear preview area
                    newFile.value = ''; // Reset the file input
                    Utils.showNotification('File deleted successfully!', 'success');
                });
    
                // Append the buttons to the file preview area
                filePreview.appendChild(viewFileButton);
                filePreview.appendChild(deleteFileButton);
            }
        });
    
        // Function to get the file content as a buffer
        const getFileContent = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                if (file) {
                    reader.readAsArrayBuffer(file);
                } else {
                    resolve(null);
                }
            });
        };
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