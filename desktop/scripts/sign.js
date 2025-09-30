#! env node
exports.default = async function sign(context) {
  const { electronPlatformName, outDir, appOutDir } = context;
  console.log(`Signing code for platform ${electronPlatformName}`);
  //const info = context.packager.appInfo;
  // const { description,
  //   version,
  //   buildNumber,
  //   buildVersion,
  //   productName,
  //   sanitizedProductName,
  //   productFilename 
  // } = context.packager.appInfo;
  //console.log(`++++++++++++++ Signing code for platform ${productFilename} for ${electronPlatformName} ++++++++++`);
  // console.log(`Skipping notarizing. temporarily`);
  // return;
  switch (electronPlatformName) {
    case "darwin":
      const { signAsync } = require('@electron/osx-sign');
      const { APPLEID: appleId, APPLEIDPASS: appleIdPassword, APPLETEAMID: teamId } = process.env;
      const { APPLEIDPASS, APPLEID, APPLETEAMID } = process.env;
      console.log({ appleId, appleIdPassword, teamId });
      const appName = context.packager.appInfo.productFilename;
      const app = `${appOutDir}/${appName}.app`;
      console.log("SIGNING...", app);
      return await signAsync({
        app,
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: 'entitlements/darwin.plist',
        entitlementsInherit: 'entitlements/darwin.plist',
      })
    case "win":
    case "win32":
      console.log("TBD -- sign code for", electronPlatformName);
      /*
      let { MSICreator } = require('electron-wix-msi');

      // Step 1: Instantiate the MSICreator
      const msiCreator = new MSICreator({
        appDirectory: appOutDir,
        description,
        exe: productFilename,
        name: productName,
        manufacturer: 'Drumee',
        version,
        outputDirectory: outDir,  
        certificateFile: './xialia.cer',
        certificatePassword: process.env.CERT_PASSWORD
      });

      // Step 2: Create a .wxs template file
      const supportBinaries = await msiCreator.create();

      // 🆕 Step 2a: optionally sign support binaries if you
      // sign you binaries as part of of your packaging script
      supportBinaries.forEach(async (binary) => {
        // Binaries are the new stub executable and optionally
        // the Squirrel auto updater.
        await signFile(binary);
      });

      // Step 3: Compile the template to a .msi file
      await msiCreator.compile();
      */
          
    default:
      console.log(`No signing code planned for platform ${electronPlatformName}`)
  }
};

