const { filesize } = require("core/utils");
const __window_core = require("../core");

/**
 * @class __window_upload_progress
 * @extends __window_core
 * Window hiển thị tiến trình upload ở góc phải dưới màn hình
 */
class __window_upload_progress extends __window_core {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);
    this.addUploadItem = this.addUploadItem.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.completeUpload = this.completeUpload.bind(this);
    this.cancelAll = this.cancelAll.bind(this);
  }

  /**
   * Initialize class
   */
  static initClass() {
    this.prototype.figName = "window_upload_progress";
  }

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    
    // State management
    this._uploadItems = []; // Array of upload items: { id, file, progress, speed, status, queue }
    this._isExpanded = true;
    this._totalFiles = 0;
    this._fileProgressMap = {}; // Track progress for speed calculation
    this._pendingProgressUpdates = new Map(); // Queue progress updates when DOM not ready
    this._updateRetryCount = new Map(); // Track retry count to avoid infinite loops
    this._progressListeners = new Map(); // Store progress listeners for cleanup
    
    // Set window position to bottom right corner
    const width = 360;
    const height = 280;
    this.size = {
      width: width,
      height: height,
      minWidth: 320,
      minHeight: 80,
    };
    
    // Position at bottom right, aligned with dock launcher
    // Dock launcher is at bottom: 60px, so we position window above it
    // Dock height is approximately 48-50px, so we add padding of ~20px = ~130px from bottom
    this.style.set({
      position: "fixed",
      right: 24,
      bottom: 130, // Aligned with dock launcher (60px dock bottom + ~70px height/padding)
      width: width,
      height: height,
      zIndex: 10000,
    });
    
    // Listen to global upload events
    this._setupGlobalListeners();
  }

  /**
   * Setup global listeners for upload events
   */
  _setupGlobalListeners() {
    // Listen to RADIO_MEDIA events for upload progress
    if (typeof RADIO_MEDIA !== 'undefined') {
      RADIO_MEDIA.on("upload:queue:created", this._onUploadQueueCreated.bind(this));
      RADIO_MEDIA.on("upload:start", this._onUploadStart.bind(this));
      RADIO_MEDIA.on("upload:progress", this._onUploadProgress.bind(this));
      RADIO_MEDIA.on("upload:end", this._onUploadEnd.bind(this));
      RADIO_MEDIA.on("upload:error", this._onUploadError.bind(this));
    }
  }

  /**
   * Handle upload queue created event
   * This receives upload information: queue, destination, token, etc.
   */
  _onUploadQueueCreated(data) {
    if (!data || !data.queue) return;
    
    this.debug("_onUploadQueueCreated: Queue created", data);
    
    // Store queue reference and setup progress tracking
    const queue = data.queue;
    
    // Listen to progress events from queue
    if (queue.on) {
      // Create progress handler that checks status before updating
      const progressHandler = (progressPercent) => {
        this.debug(`_onUploadQueueCreated: Progress event received: ${progressPercent}%`);
        
        // Find current uploading file from queue
        let currentFile = null;
        let fileName = null;
        
        // Try to get from pendingItem first
        if (queue.pendingItem && queue.pendingItem.file) {
          currentFile = queue.pendingItem.file;
          fileName = currentFile.name;
        }
        // Fallback to xhr array - find active xhr
        else if (queue.xhr && queue.xhr.length > 0) {
          const activeXhrs = queue.xhr.filter(xhr => xhr.file && xhr.readyState < 4);
          if (activeXhrs.length > 0) {
            currentFile = activeXhrs[activeXhrs.length - 1].file;
            fileName = currentFile ? currentFile.name : null;
          } else {
            // Use last xhr if no active ones
            const lastXhr = queue.xhr[queue.xhr.length - 1];
            if (lastXhr && lastXhr.file) {
              currentFile = lastXhr.file;
              fileName = currentFile.name;
            }
          }
        }
        
        // If we found a file, check status before updating
        if (fileName) {
          const item = this._findUploadItem(fileName);
          // Skip if item is already completed, cancelled, or error
          if (item && (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error')) {
            console.log(`⏭️ [UPLOAD_PROGRESS] Skipping progress update for ${fileName} - status is ${item.status}`);
            return;
          }
          
          // Skip if progress is already 100% - wait for completion
          if (item && item.progress >= 100) {
            console.log(`⏭️ [UPLOAD_PROGRESS] Skipping progress update for ${fileName} - progress already 100%, waiting for completion`);
            return;
          }
          
          // Skip if progressPercent is 100% - wait for completion event
          // This check MUST be before any progress calculation or updateProgress call
          if (progressPercent >= 100) {
            console.log(`⏭️ [UPLOAD_PROGRESS] Progress listener: Skipping progress update for ${fileName} - progress is 100%, waiting for completion event`);
            return;
          }
          
          // Calculate speed using instance-level map
          if (!this._fileProgressMap[fileName]) {
            this._fileProgressMap[fileName] = { lastProgress: 0, lastTime: Date.now() };
          }
          
          const now = Date.now();
          const deltaTime = Math.max(0.1, (now - this._fileProgressMap[fileName].lastTime) / 1000);
          const deltaProgress = progressPercent - this._fileProgressMap[fileName].lastProgress;
          
          let speed = 0;
          if (deltaTime > 0 && currentFile && currentFile.size && deltaProgress > 0) {
            const bytesProgressed = (currentFile.size * deltaProgress) / 100;
            speed = bytesProgressed / deltaTime;
          }
          
          // Only update progress map if not at 100%
          if (progressPercent < 100) {
            this._fileProgressMap[fileName].lastProgress = progressPercent;
            this._fileProgressMap[fileName].lastTime = now;
            
            this.debug(`_onUploadQueueCreated: Updating progress for ${fileName}: ${progressPercent}%`);
            this.updateProgress(fileName, progressPercent, speed);
          }
        } else {
          // No file found - update all uploading items in this queue (only if still uploading and not at 100%)
          this.debug("_onUploadQueueCreated: No file found, updating all uploading items");
          // Skip if progress is 100% - wait for completion
          if (progressPercent >= 100) {
            console.log(`⏭️ [UPLOAD_PROGRESS] Skipping bulk progress update - progress is 100%, waiting for completion`);
            return;
          }
          
          this._uploadItems.forEach((item) => {
            if (item.status === 'uploading' && item.queue === queue && (item.progress || 0) < 100) {
              this.updateProgress(item.fileName, progressPercent, 0);
            }
          });
        }
      };
      
      // Store listener for cleanup
      this._progressListeners.set(queue, progressHandler);
      queue.on(_e.progress, progressHandler);
      
      // Listen to upload completion to clean up progress listener and mark as completed
      queue.once(_e.uploaded, (data) => {
        console.log(`✅ [UPLOAD_PROGRESS] _e.uploaded event received`, data);
        
        // Find the file that was uploaded
        let fileName = null;
        let result = data;
        
        // Try to get fileName from various sources
        if (queue.pendingItem && queue.pendingItem.file) {
          fileName = queue.pendingItem.file.name;
        } else if (queue.xhr && queue.xhr.length > 0) {
          const lastXhr = queue.xhr[queue.xhr.length - 1];
          if (lastXhr && lastXhr.file) {
            fileName = lastXhr.file.name;
          }
        }
        
        // Also try from data if available
        if (!fileName && data) {
          if (data.file && data.file.name) {
            fileName = data.file.name;
          } else if (data.name) {
            fileName = data.name;
          } else if (data.filename) {
            fileName = data.filename;
          }
        }
        
        // If we found a fileName, mark upload as completed
        if (fileName) {
          console.log(`✅ [UPLOAD_PROGRESS] Calling completeUpload for: ${fileName}`);
          this.completeUpload(fileName, result);
        } else {
          console.warn(`⚠️ [UPLOAD_PROGRESS] Could not determine fileName from uploaded event`, { data, queue });
          // Try to find any uploading item in this queue and mark as completed
          const uploadingItem = this._uploadItems.find(item => 
            item.status === 'uploading' && item.queue === queue
          );
          if (uploadingItem) {
            console.log(`✅ [UPLOAD_PROGRESS] Found uploading item by queue: ${uploadingItem.fileName}`);
            this.completeUpload(uploadingItem.fileName, result);
          }
        }
        
        // Remove progress listener when upload completes
        if (queue.off && this._progressListeners.has(queue)) {
          const listener = this._progressListeners.get(queue);
          queue.off(_e.progress, listener);
          this._progressListeners.delete(queue);
          console.log(`🧹 [UPLOAD_PROGRESS] Progress listener removed for completed upload`);
        }
      });
      
      // Also clean up on queue destroy
      queue.once(_e.destroy, () => {
        if (this._progressListeners.has(queue)) {
          this._progressListeners.delete(queue);
        }
      });
    }
    
    // Store queue info for later use
    this._currentQueue = queue;
    this._currentQueueInfo = {
      destination: data.destination,
      token: data.token,
      echoId: data.echoId,
      isFolder: data.isFolder,
      media: data.media
    };
  }

  /**
   * Handle upload start event
   */
  _onUploadStart(data) {
    if (!data || !data.file) {
      // Try to extract file from opt
      if (data && data.opt && data.opt.file) {
        data.file = data.opt.file;
      } else {
        return;
      }
    }
    
    // Get or create upload progress window and add item
    // Queue might not be available yet, so we'll add it later when upload actually starts
    const file = data.file;
    const fileName = file.name || data.fileName || data.opt?.filename || "Unknown file";
    const fileSize = file.size || data.fileSize || data.opt?.size || 0;
    
    // Create a placeholder file object if needed
    if (!file.name && fileName) {
      file.name = fileName;
    }
    if (!file.size && fileSize) {
      file.size = fileSize;
    }
    
    // Add item to window (queue will be set later when upload actually starts)
    this.addUploadItem(file, data.queue || null);
  }

  /**
   * Handle upload progress event
   */
  _onUploadProgress(data) {
    if (!data || !data.file) return;
    this.updateProgress(data.file.name || data.file.filename, data.progress || 0, data.speed || 0);
  }

  /**
   * Handle upload end event
   */
  _onUploadEnd(data) {
    if (!data || !data.file) return;
    this.completeUpload(data.file.name || data.file.filename, data.result);
  }

  /**
   * Handle upload error event
   */
  _onUploadError(data) {
    if (!data || !data.file) return;
    // Mark as failed
    this.updateUploadStatus(data.file.name || data.file.filename, "error");
  }

  /**
   * Add a new upload item to the list
   * @param {File} file - File being uploaded
   * @param {*} queue - Upload queue instance (optional)
   */
  addUploadItem(file, queue = null) {
    if (!file) return;
    
    const fileName = file.name || file.filename || "Unknown file";
    const fileId = `${fileName}-${Date.now()}`;
    
    this.debug("addUploadItem: Adding file", fileName, "Total items before:", this._uploadItems.length);
    
    // Check if file already exists
    const existingIndex = this._uploadItems.findIndex(item => item.fileName === fileName && item.status === 'uploading');
    if (existingIndex >= 0) {
      this.debug("addUploadItem: File already exists, skipping", fileName);
      return; // Already tracking this file
    }
    
    const uploadItem = {
      id: fileId,
      fileName: fileName,
      file: file,
      progress: 0,
      speed: 0, // bytes per second
      status: 'uploading', // 'uploading', 'completed', 'error', 'cancelled'
      queue: queue,
      startTime: Date.now(),
      fileSize: file.size || 0,
    };
    
    this._uploadItems.push(uploadItem);
    this._totalFiles = this._uploadItems.length;
    
    this.debug("addUploadItem: File added, total items:", this._totalFiles, "DOM ready:", !!this.el);
    
    // Show window if hidden - do this even if DOM not ready yet
    if (this.el) {
      // Safely call raise() if it exists (for window_core/interact windows)
      if (typeof this.raise === 'function') {
        this.raise();
      } else if (window.Wm && window.Wm.onUiEvent) {
        // Fallback: trigger raise via window manager
        this.triggerMethod && this.triggerMethod("raise");
      }
      this.el.style.display = '';
      this.debug("addUploadItem: Window shown and raised");
    } else {
      this.debug("addUploadItem: Window element not ready yet");
    }
    
    // Refresh UI - if DOM not ready, it will be refreshed in onDomRefresh
    if (this.el) {
      this._refreshUI();
      this.debug("addUploadItem: UI refreshed");
    } else {
      // DOM not ready yet - items will be rendered when onDomRefresh is called
      this.debug("addUploadItem: DOM not ready, will render when ready", fileName);
    }
  }

  /**
   * Find upload item by file name (with fuzzy matching)
   * @param {String} fileName - File name (may be encoded or decoded)
   * @param {Boolean} allowAnyStatus - If true, don't filter by status (default: false, only finds 'uploading' items)
   * @returns {Object|null}
   */
  _findUploadItem(fileName, allowAnyStatus = false) {
    if (!fileName) return null;
    
    // Normalize filename: try to decode if encoded
    let normalizedFileName = fileName;
    try {
      // Try to decode if it looks encoded
      if (fileName.includes('%')) {
        normalizedFileName = decodeURIComponent(fileName);
      }
    } catch (e) {
      // If decode fails, use original
      normalizedFileName = fileName;
    }
    
    // Helper function to normalize a filename for comparison
    const normalizeForCompare = (name) => {
      if (!name) return '';
      try {
        if (name.includes('%')) {
          return decodeURIComponent(name);
        }
      } catch (e) {}
      return name;
    };
    
    // Exact match first (both encoded and decoded)
    let item = this._uploadItems.find(item => {
      const matches = item.fileName === fileName || 
                     item.fileName === normalizedFileName ||
                     normalizeForCompare(item.fileName) === normalizedFileName ||
                     normalizeForCompare(item.fileName) === fileName;
      if (!matches) return false;
      return allowAnyStatus || item.status === 'uploading';
    });
    if (item) return item;
    
    // Try matching by basename (without path)
    const basename = normalizedFileName.split('/').pop().split('\\').pop();
    item = this._uploadItems.find(item => {
      const itemBasename = item.fileName.split('/').pop().split('\\').pop();
      const itemBasenameNormalized = normalizeForCompare(itemBasename);
      const basenameNormalized = normalizeForCompare(basename);
      
      const matches = itemBasename === basename || 
                     itemBasename === basenameNormalized ||
                     itemBasenameNormalized === basename ||
                     itemBasenameNormalized === basenameNormalized;
      
      if (!matches) return false;
      return allowAnyStatus || item.status === 'uploading';
    });
    if (item) return item;
    
    // Try case-insensitive match
    item = this._uploadItems.find(item => {
      const itemNameNormalized = normalizeForCompare(item.fileName);
      const fileNameNormalized = normalizeForCompare(normalizedFileName);
      
      const matches = itemNameNormalized.toLowerCase() === fileNameNormalized.toLowerCase();
      if (!matches) return false;
      return allowAnyStatus || item.status === 'uploading';
    });
    
    return item || null;
  }

  /**
   * Update progress for an upload item
   * @param {String} fileName
   * @param {Number} progress - 0-100
   * @param {Number} speed - bytes per second
   */
  updateProgress(fileName, progress, speed) {
    const item = this._findUploadItem(fileName);
    if (!item) {
      console.warn(`⚠️ [UPLOAD_PROGRESS] File not found: ${fileName}`);
      console.log(`📋 [UPLOAD_PROGRESS] Available files:`, this._uploadItems.map(i => i.fileName));
      this.debug(`updateProgress: File not found: ${fileName}`, this._uploadItems.map(i => i.fileName));
      return;
    }
    
    // Don't update progress for completed, cancelled, or error items
    if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error') {
      console.log(`⏭️ [UPLOAD_PROGRESS] Skipping progress update for ${fileName} - status is ${item.status}`);
      return;
    }
    
    // Get current progress
    const currentProgress = item.progress || 0;
    
    // Debug log when progress update is called
    console.log(`📊 [UPLOAD_PROGRESS] updateProgress called for: ${fileName}, progress: ${progress}%, speed: ${speed}, current: ${currentProgress}%`);
    
    // If progress reaches 100%, mark as completed immediately and update UI
    if (progress >= 100) {
      console.log(`✅ [UPLOAD_PROGRESS] Progress reached 100% for ${fileName}, marking as completed immediately`);
      item.progress = 100;
      item.speed = speed || 0;
      
      // Update status to completed immediately so UI shows checked icon
      if (item.status !== 'completed') {
        item.status = 'completed';
        console.log(`✅ [UPLOAD_PROGRESS] Status updated to 'completed' for ${fileName} (progress: 100%)`);
      }
      
      // Refresh UI immediately to show checked icon instead of cancel button
      this._refreshUI();
      
      // Also update estimated time
      if (this._isExpanded) {
        this._updateEstimatedTime();
      }
      
      return; // Don't continue with normal progress update
    }
    
    // Normal progress update (0-99.99%)
    const newProgress = Math.min(99.99, Math.max(0, progress));
    item.progress = newProgress;
    item.speed = speed || 0;
    
    // Debug log
    if (Math.round(currentProgress) !== Math.round(item.progress)) {
      console.log(`🟢 [UPLOAD_PROGRESS] Progress changed for ${fileName}: ${Math.round(currentProgress)}% → ${Math.round(item.progress)}%`);
      this.debug(`🟢 [UPDATE_PROGRESS] ${fileName}: ${Math.round(currentProgress)}% → ${Math.round(item.progress)}%`);
    }
    
    // Update DOM directly for better performance
    this._updateItemInDOM(fileName);
    
    // Also update estimated time
    if (this._isExpanded) {
      this._updateEstimatedTime();
    }
  }
  
  /**
   * Update a single item in DOM without re-rendering entire list
   * @param {String} fileName
   */
  _updateItemInDOM(fileName) {
    if (!this.el) {
      return; // Silently skip if DOM not ready
    }
    
    const item = this._findUploadItem(fileName);
    if (!item) {
      return; // Silently skip if item not found
    }
    
    // Skip DOM updates for completed, cancelled, or error items
    // These should be handled by re-rendering the file list
    if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error') {
      // If item is completed and not in DOM, just re-render file list
      if (item.status === 'completed') {
        const fileListPart = this.findPart("file-list");
        if (fileListPart) {
          this._renderFileList(fileListPart);
        }
      }
      // Clear retry count for completed/cancelled/error items
      if (this._updateRetryCount && this._updateRetryCount.has(fileName)) {
        this._updateRetryCount.delete(fileName);
      }
      return;
    }
    
    // Find the file item element in DOM - try multiple methods
    let fileListContainer = null;
    
    // Only try to find elements if window is expanded
    if (this._isExpanded) {
      // Method 1: Try to find via findPart (more reliable)
      const fileListPart = this.findPart("file-list");
      if (fileListPart && fileListPart.el) {
        fileListContainer = fileListPart.el;
      }
      
      // Method 2: Try to find via querySelector with different class names
      if (!fileListContainer && this.el) {
        fileListContainer = this.el.querySelector(`.${this.fig.family}__file-list`) ||
                           this.el.querySelector(`[data-partname="file-list"]`);
      }
    }
    
    // If window is collapsed or container not found, queue update
    if (!this._isExpanded || !fileListContainer) {
      // Queue update for when window is expanded or DOM is ready
      if (!this._pendingProgressUpdates) {
        this._pendingProgressUpdates = new Map();
      }
      this._pendingProgressUpdates.set(fileName, { progress: item.progress, speed: item.speed });
      return;
    }
    
    // Find item by dataset.fileName (try exact match, then fuzzy match)
    let itemEl = null;
    const allItems = fileListContainer.querySelectorAll(`.${this.fig.family}__file-item`);
    
    for (let el of allItems) {
      const elFileName = el.dataset.fileName;
      if (elFileName === fileName || 
          elFileName === decodeURIComponent(fileName) ||
          decodeURIComponent(elFileName) === fileName ||
          elFileName?.toLowerCase() === fileName?.toLowerCase()) {
        itemEl = el;
        break;
      }
    }
    
    // If item element not found, queue update and trigger render if needed
    if (!itemEl) {
      // Queue this update for later processing
      if (!this._pendingProgressUpdates) {
        this._pendingProgressUpdates = new Map();
      }
      this._pendingProgressUpdates.set(fileName, { progress: item.progress, speed: item.speed });
      
      // Try to trigger render to ensure item is in DOM
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
        // Retry update after a short delay to allow DOM to render
        setTimeout(() => {
          this._updateItemInDOM(fileName);
        }, 50);
      }
      return;
    }
    
    // Clear retry count when item element is found
    if (this._updateRetryCount && this._updateRetryCount.has(fileName)) {
      this._updateRetryCount.delete(fileName);
    }
    
    // Clear pending update for this file since we're updating now
    if (this._pendingProgressUpdates && this._pendingProgressUpdates.has(fileName)) {
      this._pendingProgressUpdates.delete(fileName);
    }
    
    // Update status attribute
    itemEl.dataset.status = item.status;
    
    // Update progress bar if uploading
    if (item.status === 'uploading') {
      // Calculate progress percent once
      const progressPercent = Math.round(item.progress);
      
      // Update progress bar fill - try multiple methods to find element
      let progressFill = null;
      
      // Find progress fill element - try multiple methods
      const normalizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
      const partName = `progress-fill-${normalizedFileName}`;
      
      // Method 1: Find via progress wrapper and progress bar container (most reliable)
      const progressWrapper = itemEl.querySelector(`.${this.fig.family}__file-item-progress-wrapper`);
      if (progressWrapper) {
        const progressBar = progressWrapper.querySelector(`.${this.fig.family}__file-item-progress-bar`);
        if (progressBar) {
          // Try data-partname first
          progressFill = progressBar.querySelector(`[data-partname="${partName}"]`);
          
          // Try className
          if (!progressFill) {
            progressFill = progressBar.querySelector(`.${this.fig.family}__file-item-progress-fill`);
          }
          
          // Try class contains progress-fill
          if (!progressFill) {
            progressFill = progressBar.querySelector('[class*="progress-fill"]');
          }
          
          // Try finding any div child of progressBar
          if (!progressFill) {
            const allDivs = progressBar.querySelectorAll('div');
            for (let div of allDivs) {
              if (div.classList.contains(`${this.fig.family}__file-item-progress-fill`) ||
                  div.dataset.partname === partName ||
                  div.className.includes('progress-fill')) {
                progressFill = div;
                break;
              }
            }
          }
        }
      }
      
      // Method 2: Find by data-partname directly within itemEl
      if (!progressFill) {
        progressFill = itemEl.querySelector(`[data-partname="${partName}"]`);
      }
      
      // Method 3: Find by className within itemEl
      if (!progressFill) {
        progressFill = itemEl.querySelector(`.${this.fig.family}__file-item-progress-fill`);
      }
      
      // Method 4: Find any element with progress-fill in class within itemEl
      if (!progressFill) {
        progressFill = itemEl.querySelector('[class*="progress-fill"]');
      }
      
      // Method 5: Find by iterating all elements in itemEl
      if (!progressFill) {
        const allElements = itemEl.querySelectorAll('*');
        for (let el of allElements) {
          if (el.dataset && el.dataset.partname === partName) {
            progressFill = el;
            break;
          }
          if (el.className && (
            el.className.includes(`${this.fig.family}__file-item-progress-fill`) ||
            el.className.includes('progress-fill')
          )) {
            progressFill = el;
            break;
          }
        }
      }
      
      if (progressFill) {
        // Update progress bar fill directly for realtime updates
        const widthValue = `${progressPercent}%`;
        
        // Update immediately for realtime updates
        progressFill.style.width = widthValue;
        progressFill.style.setProperty('width', widthValue, 'important');
        progressFill.style.display = 'block';
        progressFill.style.setProperty('display', 'block', 'important');
        progressFill.style.setProperty('flex', 'none', 'important');
        
        // Force browser reflow to apply changes immediately
        void progressFill.offsetWidth;
      } else {
        // If progress fill not found, queue update and trigger re-render
        if (!this._pendingProgressUpdates) {
          this._pendingProgressUpdates = new Map();
        }
        this._pendingProgressUpdates.set(fileName, { progress: item.progress, speed: item.speed });
        
        // Trigger re-render to ensure progress fill is in DOM
        const fileListPart = this.findPart("file-list");
        if (fileListPart) {
          this._renderFileList(fileListPart);
          // Retry update after a short delay
          setTimeout(() => {
            this._updateItemInDOM(fileName);
          }, 50);
        }
      }
      
      // Update speed text
      const speedEl = itemEl.querySelector(`.${this.fig.family}__file-item-speed`);
      if (speedEl) {
        const { formatSpeed } = require('./skeleton/helpers');
        speedEl.textContent = formatSpeed(item.speed);
      }
      
      // Update file size text
      const sizeEl = itemEl.querySelector(`.${this.fig.family}__file-item-size`);
      if (sizeEl && item.fileSize) {
        const { filesize } = require("core/utils");
        sizeEl.textContent = filesize(item.fileSize);
      }
      
      // Show progress wrapper if hidden
      if (progressWrapper) {
        progressWrapper.style.display = '';
      }
    } else if (item.status === 'completed') {
      // Update dataset for clickable
      itemEl.dataset.clickable = "1";
      itemEl.dataset.status = 'completed';
      
      // Hide progress bar if still visible
      const progressWrapper = itemEl.querySelector(`.${this.fig.family}__file-item-progress-wrapper`);
      if (progressWrapper) {
        progressWrapper.style.display = 'none';
      }
      
      // Hide cancel button if still visible
      const cancelButton = itemEl.querySelector(`.${this.fig.family}__file-item-cancel`);
      if (cancelButton) {
        cancelButton.style.display = 'none';
      }
      
      // Re-render file list to show checkmark and hide cancel/progress
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
        console.log(`✅ [UPLOAD_PROGRESS] Re-rendered file list for completed item: ${fileName}`);
      }
      
      console.log(`✅ [UPLOAD_PROGRESS] Completed status set for ${fileName} in DOM`);
    } else if (item.status === 'cancelled' || item.status === 'error') {
      // Re-render to update UI for cancelled/error state
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
    }
  }

  /**
   * Mark upload as completed
   * @param {String} fileName
   * @param {*} result - Upload result data
   */
  completeUpload(fileName, result) {
    console.log(`✅ [UPLOAD_PROGRESS] completeUpload called for: ${fileName}`, {
      availableFiles: this._uploadItems.map(i => ({ name: i.fileName, status: i.status })),
      result
    });
    
    // Try to find item - allow any status except cancelled to handle edge cases
    let item = this._findUploadItem(fileName, true);
    
    // If not found, try to find by matching file object if result has file info
    if (!item && result) {
      if (result.name) {
        item = this._findUploadItem(result.name, true);
      }
      if (!item && result.filename) {
        item = this._findUploadItem(result.filename, true);
      }
    }
    
    // If still not found, try all items and find by file object reference
    if (!item && this._uploadItems.length > 0) {
      // Try to match by file size if available
      if (result && result.size) {
        item = this._uploadItems.find(item => 
          item.file && item.file.size === result.size && 
          (item.status === 'uploading' || !item.status || item.status === 'pending')
        );
      }
    }
    
    if (!item) {
      console.warn(`⚠️ [UPLOAD_PROGRESS] completeUpload: File not found: ${fileName}`, {
        availableFiles: this._uploadItems.map(i => ({ 
          name: i.fileName, 
          status: i.status,
          fileSize: i.file?.size 
        })),
        result
      });
      this.debug(`completeUpload: File not found: ${fileName}`, this._uploadItems.map(i => ({
        fileName: i.fileName,
        status: i.status,
        fileSize: i.file?.size
      })));
      return;
    }
    
    console.log(`✅ [UPLOAD_PROGRESS] Found item for completion: ${item.fileName}, current status: ${item.status}`);
    
    // Update item status
    const oldStatus = item.status;
    item.status = 'completed';
    item.progress = 100;
    item.result = result;
    
    console.log(`✅ [UPLOAD_PROGRESS] Status updated: ${oldStatus} -> completed for ${item.fileName}`);
    
    // Force expand window to show completed status if collapsed
    if (!this._isExpanded) {
      this._isExpanded = true;
      console.log(`✅ [UPLOAD_PROGRESS] Window expanded to show completed item`);
    }
    
    // Clear any pending updates for this file since it's now completed
    if (this._pendingProgressUpdates && this._pendingProgressUpdates.has(item.fileName)) {
      this._pendingProgressUpdates.delete(item.fileName);
    }
    
    // Clear retry count for this file
    if (this._updateRetryCount && this._updateRetryCount.has(item.fileName)) {
      this._updateRetryCount.delete(item.fileName);
    }
    
    // Remove progress listener for this queue if item has queue
    if (item.queue && this._progressListeners && this._progressListeners.has(item.queue)) {
      const listener = this._progressListeners.get(item.queue);
      if (item.queue.off && typeof item.queue.off === 'function') {
        item.queue.off(_e.progress, listener);
        this._progressListeners.delete(item.queue);
        console.log(`🧹 [UPLOAD_PROGRESS] Progress listener removed for completed upload: ${item.fileName}`);
      }
    }
    
    // Update UI first (this will re-render file list)
    this._refreshUI();
    
    // Force re-render file list immediately to show checkmark and hide cancel
    // This ensures the UI is updated with the new status
    setTimeout(() => {
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        // Re-render the entire file list to update all items with new status
        this._renderFileList(fileListPart);
        console.log(`✅ [UPLOAD_PROGRESS] File list re-rendered for completed item: ${item.fileName} (status: ${item.status})`);
      }
    }, 50);
    
    // Also force re-render after a longer delay to ensure DOM is fully ready
    setTimeout(() => {
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
        console.log(`✅ [UPLOAD_PROGRESS] File list re-rendered again for: ${item.fileName}`);
      }
    }, 200);
    
    console.log(`✅ [UPLOAD_PROGRESS] UI refreshed for completed upload: ${item.fileName}`);
    
    // Auto-close after a delay if all uploads are complete
    _.delay(() => {
      const allComplete = this._uploadItems.every(item => item.status === 'completed' || item.status === 'error');
      if (allComplete) {
        _.delay(() => {
          if (this._uploadItems.every(item => item.status === 'completed' || item.status === 'error')) {
            // Optionally close after delay
            // this.goodbye();
          }
        }, 3000);
      }
    }, 500);
  }

  /**
   * Update upload status
   * @param {String} fileName
   * @param {String} status
   */
  updateUploadStatus(fileName, status) {
    const item = this._uploadItems.find(item => item.fileName === fileName);
    if (!item) return;
    
    item.status = status;
    this._refreshUI();
  }

  /**
   * Cancel all uploads
   */
  cancelAll() {
    // Cancel all active uploads
    this._uploadItems.forEach(item => {
      if (item.status === 'uploading' && item.queue) {
        if (item.queue.isCanceled && typeof item.queue.isCanceled === 'function') {
          item.queue.isCanceled() || (item.queue._canceled = true);
        }
        if (item.queue.trigger) {
          item.queue.trigger(_e.cancel);
        }
      }
      item.status = 'cancelled';
    });
    
    this._refreshUI();
    
    // Close window after delay
    _.delay(() => {
      this.goodbye();
    }, 500);
  }

  /**
   * Cancel single upload
   * @param {String} fileName
   */
  cancelUpload(fileName) {
    const item = this._uploadItems.find(item => item.fileName === fileName);
    if (!item) return;
    
    if (item.status === 'uploading' && item.queue) {
      if (item.queue.isCanceled && typeof item.queue.isCanceled === 'function') {
        item.queue.isCanceled() || (item.queue._canceled = true);
      }
      if (item.queue.trigger) {
        item.queue.trigger(_e.cancel);
      }
    }
    
    item.status = 'cancelled';
    this._refreshUI();
  }

  /**
   * Toggle expand/collapse
   */
  toggleExpand() {
    this.debug(`toggleExpand: ${this._isExpanded} -> ${!this._isExpanded}`);
    this._isExpanded = !this._isExpanded;
    this._refreshUI();
    this.debug(`After toggleExpand, _isExpanded: ${this._isExpanded}, container:`, this.el?.querySelector(`.${this.fig.family}__container`));
    
    // When expanding, process any pending updates immediately
    if (this._isExpanded && this._pendingProgressUpdates && this._pendingProgressUpdates.size > 0) {
      setTimeout(() => {
        // Update all pending items
        this._pendingProgressUpdates.forEach((data, fileName) => {
          const item = this._findUploadItem(fileName);
          if (item) {
            item.progress = data.progress;
            item.speed = data.speed;
            this._updateItemInDOM(fileName);
          }
        });
      }, 150);
    }
  }

  /**
   * Handle click on upload item (when completed)
   * @param {String} fileName
   */
  onItemClick(fileName) {
    const item = this._uploadItems.find(item => item.fileName === fileName);
    if (!item || item.status !== 'completed') return;
    
    // Handle click - could open file viewer or navigate to file location
    if (item.result && item.result.nid) {
      // Navigate to file or open viewer
      this.debug("Click on completed upload item", item);
      // You can emit event or trigger navigation here
      if (this.triggerHandlers) {
        this.triggerHandlers({ 
          data: item.result, 
          service: "open-uploaded-file" 
        });
      }
    }
  }

  /**
   * Refresh UI
   */
  _refreshUI() {
    if (!this.el) return;
    
    // Update file count
    this._totalFiles = this._uploadItems.length;
    const activeCount = this._uploadItems.filter(item => item.status === 'uploading').length;
    
    // Update title
    const titlePart = this.findPart("upload-title");
    if (titlePart) {
      const count = activeCount || this._totalFiles;
      titlePart.set({ 
        content: `${LOCALE.UPLOADING || "Uploading"} ${count} ${count === 1 ? LOCALE.FILE || "file" : LOCALE.FILES || "files"}` 
      });
    }
    
    // Update expand state on container
    const container = this.el.querySelector(`.${this.fig.family}__container`);
    if (container) {
      container.dataset.expanded = this._isExpanded ? "1" : "0";
      this.debug(`Updated container data-expanded to: ${container.dataset.expanded}`);
    } else {
      this.debug(`Container not found: .${this.fig.family}__container`);
    }
    // Also update on root element for CSS
    if (this.el) {
      this.el.dataset.expanded = this._isExpanded ? "1" : "0";
      this.debug(`Updated root element data-expanded to: ${this.el.dataset.expanded}`);
      
      // CSS will handle height changes via data-expanded attribute
      // No need to manually set height here
    }
    
    // Update file list (only when expanded)
    if (this._isExpanded) {
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
    }
    
    // Update estimated time (only when expanded)
    if (this._isExpanded) {
      this._updateEstimatedTime();
    }
    
    // Process any pending progress updates after UI refresh
    if (this._pendingProgressUpdates && this._pendingProgressUpdates.size > 0) {
      // Use setTimeout to ensure DOM is fully rendered before applying updates
      setTimeout(() => {
        this._pendingProgressUpdates.forEach((data, fileName) => {
          const item = this._findUploadItem(fileName);
          if (item) {
            // Update item state first
            item.progress = data.progress;
            item.speed = data.speed;
            // Then update DOM
            this._updateItemInDOM(fileName);
          }
        });
        // Clear pending updates after processing
        this._pendingProgressUpdates.clear();
      }, 100);
    }
  }

  /**
   * Render file list
   * @param {*} listPart
   */
  _renderFileList(listPart) {
    if (!listPart || !listPart.softClear) return;
    
    // Clear existing items
    listPart.softClear();
    
    // Create and add file items
    const fileItems = this._uploadItems.map(item => {
      return this._createFileItemSkeleton(item);
    }).filter(Boolean);
    
    if (fileItems.length > 0) {
      listPart.feed(fileItems);
    }
  }

  /**
   * Create file item skeleton
   * @param {Object} item
   */
  _createFileItemSkeleton(item) {
    const createFileItem = require('./skeleton/file-item');
    return createFileItem(this, item);
  }

  /**
   * Update estimated time display
   */
  _updateEstimatedTime() {
    const timePart = this.findPart("estimated-time");
    if (!timePart) return;
    
    const uploadingItems = this._uploadItems.filter(item => item.status === 'uploading');
    if (uploadingItems.length === 0) {
      timePart.el.style.display = 'none';
      return;
    }
    
    // Calculate estimated time based on remaining bytes and average speed
    let totalRemaining = 0;
    let totalSpeed = 0;
    
    uploadingItems.forEach(item => {
      const remaining = item.fileSize * (1 - item.progress / 100);
      totalRemaining += remaining;
      totalSpeed += item.speed || 0;
    });
    
    if (totalSpeed > 0) {
      const secondsRemaining = Math.ceil(totalRemaining / totalSpeed);
      const minutes = Math.floor(secondsRemaining / 60);
      
      let timeText;
      if (minutes >= 1) {
        timeText = `${LOCALE.LESS_THAN || "Less than"} ${minutes} ${minutes === 1 ? LOCALE.MINUTE || "minute" : LOCALE.MINUTES || "minutes"} ${LOCALE.LEFT || "left"}`;
      } else {
        timeText = LOCALE.LESS_THAN_A_MINUTE_LEFT || "Less than a minute left";
      }
      
      timePart.set({ content: timeText });
    } else {
      timePart.set({ content: LOCALE.LESS_THAN_A_MINUTE_LEFT || "Less than a minute left" });
    }
    
    timePart.el.style.display = '';
  }

  /**
   * Get upload items for rendering
   */
  getUploadItems() {
    return this._uploadItems;
  }

  /**
   *
   */
  onDomRefresh() {
    const skeletonFn = require("./skeleton");
    this.feed(typeof skeletonFn === 'function' ? skeletonFn(this) : skeletonFn.default(this));
    
    // Call raise() if it exists (for window_core/interact windows)
    if (typeof this.raise === 'function') {
      this.raise();
    } else if (window.Wm && window.Wm.onUiEvent) {
      // Fallback: trigger raise via window manager
      this.triggerMethod && this.triggerMethod("raise");
    }
    
    // Wait for DOM to be ready before refreshing UI
    this.waitElement(this.el, () => {
      // Render any items that were added before DOM was ready
      if (this.el) {
        this.el.style.display = '';
      }
      this._refreshUI();
      
      // Apply any pending progress updates after UI refresh
      if (this._pendingProgressUpdates && this._pendingProgressUpdates.size > 0) {
        setTimeout(() => {
          this._pendingProgressUpdates.forEach((data, fileName) => {
            const item = this._findUploadItem(fileName);
            if (item) {
              item.progress = data.progress;
              item.speed = data.speed;
              this._updateItemInDOM(fileName);
            }
          });
          this._pendingProgressUpdates.clear();
        }, 100);
      }
    });
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    // Try multiple ways to get service
    let service = args.service;
    
    // If args is a PointerEvent/MouseEvent, get service from event target
    if (args instanceof PointerEvent || args instanceof MouseEvent) {
      // Walk up the DOM tree from event target to find service attribute
      if (args.target) {
        let target = args.target;
        // Walk up the DOM tree to find service attribute
        while (target && target !== document.body && target !== document.documentElement) {
          if (target.dataset && target.dataset.service) {
            service = target.dataset.service;
            break;
          }
          target = target.parentElement;
        }
      }
      
      // Try getService method on the event (if available)
      if (!service && typeof args.getService === 'function') {
        service = args.getService(this.el);
      }
      
      // Also try cmd.el.getService if available
      if (!service && cmd && cmd.el && typeof cmd.el.getService === 'function') {
        service = cmd.el.getService(args);
      }
      
      // Fallback to cmd.el.dataset.service
      if (!service && cmd && cmd.el && cmd.el.dataset) {
        service = cmd.el.dataset.service;
      }
    }
    
    // Try to get service from cmd object
    if (!service && cmd) {
      if (typeof cmd.mget === 'function') {
        service = cmd.mget(_a.service) || cmd.mget(_a.name);
      }
      if (!service) {
        service = cmd.service || cmd.model?.get?.(_a.service) || cmd.model?.get?.(_a.name);
      }
      if (!service && cmd.el) {
        // Try dataset
        if (cmd.el.dataset) {
          service = cmd.el.dataset.service;
        }
        // Try getAttribute
        if (!service) {
          service = cmd.el.getAttribute?.(_a.service) || cmd.el.getAttribute?.(_a.name);
        }
      }
    }
    
    this.debug(`onUiEvent service=${service}`, { 
      cmd, 
      args, 
      target: args?.target, 
      targetDataset: args?.target?.dataset,
      cmdEl: cmd?.el,
      cmdElDataset: cmd?.el?.dataset
    });

    switch (service) {
      case _e.close:
        return this.goodbye();

      case "toggle-expand":
        this.debug("Toggle expand called", this._isExpanded);
        return this.toggleExpand();

      case "cancel-all":
        return this.cancelAll();

      case "cancel-upload":
        // Try to get fileName from various sources
        let fileName = cmd.mget?.(_a.fileName) || cmd.el?.dataset?.fileName;
        
        // If not found, try to get from parent element (file-item)
        if (!fileName && args?.target) {
          let target = args.target;
          while (target && target !== document.body) {
            if (target.dataset && target.dataset.fileName) {
              fileName = target.dataset.fileName;
              break;
            }
            target = target.parentElement;
          }
        }
        
        // Also try from cmd.el parent
        if (!fileName && cmd?.el) {
          let parent = cmd.el.parentElement;
          while (parent && parent !== document.body) {
            if (parent.dataset && parent.dataset.fileName) {
              fileName = parent.dataset.fileName;
              break;
            }
            parent = parent.parentElement;
          }
        }
        
        if (fileName) {
          this.debug(`Cancelling upload for file: ${fileName}`);
          return this.cancelUpload(fileName);
        } else {
          this.debug(`Cancel upload: Could not find fileName`, { cmd, args, target: args?.target });
        }
        break;

      case "click-upload-item":
        const itemFileName = cmd.mget?.(_a.fileName) || cmd.el?.dataset?.fileName;
        if (itemFileName) {
          return this.onItemClick(itemFileName);
        }
        break;

      default:
        // Call parent but pass no_raise to avoid raise() error
        this.debug(`Service not found: ${service}, passing to parent with no_raise`);
        return super.onUiEvent(cmd, { ...args, no_raise: true });
    }
  }
}

