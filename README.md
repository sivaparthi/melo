# Melo

Melo is a private, realtime emotion-sharing space with one-to-one conversations and friend-only groups. It includes a responsive React session room, male and female CSS avatars, 16 emotion controls, and a NestJS Socket.IO gateway that synchronizes room state for up to 12 participants.

## Requirements

- Node.js 20.17 or newer
- npm 11 or newer

## Run locally

```powershell
npm install
docker compose up -d postgres
npm run db:deploy --workspace api
npm run dev:api
```

In a second terminal:

```powershell
npm run dev:web
```

Open `http://localhost:5173`. Use the development login locally, then open a second browser profile or private window with a different display name to test friendships and realtime emotion synchronization.

PostgreSQL is exposed on local port `5433` to avoid conflicts with an existing PostgreSQL installation. Copy [apps/api/.env.example](apps/api/.env.example) to `apps/api/.env`; local secrets are gitignored.

## Google sign-in

Create a Google OAuth web application with this authorized redirect URI:

```text
http://localhost:3001/auth/google/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`. Without them, the API returns `503` and local development login remains available. Development login is disabled when `NODE_ENV=production`.

## Deploy with Docker to Azure

Azure Container Apps can run the included [Dockerfile](Dockerfile) with HTTPS ingress and WebSocket support. Use Azure Database for PostgreSQL Flexible Server for persistent storage. Container Apps can scale to zero, but PostgreSQL is billed separately unless covered by an Azure credit or free offer.

Test the production image locally:

```powershell
docker build -t melo:azure .
docker run --rm -p 3000:3000 `
	-e DATABASE_URL="postgresql://melo:melo@host.docker.internal:5433/melo" `
	-e WEB_ORIGIN="http://localhost:3000" `
	melo:azure
```

Deploy through the [Azure portal](https://portal.azure.com):

1. Create a resource group in a nearby region, such as **Central India**.
2. Create **Azure Database for PostgreSQL flexible server**, select PostgreSQL 16 and a small Burstable SKU, create a database named `melo`, require TLS, and permit the Container Apps environment to connect. For an initial public-network deployment, enable **Allow public access from Azure services**; use private networking for production isolation.
3. Create **Azure Container Registry**, then use its **Quick start > Build image** workflow or `az acr build --registry melocr --image melo:latest .` from this repository.
4. Create **Container Apps Environment**, then create a **Container App** named `melo-app` from `melocr-abe9b7f6hef2h9aw.azurecr.io/melo:latest`.
5. Enable external HTTP ingress, set the target port to `3000`, and start with one replica if uninterrupted WebSocket sessions matter. Scale-to-zero is cheaper but disconnects sessions while the app is idle and adds cold-start latency.
6. Add these Container App secrets: `database-url`, `google-client-id`, and `google-client-secret`. Map them to environment variables as shown below. Store secret values only in Azure, not in source control.

| Environment variable   | Value                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Secret reference to `postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/melo?sslmode=require` |
| `GOOGLE_CLIENT_ID`     | Secret reference to the Google OAuth client ID                                                                      |
| `GOOGLE_CLIENT_SECRET` | Secret reference to the rotated Google OAuth client secret                                                          |
| `GOOGLE_CALLBACK_URL`  | `https://shivnpsiv.com/auth/google/callback`                                                                        |
| `WEB_ORIGIN`           | `https://shivnpsiv.com`                                                                                             |
| `SESSION_COOKIE_NAME`  | `melo_session`                                                                                                      |
| `SESSION_TTL_DAYS`     | `30`                                                                                                                |

7. Confirm the generated `azurecontainerapps.io` URL returns a successful response from `/health`.
8. Under **Networking > Custom domains**, add `shivnpsiv.com` with an Azure-managed certificate. In Cloudflare, create the `A` and `TXT` records Azure displays. Keep the records **DNS only** so Azure can issue and renew the certificate; if Cloudflare proxying is enabled later, certificate renewal requirements must still remain satisfied.
9. Add `https://shivnpsiv.com` and `https://shivnpsiv.com/auth/google/callback` to the Google OAuth client's authorized origin and redirect URI respectively.

The container runs pending Prisma migrations before starting NestJS. React, REST endpoints, and Socket.IO are served by the same container and domain.

### Continuous deployment to Azure

The [GitHub Actions workflow](.github/workflows/azure-container-app.yml) validates every pull request. A push to `main` builds the Docker image, pushes both an immutable commit tag and `latest` to `melocr`, updates `melocontainerapp`, and checks the deployed `/health` endpoint. Prisma migrations run inside the new container before NestJS starts.

The workflow authenticates without a client secret by using GitHub OIDC and a user-assigned Azure identity. Create the identity and its narrowly scoped role assignments once:

