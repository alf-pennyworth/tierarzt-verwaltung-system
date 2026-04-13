/**
 * API Self-Service Portal
 * 
 * HTML page for practice admins to manage API keys
 * Access at /portal when running the API
 */

export const portalHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vet App API Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 2rem;
    }
    header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    header p { opacity: 0.9; }
    .content { padding: 2rem; }
    .card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    h2 { color: #1e3a5f; margin-bottom: 1rem; font-size: 1.3rem; }
    .endpoint {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
      overflow-x: auto;
      margin-bottom: 0.5rem;
    }
    .method { 
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      margin-right: 0.5rem;
    }
    .get { background: #22c55e; color: white; }
    .post { background: #3b82f6; color: white; }
    .delete { background: #ef4444; color: white; }
    .patch { background: #f59e0b; color: white; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .key { 
      font-family: monospace;
      background: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem;
      border-radius: 0 8px 8px 0;
      margin: 1rem 0;
    }
    .code-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.85rem;
    }
    footer {
      background: #f8fafc;
      padding: 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🩺 Vet App API Portal</h1>
      <p>Headless API for veterinary practice integration</p>
    </header>
    
    <div class="content">
      <div class="card">
        <h2>📡 API Endpoints</h2>
        
        <div class="endpoint">
          <span class="method get">GET</span> /health
          <span style="color:#94a3b8">→ Health check (no auth)</span>
        </div>
        
        <div class="endpoint">
          <span class="method get">GET</span> /openapi.json
          <span style="color:#94a3b8">→ OpenAPI specification</span>
        </div>
        
        <h3 style="margin: 1rem 0 0.5rem; color:#475569;">🔐 API Key Management</h3>
        
        <div class="endpoint">
          <span class="method get">GET</span> /api-keys
          <span style="color:#94a3b8">→ List your API keys</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span> /api-keys
          <span style="color:#94a3b8">→ Create new API key</span>
        </div>
        <div class="endpoint">
          <span class="method delete">DELETE</span> /api-keys/:id
          <span style="color:#94a3b8">→ Revoke API key</span>
        </div>
        
        <h3 style="margin: 1rem 0 0.5rem; color:#475569;">🐾 Patients</h3>
        
        <div class="endpoint">
          <span class="method get">GET</span> /patients?page=1&limit=20
          <span style="color:#94a3b8">→ List patients</span>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span> /patients/:id
          <span style="color:#94a3b8">→ Get patient details</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span> /patients
          <span style="color:#94a3b8">→ Create patient</span>
        </div>
        
        <h3 style="margin: 1rem 0 0.5rem; color:#475569;">💊 TAMG (Antibiotic Tracking)</h3>
        
        <div class="endpoint">
          <span class="method get">GET</span> /tamg/prescriptions
          <span style="color:#94a3b8">→ List antibiotic prescriptions</span>
        </div>
        <div class="endpoint">
          <span class="method post">POST</span> /tamg/prescriptions
          <span style="color:#94a3b8">→ Create prescription</span>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span> /tamg/export?start_date=2024-01-01&end_date=2024-12-31
          <span style="color:#94a3b8">→ BVL CSV export</span>
        </div>
        <div class="endpoint">
          <span class="method get">GET</span> /tamg/antibiotics
          <span style="color:#94a3b8">→ List available antibiotics</span>
        </div>
      </div>
      
      <div class="card">
        <h2>🔑 Authentication</h2>
        
        <p style="margin-bottom: 1rem;">
          All API requests require an API key in the header:
        </p>
        
        <div class="code-block">
X-Api-Key: vet_your_api_key_here
        </div>
        
        <div class="warning">
          <strong>⚠️ Important:</strong> Store your API key securely. It's only shown once when created.
        </div>
      </div>
      
      <div class="card">
        <h2>📝 Example: Create API Key</h2>
        
        <div class="code-block">
curl -X POST https://api.vet-app.de/api-keys \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "name": "My Integration",
    "scopes": ["read", "transcribe"],
    "rate_limit": 100
  }'
        </div>
        
        <p style="margin-top: 1rem; color:#64748b;">
          Response includes the API key <strong>once</strong> - store it securely!
        </p>
      </div>
      
      <div class="card">
        <h2>📝 Example: Create Patient</h2>
        
        <div class="code-block">
curl -X POST https://api.vet-app.de/patients \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: vet_your_api_key" \\
  -d '{
    "name": "Bello",
    "species": "Hund",
    "breed": "Labrador",
    "owner_name": "Max Mustermann"
  }'
        </div>
      </div>
      
      <div class="card">
        <h2>📊 Rate Limits</h2>
        
        <table>
          <tr>
            <th>Scope</th>
            <th>Default Limit</th>
            <th>Description</th>
          </tr>
          <tr>
            <td><code>read</code></td>
            <td>100 req/min</td>
            <td>Read patients, treatments, prescriptions</td>
          </tr>
          <tr>
            <td><code>write</code></td>
            <td>50 req/min</td>
            <td>Create/update patients, treatments</td>
          </tr>
          <tr>
            <td><code>transcribe</code></td>
            <td>20 req/min</td>
            <td>Audio transcription endpoints</td>
          </tr>
          <tr>
            <td><code>admin</code></td>
            <td>Custom</td>
            <td>API key management, full access</td>
          </tr>
        </table>
      </div>
      
      <div class="card">
        <h2>🛠️ Integration Guide</h2>
        
        <ol style="padding-left: 1.5rem; line-height: 2;">
          <li>Create an API key in the portal (requires authentication)</li>
          <li>Store the key securely (it's shown only once)</li>
          <li>Add <code>X-Api-Key</code> header to all requests</li>
          <li>Check rate limit headers: <code>X-RateLimit-Remaining</code></li>
          <li>Handle 429 responses with exponential backoff</li>
        </ol>
      </div>
    </div>
    
    <footer>
      <p>Vet App API v1.0.0 • Built with Hono • © 2024</p>
    </footer>
  </div>
</body>
</html>
`;

// Add portal route to main app
export function addPortalRoute(app: Hono) {
  app.get('/portal', (c) => {
    return c.html(portalHtml);
  });
  
  app.get('/', (c) => {
    return c.redirect('/portal');
  });
}