__window_upload_progress.initClass();

// Cache promise to prevent multiple window creation (singleton pattern)
let _pendingPromise = null;

/**
 * Get or create upload progress window instance (singleton)
 * @returns {Promise<__window_upload_progress>}
 */
__window_upload_progress.getOrCreate = function() {
  // If there's already a pending promise, return it
  if (_pendingPromise) {
    return _pendingPromise.then((instance) => {
      // Check if instance is still valid
      if (instance && !instance.isDestroyed()) {
        return instance;
      }
      // If destroyed, clear cache and try again
      _pendingPromise = null;
      return __window_upload_progress.getOrCreate();
    });
  }
  
  _pendingPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.Wm) {
      _pendingPromise = null;
      resolve(null);
      return;
    }
    
    // Check if window already exists
    const existing = window.Wm.getItemsByKind('window_upload_progress');
    if (existing && existing.length > 0 && !existing[0].isDestroyed()) {
      _pendingPromise = null;
      resolve(existing[0]);
      return;
    }
    
    // Launch new window
    const launched = window.Wm.launch(
      { kind: 'window_upload_progress' },
      { explicit: 1, singleton: 1 }
    );
    
    if (launched === false) {
      // Window already exists (singleton returned false)
      const windows = window.Wm.getItemsByKind('window_upload_progress');
      if (windows && windows.length > 0 && !windows[0].isDestroyed()) {
        _pendingPromise = null;
        resolve(windows[0]);
        return;
      }
    }
    
    // Wait for window to be created
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    const checkWindow = () => {
      attempts++;
      const windows = window.Wm.getItemsByKind('window_upload_progress');
      if (windows && windows.length > 0 && !windows[0].isDestroyed()) {
        _pendingPromise = null;
        resolve(windows[0]);
      } else if (attempts < maxAttempts) {
        setTimeout(checkWindow, 100);
      } else {
        // Timeout - clear cache and resolve null
        _pendingPromise = null;
        resolve(null);
      }
    };
    setTimeout(checkWindow, 100);
  });
  
  // Clear cache when promise resolves/rejects
  _pendingPromise.then(() => {
    _pendingPromise = null;
  }).catch(() => {
    _pendingPromise = null;
  });
  
  return _pendingPromise;
};

module.exports = __window_upload_progress;

