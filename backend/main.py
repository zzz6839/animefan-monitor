from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
import feedparser
import requests
import json
from typing import List

import crud
import schemas
from database import SessionLocal, engine, Base

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    logger.info("Starting scheduler...")
    from scheduler import start_scheduler
    start_scheduler()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Rules endpoints
@app.post("/rules/", response_model=schemas.Rule)
def create_rule(rule: schemas.RuleCreate, db: Session = Depends(get_db)):
    logger.debug(f"Creating rule: {rule.name}")
    return crud.create_rule(db=db, rule=rule)

@app.get("/rules/", response_model=List[schemas.Rule])
def read_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rules = crud.get_rules(db, skip=skip, limit=limit)
    logger.debug(f"Retrieved {len(rules)} rules")
    return rules

@app.get("/rules/{rule_id}", response_model=schemas.Rule)
def read_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = crud.get_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return db_rule

@app.put("/rules/{rule_id}", response_model=schemas.Rule)
def update_rule(rule_id: int, rule: schemas.RuleCreate, db: Session = Depends(get_db)):
    logger.debug(f"Updating rule {rule_id}")
    return crud.update_rule(db=db, rule_id=rule_id, rule=rule)

@app.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    logger.debug(f"Deleting rule {rule_id}")
    success = crud.delete_rule(db=db, rule_id=rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted successfully"}

@app.post("/rules/{rule_id}/toggle")
def toggle_rule(rule_id: int, db: Session = Depends(get_db)):
    logger.debug(f"Toggling rule {rule_id}")
    rule = crud.toggle_rule(db=db, rule_id=rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

# RSS preview endpoint
@app.post("/rss/preview", response_model=List[schemas.RSSItem])
def preview_rss(request: schemas.RSSPreviewRequest):
    logger.debug(f"Previewing RSS: {request.rss_url}")
    try:
        feed = feedparser.parse(request.rss_url)
        items = []
        
        for entry in feed.entries[:50]:  # Get more items for filtering
            # Extract basic info
            title = entry.get('title', '')
            published = entry.get('published', '')
            
            # Extract subtitle group from title
            subtitle_group = extract_subtitle_group(title)
            
            # Extract file size from various sources
            size = extract_file_size(entry, request.rss_url)
            
            # Format published date to be more user-friendly
            formatted_date = format_published_date(published)
            
            item = schemas.RSSItem(
                title=title,
                link=entry.get('link', ''),
                published=formatted_date,
                size=size,
                subtitle_group=subtitle_group,
                task_exists=False  # TODO: Check if task already exists in Aria2
            )
            items.append(item)
            
        logger.info(f"Successfully parsed {len(items)} items from RSS feed")
        return items
        
    except Exception as e:
        logger.error(f"Error parsing RSS: {e}")
        raise HTTPException(status_code=400, detail=f"Error parsing RSS: {str(e)}")

def extract_subtitle_group(title: str) -> str:
    """Extract subtitle group from title"""
    try:
        # Common patterns for subtitle groups
        import re
        
        # Pattern: [GroupName] or (GroupName) at the beginning
        match = re.match(r'[\[\(]([^\]\)]+)[\]\)]', title)
        if match:
            return match.group(1)
        
        # If no pattern found, return default
        return "未知字幕组"
        
    except Exception:
        return "未知字幕组"

def extract_file_size(entry, rss_url: str) -> str:
    """Extract file size from RSS entry"""
    try:
        import re
        
        # Try different methods to extract size
        size = "未知"
        
        # Method 1: Check enclosures (common in RSS feeds)
        if hasattr(entry, 'enclosures') and entry.enclosures:
            enclosure = entry.enclosures[0]
            if hasattr(enclosure, 'length') and enclosure.length:
                try:
                    size_bytes = int(enclosure.length)
                    if size_bytes > 1024 * 1024 * 1024:  # GB
                        size = f"{size_bytes / (1024*1024*1024):.1f}GB"
                    else:  # MB
                        size = f"{size_bytes / (1024*1024):.1f}MB"
                    return size
                except:
                    pass
        
        # Method 2: Extract from title (common pattern)
        title = entry.get('title', '')
        size_patterns = [
            r'(\d+\.?\d*\s*GB)',
            r'(\d+\.?\d*\s*MB)',
            r'(\d+\.?\d*GB)',
            r'(\d+\.?\d*MB)',
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Method 3: Extract from description
        description = entry.get('description', '')
        if description:
            for pattern in size_patterns:
                match = re.search(pattern, description, re.IGNORECASE)
                if match:
                    return match.group(1)
        
        # Method 4: Check for RSS-specific size fields
        if 'nyaa' in rss_url.lower():
            # Nyaa-specific size field
            if hasattr(entry, 'nyaa_size'):
                return entry.nyaa_size
            elif 'nyaa_size' in entry:
                return entry['nyaa_size']
        
        return size
        
    except Exception as e:
        logger.debug(f"Error extracting size: {e}")
        return "未知"

def format_published_date(published: str) -> str:
    """Format published date to be more user-friendly"""
    try:
        if not published:
            return "未知时间"
        
        from datetime import datetime, timezone
        import time
        
        # Try to parse the date
        try:
            # Common RSS date format: "Wed, 15 Jan 2025 12:30:00 +0000"
            parsed_date = datetime.strptime(published, '%a, %d %b %Y %H:%M:%S %z')
        except:
            try:
                # Alternative format without timezone
                parsed_date = datetime.strptime(published, '%a, %d %b %Y %H:%M:%S')
                parsed_date = parsed_date.replace(tzinfo=timezone.utc)
            except:
                # If parsing fails, return original
                return published
        
        # Calculate time difference
        now = datetime.now(timezone.utc)
        diff = now - parsed_date
        
        if diff.days == 0:
            if diff.seconds < 3600:  # Less than 1 hour
                minutes = diff.seconds // 60
                return f"{minutes}分钟前" if minutes > 0 else "刚刚"
            else:  # Less than 1 day
                hours = diff.seconds // 3600
                return f"{hours}小时前"
        elif diff.days == 1:
            return f"昨天 {parsed_date.strftime('%H:%M')}"
        elif diff.days < 7:
            return f"{diff.days}天前"
        else:
            return parsed_date.strftime('%m-%d %H:%M')
            
    except Exception as e:
        logger.debug(f"Error formatting date: {e}")
        return published or "未知时间"

def extract_size_from_description(description: str) -> str:
    """Extract file size from description"""
    try:
        import re
        
        # Pattern: [123.4 MB] or (123.4 MB) or 123.4MB
        size_pattern = r'[\[\(]?(\d+\.?\d*\s*[KMGT]?B)[\]\)]?'
        match = re.search(size_pattern, description, re.IGNORECASE)
        if match:
            return match.group(1)
        
        return "Unknown"
        
    except Exception:
        return "Unknown"

# Manual rule execution
@app.post("/rules/{rule_id}/run")
def run_rule(rule_id: int, db: Session = Depends(get_db)):
    logger.debug(f"Manually running rule {rule_id}")
    rule = crud.get_rule(db, rule_id=rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Import and run the individual rule check
    from scheduler import check_individual_rule
    try:
        check_individual_rule(rule_id)
        return {"message": f"Rule '{rule.name}' executed successfully"}
    except Exception as e:
        logger.error(f"Error running rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error executing rule: {str(e)}")

# Aria2 configuration endpoints
@app.post("/aria2_config/", response_model=schemas.Aria2Config)
def create_or_update_aria2_config(
    config: schemas.Aria2ConfigCreate, db: Session = Depends(get_db)
):
    logger.debug("Creating/updating Aria2 config")
    return crud.create_or_update_aria2_config(db=db, config=config)

@app.get("/aria2_config/", response_model=schemas.Aria2Config)
def read_aria2_config(db: Session = Depends(get_db)):
    config = crud.get_aria2_config(db)
    if config is None:
        raise HTTPException(status_code=404, detail="Aria2 config not found")
    return config

@app.post("/aria2_config/test")
def test_aria2_connection(db: Session = Depends(get_db)):
    logger.debug("Testing Aria2 connection")
    config = crud.get_aria2_config(db)
    if not config:
        raise HTTPException(status_code=404, detail="Aria2 config not found")
    
    try:
        protocol = "https" if config.use_ssl else "http"
        url = f"{protocol}://{config.host}:{config.port}/{config.rpc_path}"
        
        payload = {
            "jsonrpc": "2.0",
            "method": "aria2.getVersion",
            "id": "test",
            "params": []
        }
        
        if config.token:
            payload["params"] = [f"token:{config.token}"]
        
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        if "result" in result:
            return {"status": "success", "version": result["result"]["version"]}
        else:
            return {"status": "error", "message": "Invalid response from Aria2"}
            
    except Exception as e:
        logger.error(f"Aria2 connection test failed: {e}")
        return {"status": "error", "message": str(e)}
