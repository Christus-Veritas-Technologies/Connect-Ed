# Cloudflare R2 Setup Guide

Connect-Ed uses **Cloudflare R2** for cloud file storage (shared files, documents, resources). R2 is S3-compatible and has **no egress fees**.

---

## 1. Create a Cloudflare Account

If you don't already have one, sign up at [dash.cloudflare.com](https://dash.cloudflare.com).

---

## 2. Find Your Account ID

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Your **Account ID** is shown in the right sidebar on the dashboard overview page
3. Alternatively, it's in the URL: `https://dash.cloudflare.com/<ACCOUNT_ID>`

Copy this value → **`R2_ACCOUNT_ID`**

---

## 3. Create an R2 Bucket

1. In the Cloudflare Dashboard, go to **R2 Object Storage** (left sidebar)
2. Click **Create bucket**
3. Set the bucket name to `connect-ed-files` (or any name you prefer)
4. Choose a location hint closest to your users (e.g., `Eastern North America` or `Europe`)
5. Click **Create bucket**

The bucket name → **`R2_BUCKET_NAME`**

---

## 4. Create API Tokens (Access Keys)

1. In the R2 section, click **Manage R2 API Tokens** (top right)
2. Click **Create API token**
3. Set a token name (e.g., `connect-ed-server`)
4. Under **Permissions**, select:
   - **Object Read & Write** for your bucket
5. Optionally set a TTL (token expiry)
6. Click **Create API Token**
7. You'll see two values:
   - **Access Key ID** → **`R2_ACCESS_KEY_ID`**
   - **Secret Access Key** → **`R2_SECRET_ACCESS_KEY`**

> ⚠️ **Save the Secret Access Key immediately** — it's only shown once!

---

## 5. (Optional) Set Up a Public Bucket or Custom Domain

If you want files to be publicly accessible via a URL (instead of always using signed URLs):

1. In your bucket settings, go to **Settings** → **Public Access**
2. Click **Allow Access** and connect a custom domain (e.g., `files.yourschool.com`)
3. Set the public URL → **`R2_PUBLIC_URL`** (e.g., `https://files.yourschool.com`)

If you skip this step, all file access will use pre-signed URLs (which is fine and more secure).

---

## 6. Update Your `.env` File

Copy `apps/server/.env.example` to `apps/server/.env` and fill in the values:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=connect-ed-files
R2_PUBLIC_URL=
```

---

## 7. CORS Configuration (Important!)

For the browser to upload files directly (if you ever implement client-side uploads), configure CORS on your bucket:

1. In your bucket settings, go to **Settings** → **CORS Policy**
2. Add a rule:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

> Note: Currently, uploads go through the server, so CORS is only needed if you implement direct browser-to-R2 uploads in the future.

---

## Storage Limits by Plan

| Plan       | Storage | Max File Size |
|------------|---------|---------------|
| Lite       | 150 GB  | 50 MB         |
| Growth     | 400 GB  | 50 MB         |
| Enterprise | 1,000 GB| 50 MB         |

---

## Troubleshooting

- **"R2 client not initialized"**: Make sure `R2_ACCOUNT_ID` is set in your `.env`
- **Access Denied**: Check that your API token has read/write permissions for the bucket
- **Slow uploads**: R2 location should match your server's region for best performance
- **Files not deleting**: Ensure the API token has delete permissions on the bucket
