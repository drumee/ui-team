const { getFileIcon, formatSpeed } = require('./helpers');
const { filesize } = require("@drumee/ui-essentials");

/**
 * Extract and normalize file item options
 * @param {Object} item - Upload item with fileName, progress, speed, status, file
 * @returns {Object} Normalized options object
 */
function extractFileOptions(item) {
  // Extract basic properties with defaults
  const options = {
    // File identification
    fileName: item.fileName || item.file?.name || item.file?.filename || "Unknown file",
    file: item.file || null,
    fileSize: item.fileSize || item.file?.size || 0,
    // Upload progress
    progress: item.progress || 0,
    speed: item.speed || 0,
    status: item.status || 'uploading',
    id: item.id || null,
    queue: item.queue || null,
    result: item.result || null,
    startTime: item.startTime || null,
  };
  
  // Normalize status: treat unknown/pending as uploading for UI
  const normalizedStatus = ['completed', 'cancelled', 'error', 'uploading'].includes(options.status)
    ? options.status
    : 'uploading';
  options.status = normalizedStatus;

  // Derive computed states from status
  options.isCompleted = options.status === 'completed';
  options.isCancelled = options.status === 'cancelled';
  options.isError = options.status === 'error';
  options.isUploading = options.status === 'uploading' && options.progress < 100;
  options.isClickable = options.isCompleted;
  options.progressPercent = Math.round(options.progress);
  
  // Display status for dataset
  options.displayStatus = options.isCompleted ? 'completed' : 
                         (options.isCancelled ? 'cancelled' : 
                         (options.isError ? 'error' : options.status));
  
  // File icon
  options.fileIcon = getFileIcon(options.file || { name: options.fileName, type: options.file?.type });
  
  // Visibility flags - control what to show/hide
  // These can be overridden by index.js if needed
  options.showIcon = item.showIcon !== undefined ? item.showIcon : true;
  options.showName = item.showName !== undefined ? item.showName : true;
  options.showSpeed = item.showSpeed !== undefined ? item.showSpeed : (options.isUploading && options.speed > 0);
  options.showProgress = item.showProgress !== undefined ? item.showProgress : options.isUploading;
  options.showCheck = item.showCheck !== undefined ? item.showCheck : options.isCompleted;
  options.showCancel = item.showCancel !== undefined ? item.showCancel : options.isUploading;
  options.showCancelled = item.showCancelled !== undefined ? item.showCancelled : options.isCancelled;
  options.showError = item.showError !== undefined ? item.showError : options.isError;
  
  return options;
}

/**
 * Create file icon component
 * @param {String} pfx - CSS prefix
 * @param {Object} opt - Options object
 * @returns {Object|null} Skeleton component or null
 */
function createFileIcon(pfx, opt) {
  if (!opt.showIcon) return null;
  
  return Skeletons.Button.Svg({
    className: `${pfx}-icon`,
    ico: opt.fileIcon,
    active: 0,
  });
}

/**
 * Create file name component
 * @param {String} pfx - CSS prefix
 * @param {Object} opt - Options object
 * @returns {Object|null} Skeleton component or null
 */
function createFileName(pfx, opt) {
  if (!opt.showName) return null;
  const normalizedFileName = opt.fileName.replace(/[^a-zA-Z0-9]/g, '_');
  
  return Skeletons.Note({
    className: `${pfx}-name`,
    sys_pn: `name-${normalizedFileName}`,
    content: opt.fileName,
  });
}

/**
 * Create speed indicator component
 * @param {String} pfx - CSS prefix
 * @param {Object} opt - Options object
 * @returns {Array} Array of skeleton components
 */
function createSpeedIndicator(pfx, opt) {
  if (!opt.showSpeed || !opt.speed || opt.speed <= 0) {
    return [];
  }
  
  const normalizedFileName = opt.fileName.replace(/[^a-zA-Z0-9]/g, '_');
  
  return [
    Skeletons.Note({
      className: `${pfx}-separator`,
      content: " • ",
    }),
    Skeletons.Note({
      className: `${pfx}-speed`,
      sys_pn: `speed-${normalizedFileName}`,
      content: formatSpeed(opt.speed),
    }),
  ];
}

