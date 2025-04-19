require('dotenv').config();
const { notarize } = require('@electron/notarize');
exports.default = async function notarizing(context) {
  // console.log(`Skipping notarizing. temporarily`);
  // return;
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    console.log(`No notarizing task for for ${electronPlatformName}. Skipping.`);
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const { APPLEIDPASS, APPLEID, APPLETEAMID } = process.env;
  let opt = {
    appBundleId: 'com.drumee.desktop',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: APPLEID,
    appleIdPassword: APPLEIDPASS,
    teamId: APPLETEAMID,
  };
  console.log(`Notarizing for ${electronPlatformName}`);
  return await notarize(opt);
};

