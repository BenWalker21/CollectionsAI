# CollectionsAI connection setup

The fastest MVP workflow is AR aging CSV upload. Users can try CollectionsAI
without connecting QuickBooks or email.

This guide is for the optional later workflow where the paid website connects directly to:

- QuickBooks Online
- Gmail
- Outlook / Microsoft 365

The direct connection buttons run in setup mode until you create developer
credentials and add them to `.env`.

## What you need to do

These steps require your account access, so the agent cannot complete them for you.

### 1. Create a QuickBooks developer app

1. Go to the Intuit Developer dashboard.
2. Create an app for QuickBooks Online.
3. Add this redirect URL:

   ```text
   http://localhost:4173/api/qbo/callback
   ```

4. Copy the app's client ID and client secret.
5. Put them in `.env`:

   ```text
   QBO_CLIENT_ID=your_client_id
   QBO_CLIENT_SECRET=your_client_secret
   QBO_REDIRECT_URI=http://localhost:4173/api/qbo/callback
   ```

### 2. Create a Google app for Gmail

1. Go to Google Cloud Console.
2. Create an OAuth client for a web application.
3. Enable the Gmail API.
4. Add this redirect URL:

   ```text
   http://localhost:4173/api/gmail/callback
   ```

5. Put the credentials in `.env`:

   ```text
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:4173/api/gmail/callback
   ```

### 3. Create a Microsoft app for Outlook

1. Go to Azure App registrations.
2. Create a new app registration.
3. Add this redirect URL:

   ```text
   http://localhost:4173/api/outlook/callback
   ```

4. Add Microsoft Graph mail permissions:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `offline_access`
5. Put the credentials in `.env`:

   ```text
   MICROSOFT_CLIENT_ID=your_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   MICROSOFT_REDIRECT_URI=http://localhost:4173/api/outlook/callback
   ```

## Run locally

Copy the example environment file:

```bash
cp .env.example .env
```

Start the server:

```bash
npm run serve
```

Open:

```text
http://localhost:4173
```

Then open the website demo:

```text
http://localhost:4173/demo/
```

## What still needs to be built after credentials work

After OAuth is working, the production backend needs:

- User accounts and login
- A database for encrypted OAuth tokens
- QuickBooks invoice sync jobs
- Gmail/Outlook message sync jobs
- AI draft generation with approval before sending
- Audit logs for every automated follow-up
