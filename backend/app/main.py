import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from .core.config import settings
from .core.database import init_db, get_db
from .core.scheduler import scheduler
from .core.aria2 import aria2_client
from . import crud, models, schemas

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Download Rules endpoints
@app.post("/api/rules", response_model=schemas.DownloadRule)
async def create_rule(rule: schemas.DownloadRuleCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_download_rule(db, rule)

@app.get("/api/rules", response_model=List[schemas.DownloadRule])
async def get_rules(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await crud.get_download_rules(db, skip=skip, limit=limit)

@app.get("/api/rules/{rule_id}", response_model=schemas.DownloadRule)
async def get_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    rule = await crud.get_download_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@app.put("/api/rules/{rule_id}", response_model=schemas.DownloadRule)
async def update_rule(
    rule_id: int,
    rule: schemas.DownloadRuleCreate,
    db: AsyncSession = Depends(get_db)
):
    updated_rule = await crud.update_download_rule(db, rule_id, rule)
    if not updated_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return updated_rule

@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_download_rule(db, rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"status": "success"}

# RSS Feed endpoints
class RSSPreviewRequest(BaseModel):
    rss_url: str

@app.post("/api/rss/preview")
async def preview_rss_feed(request: RSSPreviewRequest):
    """Preview RSS feed content for validation before creating rules."""
    try:
        import feedparser
        from datetime import datetime
        
        feed = feedparser.parse(request.rss_url, timeout=30)
        
        if feed.bozo:
            return {"success": False, "error": str(feed.bozo_exception)}
        
        if not feed.entries:
            return {"success": False, "error": "No entries found in RSS feed"}
        
        # Extract basic feed info
        feed_info = {
            "title": feed.feed.get("title", "Unknown"),
            "description": feed.feed.get("description", ""),
            "link": feed.feed.get("link", ""),
            "total_entries": len(feed.entries)
        }
        
        # Extract sample entries
        entries = []
        for entry in feed.entries[:5]:  # Preview first 5 entries
            entry_data = {
                "title": entry.get("title", "No title"),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "description": entry.get("description", "")[:200] + "..." if entry.get("description") else ""
            }
            entries.append(entry_data)
        
        return {
            "success": True,
            "feed": feed_info,
            "sample_entries": entries
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# Aria2 Configuration endpoints
@app.get("/api/aria2/config", response_model=Optional[schemas.Aria2Config])
async def get_aria2_config(db: AsyncSession = Depends(get_db)):
    return await crud.get_aria2_config(db)

@app.post("/api/aria2/config", response_model=schemas.Aria2Config)
async def create_or_update_aria2_config(
    config: schemas.Aria2ConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    return await crud.create_or_update_aria2_config(db, config)

@app.post("/api/aria2/test")
async def test_aria2_connection(
    config: schemas.Aria2ConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    db_config = models.Aria2Config(**config.dict())
    success = aria2_client.connect(db_config)
    if success:
        status, message = aria2_client.test_connection()
        return {"success": status, "message": message}
    return {"success": False, "message": "Failed to connect to Aria2"}

# Scheduler endpoints
@app.post("/api/scheduler/start")
async def start_scheduler(interval: Optional[int] = None):
    try:
        scheduler.start(interval or settings.DEFAULT_MONITOR_INTERVAL)
        return {"status": "success", "message": "Scheduler started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scheduler/stop")
async def stop_scheduler():
    try:
        scheduler.stop()
        return {"status": "success", "message": "Scheduler stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scheduler/interval")
async def update_scheduler_interval(interval: int):
    try:
        scheduler.update_interval(interval)
        return {"status": "success", "message": f"Interval updated to {interval}s"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    # Initialize database
    await init_db()
    logger.info("Database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    # Stop the scheduler
    scheduler.stop()
    logger.info("Scheduler stopped")
    
    # Disconnect from Aria2
    aria2_client.disconnect()
    logger.info("Disconnected from Aria2")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