```powershell
$subscriptionId = "4a75dda4-8f2e-41e1-9cdb-683b5e971319"
$tenantId = "7ef31e11-917e-4e49-b2fc-0b41303fee6f"
$repositorySubject = "repo:sivaparthi@86819116/melo@1324397721:environment:production"

az account set --subscription $subscriptionId

$identity = az identity create `
	--name melo-github `
	--resource-group Melo `
	--query "{clientId:clientId,principalId:principalId,id:id}" `
	| ConvertFrom-Json

az identity federated-credential create `
	--name melo-main-immutable `
	--identity-name melo-github `
	--resource-group Melo `
	--issuer "https://token.actions.githubusercontent.com" `
	--subject $repositorySubject `
	--audiences "api://AzureADTokenExchange"

$registryId = az acr show --name melocr --query id --output tsv
$containerAppId = az containerapp show --name melocontainerapp --resource-group Melo --query id --output tsv

az role assignment create --assignee-object-id $identity.principalId --assignee-principal-type ServicePrincipal --role AcrPush --scope $registryId
az role assignment create --assignee-object-id $identity.principalId --assignee-principal-type ServicePrincipal --role Reader --scope $registryId
az role assignment create --assignee-object-id $identity.principalId --assignee-principal-type ServicePrincipal --role Contributor --scope $containerAppId
```

`AcrPush` permits image push and pull operations. The ACR-scoped `Reader` assignment lets Azure CLI resolve the registry's DNS-hash login server before requesting its short-lived access token.

The workflow contains the Azure client, tenant, and subscription IDs because they are identifiers rather than credentials; no Azure client secret is stored in GitHub. The `production` environment is created when the workflow first runs and can later be given approval or branch protection rules under **Settings > Environments**.

Commit and push to `main` to deploy. Review progress under the repository's **Actions** tab. Azure keeps the previous Container App revision available for rollback, while each deployment references its immutable commit image tag.

## Deploy to shivnpsiv.com

The production deployment uses one Render web service for React, NestJS, and Socket.IO, plus Render PostgreSQL. The included [render.yaml](render.yaml) provisions both services. Keeping the browser and API on one origin makes secure cookies and WebSockets work without cross-domain configuration.

1. Push this repository to GitHub or GitLab.
2. In Render, select **New > Blueprint**, connect the repository, and deploy `render.yaml`.
3. Enter `GOOGLE_CLIENT_ID` and a newly rotated `GOOGLE_CLIENT_SECRET` when Render requests the unsynced variables.
4. The Blueprint registers `shivnpsiv.com` as the custom domain. Render also provisions the corresponding `www` redirect.
5. In Cloudflare DNS, create the records Render displays under **Settings > Custom Domains**. Keep them **DNS only** until Render verifies the domains and issues certificates; the Cloudflare proxy can be enabled afterward.
6. In Cloudflare SSL/TLS, use **Full (strict)** and enable **Always Use HTTPS**.
7. In the Google OAuth web client, add:

```text
Authorized JavaScript origin: https://shivnpsiv.com
Authorized redirect URI:      https://shivnpsiv.com/auth/google/callback
```

Render builds all workspaces, applies pending Prisma migrations at startup, starts the API, and serves the built frontend from the same process. WebSockets use the same `wss://shivnpsiv.com` origin automatically. After upgrading the web service to a paid plan, the migration command can be moved to Render's dedicated pre-deploy command.

The Blueprint starts on Render's free service and database plans to avoid an automatic charge. Free services can sleep and are suitable for initial testing; move the web service to `starter` and PostgreSQL to `basic-256mb` before relying on always-available WebSocket sessions and durable production storage.

Do not commit `apps/api/.env`. The previously shared Google client secret should be rotated before production deployment.

## Validate

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Current scope

- Shared Zod schemas and typed Socket.IO events
- Google OAuth and opaque, hashed, revocable cookie sessions
- Persistent profiles with unique usernames and avatar selection
- Exact username discovery and friend request accept/decline/cancel flows
- Canonical, unique friendships and unfriend controls
- PostgreSQL persistence through Prisma migrations
- Persistent direct and group room membership with friend-only invitations
- Session-cookie-authenticated Socket.IO joins with database-backed room authorization
- In-memory live presence and emotion state with a 12-participant limit
- Persistent mood until changed or reset to neutral
- Responsive session grid and direct access to all 16 emotions
- CSS avatar poses and transitions with reduced-motion support

Redis fan-out, persisted emotion events and private recaps, room invitation acceptance, and production Rive assets remain for later phases. Live presence and current emotion state remain in memory, while room membership is persisted and authorized through PostgreSQL.
