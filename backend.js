const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class DatabaseManager {
    constructor(dbPath, downloadsDir, uploadDir) {
        this.dbPath = dbPath;
        this.downloadsDir = downloadsDir;
        this.uploadDir = uploadDir;

        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
        if (!fs.existsSync(this.downloadsDir)) {
            fs.mkdirSync(this.downloadsDir, { recursive: true });
        }
    }

    // Initialize the database and set up tables, users
    async initialize() {
        try {
            this.db = await this.connectDatabase();
            await this.createTables();
            await this.initializeDefaultUsers();
        } catch (err) {
            console.error('Error during initialization:', err);
            throw err;
        }
    }

    // Connect to the SQLite database
    async connectDatabase() {
        return new Promise((resolve, reject) => {
            console.log('Database path:', this.dbPath);
            const db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection failed:', err);
                    reject(err);
                } else {
                    resolve(db);
                }
            });
        });
    }

    // Create tables in the database if they do not exist
    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE,
                        password TEXT,
                        role TEXT,
                        user_type TEXT
                    );
                `, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err);
                        return reject(err);
                    }
                });

                this.db.run(`
                    CREATE TABLE IF NOT EXISTS complaint (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        victim_name TEXT,
                        victim_gender TEXT,
                        victim_age INTEGER,
                        victim_email TEXT,
                        victim_mobile_numbers TEXT,
                        acknowledgment_no TEXT UNIQUE,
                        cctns_no TEXT,
                        fir_no TEXT,
                        date_of_complaint TEXT,
                        date_of_incident TEXT,
                        time TEXT,
                        category_of_complaint TEXT,
                        sub_category_of_complaint TEXT,
                        police_station TEXT,
                        investigation_officer TEXT,
                        lost_amount REAL,
                        lien_amount REAL,
                        it_act TEXT,
                        bns TEXT,
                        action_taken TEXT,
                        forward_date TEXT,
                        out_no TEXT,
                        suspect_name TEXT,
                        suspect_gender TEXT,
                        suspect_age TEXT,
                        suspect_email TEXT,
                        suspect_mobile_numbers TEXT,
                        suspect_social_handles TEXT,
                        suspect_acc_no TEXT,
                        ifsc_code TEXT,
                        suspect_address TEXT,
                        description TEXT,
                        file_name TEXT,
                        file_path TEXT
                        
                    );
                `, (err) => {
                    if (err) {
                        console.error('Error creating complaint table:', err);
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    }

    // Initialize default users in the database
    async initializeDefaultUsers() {
        const defaultUsers = [
            { username: 'cyber_ps', password: 'cyber_ps123', role: 'admin', user_type: 'admin' },
        ];

        for (const user of defaultUsers) {
            try {
                await this.registerUser(user);
            } catch (err) {
                console.warn(`Error initializing default user '${user.username}':`, err.message);
            }
        }
    }

    // Register a new user with hashed password
    async registerUser({ username, password, role, user_type }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR IGNORE INTO users (username, password, role, user_type)
                VALUES (?, ?, ?, ?);
            `;
            this.db.run(query, [username, hashedPassword, role, user_type], function (err) {
                if (err) {
                    console.error('Error registering user:', err);
                    return reject(err);
                }
                resolve({ id: this.lastID });
            });
        });
    }

    // Authenticate user with username, password, and user type
    async authenticateUser(username, password, userType) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM users WHERE username = ? AND user_type = ?`, [username, userType], async (err, user) => {
                if (err) {
                    console.error('Error during authentication:', err);
                    return reject(err);
                }
                if (!user) {
                    return resolve({ success: false, message: 'User not found' });
                }
                const isMatch = await bcrypt.compare(password, user.password);
                resolve(isMatch ? { success: true, user } : { success: false, message: 'Incorrect password' });
            });
        });
    }

    // Insert complaint logic
    insertComplaint(formData) {
        return new Promise(async (resolve, reject) => {
            try {
                let newFileName = null;
                let newFilePath = null;

                // File handling logic
                if (formData.filePath && formData.fileName) {
                    const fileExtension = path.extname(formData.fileName);
                    newFileName = `${formData.acknowledgmentNo}${fileExtension}`;
                    newFilePath = path.join(this.uploadDir, newFileName);

                    await fs.promises.copyFile(formData.filePath, newFilePath);
                    console.log('File saved successfully!');
                } else {
                    console.log('No file selected, skipping file save.');
                }

                // Determine status based on action_taken field
                const status = formData.actionTaken && formData.actionTaken !== '' ? 'resolved' : 'pending';

                const query = `
                    INSERT INTO complaint (
                        victim_name, victim_gender, victim_age, victim_email, victim_mobile_numbers, acknowledgment_no, cctns_no, fir_no, 
                        date_of_complaint, date_of_incident, time, category_of_complaint, sub_category_of_complaint, police_station, 
                        investigation_officer, lost_amount, lien_amount, it_act, bns, action_taken, forward_date, out_no, suspect_name, 
                        suspect_gender, suspect_age, suspect_email, suspect_mobile_numbers, suspect_social_handles, suspect_acc_no, 
                        ifsc_code, suspect_address, description, file_name, file_path
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `;

                // Construct the values array with default fallbacks
                const values = [
                    formData.victimName ?? null,
                    formData.victimGender ?? null,
                    formData.victimAge ?? null,
                    formData.victimEmail ?? null,
                    formData.victimMobileNumbers && formData.victimMobileNumbers !== '[]' ? formData.victimMobileNumbers : null,
                    formData.acknowledgmentNo ?? null,
                    formData.cctnsNo ?? null,
                    formData.firNo ?? null,
                    formData.dateOfComplaint ?? null,
                    formData.dateOfIncident ?? null,
                    formData.time ?? null,
                    formData.categoryOfComplaint ?? null,
                    formData.subCategoryOfComplaint ?? null,
                    formData.policeStation ?? null,
                    formData.investigationOfficer ?? null,
                    formData.lostAmount ?? null,
                    formData.lienAmount ?? null,
                    formData.itAct ?? null,
                    formData.bns ?? null,
                    formData.actionTaken ?? null,
                    formData.forwardDate ?? null,
                    formData.outNo ?? null,
                    formData.suspectName ?? null,
                    formData.suspectGender ?? null,
                    formData.suspectAge ?? null,
                    formData.suspectEmail ?? null,
                    formData.suspectMobileNumbers && formData.suspectMobileNumbers !== '[]' ? formData.suspectMobileNumbers : null,
                    formData.suspectSocialHandles?.length ? JSON.stringify(formData.suspectSocialHandles) : null,
                    formData.suspectAccNo?.length ? JSON.stringify(formData.suspectAccNo) : null,
                    formData.ifscCode?.length ? JSON.stringify(formData.ifscCode) : null,
                    formData.suspectAddress ?? null,
                    formData.Description ?? null,
                    newFileName,
                    newFilePath,
                
                ];

                // Ensure the values length matches the number of columns (34)
                if (values.length !== 34) {
                    console.error("Mismatch in the number of values and columns.");
                    return reject(new Error(`Mismatch in the number of values and columns: Expected 34, got ${values.length}.`));
                }

                // Execute SQL query
                this.db.run(query, values, function (err) {
                    if (err) {
                        console.error("Error inserting complaint:", err);
                        return reject(err);
                    }
                    resolve({ id: this.lastID });
                });
            } catch (error) {
                console.error("Error in insertComplaint:", error);
                reject(error);
            }
        });
    }
    
    // Fetch dashboard statistics (total, pending, and resolved cases)
    async fetchDashboardStats() {
        try {
            // Use a promise-based approach but without creating explicit promises for each query
            const totalCases = await new Promise((resolve, reject) => {
                this.db.get(`SELECT COUNT(*) as totalCases FROM complaint`, (err, row) => {
                    if (err) return reject(err);
                    resolve(row.totalCases);
                });
            });
    
            const pendingCases = await new Promise((resolve, reject) => {
                this.db.get(`SELECT COUNT(*) as pendingCases FROM complaint WHERE action_taken IS NULL OR action_taken = ''`, (err, row) => {
                    if (err) return reject(err);
                    resolve(row.pendingCases);
                });
            });
    
            const resolvedCases = await new Promise((resolve, reject) => {
                this.db.get(`SELECT COUNT(*) as resolvedCases FROM complaint WHERE action_taken IS NOT NULL AND action_taken != ''`, (err, row) => {
                    if (err) return reject(err);
                    resolve(row.resolvedCases);
                });
            });
    
            return { totalCases, pendingCases, resolvedCases };
        } catch (err) {
            // Catch any errors and return the rejected promise
            throw err;
        }
    }    


   //edit page logic
   async updateDocument(documentNumber, updateData) {
    return new Promise((resolve, reject) => {
        console.log(`Fetching document with number: ${documentNumber}`);

        // Step 1: Fetch the document details using the document number
        this.db.get('SELECT id, file_path, file_name FROM complaint WHERE id = ?', [documentNumber], (err, doc) => {
            if (err) {
                console.error("Error fetching document details:", err);
                return reject({ success: false, message: 'Error fetching document details: ' + err.message });
            }
            if (!doc) {
                console.warn("No document found with the given document number:", documentNumber);
                return reject({ success: false, message: 'No document found with the given document number' });
            }

            const documentId = doc.id;
            const originalFilePath = doc.file_path; // Original file path of the document
            console.log("Original file path:", originalFilePath);

            // Step 2: Check if new file content is provided in the updateData
            if (updateData.fileContent) {
                console.log("New file content provided. Proceeding to overwrite the existing file...");

                const providedExtension = path.extname(updateData.fileName) || '.txt'; // Default to .txt if not provided
                const finalFilePath = path.join(this.uploadDir, documentNumber + providedExtension);
                console.log("Final File Path to Save:", finalFilePath);

                // Step 3: Delete the old file if it exists
                if (originalFilePath && fs.existsSync(originalFilePath)) {
                    fs.unlink(originalFilePath, (err) => {
                        if (err) {
                            console.error("Error deleting the old file:", err);
                            return reject({ success: false, message: 'Error deleting the old file: ' + err.message });
                        }
                        console.log("Old file deleted:", originalFilePath);
                    });
                }

                // Step 4: Write the new file content
                fs.writeFile(finalFilePath, Buffer.from(updateData.fileContent), (err) => {
                    if (err) {
                        console.error("Error writing the new file at path:", finalFilePath, err);
                        return reject({ success: false, message: 'Error writing new file: ' + err.message });
                    }
                    console.log("File successfully written at", finalFilePath);

                    // Log the mobile numbers data
                    console.log("Victim Mobile Numbers:", JSON.stringify(updateData.victimMobileNumbers || []));
                    console.log("Suspect Mobile Numbers:", JSON.stringify(updateData.suspectMobileNumbers || []));
                    console.log("Before passing victimMobileNumbers to the query:", JSON.stringify(updateData.victimMobileNumbers));

                    // Step 5: Update the database after the file is written
                    const stmt = this.db.prepare(
                        `UPDATE complaint SET
                            victim_name = ?, victim_gender = ?, victim_age = ?, victim_email = ?, victim_mobile_numbers = ?,
                            acknowledgment_no = ?, cctns_no = ?, fir_no = ?, date_of_complaint = ?, date_of_incident = ?, time = ?,
                            category_of_complaint = ?, sub_category_of_complaint = ?, police_station = ?, investigation_officer = ?,
                            lost_amount = ?, lien_amount = ?, it_act = ?, bns = ?, action_taken = ?, forward_date = ?, out_no = ?,
                            suspect_name = ?, suspect_gender = ?, suspect_age = ?, suspect_email = ?, suspect_mobile_numbers = ?,
                            suspect_social_handles = ?, suspect_acc_no = ?, ifsc_code = ?, suspect_address = ?, description = ?,
                            file_name = ?, file_path = ?
                        WHERE id = ?`
                    );

                    stmt.run(
                        updateData.victimName,
                        updateData.victimGender,
                        updateData.victimAge,
                        updateData.victimEmail,
                        updateData.victimMobileNumbers ? JSON.stringify(updateData.victimMobileNumbers) : null,  // Ensure victim mobile numbers are passed as JSON
                        updateData.acknowledgmentNo,
                        updateData.cctnsNo,
                        updateData.firNo,
                        updateData.dateOfComplaint,
                        updateData.dateOfIncident,
                        updateData.time,
                        updateData.categoryOfComplaint,
                        updateData.subCategoryOfComplaint,
                        updateData.policeStation,
                        updateData.investigationOfficer,
                        updateData.lostAmount,
                        updateData.lienAmount,
                        updateData.itAct,
                        updateData.bns,
                        updateData.actionTaken,
                        updateData.forwardDate,
                        updateData.outNo,
                        updateData.suspectName,
                        updateData.suspectGender,
                        updateData.suspectAge,
                        updateData.suspectEmail,
                        updateData.suspectMobileNumbers ? JSON.stringify(updateData.suspectMobileNumbers) : null,  // Ensure suspect mobile numbers are passed as JSON
                        updateData.suspectSocialHandles ? JSON.stringify(updateData.suspectSocialHandles) : null,  // Ensure social handles are passed as JSON
                        updateData.suspectAccNo ? JSON.stringify(updateData.suspectAccNo) : null,  // Ensure suspect account numbers are passed as JSON
                        updateData.ifscCode ? JSON.stringify(updateData.ifscCode) : null,  // Ensure IFSC codes are passed as JSON
                        updateData.suspectAddress,
                        updateData.description,
                        updateData.fileName,
                        finalFilePath,
                        documentId, // Pass the fetched document ID for update
                        function (err) {
                            if (err) {
                                console.error("Error in updating document:", err);
                                return reject({ success: false, message: 'Database error: ' + err.message });
                            }
                            if (this.changes === 0) {
                                console.warn("No document found or no changes made.");
                                return reject({ success: false, message: "No document found with the given document ID or no changes made" });
                            }
                            console.log("Document updated successfully.");
                            resolve({ success: true });
                        }
                    );

                    stmt.finalize();
                });
            } else {
                // Step 6: If no new file is provided, update only the database fields (keep original file)
                console.log("No new file content provided. Updating database fields only...");
                console.log("Victim Mobile Numbers:", JSON.stringify(updateData.victimMobileNumbers || []));
                console.log("Suspect Mobile Numbers:", JSON.stringify(updateData.suspectMobileNumbers || []));

                const stmt = this.db.prepare(
                    `UPDATE complaint SET
                        victim_name = ?, victim_gender = ?, victim_age = ?, victim_email = ?, victim_mobile_numbers = ?,
                        acknowledgment_no = ?, cctns_no = ?, fir_no = ?, date_of_complaint = ?, date_of_incident = ?, time = ?,
                        category_of_complaint = ?, sub_category_of_complaint = ?, police_station = ?, investigation_officer = ?,
                        lost_amount = ?, lien_amount = ?, it_act = ?, bns = ?, action_taken = ?, forward_date = ?, out_no = ?,
                        suspect_name = ?, suspect_gender = ?, suspect_age = ?, suspect_email = ?, suspect_mobile_numbers = ?,
                        suspect_social_handles = ?, suspect_acc_no = ?, ifsc_code = ?, suspect_address = ?, description = ?
                    WHERE id = ?`
                );

                stmt.run(
                    updateData.victimName,
                    updateData.victimGender,
                    updateData.victimAge,
                    updateData.victimEmail,
                    updateData.victimMobileNumbers ? JSON.stringify(updateData.victimMobileNumbers) : null,
                    updateData.acknowledgmentNo,
                    updateData.cctnsNo,
                    updateData.firNo,
                    updateData.dateOfComplaint,
                    updateData.dateOfIncident,
                    updateData.time,
                    updateData.categoryOfComplaint,
                    updateData.subCategoryOfComplaint,
                    updateData.policeStation,
                    updateData.investigationOfficer,
                    updateData.lostAmount,
                    updateData.lienAmount,
                    updateData.itAct,
                    updateData.bns,
                    updateData.actionTaken,
                    updateData.forwardDate,
                    updateData.outNo,
                    updateData.suspectName,
                    updateData.suspectGender,
                    updateData.suspectAge,
                    updateData.suspectEmail,
                    updateData.suspectMobileNumbers ? JSON.stringify(updateData.suspectMobileNumbers) : null,
                    updateData.suspectSocialHandles ? JSON.stringify(updateData.suspectSocialHandles) : null,
                    updateData.suspectAccNo ? JSON.stringify(updateData.suspectAccNo) : null,
                    updateData.ifscCode ? JSON.stringify(updateData.ifscCode) : null,
                    updateData.suspectAddress,
                    updateData.description,
                    documentId, // Pass the fetched document ID for update
                    function (err) {
                        if (err) {
                            console.error("Error in updating document:", err);
                            return reject({ success: false, message: 'Database error: ' + err.message });
                        }

                        if (this.changes === 0) {
                            console.warn("No document found or no changes made.");
                            return reject({ success: false, message: "No document found with the given document ID or no changes made" });
                        }

                        console.log("Document updated successfully without new file.");
                        resolve({ success: true });
                    }
                );

                stmt.finalize();
            }
        });
    });
}

deleteCase(caseId) {
    return new Promise((resolve, reject) => {
        // Fetch the file path associated with the case ID from the database
        this.db.get('SELECT file_path FROM complaint WHERE id = ?', [caseId], (err, caseRecord) => {
            if (err) {
                console.error('Database error:', err);
                return reject({ success: false, message: 'Database error occurred' });
            }

            console.log("Fetched case record:", caseRecord);

            if (!caseRecord) {
                return reject({ success: false, message: 'Complaint not found' });
            }

            // Validate file_path
            const filePath = caseRecord.file_path;

            // Log file path if available
            if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
                console.log('Attempting to delete file at:', filePath);

                // If file path exists, attempt to delete the file
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting file:', unlinkErr);
                        return reject({ success: false, message: 'Failed to delete file' });
                    }

                    // Proceed to delete the case from the database after file is deleted
                    this.db.run('DELETE FROM complaint WHERE id = ?', [caseId], function (dbErr) {
                        if (dbErr) {
                            console.error('Database error during complaint deletion:', dbErr);
                            return reject({ success: false, message: 'Failed to delete complaint from DB' });
                        }

                        // Successfully deleted both the file and the case
                        resolve({ success: true, message: 'Complaint and file deleted successfully' });
                    });
                });
            } else {
                // If no file path, delete the case directly without deleting the file
                console.log('No valid file path found, deleting complaint without file deletion.');

                this.db.run('DELETE FROM complaint WHERE id = ?', [caseId], function (dbErr) {
                    if (dbErr) {
                        console.error('Database error during complaint deletion:', dbErr);
                        return reject({ success: false, message: 'Failed to delete complaint from DB' });
                    }

                    // Successfully deleted only the case
                    resolve({ success: true, message: 'Complaint deleted, no file associated' });
                });
            }
        });
    });
}
    
    async fetchComplaints(filters = {}) {
        const conditions = [];
        const params = [];

        // Case Number
        if (filters.caseNumber && !isNaN(filters.caseNumber)) {
            conditions.push('id = ?');
            params.push(filters.caseNumber);
        }

        // Category
        if (filters.category && filters.category.trim() !== '') {
            conditions.push('category_of_complaint LIKE ?');
            params.push(`%${filters.category.trim()}%`);
        }

        // Sub Category
        if (filters.subCategory && filters.subCategory.trim() !== '') {
            conditions.push('sub_category_of_complaint LIKE ?');
            params.push(`%${filters.subCategory.trim()}%`);
        }

        // Date Range
        if (filters.dateFrom && filters.dateTo) {
            conditions.push('date_of_complaint BETWEEN ? AND ?');
            params.push(filters.dateFrom, filters.dateTo);
        }

        // Lost Amount
        if (filters.lostAmount && filters.lostAmount.trim() !== '') {
            conditions.push('lost_amount LIKE ?');
            params.push(`%${filters.lostAmount}%`);
        }

        // Lien Amount
        if (filters.lienAmount && filters.lienAmount.trim() !== '') {
            conditions.push('lien_amount LIKE ?');
            params.push(`%${filters.lienAmount}%`);
        }

        // BNS Section
        if (filters.bnsSection && filters.bnsSection.trim() !== '') {
            conditions.push('bns = ?');
            params.push(filters.bnsSection.trim());
        }

        // IT Act Section
        if (filters.itActSection && filters.itActSection.trim() !== '') {
            conditions.push('it_act = ?');
            params.push(filters.itActSection.trim());
        }

        // Police Station
        if (filters.policeStation && filters.policeStation.trim() !== '') {
            conditions.push('police_station LIKE ?');
            params.push(`%${filters.policeStation.trim()}%`);
        }

        // Investigation Officer
        if (filters.investigationOfficer && filters.investigationOfficer.trim() !== '') {
            conditions.push('investigation_officer LIKE ?');
            params.push(`%${filters.investigationOfficer.trim()}%`);
        }

        // Victim Name
        if (filters.victimName && filters.victimName.trim() !== '') {
            conditions.push('victim_name LIKE ?');
            params.push(`%${filters.victimName.trim()}%`);
        }

        // Status
        if (filters.status && filters.status.trim() !== '') {
            conditions.push('status = ?');
            params.push(filters.status.trim());
        }

        // Victim Mobile Numbers
        if (filters.victimMobileNumbers && filters.victimMobileNumbers.trim() !== '') {
            conditions.push('victim_mobile_numbers LIKE ?');
            params.push(`%${filters.victimMobileNumbers.trim()}%`);
        }

        // Action Taken
        if (filters.actionTaken && filters.actionTaken.trim() !== '') {
            conditions.push('action_taken LIKE ?');
            params.push(`%${filters.actionTaken.trim()}%`);
        }

        // Acknowledgment No
        if (filters.acknowledgmentNo && filters.acknowledgmentNo.trim() !== '') {
            conditions.push('acknowledgment_no LIKE ?');
            params.push(`%${filters.acknowledgmentNo.trim()}%`);
        }

        // Construct the base query
        let query = `SELECT * FROM complaint ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}`;

        // Apply sorting
        if (filters.sortBy === 'newest') {
            query += ' ORDER BY date_of_complaint DESC';
        } else if (filters.sortBy === 'oldest') {
            query += ' ORDER BY date_of_complaint ASC';
        }

        console.log(`[SQL EXECUTION]: Query - ${query}`);
        console.log(`[SQL EXECUTION]: Parameters - ${JSON.stringify(params)}`);

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Error executing query:', err);
                    return reject(err);
                }
                console.log('Query Result:', rows);
                resolve(rows);
            });
        });
    }   
    
    async mergeComplaints(complaintIds) {
        if (!Array.isArray(complaintIds) || complaintIds.length < 2) {
            return { success: false, message: 'At least two complaints are required to merge.' };
        }
    
        const placeholders = complaintIds.map(() => '?').join(',');
        const query = `SELECT * FROM complaint WHERE id IN (${placeholders})`;
    
        return new Promise((resolve, reject) => {
            this.db.all(query, complaintIds , (err, rows) => {
                if (err) {
                    console.error('Error fetching complaints for merging:', err);
                    return resolve({ success: false, message: 'Failed to fetch complaints for merging.' });
                }
    
                if (rows.length < 2) {
                    return resolve({ success: false, message: 'At least two complaints are required to merge.' });
                }
    
                // Find the smallest ID
                const smallestId = Math.min(...rows.map(row => row.id));
    
                // Merge complaint data
                const mergedComplaint = {
                    victim_name: rows.map(row => row.victim_name).join('<br>'),
                    victim_gender: rows.map(row => row.victim_gender).join('<br>'),
                    victim_age: rows.map(row => row.victim_age).join('<br>'),
                    victim_email: rows.map(row => row.victim_email).join('<br>'),
                    victim_mobile_numbers: rows.map(row => row.victim_mobile_numbers).join('<br>'),
                    acknowledgment_no: rows.map(row => row.acknowledgment_no).join('<br>'),
                    cctns_no: rows.map(row => row.cctns_no).join('<br>'),
                    fir_no: rows.map(row => row.fir_no).join('<br>'),
                    date_of_complaint: rows.map(row => row.date_of_complaint).join('<br>'),
                    date_of_incident: rows.map(row => row.date_of_incident).join('<br>'),
                    time: rows.map(row => row.time).join('<br>'),
                    category_of_complaint: rows.map(row => row.category_of_complaint).join('<br>'),
                    sub_category_of_complaint: rows.map(row => row.sub_category_of_complaint).join('<br>'),
                    police_station: rows.map(row => row.police_station).join('<br>'),
                    investigation_officer: rows.map(row => row.investigation_officer).join('<br>'),
                    lost_amount: rows.map(row => row.lost_amount).join('<br>'),
                    lien_amount: rows.map(row => row.lien_amount).join('<br>'),
                    it_act: rows.map(row => row.it_act).join('<br>'),
                    bns: rows.map(row => row.bns).join('<br>'),
                    action_taken: rows.map(row => row.action_taken).join('<br>'),
                    forward_date: rows.map(row => row.forward_date).join('<br>'),
                    out_no: rows.map(row => row.out_no).join('<br>'),
                    suspect_name: rows.map(row => row.suspect_name).join('<br>'),
                    suspect_gender: rows.map(row => row.suspect_gender).join('<br>'),
                    suspect_age: rows.map(row => row.suspect_age).join('<br>'),
                    suspect_email: rows.map(row => row.suspect_email).join('<br>'),
                    suspect_mobile_numbers: rows.map(row => row.suspect_mobile_numbers).join('<br>'),
                    suspect_social_handles: rows.map(row => row.suspect_social_handles).join('<br>'),
                    suspect_acc_no: rows.map(row => row.suspect_acc_no).join('<br>'),
                    ifsc_code: rows.map(row => row.ifsc_code).join('<br>'),
                    suspect_address: rows.map(row => row.suspect_address).join('<br>'),
                    description: rows.map(row => row.description).join(' | '),
                    file_name: rows.map(row => row.file_name).join('<br>'),
                    file_path: (() => {
                        const allFiles = rows.flatMap(row => 
                            row.file_path ? row.file_path.split(',').map(f => f.trim()) : []
                        ).filter(f => f);                    
                        return allFiles.length === 0 ? '' : allFiles.join(', ');
                    })(),
                };
    
                // Update the existing complaint with the smallest ID
                const updateQuery = `
                    UPDATE complaint SET
                        victim_name = ?, victim_gender = ?, victim_age = ?, victim_email = ?, victim_mobile_numbers = ?,
                        acknowledgment_no = ?, cctns_no = ?, fir_no = ?, date_of_complaint = ?,
                        date_of_incident = ?, time = ?, category_of_complaint = ?,
                        sub_category_of_complaint = ?, police_station = ?, investigation_officer = ?,
                        lost_amount = ?, lien_amount = ?, it_act = ?, bns = ?,
                        action_taken = ?, forward_date = ?, out_no = ?, suspect_name = ?,
                        suspect_gender = ?, suspect_age = ?, suspect_email = ?,
                        suspect_mobile_numbers = ?, suspect_social_handles = ?, suspect_acc_no = ?,
                        ifsc_code = ?, suspect_address = ?, description = ?, file_name = ?, file_path = ?
                    WHERE id = ?;
                `;
    
                const updateValues = [
                    mergedComplaint.victim_name,
                    mergedComplaint.victim_gender,
                    mergedComplaint.victim_age,
                    mergedComplaint.victim_email,
                    mergedComplaint.victim_mobile_numbers,
                    mergedComplaint.acknowledgment_no,
                    mergedComplaint.cctns_no,
                    mergedComplaint.fir_no,
                    mergedComplaint.date_of_complaint,
                    mergedComplaint.date_of_incident,
                    mergedComplaint.time,
                    mergedComplaint.category_of_complaint,
                    mergedComplaint.sub_category_of_complaint,
                    mergedComplaint.police_station,
                    mergedComplaint.investigation_officer,
                    mergedComplaint.lost_amount,
                    mergedComplaint.lien_amount,
                    mergedComplaint.it_act,
                    mergedComplaint.bns,
                    mergedComplaint.action_taken,
                    mergedComplaint.forward_date,
                    mergedComplaint.out_no,
                    mergedComplaint.suspect_name,
                    mergedComplaint.suspect_gender,
                    mergedComplaint.suspect_age,
                    mergedComplaint.suspect_email,
                    mergedComplaint.suspect_mobile_numbers,
                    mergedComplaint.suspect_social_handles,
                    mergedComplaint.suspect_acc_no,
                    mergedComplaint.ifsc_code,
                    mergedComplaint.suspect_address,
                    mergedComplaint.description,
                    mergedComplaint.file_name,
                    mergedComplaint.file_path,
                    smallestId
                ];
    
                // Update the merged complaint
                this.db.run(updateQuery, updateValues, (err) => {
                    if (err) {
                        console.error('Error updating merged complaint:', err.message);
                        return resolve({ success: false, message: `Failed to update merged complaint: ${err.message}` });
                    }
    
                    // Now delete all complaints except the one with the smallest ID
                    const deleteQuery = `DELETE FROM complaint WHERE id IN (${complaintIds.join(', ')}) AND id != ?`;
                    this.db.run(deleteQuery, [smallestId], (deleteErr) => {
                        if (deleteErr) {
                            console.error('Error deleting original complaints:', deleteErr.message);
                            return resolve({ success: false, message: `Failed to delete original complaints: ${deleteErr.message}` });
                        }
    
                        resolve({ success: true, mergedData: mergedComplaint });
                    });
                });
            });
        });
    }
    
    // Exports documents to an Excel file
    async exportToExcel(documents, outputPath) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Documents');
    
        // Define worksheet columns
        worksheet.columns = [
            { header: 'S.No', key: 'serial_number' },
            { header: 'Victim Name', key: 'victim_name' },
            { header: 'Victim Gender', key: 'victim_gender' },
            { header: 'Victim Age', key: 'victim_age' },
            { header: 'Victim Email', key: 'victim_email' },
            { header: 'Victim Mob No', key: 'victim_mobile_numbers' },
            { header: 'Ack No', key: 'acknowledgment_no' },
            { header: 'CCTNS No', key: 'cctns_no' },
            { header: 'FIR No', key: 'fir_no' },
            { header: 'Date of Complaint', key: 'date_of_complaint' },
            { header: 'Date of Incident', key: 'date_of_incident' },
            { header: 'Time', key: 'time' },
            { header: 'Category', key: 'category_of_complaint' },
            { header: 'Sub-Category', key: 'sub_category_of_complaint' },
            { header: 'Police Station', key: 'police_station' },
            { header: 'Investigation Officer', key: 'investigation_officer' },
            { header: 'Lost Amt', key: 'lost_amount' },
            { header: 'Lien Amt', key: 'lien_amount' },
            { header: 'IT Act', key: 'it_act' },
            { header: 'BNS', key: 'bns' },
            { header: 'Action Taken', key: 'action_taken' },
            { header: 'Forward Date', key: 'forward_date' },
            { header: 'Out No', key: 'out_no' },
            { header: 'Suspect Name', key: 'suspect_name' },
            { header: 'Suspect Gender', key: 'suspect_gender' },
            { header: 'Suspect Age', key: 'suspect_age' },
            { header: 'Suspect Email', key: 'suspect_email' },
            { header: 'Suspect Mob No', key: 'suspect_mobile_numbers' },
            { header: 'Suspect Social Handles', key: 'suspect_social_handles' },
            { header: 'Suspect Acc No', key: 'suspect_acc_no' },
            { header: 'IFSC Code', key: 'ifsc_code' },
            { header: 'File Name', key: 'file_name' },
            { header: 'File Path', key: 'file_path' },
            { header: 'Suspect Address', key: 'suspect_address' },
            { header: 'Description', key: 'description' },
        ];
    
        // Helper function to replace <br> with line breaks
        const formatCellValue = (value) => {
            if (value === null || value === undefined || value === '') return 'N/A';
        
            // Handle arrays
            if (Array.isArray(value)) {
                const filtered = value
                    .map(item => String(item).trim()) // Ensure all items are strings and trimmed
                    .filter(item => item !== ''); // Remove empty strings
        
                if (filtered.length === 0) return 'N/A';
                return filtered.length === 1 ? filtered[0] : filtered.join('\n');
            }
        
            // Process strings
            const formattedValue = String(value)
                .replace(/<br\s*\/?>/gi, '\n') // Replace all <br> variants
                .split('\n')
                .map(line => line.trim())
                .filter(line => line !== '')
                .join('\n');
        
            return formattedValue || 'N/A';
        };
    
        // Add rows with formatted data
        documents.forEach((doc, index) => {
            const filePath = doc.file_path ? doc.file_path.replace(/\\/g, '/') : '';
            const hyperlink = filePath ? `file:///${filePath}` : '';
            const finalFilePath = filePath ? { text: filePath, hyperlink } : 'N/A';
    
            const row = worksheet.addRow({
                serial_number: index + 1,
                victim_name: formatCellValue(doc.victim_name),
                victim_gender: formatCellValue(doc.victim_gender),
                victim_age: formatCellValue(doc.victim_age),
                victim_email: formatCellValue(doc.victim_email),
                victim_mobile_numbers: formatCellValue(doc.victim_mobile_numbers),
                acknowledgment_no: formatCellValue(doc.acknowledgment_no),
                cctns_no: formatCellValue(doc.cctns_no),
                fir_no: formatCellValue(doc.fir_no),
                date_of_complaint: formatCellValue(doc.date_of_complaint),
                date_of_incident: formatCellValue(doc.date_of_incident),
                time: formatCellValue(doc.time),
                category_of_complaint: formatCellValue(doc.category_of_complaint),
                sub_category_of_complaint: formatCellValue(doc.sub_category_of_complaint),
                police_station: formatCellValue(doc.police_station),
                investigation_officer: formatCellValue(doc.investigation_officer),
                lost_amount: formatCellValue(doc.lost_amount),
                lien_amount: formatCellValue(doc.lien_amount),
                it_act: formatCellValue(doc.it_act),
                bns: formatCellValue(doc.bns),
                action_taken: formatCellValue(doc.action_taken),
                forward_date: formatCellValue(doc.forward_date),
                out_no: formatCellValue(doc.out_no),
                suspect_name: formatCellValue(doc.suspect_name),
                suspect_gender: formatCellValue(doc.suspect_gender),
                suspect_age: formatCellValue(doc.suspect_age),
                suspect_email: formatCellValue(doc.suspect_email),
                suspect_mobile_numbers: formatCellValue(doc.suspect_mobile_numbers),
                suspect_social_handles: formatCellValue(doc.suspect_social_handles),
                suspect_acc_no: formatCellValue(doc.suspect_acc_no),
                ifsc_code: formatCellValue(doc.ifsc_code),
                file_name: formatCellValue(doc.file_name),
                file_path: finalFilePath,
                suspect_address: formatCellValue(doc.suspect_address),
                description: formatCellValue(doc.description),
            });
    
            // Force text wrapping for all cells
            row.eachCell((cell) => {
                cell.alignment = { 
                    wrapText: true,
                    vertical: 'top'
                };
            });
        });
    
        // Set column widths
        worksheet.columns.forEach(column => {
            column.width = 30;
        });
    
        await workbook.xlsx.writeFile(outputPath);
        return outputPath;
    }

    async generatePDFFromExcel(excelPath, outputPath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        const worksheet = workbook.worksheets[0];
    
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);
    
        doc.fontSize(20).text('Document Search Results', { align: 'center' });
        doc.moveDown();
    
        const tableTop = 100;
        const rowHeight = 20;
        const columnWidths = [45, 40, 55, 50, 50, 50, 60, 50, 65, 50];
        let currentY = tableTop;
    
        // Draw the header row
        const headerCells = worksheet.getRow(1).values.slice(1);
        doc.fontSize(10).font('Helvetica-Bold');
        headerCells.forEach((cell, index) => {
            const cellText = String(cell || '');
            const xPosition = 50 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
    
            // Draw cell border
            doc.rect(xPosition, currentY, columnWidths[index] || 0, rowHeight).stroke();
    
            // Draw cell text
            doc.text(cellText, xPosition + 2, currentY + 2, {
                width: (columnWidths[index] || 0) - 4,
                height: rowHeight,
                ellipsis: true,
                align: 'left'
            });
        });
        currentY += rowHeight;
    
        // Draw the data rows
        doc.font('Helvetica').fontSize(10);
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const cells = row.values.slice(1);
                cells.forEach((cell, index) => {
                    const cellText = String(cell && cell.text ? cell.text : cell || '');
                    const xPosition = 50 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
    
                    // Ensure column width is a valid number
                    const width = columnWidths[index] || 0;
    
                    // Draw cell border
                    doc.rect(xPosition, currentY, width, rowHeight).stroke();
    
                    // Draw cell text
                    doc.text(cellText, xPosition + 2, currentY + 2, {
                        width: width - 4,
                        height: rowHeight,
                        ellipsis: true,
                        align: 'left'
                    });
                });
                currentY += rowHeight;
            }
        });
        doc.end();
    
        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                // Delete the temporary Excel file after PDF generation
                fs.unlink(excelPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            stream.on('error', reject);
        });
    }

    async downloadSearchResults(filters, format,downloadsDir) {
        console.log("downloads dir received in backedn.js:",downloadsDir);
        const supportedFormats = ['excel', 'pdf'];
        if (!supportedFormats.includes(format)) {
            throw new Error('Unsupported format');
        }
    
        if (!downloadsDir) {
            throw new Error('downloadsDir is not defined');
        }
    
        const documents = await this.fetchComplaints(filters);
        if (!documents || documents.length === 0) {
            throw new Error('No complaints found');
        }
    
        // Generate a unique file name by checking existing files
        let fileIndex = 1;
        let filePath;
        do {
            filePath = path.join(this.downloadsDir, `search_results${fileIndex}.${format === 'excel' ? 'xlsx' : format}`);

            fileIndex++;
        } while (fs.existsSync(filePath));
    
        try {
            if (format === 'excel') {
                await this.exportToExcel(documents, filePath);
                return { success: true, path: filePath };
            } else if (format === 'pdf') {
                const excelPath = path.join(this.downloadsDir, 'search_results_temp.xlsx');
                console.log("creating temporary excel for pdf generation",excelPath );
                await this.exportToExcel(documents, excelPath);
                console.log("generatign pdf at:",filePath);
                await this.generatePDFFromExcel(excelPath, filePath);
                if (fs.existsSync(excelPath)) {
                    console.log("Deleting temporary Excel file:", excelPath);
                    fs.unlinkSync(excelPath);
                } else {
                    console.warn("Temporary Excel file not found for deletion:", excelPath);
                }
    
                return { success: true, path: filePath };
            }
        } catch (err) {
            console.error('Error during download:', err);
            return { success: false, message: err.message };
        }
    }        
}
module.exports = DatabaseManager;