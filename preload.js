const { contextBridge, ipcRenderer } = require('electron');

// Expose Electron APIs to the renderer process securely
contextBridge.exposeInMainWorld('electronAPI', {
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    saveComplaint: (complaintData) => ipcRenderer.invoke('save-complaint', complaintData),
    fetchDashboardStats: () => ipcRenderer.invoke('fetch-dashboard-stats'),
    fetchComplaints: (filters) => ipcRenderer.invoke('fetch-complaints', filters),
    navigateToFile: (filePath) => ipcRenderer.invoke('navigateToFile', filePath),
    onSearchResults: (callback) => ipcRenderer.on('searchResults', (event, results) => callback(results)),
    deleteCase: (complaintId) => ipcRenderer.invoke('deleteCase', complaintId),
    onEvent: (eventName, callback) => ipcRenderer.on(eventName, (event, data) => callback(data)),
    downloadSearchResults: (filters, format) => ipcRenderer.invoke('downloadSearchResults', filters, format),
    mergeComplaints: (complaintIds) => ipcRenderer.invoke('mergeComplaints', complaintIds),
    deleteMergedComplaint: (mergedComplaintId) => ipcRenderer.invoke('deleteMergedComplaint', mergedComplaintId),
    updateComplaint: (complaintNumber, updateData) => ipcRenderer.invoke('updateComplaint', complaintNumber, updateData),
    fetchComplaintDetails: async (acknowledgmentNo) => ipcRenderer.invoke('fetch-complaint-details', acknowledgmentNo),
    removeAllListeners: (eventName) => ipcRenderer.removeAllListeners(eventName),
});
