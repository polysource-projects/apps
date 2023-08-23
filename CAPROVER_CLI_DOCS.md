In this example, we are going to use "refweek" as the name of the app we are going to manage.

## Create an app

**Endpoint**: `/user/apps/appDefinitions/register`  
**Method**: `POST`  
**Body**: `{"appName": "refweek", "hasPersistentData": false}`

## Attach GitHub repo to an app / force SSL / change container port

**Endpoint**: `/user/apps/appDefinitions/update`  
**Method**: `POST`  
**Body**: `{
  "appName": "test",
  "instanceCount": 1,
  "captainDefinitionRelativeFilePath": "./captain-definition",
  "notExposeAsWebApp": false,
  "forceSsl": false,
  "websocketSupport": false,
  "containerHttpPort": 3000,
  "volumes": [],
  "ports": [],
  "appPushWebhook": {
    "repoInfo": {
      "user": "androz2091@gmail.com",
      "password": "______",
      "branch": "main",
      "sshKey": "",
      "repo": "github.com/epfl-tools/refweek"
    }
  },
  "description": "",
  "envVars": []
}`

## Create GitHub Repository

URL: `http://captain.sys.epfl.tools/api/v2/user/apps/webhooks/triggerbuild?namespace=captain&token={appData.appPushWebhook.pushWebhookToken}`

## Get apps statuses and configurations

**Endpoint**: `/user/apps/appDefinitions`  
**Method**: `GET`  
**Example Response**:
<details>
  <summary>View JSON</summary>

  ```json
  {
    "status": "number",
    "description": "string",
    "data": {
        "appDefinitions": [
            {
                "hasPersistentData": "boolean",
                "description": "string",
                "instanceCount": "number",
                "captainDefinitionRelativeFilePath": "string",
                "networks": [
                    "string"
                ],
                "envVars": [
                    {
                        "key": "string",
                        "value": "string"
                    }
                ],
                "volumes": [
                    {
                        "containerPath": "string",
                        "volumeName": "string"
                    }
                ],
                "ports": [
                    "object"
                ],
                "versions": [
                    {
                        "version": "number",
                        "timeStamp": "string",
                        "deployedImageName": "string",
                        "gitHash": "string"
                    }
                ],
                "deployedVersion": "number",
                "notExposeAsWebApp": "boolean",
                "customDomain": [
                    {
                        "publicDomain": "string",
                        "hasSsl": "boolean"
                    }
                ],
                "hasDefaultSubDomainSsl": "boolean",
                "forceSsl": "boolean",
                "websocketSupport": "boolean",
                "containerHttpPort": "number",
                "preDeployFunction": "string",
                "serviceUpdateOverride": "string",
                "appDeployTokenConfig": {
                    "enabled": "boolean"
                },
                "appPushWebhook": {
                    "tokenVersion": "string",
                    "pushWebhookToken": "string",
                    "repoInfo": {
                        "repo": "string",
                        "user": "string",
                        "password": "string",
                        "sshKey": "string",
                        "branch": "string"
                    }
                },
                "appName": "string",
                "isAppBuilding": "boolean"
            }
        ],
        "rootDomain": "string",
        "defaultNginxConfig": "string"
      }
  }
  ```
</details>
