# Your Personal Setup Guide — Jinit Patel

## Your Credentials (already filled in the project)

| Item | Value |
|------|-------|
| Docker Hub Username | `jinitpatel` |
| Docker Hub Token | `YOUR_DOCKER_TOKEN_HERE` |

---

## Step 1: Install Required Tools

1. **Docker Desktop** → https://www.docker.com/products/docker-desktop
   - Install it, open it, make sure it's running (whale icon in taskbar)

2. **Git** → https://git-scm.com/downloads
   - Install with default options

3. **VS Code** (optional but helpful) → https://code.visualstudio.com

---

## Step 2: Create GitHub Account + 2 Repos

1. Go to https://github.com → Sign Up
2. Create repo 1: **`ai-task-platform`** (Public)
3. Create repo 2: **`ai-task-platform-infra`** (Public)
4. Note your GitHub username — you'll need it in Step 5

---

## Step 3: Create GitHub Personal Access Token

1. GitHub → Profile icon → Settings
2. Left sidebar bottom → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)**
5. Name: `infra-repo-access`
6. Expiration: 90 days
7. Check ✅ **repo**
8. Click **Generate token** → Copy and save it

---

## Step 4: Test the App Locally (Do This First!)

Open terminal / Command Prompt in this project folder:

```bash
docker-compose up --build
```

Wait 2-3 minutes for everything to start. Then open:
**http://localhost:3000**

You should see the login page. Register → Create a task → Watch it process.

If this works ✅ your app is working correctly.

---

## Step 5: Update argocd-application.yaml

Open `infra/argocd-application.yaml` and replace `YOUR_GITHUB_USERNAME` with your actual GitHub username (2 places).

---

## Step 6: Add GitHub Actions Secrets

1. Go to your `ai-task-platform` GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Add these 3 secrets:

| Secret Name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | `jinitpatel` |
| `DOCKERHUB_TOKEN` | `YOUR_DOCKER_TOKEN_HERE` |
| `INFRA_REPO_TOKEN` | (the GitHub token from Step 3) |

---

## Step 7: Push Code to GitHub

Open terminal in this project folder:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ai-task-platform.git
git branch -M main
git push -u origin main
```

For the infra repo:
```bash
cd ..
mkdir ai-task-infra-repo
cp -r ai-task-platform/k8s ai-task-infra-repo/
cp -r ai-task-platform/infra ai-task-infra-repo/
cd ai-task-infra-repo
git init
git add .
git commit -m "initial infra"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ai-task-platform-infra.git
git branch -M main
git push -u origin main
```

---

## Step 8: Verify CI/CD Runs

After pushing to GitHub:
1. Go to your repo → **Actions** tab
2. You should see a workflow running
3. It will lint, build images, and push to Docker Hub

Check Docker Hub → **Hub** → your images should appear as:
- `jinitpatel/ai-task-backend`
- `jinitpatel/ai-task-worker`
- `jinitpatel/ai-task-frontend`

---

## Already Done For You ✅

- All `jinitpatel` replacements in k8s files
- Secrets file pre-filled with correct base64 values
- Docker Compose working for local dev
- All 4 k8s manifests with correct resource limits, probes, etc.