/**
 * Create progress bar component
 * @param {String} pfx - CSS prefix
 * @param {Object} opt - Options object
 * @returns {Object|null} Skeleton component or null
 */
function createProgressBar(pfx, opt) {
  if (!opt.showProgress) return null;
  
  const normalizedFileName = opt.fileName.replace(/[^a-zA-Z0-9]/g, '_');
  
  return Skeletons.Box.Y({
    className: `${pfx}-progress-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-progress-bar`,
        kids: [
          Skeletons.Element({
            tagName: 'div',
            className: `${pfx}-progress-fill`,
            sys_pn: `progress-fill-${normalizedFileName}`,
            style: {
              width: `${Math.round(opt.progress)}%`
            }
          })
        ]
      })
    ]
  });
}

/**
 * Create status indicator component (check icon, cancel button, cancelled text, or error text)
 * @param {String} pfx - CSS prefix
 * @param {Object} ui - Window instance
 * @param {Object} opt - Options object
 * @returns {Object|null} Skeleton component or null
 */
function createStatusIndicator(pfx, ui, opt) {
  // Priority: completed > cancelled > error > uploading
  if (opt.showCheck && opt.isCompleted) {
    return Skeletons.Box.X({
      className: `${pfx}-check`,
      kids: [
        Skeletons.Button.Svg({
          className: `${pfx}-check-svg ${ui.fig.family}__icon-svg`,
          ico: "upload-checked",
          active: 0,
        }),
      ]
    });
  }
  
  if (opt.showCancelled && opt.isCancelled) {
    return Skeletons.Note({
      className: `${pfx}-cancelled`,
      content: LOCALE.CANCELLED || "Cancelled",
    });
  }
  
  if (opt.showError && opt.isError) {
    return Skeletons.Note({
      className: `${pfx}-error`,
      content: LOCALE.ERROR || "Error",
    });
  }
  
  if (opt.showCancel && opt.isUploading) {
    const normalizedFileName = opt.fileName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Use Note to avoid unintended icon rendering
    return Skeletons.Note({
      className: `${pfx}-cancel`,
      content: LOCALE.CANCEL || "Cancel",
      service: "cancel-upload",
      uiHandler: [ui],
      partHandler: [ui],
      trigger: 'click',
      interactive: 1,
      name: opt.fileName,
      role: 'button',
      value: opt.fileName,
      dataset: {
        fileName: opt.fileName,
        name: opt.fileName,
        value: opt.fileName,
        status: 'uploading',
        service: "cancel-upload"
      },
      sys_pn: `cancel-${normalizedFileName}`,
    });
  }
  
  return null;
}

/**
 * Create file item skeleton for upload progress window
 * @param {Object} ui - Window instance
 * @param {Object} item - Upload item with fileName, progress, speed, status
 * @returns {Object} Skeleton object
 */
module.exports = function fileItem(ui, item) {
  const pfx = `${ui.fig.family}__file-item`;
  
  // Extract and normalize all options from item
  const opt = extractFileOptions(item);
  
  // Create individual components
  const fileIcon = createFileIcon(pfx, opt);
  const fileName = createFileName(pfx, opt);
  const speedIndicator = createSpeedIndicator(pfx, opt);
  const progressBar = createProgressBar(pfx, opt);
  const statusIndicator = createStatusIndicator(pfx, ui, opt);
  
  return Skeletons.Box.Y({
    className: `${pfx}`,
    dataset: {
      fileName: opt.fileName,
      status: opt.displayStatus,
      clickable: opt.isClickable ? "1" : "0"
    },
    service: opt.isClickable ? "click-upload-item" : null,
    uiHandler: opt.isClickable ? [ui] : null,
    kids: [
      // File icon and name row
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          // File icon
          fileIcon,
          // File name, speed, and progress bar container
          Skeletons.Box.Y({
            className: `${pfx}-info`,
            kids: [
              // File name and speed on same line
              Skeletons.Box.X({
                className: `${pfx}-name-speed`,
                kids: [
                  fileName,
                  ...speedIndicator,
                ].filter(Boolean),
              }),
              // Progress bar
              progressBar,
            ].filter(Boolean),
          }),
          // Status indicator (check icon, cancel button, cancelled text, or error text)
          statusIndicator,
        ].filter(Boolean),
      }),
    ].filter(Boolean),
  });
};

