// DOM Elements
const pageTitleEl = document.getElementById('pageTitle');
const pageUrlEl = document.getElementById('pageUrl');
const folderNameInput = document.getElementById('folderName');
const saveHtmlCheckbox = document.getElementById('saveHtml');
const saveMarkdownCheckbox = document.getElementById('saveMarkdown');
const saveImagesCheckbox = document.getElementById('saveImages');
const captureBtn = document.getElementById('captureBtn');
const statusEl = document.getElementById('status');

// Initialize Turndown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

// Add rules for better Markdown conversion
turndownService.addRule('removeScripts', {
  filter: ['script', 'style', 'noscript', 'iframe'],
  replacement: () => ''
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadCurrentTab();
});

// Load saved settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['folderName', 'saveHtml', 'saveMarkdown', 'saveImages']);
    if (result.folderName) {
      folderNameInput.value = result.folderName;
    }
    if (result.saveHtml !== undefined) {
      saveHtmlCheckbox.checked = result.saveHtml;
    }
    if (result.saveMarkdown !== undefined) {
      saveMarkdownCheckbox.checked = result.saveMarkdown;
    }
    if (result.saveImages !== undefined) {
      saveImagesCheckbox.checked = result.saveImages;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings
async function saveSettings() {
  try {
    await chrome.storage.local.set({
      folderName: folderNameInput.value || 'Copyable-Capture',
      saveHtml: saveHtmlCheckbox.checked,
      saveMarkdown: saveMarkdownCheckbox.checked,
      saveImages: saveImagesCheckbox.checked
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Load current tab info
async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      pageTitleEl.textContent = tab.title || 'タイトルなし';
      pageUrlEl.textContent = tab.url || '-';
      pageTitleEl.title = tab.title || '';
      pageUrlEl.title = tab.url || '';
    }
  } catch (error) {
    console.error('Failed to get current tab:', error);
    pageTitleEl.textContent = 'エラー';
    pageUrlEl.textContent = 'ページ情報を取得できませんでした';
  }
}

// Save settings on change
folderNameInput.addEventListener('change', saveSettings);
saveHtmlCheckbox.addEventListener('change', saveSettings);
saveMarkdownCheckbox.addEventListener('change', saveSettings);
saveImagesCheckbox.addEventListener('change', saveSettings);

// Capture button click
captureBtn.addEventListener('click', async () => {
  if (!saveHtmlCheckbox.checked && !saveMarkdownCheckbox.checked) {
    showStatus('少なくとも1つの保存形式を選択してください', 'error');
    return;
  }

  captureBtn.disabled = true;
  captureBtn.classList.add('loading');
  showStatus('');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      throw new Error('ページ情報を取得できませんでした');
    }

    // Check if we can access this page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      throw new Error('このページは保存できません');
    }

    // Inject content script and get page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getPageContent
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error('ページコンテンツを取得できませんでした');
    }

    const { html, title, url, images } = results[0].result;
    const folderName = folderNameInput.value || 'Copyable-Capture';
    const sanitizedTitle = sanitizeFilename(title || 'untitled');
    const hostname = new URL(url).hostname;
    const basePath = `${folderName}/${hostname}/${sanitizedTitle}`;

    let savedCount = 0;
    let imageCount = 0;

    // Download images if enabled
    let imageMap = {};
    if (saveImagesCheckbox.checked && images && images.length > 0) {
      showStatus(`画像をダウンロード中... (0/${images.length})`);

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        try {
          const filename = `image_${i + 1}${getExtension(img.src)}`;
          const imagePath = `${basePath}/images/${filename}`;

          await downloadImageFile(img.src, imagePath);
          imageMap[img.src] = `images/${filename}`;
          imageCount++;

          showStatus(`画像をダウンロード中... (${imageCount}/${images.length})`);
        } catch (e) {
          console.warn(`Failed to download image: ${img.src}`, e);
        }
      }
    }

    // Process HTML with local image paths if images were downloaded
    let processedHtml = html;
    if (imageCount > 0) {
      processedHtml = replaceImagePaths(html, imageMap);
    }

    // Save HTML
    if (saveHtmlCheckbox.checked) {
      const htmlWithMeta = createHtmlDocument(processedHtml, title, url, imageCount > 0);
      await downloadFile(htmlWithMeta, `${basePath}/page.html`, 'text/html');
      savedCount++;
    }

    // Save Markdown
    if (saveMarkdownCheckbox.checked) {
      const markdown = convertToMarkdown(processedHtml, title, url);
      await downloadFile(markdown, `${basePath}/page.md`, 'text/markdown');
      savedCount++;
    }

    let statusMessage = `${savedCount}ファイルを保存しました`;
    if (imageCount > 0) {
      statusMessage += ` (画像: ${imageCount}枚)`;
    }
    showStatus(statusMessage, 'success');

  } catch (error) {
    console.error('Capture error:', error);
    showStatus(error.message || '保存に失敗しました', 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
});

