# AI Task Platform

A production-ready MERN stack application for asynchronous AI text-processing tasks, deployed with Docker, Kubernetes (k3s), and Argo CD (GitOps).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Backend API | Node.js, Express |
| Worker | Python 3.11 |
| Database | MongoDB 7 |
| Queue | Redis 7 |
| Containerization | Docker (multi-stage builds) |
| Orchestration | Kubernetes (k3s compatible) |
| GitOps | Argo CD |
| CI/CD | GitHub Actions |

## Features

- JWT authentication (register / login / protected routes)
- Create text-processing tasks: **uppercase, lowercase, reverse, word count**
- Async processing via Redis queue + Python worker
- Real-time status polling (pending → running → success/failed)
- Per-task logs with timestamps
- Paginated task dashboard
- Fully containerized with Docker Compose for local dev

---

## Project Structure

```
ai-task-platform/
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── config/           # Redis, logger
│   │   ├── middleware/        # JWT auth
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # auth, tasks
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React app
│   ├── src/
│   │   ├── components/       # TaskCard, CreateTaskModal
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Login, Register, Dashboard, TaskDetail
│   │   └── utils/            # axios instance
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── worker/                   # Python background processor
│   ├── worker.py
│   ├── requirements.txt
│   └── Dockerfile
├── k8s/                      # Kubernetes manifests
│   ├── base/
│   └── overlays/
│       ├── staging/
│       └── production/
├── infra/                    # Argo CD Application manifests
├── .github/workflows/        # CI/CD pipeline
├── docker-compose.yml
├── ARCHITECTURE.md
└── .env.example
```

---

## Local Development Setup

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for local dev without Docker)
- Python 3.11+ (for worker without Docker)

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/ai-task-platform.git
cd ai-task-platform

# Copy and edit environment variables
cp .env.example backend/.env
cp .env.example worker/.env
cp .env.example frontend/.env
```

Edit each `.env` file with your values (the defaults work with Docker Compose as-is).

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

This starts:
- MongoDB on port `27017`
- Redis on port `6379`
- Backend API on port `5000`
- Worker (background, no port)
- Frontend on port `3000`

Open **http://localhost:3000**

### 3. Run without Docker (dev mode)

**Terminal 1 — Start MongoDB and Redis:**
```bash
docker-compose up mongodb redis
```

**Terminal 2 — Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 3 — Worker:**
```bash
cd worker
pip install -r requirements.txt
python worker.py
```

**Terminal 4 — Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## API Reference

All protected routes require `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

**Register / Login body:**
```json
{ "username": "john", "email": "john@example.com", "password": "secret123" }
```

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks (paginated) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task with logs |
| DELETE | `/api/tasks/:id` | Delete task |

**Create task body:**
```json
{
  "title": "Process feedback",
  "inputText": "Hello World",
  "operation": "uppercase"
}
```

**Supported operations:** `uppercase`, `lowercase`, `reverse`, `word_count`

---

## Kubernetes Deployment

### Prerequisites

- k3s or any Kubernetes cluster
- `kubectl` configured
- `kustomize` installed
- Argo CD installed in cluster

### 1. Update image names

Replace `YOUR_DOCKERHUB_USERNAME` in all files:
```bash
grep -r "YOUR_DOCKERHUB_USERNAME" k8s/ --include="*.yaml" -l
```

### 2. Update secrets

Edit `k8s/base/secrets.yaml` with your base64-encoded values:
```bash
echo -n "your-mongodb-uri" | base64
echo -n "your-redis-password" | base64
echo -n "your-jwt-secret" | base64
```

### 3. Apply manually (without Argo CD)

```bash
# Staging
kubectl apply -k k8s/overlays/staging

# Production
kubectl apply -k k8s/overlays/production
```

### 4. Install Argo CD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### 5. Register Argo CD applications

```bash
kubectl apply -f infra/argocd-application.yaml
```

Argo CD will auto-sync from the infra repository on every push.

---

## CI/CD Setup

### GitHub Actions secrets required

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `INFRA_REPO_TOKEN` | GitHub PAT with write access to infra repo |

### Pipeline flow

```
Push to main/staging
  → Lint (backend + frontend)
  → Build Docker images
  → Push to Docker Hub with SHA tag
  → Update kustomization.yaml in infra repo
  → Argo CD detects change and syncs cluster
```

---

## Security Notes

- Passwords hashed with **bcrypt** (cost 12)
- JWTs signed with HS256, 7-day expiry
- **Helmet** sets security HTTP headers
- **Rate limiting:** 100 req/15min (global), 10 req/15min (auth)
- All containers run as **non-root users**
- No secrets hardcoded — all via environment variables
- Input validation on all API routes

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation on:
- Worker scaling strategy
- Handling 100k tasks/day
- Database indexing
- Redis failure handling
- Staging vs production environment setup
