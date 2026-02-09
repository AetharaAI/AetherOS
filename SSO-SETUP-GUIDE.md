# Passport SSO Setup Guide
## AetherPro Technologies Ecosystem Integration

---

## Step 1: Create Your Realm

1. Go to **https://passport.aetherpro.us/admin**
2. Click **"Create realm"** (top-left dropdown)
3. Realm name: `aetherpro`
4. Click **Create**

---

## Step 2: Configure Realm Settings

In the `aetherpro` realm:

1. **Realm settings** → **Login** tab:
   - ✅ User registration (if you want public signups)
   - ✅ Email as username
   - ✅ Login with email
   - ✅ Remember me

2. **Realm settings** → **Email** tab:
   - Configure SMTP for password resets

---

## Step 3: Create SSO Clients

### A. AetherPro.tech (Chat Interface)

1. **Clients** → **Create client**
2. Settings:
   - Client ID: `aetherpro-chat`
   - Client type: `OpenID Connect`
   - Client authentication: `ON`
3. Next → Configure:
   - Valid redirect URIs: `https://aetherpro.tech/*`
   - Web origins: `https://aetherpro.tech`
4. Save → **Credentials** tab → Copy the **Client secret**

### B. AetherAgentForge.org (Agent Marketplace)

1. **Clients** → **Create client**
2. Settings:
   - Client ID: `agent-forge`
   - Client type: `OpenID Connect`
   - Client authentication: `ON`
3. Configure:
   - Valid redirect URIs: `https://aetheragentforge.org/*`
   - Web origins: `https://aetheragentforge.org`
4. Save → Copy **Client secret**

### C. Perceptor.us (Vision/Security Platform)

1. **Clients** → **Create client**
2. Settings:
   - Client ID: `perceptor`
   - Client type: `OpenID Connect`
   - Client authentication: `ON`
3. Configure:
   - Valid redirect URIs: `https://perceptor.us/*`
   - Web origins: `https://perceptor.us`
4. Save → Copy **Client secret**

### D. MCPFabric.space (Agent MCP Server)

1. **Clients** → **Create client**
2. Settings:
   - Client ID: `mcp-fabric`
   - Client type: `OpenID Connect`
   - Client authentication: `ON`
3. Configure:
   - Valid redirect URIs: `https://mcpfabric.space/*`
   - Web origins: `https://mcpfabric.space`
4. Save → Copy **Client secret**

---

## Step 4: Application Integration

### Next.js / React Apps (next-auth)

```bash
npm install next-auth
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

const handler = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: "aetherpro-chat",  // or your client ID
      clientSecret: process.env.PASSPORT_CLIENT_SECRET!,
      issuer: "https://passport.aetherpro.us/realms/aetherpro",
    }),
  ],
});

export { handler as GET, handler as POST };
```

```bash
# .env.local
PASSPORT_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=https://aetherpro.tech
NEXTAUTH_SECRET=generate_a_random_string
```

### Python / FastAPI

```bash
pip install python-keycloak
```

```python
from keycloak import KeycloakOpenID

keycloak_openid = KeycloakOpenID(
    server_url="https://passport.aetherpro.us/",
    client_id="mcp-fabric",
    realm_name="aetherpro",
    client_secret_key="your_client_secret"
)

# Verify token from request
def verify_token(token: str):
    return keycloak_openid.decode_token(token, validate=True)
```

---

## Step 5: Agent Passports (Agency Extension)

Your **Agency** extension enables machine identity. In the Admin Console:

1. Go to **Agency** (left sidebar)
2. Create agent identities with:
   - Agent name
   - Owner (human user)
   - Capabilities/scopes
   - Expiration policy

Agents authenticate using **client credentials flow**:

```bash
# Agent getting its own token
curl -X POST https://passport.aetherpro.us/realms/aetherpro/protocol/openid-connect/token \
  -d "client_id=agent-marketplace-bot" \
  -d "client_secret=AGENT_SECRET" \
  -d "grant_type=client_credentials"
```

---

## OIDC Discovery URLs

All your apps can use these endpoints:

| Purpose | URL |
|---------|-----|
| Issuer | `https://passport.aetherpro.us/realms/aetherpro` |
| Discovery | `https://passport.aetherpro.us/realms/aetherpro/.well-known/openid-configuration` |
| Token | `https://passport.aetherpro.us/realms/aetherpro/protocol/openid-connect/token` |
| Auth | `https://passport.aetherpro.us/realms/aetherpro/protocol/openid-connect/auth` |
| Userinfo | `https://passport.aetherpro.us/realms/aetherpro/protocol/openid-connect/userinfo` |

---

## Security Best Practices

1. **Rotate client secrets** periodically
2. **Use PKCE** for public clients (SPAs)
3. **Set token lifespans** appropriately (short for agents)
4. **Enable MFA** for admin accounts
5. **Audit logs** - Enable in Passport for compliance

---

## Government Compliance Notes

For CAGE code / SAM.gov compliance:
- Passport supports **FIPS 140-2** crypto providers
- Enable **audit logging** for all auth events
- Configure **session policies** per FedRAMP guidelines
- Document your **identity proofing** process for Agent Passports
