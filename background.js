// Background service worker for Copyable Capture

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings
        chrome.storage.local.set({
            folderName: 'Copyable-Capture',
            saveHtml: true,
            saveMarkdown: true
        });
        console.log('Copyable Capture installed successfully');
    }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'downloadFile') {
        handleDownload(message.content, message.filename, message.mimeType)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }
});

// Handle file download
async function handleDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    try {
        await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: false
        });
    } finally {
        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
}
