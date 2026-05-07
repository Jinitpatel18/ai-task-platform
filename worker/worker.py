import os
import json
import time
import signal
import logging
from datetime import datetime

import redis
from pymongo import MongoClient
from bson import ObjectId

# Logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
logger = logging.getLogger("worker")

QUEUE_NAME = "task_queue"
WORKER_ID = os.getenv("WORKER_ID", "worker-0")

# --- DB + Redis connections ---

def connect_mongo():
    uri = os.environ["MONGODB_URI"]
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    logger.info("MongoDB connected")
    return client["ai_task_platform"]

def connect_redis():
    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", 6379))
    password = os.getenv("REDIS_PASSWORD") or None
    r = redis.Redis(host=host, port=port, password=password, decode_responses=True)
    r.ping()
    logger.info("Redis connected")
    return r

# --- Task operations ---

OPERATIONS = {
    "uppercase": lambda text: text.upper(),
    "lowercase": lambda text: text.lower(),
    "reverse": lambda text: text[::-1],
    "word_count": lambda text: str(len(text.split())),
}

def process_task(db, task_id: str):
    tasks = db["tasks"]
    task = tasks.find_one({"_id": ObjectId(task_id)})

    if not task:
        logger.error(f"Task {task_id} not found in DB")
        return

    if task["status"] not in ("pending",):
        logger.warning(f"Task {task_id} status is {task['status']}, skipping")
        return

    # Mark as running
    started_at = datetime.utcnow()
    tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {"status": "running", "startedAt": started_at},
            "$push": {
                "logs": {
                    "message": f"Worker {WORKER_ID} picked up task",
                    "level": "info",
                    "timestamp": started_at
                }
            }
        }
    )

    logger.info(f"Processing task {task_id}, operation: {task['operation']}")

    try:
        op_fn = OPERATIONS.get(task["operation"])
        if not op_fn:
            raise ValueError(f"Unknown operation: {task['operation']}")

        result = op_fn(task["inputText"])
        completed_at = datetime.utcnow()

        tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "success",
                    "result": result,
                    "completedAt": completed_at
                },
                "$push": {
                    "logs": {
                        "message": f"Task completed successfully in {(completed_at - started_at).total_seconds():.3f}s",
                        "level": "info",
                        "timestamp": completed_at
                    }
                }
            }
        )
        logger.info(f"Task {task_id} succeeded")

    except Exception as exc:
        error_msg = str(exc)
        completed_at = datetime.utcnow()
        tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "failed",
                    "errorMessage": error_msg,
                    "completedAt": completed_at
                },
                "$push": {
                    "logs": {
                        "message": f"Task failed: {error_msg}",
                        "level": "error",
                        "timestamp": completed_at
                    }
                }
            }
        )
        logger.error(f"Task {task_id} failed: {error_msg}")


# --- Main worker loop ---

running = True

def handle_signal(sig, frame):
    global running
    logger.info(f"Signal {sig} received, shutting down gracefully...")
    running = False

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

def main():
    db = connect_mongo()
    r = connect_redis()

    logger.info(f"Worker {WORKER_ID} started, listening on queue: {QUEUE_NAME}")

    while running:
        try:
            # Blocking pop with 2s timeout so we can check `running` flag
            item = r.brpop(QUEUE_NAME, timeout=2)

            if item is None:
                continue  # timeout, loop again

            _, payload = item
            data = json.loads(payload)
            task_id = data.get("taskId")

            if not task_id:
                logger.warning(f"Invalid payload: {payload}")
                continue

            process_task(db, task_id)

        except redis.exceptions.ConnectionError as e:
            logger.error(f"Redis connection error: {e}. Reconnecting in 5s...")
            time.sleep(5)
            try:
                r = connect_redis()
            except Exception:
                pass

        except Exception as e:
            logger.error(f"Unexpected error in worker loop: {e}")
            time.sleep(1)

    logger.info("Worker shut down cleanly")

if __name__ == "__main__":
    main()
