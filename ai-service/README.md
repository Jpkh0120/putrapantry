PutraPantry AI service (ai-service)

Purpose
- Flask microservice that provides AI features (chatbot, restock suggestions, forecasts) used by the PutraPantry frontend.

Quick setup (local)
1. Create and activate a venv: python -m venv .venv && .\.venv\Scripts\activate
2. Install deps: pip install -r requirements.txt
3. Run locally: python app.py (or gunicorn app:app)

Vercel deployment notes
- Required files: ai-service/app.py and ai-service/requirements.txt
- Repository root must contain vercel.json that points the Python builder at ai-service/app.py (already included).
- Recommended: set Project Root in Vercel to repository root or ai-service if you change structure.

What to do after editing ai-service
1. Update requirements.txt when adding packages.
2. Commit & push: git add -A && git commit -m "Your change" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" && git push
3. Confirm Vercel deployment in Team "pohkokhaos-projects" → putrapantry-ai → Deployments.

Smoke tests (post-deploy)
- Health: GET https://putrapantry-ai.vercel.app/health
- Chat: POST https://putrapantry-ai.vercel.app/ai/chatbot with JSON {"query":"...","role":"student"}

Troubleshooting
- "Skipping cache upload because no files were prepared": Verify vercel.json build src matches ai-service/app.py and requirements.txt exists.
- "Failed to fetch one or more git submodules": avoid private submodules or ensure Vercel has read access.

If you want, add a pre-commit script to run the smoke tests locally before push.