// Get page content (injected into tab)
function getPageContent() {
  // Clone the document to avoid modifying the original
  const clone = document.cloneNode(true);

  // Remove scripts, styles, and other non-content elements
  const removeSelectors = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas'];
  removeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Get the main content
  const mainContent = clone.querySelector('main, article, [role="main"], .main-content, #main-content, #content, .content');
  const bodyContent = mainContent || clone.body;

  // Collect all images with absolute URLs
  const images = [];
  const seenUrls = new Set();

  document.querySelectorAll('img').forEach(img => {
    if (img.src && img.src.startsWith('http') && !seenUrls.has(img.src)) {
      seenUrls.add(img.src);
      images.push({
        src: img.src,
        alt: img.alt || ''
      });
    }
  });

  return {
    html: bodyContent ? bodyContent.innerHTML : clone.body.innerHTML,
    title: document.title,
    url: window.location.href,
    images: images
  };
}

// Replace image paths in HTML with local paths
function replaceImagePaths(html, imageMap) {
  let result = html;
  for (const [originalUrl, localPath] of Object.entries(imageMap)) {
    // Escape special regex characters in URL
    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedUrl, 'g'), localPath);
  }
  return result;
}

// Get file extension from URL
function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
    return match ? match[0].toLowerCase() : '.jpg';
  } catch {
    return '.jpg';
  }
}

// Create HTML document with metadata
function createHtmlDocument(bodyHtml, title, url, hasLocalImages = false) {
  const date = new Date().toISOString();
  const imageNote = hasLocalImages ? '<br><strong>注意:</strong> 画像はimages/フォルダに保存されています' : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="source-url" content="${escapeHtml(url)}">
  <meta name="captured-date" content="${date}">
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .capture-meta {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #666;
    }
    .capture-meta a {
      color: #0066cc;
      text-decoration: none;
    }
    .capture-meta a:hover {
      text-decoration: underline;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="capture-meta">
    <strong>元のページ:</strong> <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a><br>
    <strong>保存日時:</strong> ${date}${imageNote}
  </div>
  <article>
    ${bodyHtml}
  </article>
</body>
</html>`;
}

// Convert HTML to Markdown
function convertToMarkdown(html, title, url) {
  const date = new Date().toISOString();

  // Convert HTML to Markdown
  const markdown = turndownService.turndown(html);

  // Add metadata header
  return `# ${title}

> **元のURL:** ${url}
> **保存日時:** ${date}

---

${markdown}
`;
}

// Download file using Chrome Downloads API
async function downloadFile(content, filename, mimeType) {
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// Download image file from URL
async function downloadImageFile(imageUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: imageUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}

// Sanitize filename
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100)
    .trim();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show status message
function showStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = 'status';
  if (type) {
    statusEl.classList.add(type);
  }

  // Add icon based on type
  if (type === 'success') {
    statusEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      ${message}
    `;
  } else if (type === 'error') {
    statusEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      ${message}
    `;
  }
}
