import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const repoApps = JSON.parse(readFileSync(join('..', 'apps.json', 'utf-8')));
const caproverApps = JSON.parse(readFileSync('apps.json', 'utf-8'));

repoApps.forEach((app) => {
    const caproverApp = caproverApps.find(ca => ca.appName === app.appName);

    if (!caproverApp) {
        console.log(`Creating app: ${app.appName}`);

        const templateCreateAppJsonFile = readFileSync(join('..', 'requests', 'create_app.json'), 'utf-8');
        const realCreateAppJsonFile = templateCreateAppJsonFile.replace('{{app_name}}', app.appName);
        writeFileSync(join('requests', '_create_app.json'), realCreateAppJsonFile);

        execSync(`caprover api -o ./requests/_create_app.json`);
        
        // finish to configure the app...
        // meaning
        // 1. add http container port
        // 2. add custom domain
        // 3. enable HTTPS
        // 4. force https (if specified in the repoApp)
        // 5. add github repo info
        // 6. add push token to github repo

    } else {
    
        // Compare properties and update if needed
        let needsUpdate = false;

        // todo; compare

        if (needsUpdate) {
            console.log(`Updating app: ${app.appName}`);
        }
    }
});