import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const env = JSON.parse(readFileSync(join('..', 'env.json'), 'utf-8'));

const repoApps = JSON.parse(readFileSync(join('..', 'apps.json'), 'utf-8'));
let caproverApps = JSON.parse(readFileSync('apps.json', 'utf-8'));

const execRequestFile = (fileName) => execSync(`CAPROVER_CONFIG_FILE='requests/${fileName}' caprover api -o ${`requests/_out_${fileName}`}`); 

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
        .replace('{{github_repo_url}}', `github.com/${env.githubOrganizationName}/${app.repo}`);

    return realUpdateAppJsonFile;

}

fetchApps();

(async () => {

    for (const app of repoApps) {

        console.log('----------------------------------------');
        console.log(`Checking app: ${app.name}`);
    
        const caproverApp = caproverApps.find(ca => ca.appName === app.name);
    
        if (!caproverApp) {
            console.log(`Creating app: ${app.name}`);
    
            // CREATE AN EMPTY APP ON CAPROVER
    
            const templateCreateAppJsonFile = readFileSync(join('requests', 'create_app.json'), 'utf-8');
            const realCreateAppJsonFile = templateCreateAppJsonFile.replace('{{app_name}}', app.name);
            writeFileSync(join('requests', '_create_app.json'), realCreateAppJsonFile);
            execRequestFile('_create_app.json');
    
            console.log(`✅ App created: ${app.name}`);
    
            // ATTACH THE DOMAIN TO THE APP
    
            const templateAttachCustomDomain = readFileSync(join('requests', 'attach_custom_domain.json'), 'utf-8');
            const realAttachCustomDomain = templateAttachCustomDomain
                .replace('{{app_name}}', app.name)
                .replace('{{custom_domain}}', `${app._subdomain}.${env.mainDomain}`);
    
            writeFileSync(join('requests', '_attach_custom_domain.json'), realAttachCustomDomain);
            execRequestFile('_attach_custom_domain.json');
    
            console.log(`✅ Domain attached: ${app.name}`);
    
            // ENABLE SSL FOR THE DOMAIN
    
            const templateEnableSSLCustomDomain = readFileSync(join('requests', 'enable_ssl_custom_domain.json'), 'utf-8');
            const realEnableSSLCustomDomain = templateEnableSSLCustomDomain
                .replace('{{app_name}}', app.name)
                .replace('{{custom_domain}}', `${app._subdomain}.${env.mainDomain}`);
    
            writeFileSync(join('requests', '_enable_ssl_custom_domain.json'), realEnableSSLCustomDomain);
            execRequestFile('_enable_ssl_custom_domain.json');
    
            console.log(`✅ SSL enabled: ${app.name}`);
    
            // UPDATE APP'S CONFIGURATION
    
            const updateAppJson = generateAppUpdateJson(app);
            writeFileSync(join('requests', '_update_app.json'), updateAppJson);
            execRequestFile('_update_app.json');
    
            console.log(`✅ App updated: ${app.name}`);
    
            // RE-FETCH APPS
            fetchApps();
            const newApp = caproverApps.find(ca => ca.appName === app.name);
            const pushWebhookToken = newApp.appPushWebhook.pushWebhookToken;
    
            const templateTriggerBuild = readFileSync(join('requests', 'trigger_build.json'), 'utf-8');
            const realTriggerBuild = templateTriggerBuild
                .replace('{{namespace}}', env.captainTriggerBuildNamespace)
                .replace('{{push_webhook_token}}', pushWebhookToken);
    
            writeFileSync(join('requests', '_trigger_build.json'), realTriggerBuild);
            execRequestFile('_trigger_build.json');
    
            console.log(`✅ Build triggered: ${app.name}`);
    
            // TODO: ADD GITHUB WEBHOOK
    
            const pushWebookUrl = `https://${env.captainSubdomain}.${env.mainDomain}/api/v2/user/apps/webhooks/triggerbuild?namespace=${env.captainTriggerBuildNamespace}&token=${pushWebhookToken}`;
    
            await fetch(`https://api.github.com/repos/${env.githubOrganizationName}/${app.repo}/hooks`, {
                method: 'POST',
                headers: {
                    Authorization: `token ${process.env.GH_USER_TOKEN}`,
                    Accept: 'application/vnd.github+json',
                    'X-Github-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    name: "web",
                    active: true,
                    events: ["push"],
                    config: {
                        url: pushWebookUrl,
                        content_type: "json",
                        insecure_ssl: "0"
                    }
                })
            });
    
            console.log(`✅ Added GitHub deploy webook: ${app.name}`);
    
        } else {
    
            console.log(`App exists: ${app.name}`);
        
            // Compare properties and update if needed
            let needsUpdate = [];
    
            if (caproverApp.containerHttpPort !== app._internal_port) {
                needsUpdate.push('internal port');
            }
    
            if (caproverApp.forceSsl !== app._force_https) {
                needsUpdate.push('force https');
            }
    
            if (caproverApp.captainDefinitionRelativeFilePath !== app._captain_definition_relative_file_path) {
                needsUpdate.push('captain definition relative file path');
            }
    
            if (
                (caproverApp.appPushWebhook?.repoInfo?.branch !== app._repo_branch)
                || (caproverApp.appPushWebhook?.repoInfo?.repo !== `github.com/${env.githubOrganizationName}/${app.repo}`)
            ) {
                needsUpdate.push('repo details');
            }
    
            if (needsUpdate.length > 0) {
    
                console.log(`Updating app: ${app.name} (${needsUpdate.join(', ')})`);
    
                // UPDATE APP'S CONFIGURATION
                const updateAppJson = generateAppUpdateJson(app);
                writeFileSync(join('requests', '_update_app.json'), updateAppJson);
                execRequestFile('_update_app.json');
    
                // RE-FETCH APPS
                fetchApps();
                const newApp = caproverApps.find(ca => ca.appName === app.name);
                const pushWebhookToken = newApp.appPushWebhook.pushWebhookToken;
    
                const templateTriggerBuild = readFileSync(join('..', 'requests', 'trigger_build.json'), 'utf-8');
                const realTriggerBuild = templateTriggerBuild
                    .replace('{{namespace}}', env.captainTriggerBuildNamespace)
                    .replace('{{push_webhook_token}}', pushWebhookToken);
                
                writeFileSync(join('requests', '_trigger_build.json'), realTriggerBuild);
                execRequestFile('_trigger_build.json')
    
            }
        }
    
        console.log(`🆗 App is up to date: ${app.name}`);
    }

    let README = '# Caprover Apps\n\n';

    for (const app of caproverApps) {

        const url = (app.forceSsl ? "https://" : "http://") +
          (app.customDomain?.[0]?.publicDomain || app.appName + "." + env.baseServiceURL);

        README += `## [${app.appName}](${url})\n\n`;
        README += `**App name:** ${app.appName}  \n`;
        README += `**App URL:** ${url}  \n`;
        README += `**App repo:** ${app?.appPushWebhook?.repoInfo?.repo || 'not defined.'}  \n`;
        README += '<details><summary>More info</summary>\n\n'
        README += `**Internal port:** ${app.containerHttpPort || 'not defined.'}  \n`;
        README += `**Force SSL:** ${app.forceSsl ? 'Yes' : 'No'}  \n`;
        README += `**Captain definition relative file path:** ${app.captainDefinitionRelativeFilePath || 'not defined.'}  \n`;
        README += '</details>\n\n';

    }

    writeFileSync(join('..', 'README.md'), README);

})();
