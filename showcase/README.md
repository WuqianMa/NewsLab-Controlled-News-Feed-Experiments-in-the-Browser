# NewsLab — Login-free interactive showcase

This directory is a **self-contained, static public demo** of the NewsLab research workflow.

It allows visitors to try an illustrative experiment setup, preview a fictional news feed, generate temporary in-browser interaction events, and download a sample CSV **without a login**.

The showcase is deliberately **separate from the real Next.js / Prisma application**. It does not call NewsLab APIs, read a database, handle authentication, or submit actual research data. The complete, original NewsLab admin system remains authenticated.

## Deploy this folder to Vercel

1. In [Vercel](https://vercel.com/new), import [this GitHub repository](https://github.com/WuqianMa/NewsLab-Controlled-News-Feed-Experiments-in-the-Browser).
2. Under **Root Directory**, select `showcase` — **not** the repository root.
3. Set **Framework Preset** to `Other` (static HTML). Leave **Build Command** empty and use the project directory as the output directory (typically `.`).
4. Deploy. This showcase requires **no database, APP_SECRET, login credentials, API keys, or Prisma migrations**.
5. Use the new `*.vercel.app` URL on the GitHub profile and portfolio after verifying the deployed site.

If Vercel instead detects Next.js or asks for a database, check that the Root Directory is `showcase` and that the Framework Preset is `Other`.

## Preview locally

From the repository root:

```bash
cd showcase
python3 -m http.server 8000
```

Open http://localhost:8000.

## Included interactions

- Switch between three fictional experiment conditions.
- Toggle vertical or two-column feed layouts and article order.
- Open articles, add and remove reactions, and complete a sample preview.
- Inspect generated interaction events.
- Download a locally generated CSV or reset the workspace.

## Boundaries and limitations

- Articles, conditions, and the sample study are **fictional**.
- Events live in JavaScript memory and are cleared on reload. No browser storage or external service is used.
- This is an interactive **showcase / simulation**, not the full deployed Next.js research application and not a production study.
- The showcase does not reproduce real user management, research data persistence, API access, or study deployment.
- If you later want a login-free read-only view of the **actual** application, implement a separate viewer role and explicitly sanitize participant records and exports; never simply disable middleware protection on the existing admin routes.
