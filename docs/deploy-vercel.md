# Deploying the HIIKKY portals to Vercel

Each portal is a separate Vercel project connected to the same Git repository. The frontend projects use Vite and deploy as static sites.

## Create each Vercel project

1. In the Vercel dashboard, select **Add New → Project**, connect the Git provider if needed, and import `KanishkaDhodduraj/HIIKKY-BILLING`.
2. Set **Project Name** to `hiikky-admin`, `hiikky-owner`, or `hiikky-student`.
3. Set **Root Directory** to the portal's frontend folder:
   - Admin: `admin/frontend`
   - Owner: `owner/frontend`
   - Student: `student/frontend`
4. In **Build and Output Settings**, use the Vite preset (or set the values manually):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install` (Vercel installs from the committed `package-lock.json`; `npm ci` is also suitable)
5. Before deploying, open **Environment Variables** in project settings and add the portal's variables below. Set them for every environment you will deploy (Production, Preview, and Development as applicable).
6. Select **Deploy**. For later changes, push to the connected Git branch; Vercel will build a new deployment. To change environment variables, save them and redeploy.

## Environment variables

Use the production HTTPS API origins for the production environment and the matching API deployment for Preview/Development. The API URL includes the API prefix shown below.

| Vercel project | Variable | Value |
| --- | --- | --- |
| `hiikky-admin` | `VITE_API_URL` | Admin API origin ending in `/api` |
| `hiikky-admin` | `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID (`rzp_test_...` or `rzp_live_...`) |
| `hiikky-admin` | `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `hiikky-owner` | `VITE_API_URL` | Owner API origin ending in `/api` |
| `hiikky-owner` | `VITE_ADMIN_API_URL` | Admin API origin ending in `/api` (used for organization registration requests) |
| `hiikky-owner` | `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID (`rzp_test_...` or `rzp_live_...`) |
| `hiikky-owner` | `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `hiikky-student` | `VITE_API_URL` | Student API origin ending in `/api/student` |
| `hiikky-student` | `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID (`rzp_test_...` or `rzp_live_...`) |
| `hiikky-student` | `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID |

The `.env.example` in each frontend folder shows the local variable names and API URL shape. `VITE_*` values are embedded in the browser bundle and are public; use only public key IDs/client IDs here. Never put API secrets, Razorpay secret keys, or OAuth client secrets in Vercel frontend variables. Configure those secrets on the backend deployment instead.

## Verify the deployment

- Open the Vercel URL and reload a nested application route to check the SPA rewrite.
- In the project's **Deployments** tab, confirm the build succeeded.
- Check the deployed response headers for `X-Robots-Tag`, `X-Content-Type-Options`, `Referrer-Policy`, and `Content-Security-Policy`.
- These portals deliberately send `noindex, nofollow, noarchive` both in the HTML and response headers.
