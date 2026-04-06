#!/usr/bin/env bash
set -euo pipefail

#####################################################################
# New Dawn - Azure Deployment Script
#
# Prerequisites:
#   - az CLI logged in with Contributor access on the subscription
#   - .NET 10 SDK installed
#   - Node.js / npm installed
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#####################################################################

RESOURCE_GROUP="NewDawn-RG"
LOCATION="westus2"
PLAN_NAME="NewDawn-Plan"
API_APP_NAME="newdawn-api"
STATIC_APP_NAME="newdawn-web"
RUNTIME="DOTNETCORE:10.0"
SKU="B1"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend/New_Dawn/New_Dawn"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "=== Step 1: Create Resource Group ==="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
echo "  Resource group '$RESOURCE_GROUP' created in '$LOCATION'"

echo ""
echo "=== Step 2: Create App Service Plan ==="
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku "$SKU" \
  --is-linux \
  --output none
echo "  App service plan '$PLAN_NAME' created (Linux, $SKU)"

echo ""
echo "=== Step 3: Create Backend Web App ==="
az webapp create \
  --name "$API_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "$RUNTIME" \
  --output none
echo "  Web app '$API_APP_NAME' created"

echo ""
echo "=== Step 4: Configure Environment Variables ==="
az webapp config appsettings set \
  --name "$API_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    SUPABASE_CONNECTION_STRING="Host=aws-1-us-west-2.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.otluyiykkmsnacuubczm;Password=7Hu6EWkXf?JQp@m;SSL Mode=Require;Trust Server Certificate=true" \
    JWT_SECRET="NewDawnSecureJwtKey2026ForIS414ProjectAtBYU!" \
    ASPNETCORE_ENVIRONMENT="Production" \
  --output none
echo "  App settings configured"

echo ""
echo "=== Step 5: Enable HTTPS-Only ==="
az webapp update \
  --name "$API_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --https-only true \
  --output none
echo "  HTTPS-only enabled"

echo ""
echo "=== Step 6: Build & Deploy Backend ==="
cd "$BACKEND_DIR"
rm -rf publish deploy.zip
dotnet publish -c Release -o ./publish
cd publish
zip -r ../deploy.zip .
cd ..
az webapp deploy \
  --resource-group "$RESOURCE_GROUP" \
  --name "$API_APP_NAME" \
  --src-path deploy.zip \
  --type zip
echo "  Backend deployed to https://$API_APP_NAME.azurewebsites.net"

echo ""
echo "=== Step 7: Build Frontend ==="
cd "$FRONTEND_DIR"
VITE_API_BASE_URL="https://$API_APP_NAME.azurewebsites.net" npm run build
echo "  Frontend built with API URL: https://$API_APP_NAME.azurewebsites.net"

echo ""
echo "=== Step 8: Create & Deploy Static Web App ==="
az staticwebapp create \
  --name "$STATIC_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none 2>/dev/null || echo "  (Static Web App may already exist)"

# Get the deployment token
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "$STATIC_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" \
  --output tsv)

# Install SWA CLI if needed and deploy
npx --yes @azure/static-web-apps-cli deploy \
  "$FRONTEND_DIR/dist" \
  --deployment-token "$DEPLOY_TOKEN" \
  --env production

FRONTEND_URL=$(az staticwebapp show \
  --name "$STATIC_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostname" \
  --output tsv)
echo "  Frontend deployed to https://$FRONTEND_URL"

echo ""
echo "=== Step 9: Update CORS with Frontend URL ==="
az webapp config appsettings set \
  --name "$API_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings ALLOWED_ORIGIN="https://$FRONTEND_URL" \
  --output none
echo "  CORS updated with frontend origin"

echo ""
echo "=== Step 10: Verify Deployment ==="
echo "  Waiting 30s for app to start..."
sleep 30

echo ""
echo "  Testing health endpoint..."
curl -s "https://$API_APP_NAME.azurewebsites.net/health/db" | python3 -m json.tool 2>/dev/null || echo "  (Health check pending - app may still be starting)"

echo ""
echo "  Testing public impact endpoint..."
curl -s "https://$API_APP_NAME.azurewebsites.net/api/public-impact" | python3 -m json.tool 2>/dev/null | head -20 || echo "  (API check pending)"

echo ""
echo "================================================================"
echo "  DEPLOYMENT COMPLETE"
echo "================================================================"
echo "  Backend API:  https://$API_APP_NAME.azurewebsites.net"
echo "  Frontend:     https://$FRONTEND_URL"
echo "  Swagger:      https://$API_APP_NAME.azurewebsites.net/swagger"
echo "================================================================"
