const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./backend');
const{stringify} = require('querystring');
const { dialog } = require('electron');



class ElectronApp {
    constructor() {
        this.setupLogging();
        console.log("Logging initialized.");
        // Directory paths
        console.log("initializing paths");     
        
        this.dbPath= path.join(app.getPath('userData'), 'data.db');
        this.uploadDir = path.join(app.getPath('userData'), 'uploaded-files');
        console.log("db path:",this.dbPath);
        this.downloadsDir = path.join(app.getPath('userData'), 'downloads');
        this.dbManager = new DatabaseManager(this.dbPath,this.downloadsDir,this.uploadDir);
        console.log("app started");
        
    }
    setupLogging() {
        {
        // Define the log file path
        this.logFile = path.join(app.getPath('userData'), 'app.log');
        
        // Ensure the log path exists
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
        const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
        
        const log = (level, message) => {
            const timestamp = new Date().toISOString();
            const formattedMessage = `[${timestamp}] [${level}] ${message}\n`;
            logStream.write(formattedMessage);
            process.stdout.write(formattedMessage);
        };

        console.log = (message) => log('INFO', message);
        console.error = (message) => log('ERROR', message);
    }

    // Initialize the app (database, lifecycle, IPC handlers)
    async initialize() {
        try {
            await this.dbManager.initialize();
            console.log("setting up backupp scheduler....");
            this.setupBackupScheduler()
            console.log("backup scheduler set ok..");
            this.setupAppLifecycle();
            this.setupIpcHandlers();
        } catch (error) {
            console.error('Application initialization error:', error);
            app.quit();
        }
    }

    setupAppLifecycle() {
        app.whenReady().then(() => {
            this.createMainWindow();
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });

        app.on('second-instance', () => {
            console.log('Second instance detected.');
            if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
            }
        });
    }

