/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : drumee-electron/utils/fileHelper.js
 * TYPE : Skelton
 * ===================================================================**/

const fs = require('fs');

/**
 * Get file type from extention.
 * @param {*} fileExt 
 * @returns 
 */
const getFileType = (fileExt) => {
  let data = global.fileExtentionType;
  try {
    return Object.values(data)[Object.keys(data).indexOf(fileExt)];
  } catch {
    return 'png';
  }
}

/**
 * Generate file response from the file path.
 * @param {*} param0 
 * @param {*} cb 
 * @returns 
 */
const generateFileResponse = ({ filePaths: files }, cb) => {
  if (!files) { return; }
  const readFiles = files.map(e => {
    const fileName = e.split("/").pop();
    const fileExt = fileName.split(".").pop();
    let buff = fs.readFileSync(e);
    let base64data = buff.toString('base64');
    return {
      data: base64data,
      path: e,
      name: fileName,
      ext: getFileType(fileExt)
    }
  });

  cb(readFiles);
}

module.exports = {
  getFileType,
  generateFileResponse
}