# AI Task Platform — Architecture Document

## 1. System Overview

The AI Task Platform is a MERN-stack application that allows users to submit text-processing jobs (uppercase, lowercase, reverse, word count) which are processed asynchronously by a Python worker pool via a Redis queue. The system is containerized with Docker and deployed on Kubernetes using GitOps (Argo CD).

```
User Browser
     │
     ▼
[React Frontend : Nginx]
     │ HTTP /api/*
     ▼
[Node.js / Express Backend]
     │              │
     │ enqueue      │ read/write
     ▼              ▼
[Redis Queue]    [MongoDB]
     │              ▲
     │ dequeue      │ update status
     ▼              │
[Python Worker Pool]
```

---

## 2. Worker Scaling Strategy

### How it works

Each Python worker runs an independent blocking-pop loop (`BRPOP`) on the Redis `task_queue` list. Redis queues are naturally load-balanced across multiple consumers — the first worker to call `BRPOP` gets the next job. There is no coordination needed between workers.

### Kubernetes scaling

Workers are deployed as a Kubernetes `Deployment` with configurable replicas:

- **Staging:** 1 replica
- **Production baseline:** 4 replicas
- **Auto-scaling:** A Horizontal Pod Autoscaler (HPA) can be added targeting CPU utilization:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: ai-task-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Graceful shutdown

Workers catch `SIGTERM` (sent by Kubernetes during pod termination) and set a `running = False` flag. The worker finishes its current task before exiting, preventing partial updates. `terminationGracePeriodSeconds: 30` gives the worker time to complete.

---

## 3. Handling High Task Volume (100,000 tasks/day)

### Capacity analysis

100,000 tasks/day = ~69 tasks/second at peak (assuming 8-hour business window at 3× average = ~35 tasks/sec sustained). Each task involves:

1. One MongoDB write (create task)
2. One Redis LPUSH
3. One MongoDB update × 2 (running → success/failed)
4. Log appends

This is well within the range of a 4-worker pool + MongoDB Atlas M10 cluster.

### Throughput strategy

**Redis queue:** Acts as the shock absorber. Tasks can be enqueued at burst speeds (thousands/sec) without overloading workers. Workers drain the queue at their own pace.

**Worker pool:** Each worker processes tasks sequentially. With 4 workers and an average task duration of 50ms, throughput is ~80 tasks/sec sustained. Scale to 10+ workers for headroom.

**MongoDB write path:**
- Task creation: single insert, indexed on `user + createdAt`
- Status updates: targeted `findOneAndUpdate` by `_id` (O(1) with default `_id` index)
- Log appends: `$push` to embedded array — efficient for small log arrays (<100 entries)

**Backend API:** Stateless Express servers behind a Kubernetes Service (round-robin load balancing). Scale horizontally by increasing `replicas`.

### Bottleneck order (from first to break)

1. MongoDB write IOPS (solve with Atlas M20+ or write concern tuning)
2. Redis memory (solve with Redis eviction policy or Redis Cluster)
3. Worker CPU (solve with more replicas or larger instance)
4. Backend API (almost never the bottleneck for this workload)

---

## 4. Database Indexing Strategy

### Collections and indexes

**`users` collection:**

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| default | `_id` | unique | Document lookup |
| email_idx | `email` | unique | Login lookup |
| username_idx | `username` | unique | Registration check |

**`tasks` collection:**

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| default | `_id` | unique | Worker task fetch by ID |
| user_date_idx | `{user: 1, createdAt: -1}` | compound | Dashboard task list (most common query) |
| status_idx | `{status: 1}` | single | Admin/monitoring queries by status |
| date_idx | `{createdAt: -1}` | single | Global task list, TTL candidates |

### Query patterns covered

- `Task.find({ user: req.user._id }).sort({ createdAt: -1 })` → hits `user_date_idx` (covered query)
- `Task.findById(taskId)` → hits default `_id` index
- `Task.updateOne({ _id: taskId })` → hits `_id` index

### Index maintenance

For 100k tasks/day, the `tasks` collection grows by ~3M documents/month. Consider a TTL index to auto-delete completed tasks older than 90 days:

```javascript
db.tasks.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }) // 90 days
```

---

## 5. Handling Redis Failure

### Failure modes

**Scenario 1: Redis goes down after task is created but before enqueue**

The backend catches the Redis error and returns a 500 to the client. The task record exists in MongoDB with status `pending`. A recovery cron job (or manual re-queue) can find all tasks stuck in `pending` for > 5 minutes and re-push them to the queue:

```javascript
// Recovery script (run as a scheduled job)
const stuckTasks = await Task.find({
  status: 'pending',
  createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
});
for (const task of stuckTasks) {
  await redis.lpush('task_queue', JSON.stringify({ taskId: task._id }));
}
```

**Scenario 2: Redis goes down while workers are running**

Workers catch `redis.exceptions.ConnectionError`, log the error, wait 5 seconds, and attempt to reconnect. No task data is lost because task state is persisted in MongoDB. The worker simply cannot pick up new jobs until Redis is back.

**Scenario 3: Redis restart causes queue loss**

By default Redis is in-memory only. Enable AOF persistence in production:

```
appendonly yes
appendfsync everysec
```

This limits data loss to 1 second of writes at most on a crash.

### Production recommendation

Use **Redis Sentinel** (3 nodes: 1 primary + 2 replicas) or **Redis Cluster** for automatic failover. On Kubernetes, the Bitnami Redis Helm chart supports Sentinel out of the box.

---

## 6. Staging and Production Environments

### Environment separation

Using **Kustomize overlays**, each environment customizes the base manifests without duplication:

```
k8s/
├── base/           ← shared manifests
└── overlays/
    ├── staging/    ← staging-specific patches (1 replica, staging image tag)
    └── production/ ← production patches (3+ replicas, latest image tag)
```

### Argo CD Applications

Two separate Argo CD `Application` resources point to each overlay:

- `ai-task-platform` → `k8s/overlays/production` → namespace `ai-task-platform`
- `ai-task-platform-staging` → `k8s/overlays/staging` → namespace `ai-task-platform-staging`

Both have `automated.syncPolicy` enabled. Any push to the infra repo triggers Argo CD to reconcile the cluster state.

### Promotion flow

```
Developer pushes code
        ↓
GitHub Actions (CI):
  lint → build → push image with SHA tag
        ↓
Update infra repo (kustomization.yaml) with new tag
        ↓
Argo CD detects change → syncs staging
        ↓
Manual approval (or auto on merge to main)
        ↓
Argo CD syncs production
```

### Secrets management

- **Never committed:** Raw secrets are never in any repository.
- **Local dev:** `.env` files (gitignored).
- **Kubernetes:** Kubernetes `Secret` objects, populated via CI/CD using `kubectl create secret` from GitHub Actions secrets, or via **Sealed Secrets** / **External Secrets Operator** for GitOps-safe secret management.

---

## 7. Security Summary

| Layer | Measure |
|-------|---------|
| Passwords | bcrypt (cost factor 12) |
| Auth | JWT (HS256, 7-day expiry) |
| HTTP | Helmet middleware (sets security headers) |
| Rate limiting | express-rate-limit (100 req/15min global, 10 req/15min for auth) |
| Containers | Non-root users in all Dockerfiles |
| Secrets | No hardcoded secrets; env vars via Kubernetes Secrets |
| Input size | Express body limit 10KB; MongoDB field maxlength enforced |
| Ingress | TLS termination at Ingress level |