    // Create the main window
    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: true,
                cache:true,
            },
        });

        this.mainWindow.loadFile(path.join(__dirname, 'templates', 'login.html')).catch((err) => {
            console.error('Failed to load login.html:', err);
        });

        this.mainWindow.setMenuBarVisibility(false);
        this.mainWindow.on('close', async (e) => {
            if (this.checkpointInProgress) return;
            this.checkpointInProgress = true;
        
            e.preventDefault(); // prevent closing for now
        
            console.log('[INFO] Window close detected. Running WAL checkpoint...');
        
            try {
                await this.dbManager.checkpointAndClose();
                console.log('[INFO] WAL checkpoint completed. Closing now...');
            } catch (err) {
                console.error("[ERROR] Checkpoint process failed:", err.message);
            }
        
            this.mainWindow.destroy();
            app.quit();
        });
        
    }

    // Backup functionality
    setupBackupScheduler() {
        const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;
        const BACKUP_DIR = 'D:\\complaint-backup';
        const LAST_BACKUP_FILE = path.join(app.getPath('userData'), 'last-backup-time.json');
    
        const ensureDirectoryExists = (dirPath) => {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`Directory created: ${dirPath}`);
            }
        };
    
        const getLastBackupTime = () => {
            if (fs.existsSync(LAST_BACKUP_FILE)) {
                const data = JSON.parse(fs.readFileSync(LAST_BACKUP_FILE, 'utf8'));
                return new Date(data.lastBackupTime).getTime();
            }
            return 0; // No previous backup
        };
    
        const saveBackupTime = () => {
            ensureDirectoryExists(BACKUP_DIR);
            const now = new Date().toISOString();
            fs.writeFileSync(LAST_BACKUP_FILE, JSON.stringify({ lastBackupTime: now }), 'utf8');
            console.log('Backup time saved.');
        };
    
        const createBackup = () => {
            console.log('Starting backup process...');
            try {
                ensureDirectoryExists(BACKUP_DIR);
    
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);
                ensureDirectoryExists(backupFolder);
    
                // Backup database
                const dbBackupPath = path.join(backupFolder, 'data.db');
                if (fs.existsSync(this.dbPath)) {
                    fs.copyFileSync(this.dbPath, dbBackupPath);
                    console.log(`Database backed up to: ${dbBackupPath}`);
                } else {
                    console.error('Database file not found:', this.dbPath);
                }
    
                // Backup uploaded files
                const uploadedFilesBackupDir = path.join(backupFolder, 'uploaded-files');
                if (fs.existsSync(this.uploadDir)) {
                    ensureDirectoryExists(uploadedFilesBackupDir);
                    fs.cpSync(this.uploadDir, uploadedFilesBackupDir, { recursive: true });
                    console.log(`Uploaded files backed up to: ${uploadedFilesBackupDir}`);
                } else {
                    console.error('Uploaded files directory not found:', this.uploadDir);
                }
    
                saveBackupTime();
                retainLatestBackups();
            } catch (error) {
                console.error('Error during backup:', error);
            }
        };
    
        const retainLatestBackups = () => {
            const backupFolders = fs.readdirSync(BACKUP_DIR)
                .map(folder => path.join(BACKUP_DIR, folder))
                .filter(folder => fs.lstatSync(folder).isDirectory());
    
            backupFolders.sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);
    
            if (backupFolders.length > 3) {
                const foldersToDelete = backupFolders.slice(3);
                foldersToDelete.forEach(folder => {
                    fs.rmSync(folder, { recursive: true, force: true });
                    console.log(`Old backup deleted: ${folder}`);
                });
            }
        };
    
        // Periodically check if backup is needed (every hour)
        setInterval(() => {
            const lastBackupTime = getLastBackupTime();
            const now = Date.now();
    
            if (now - lastBackupTime >= BACKUP_INTERVAL) {
                createBackup();
            }
        }, 24 * 60 * 60 * 1000); // Check every hour
    }

    // Set up IPC handlers to communicate with renderer process
    setupIpcHandlers() {
        ipcMain.handle('login', async (_, credentials) => {
            try {
                return await this.dbManager.authenticateUser(credentials.username, credentials.password, credentials.userType);
            } catch (error) {
                console.error('Error during user login:', error);
                return { success: false, message: 'Login failed. Please try again.' };
            }
        });

        ipcMain.handle('navigateToFile', (_, filePath, queryParams) => {
            try {
                const absolutePath = path.join(__dirname, 'templates', filePath);
                const url = new URL(`file://${absolutePath}`);
                
                // If there are query parameters, append them to the URL
                if (queryParams) {
                    Object.keys(queryParams).forEach(key => {
                        url.searchParams.append(key, queryParams[key]);
                    });
                }
        
                if (this.mainWindow) {
                    this.mainWindow.loadURL(url.toString());
                }
                return { success: true };
            } catch (error) {
                console.error('Error navigating to file:', error);
                return { success: false, message: 'Navigation failed.' };
            }
        });

        ipcMain.handle('save-complaint', async (_, complaintData) => {
            try {
                await this.dbManager.insertComplaint(complaintData);
                return { success: true, message: 'Complaint saved successfully.' };
            } catch (error) {
                console.error('Error saving complaint:', error);
                return { success: false, message: 'Failed to save complaint.' };
            }
        });

        ipcMain.handle('fetch-dashboard-stats', async () => {
            try {
                return await this.dbManager.fetchDashboardStats();
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                return { success: false, message: 'Failed to fetch dashboard stats.' };
            }
        });

        ipcMain.handle('fetch-complaints', async (_, filters) => {
            try {
                return await this.dbManager.fetchComplaints(filters);
            } catch (error) {
                console.error('Error fetching complaints:', error);
                throw error;
            }
        });
      
        ipcMain.handle('confirm-update', async () => {
            const response = await dialog.showMessageBox({
                type: 'warning',
                buttons: ['Cancel', 'Update'],
                defaultId: 1,
                title: 'Confirm Update',
                message: 'Are you sure you want to update this cell?',
            });
            return response.response === 1; // true = confirm, false = cancel
        });

        ipcMain.handle('update-cell', async (_, rowId, updatedValue) => {
            try {
                console.log("Update request received:", "Row ID:", rowId, "Updated Value:", updatedValue);
        
                if (!this.dbManager) throw new Error("DatabaseManager is not initialized.");
                if (!rowId) throw new Error("Missing rowId. Cannot update.");
        
                const field = Object.keys(updatedValue)[0];
                const value = Object.values(updatedValue)[0];
        
                console.log("🔍 Extracted Field:", field, "Value:", value);
        
                const result = await this.dbManager.updateCell(rowId, field, value);
        
                console.log("Update result:", result);
                return result;
            } catch (error) {
                console.error("Update error:", error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('deleteCase', async (_, caseId) => {
            try {
                console.log(`Deleting complaint with ID: ${caseId}`);
        
                // Show confirmation dialog
                const response = await dialog.showMessageBox({
                    type: 'warning',
                    buttons: ['Cancel', 'Delete'],
                    defaultId: 1,
                    title: 'Confirm Deletion',
                    message: 'Are you sure you want to delete this Complaint?',
                });
        
                // If the user chooses 'Delete', proceed with the deletion
                if (response.response === 1) {
                    const result = await this.dbManager.deleteCase(caseId);
                    return result;
                } else {
                    return { success: false, message: 'Complaint deletion cancelled.' };
                }
            } catch (error) {
                console.error(`Error deleting complaint: ${error}`);
                return { success: false, message: 'Complaint deletion failed.' };
            }
        });
        

        ipcMain.handle('downloadSearchResults', async (_, filters, format) => {
            console.log("download diredctory in mian.js before passing to backend:",this.downloadsDir);
            try {
                console.log(`Downloading search results with filters: ${JSON.stringify(filters)} and format: ${format}`);
                return await this.dbManager.downloadSearchResults(filters, format,this.downloadsDir);
            } catch (error) {
                console.error(`Error downloading search results: ${error}`);
                return { success: false, message: 'Download failed.' };
            }
        });

        ipcMain.handle('mergeComplaints', async (_, complaintIds) => {
            try {
                console.log('Merging complaints:', complaintIds);
                return await this.dbManager.mergeComplaints(complaintIds);
               
            } catch (error) {
                console.error('Error during merging complaints:', error);
                return { success: false, message: `Merge failed: ${error.message}` };            }
        });

        ipcMain.handle('deleteMergedComplaint', async (_, mergedId) => {
            try {
              const result = await dbManager.deleteCase(mergedId);
              return result;
            } catch (error) {
              console.error('Error deleting merged complaint:', error);
              return { success: false, message: 'Failed to delete merged complaint' };
            }
          });
        
          ipcMain.handle('unmerge-complaints', async (event, mergedCaseId) => {
            try {
                console.log("Received unmerge request for:", mergedCaseId);
        
                
                const result = await this.dbManager.unmergeComplaint(mergedCaseId);
        
                console.log("Unmerge result from db:", result);
                return result;
            } catch (error) {
                console.error("Unmerge error:", error.message);
                return { success: false, message: error.message };
            }
        });

        ipcMain.handle('fetch-complaint-details', async (event, acknowledgmentNo) => {
            try {
                const complaint = await dbManager.fetchComplaintDetails(acknowledgmentNo);
                return complaint; // Send the complaint data back to the renderer
            } catch (error) {
                console.error('Error fetching complaint details:', error);
                throw new Error('Failed to fetch complaint details');
            }
        });

    } 
}

// Ensure the app is a single instance
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
    app.quit();
} else {
    const myApp = new ElectronApp();
    app.on('ready', () => myApp.initialize());
}
