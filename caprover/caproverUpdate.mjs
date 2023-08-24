import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const env = JSON.parse(readFileSync(join('..', 'env.json'), 'utf-8'));

const repoApps = JSON.parse(readFileSync(join('..', 'apps.json'), 'utf-8'));
let caproverApps = JSON.parse(readFileSync('apps.json', 'utf-8'));

const fetchApps = () => {
    execSync(`CAPROVER_CONFIG_FILE='requests/list_apps.json' caprover api -o apps.json`);
    caproverApps = JSON.parse(readFileSync('apps.json', 'utf-8'))?.appDefinitions;
}

const generateAppUpdateJson = (app) => {

    const templateUpdateAppJsonFile = readFileSync(join('requests', 'update_app.json'), 'utf-8');
    let realUpdateAppJsonFile = templateUpdateAppJsonFile
        .replace('{{app_name}}', app.name)
        .replace('"{{container_http_port}}"', app._internal_port || 3000)
        .replace('"{{force_ssl}}"', app._force_https || false)
        .replace('{{captain_definition_relative_file_path}}', app._captain_definition_relative_file_path || 'captain-definition')
        
        .replace('{{github_user_email}}', process.env.GH_USER_EMAIL)
        .replace('{{github_user_password}}', process.env.GH_USER_PASSWORD)
        .replace('{{github_branch_name}}', app._repo_branch || 'master')
        .replace('{{github_repo_url}}', app.repo);

    return realUpdateAppJsonFile;

}

fetchApps();

repoApps.forEach((app) => {
    const caproverApp = caproverApps.find(ca => ca.appName === app.name);

    if (!caproverApp) {
        console.log(`Creating app: ${app.name}`);

        // CREATE AN EMPTY APP ON CAPROVER

        const templateCreateAppJsonFile = readFileSync(join('requests', 'create_app.json'), 'utf-8');
        const realCreateAppJsonFile = templateCreateAppJsonFile.replace('{{app_name}}', app.name);
        writeFileSync(join('requests', '_create_app.json'), realCreateAppJsonFile);

        execSync(`caprover api -o ./requests/_create_app.json`);

        // ATTACH THE DOMAIN TO THE APP

        const templateAttachCustomDomain = readFileSync(join('requests', 'attach_custom_domain.json'), 'utf-8');
        const realAttachCustomDomain = templateAttachCustomDomain
            .replace('{{app_name}}', app.name)
            .replace('{{custom_domain}}', `${app._subdomain}.${env.mainDomain}`);

        writeFileSync(join('requests', '_attach_custom_domain.json'), realAttachCustomDomain);

        execSync(`caprover api -o ./requests/_attach_custom_domain.json`);

        // UPDATE APP'S CONFIGURATION

        const updateAppJson = generateAppUpdateJson(app);
        writeFileSync(join('requests', '_update_app.json'), updateAppJson);

        execSync(`caprover api -o ./requests/_update_app.json`);

        // RE-FETCH APPS
        fetchApps();
        const newApp = caproverApps.find(ca => ca.appName === app.name);
        const pushWebhookToken = newApp.appPushWebhook.pushWebhookToken;

        const templateTriggerBuild = readFileSync(join('requests', 'trigger_build.json'), 'utf-8');
        const realTriggerBuild = templateTriggerBuild
            .replace('{{namespace}}', env.captainTriggerBuildNamespace)
            .replace('{{push_webhook_token}}', pushWebhookToken);

        writeFileSync(join('requests', '_trigger_build.json'), realTriggerBuild);

        execSync(`caprover api -o ./requests/_trigger_build.json`);

        // TODO: ADD GITHUB WEBHOOK

        const pushWebookUrl = `https://${env.captainSubdomain}.${env.captainDomain}/api/v2/user/apps/webhooks/triggerbuild?namespace=${env.captainTriggerBuildNamespace}&token=${pushWebhookToken}`;

        console.log(`Adding webhook to repo: ${app.repo}`);

    } else {
    
        // Compare properties and update if needed
        let needsUpdate = [];

        if (caproverApp._internal_port !== app._internal_port) {
            needsUpdate.push('internal port');
        }

        if (caproverApp._force_https !== app._force_https) {
            needsUpdate.push('force https');
        }

        if (caproverApp._captain_definition_relative_file_path !== app._captain_definition_relative_file_path) {
            needsUpdate.push('captain definition relative file path');
        }

        if (
            (caproverApp._repo_branch !== app._repo_branch)
            || (caproverApp.repo !== app.repo)
        ) {
            needsUpdate.push('repo details');
        }

        if (needsUpdate.length > 0) {

            console.log(`Updating app: ${app.name} (${needsUpdate.join(', ')})`);

            // UPDATE APP'S CONFIGURATION
            const updateAppJson = generateAppUpdateJson(app);
            writeFileSync(join('requests', '_update_app.json'), updateAppJson);

            execSync(`caprover api -o ./requests/_update_app.json`);

            // RE-FETCH APPS
            fetchApps();
            const newApp = caproverApps.find(ca => ca.appName === app.name);
            const pushWebhookToken = newApp.appPushWebhook.pushWebhookToken;

            const templateTriggerBuild = readFileSync(join('..', 'requests', 'trigger_build.json'), 'utf-8');
            const realTriggerBuild = templateTriggerBuild
                .replace('{{namespace}}', env.captainTriggerBuildNamespace)
                .replace('{{push_webhook_token}}', pushWebhookToken);
            
            writeFileSync(join('requests', '_trigger_build.json'), realTriggerBuild);

            execSync(`caprover api -o ./requests/_trigger_build.json`);

        }
    }
});