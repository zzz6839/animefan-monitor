from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
import logging
import feedparser
import requests
import json
from typing import List
import datetime

import crud
import schemas
from database import SessionLocal, engine, Base

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

# Custom JSON encoder to handle timezone-aware datetime serialization
def custom_json_encoder(obj):
    """Custom JSON encoder that ensures datetime objects include timezone info"""
    if isinstance(obj, datetime.datetime):
        # If the datetime is naive (no timezone), assume it's UTC
        if obj.tzinfo is None:
            obj = obj.replace(tzinfo=datetime.timezone.utc)
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

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
    db_rule = crud.create_rule(db=db, rule=rule)
    
    # Convert naive datetime objects to timezone-aware for proper frontend display
    if db_rule.creation_time and db_rule.creation_time.tzinfo is None:
        db_rule.creation_time = db_rule.creation_time.replace(tzinfo=datetime.timezone.utc)
    if db_rule.last_update_time and db_rule.last_update_time.tzinfo is None:
        db_rule.last_update_time = db_rule.last_update_time.replace(tzinfo=datetime.timezone.utc)
    if db_rule.download_after and db_rule.download_after.tzinfo is None:
        db_rule.download_after = db_rule.download_after.replace(tzinfo=datetime.timezone.utc)
    
    return db_rule

@app.get("/rules/", response_model=List[schemas.Rule])
def read_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rules = crud.get_rules(db, skip=skip, limit=limit)
    logger.debug(f"Retrieved {len(rules)} rules")
    
    # Convert naive datetime objects to timezone-aware for proper frontend display
    for rule in rules:
        if rule.creation_time and rule.creation_time.tzinfo is None:
            rule.creation_time = rule.creation_time.replace(tzinfo=datetime.timezone.utc)
        if rule.last_update_time and rule.last_update_time.tzinfo is None:
            rule.last_update_time = rule.last_update_time.replace(tzinfo=datetime.timezone.utc)
        if rule.download_after and rule.download_after.tzinfo is None:
            rule.download_after = rule.download_after.replace(tzinfo=datetime.timezone.utc)
    
    return rules

@app.get("/rules/{rule_id}", response_model=schemas.Rule)
def read_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = crud.get_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Convert naive datetime objects to timezone-aware for proper frontend display
    if db_rule.creation_time and db_rule.creation_time.tzinfo is None:
        db_rule.creation_time = db_rule.creation_time.replace(tzinfo=datetime.timezone.utc)
    if db_rule.last_update_time and db_rule.last_update_time.tzinfo is None:
        db_rule.last_update_time = db_rule.last_update_time.replace(tzinfo=datetime.timezone.utc)
    if db_rule.download_after and db_rule.download_after.tzinfo is None:
        db_rule.download_after = db_rule.download_after.replace(tzinfo=datetime.timezone.utc)
    
    return db_rule

@app.put("/rules/{rule_id}", response_model=schemas.Rule)
def update_rule(rule_id: int, rule: schemas.RuleCreate, db: Session = Depends(get_db)):
    logger.debug(f"Updating rule {rule_id}")
    db_rule = crud.update_rule(db=db, rule_id=rule_id, rule=rule)
    
    # Convert naive datetime objects to timezone-aware for proper frontend display
    if db_rule and db_rule.creation_time and db_rule.creation_time.tzinfo is None:
        db_rule.creation_time = db_rule.creation_time.replace(tzinfo=datetime.timezone.utc)
    if db_rule and db_rule.last_update_time and db_rule.last_update_time.tzinfo is None:
        db_rule.last_update_time = db_rule.last_update_time.replace(tzinfo=datetime.timezone.utc)
    if db_rule and db_rule.download_after and db_rule.download_after.tzinfo is None:
        db_rule.download_after = db_rule.download_after.replace(tzinfo=datetime.timezone.utc)
    
    return db_rule

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
    
    # Convert naive datetime objects to timezone-aware for proper frontend display
    if rule.creation_time and rule.creation_time.tzinfo is None:
        rule.creation_time = rule.creation_time.replace(tzinfo=datetime.timezone.utc)
    if rule.last_update_time and rule.last_update_time.tzinfo is None:
        rule.last_update_time = rule.last_update_time.replace(tzinfo=datetime.timezone.utc)
    if rule.download_after and rule.download_after.tzinfo is None:
        rule.download_after = rule.download_after.replace(tzinfo=datetime.timezone.utc)
    
    return rule

# RSS preview endpoint
@app.post("/rss/preview", response_model=List[schemas.RSSItem])
def preview_rss(request: schemas.RSSPreviewRequest):
    logger.debug(f"Previewing RSS: {request.rss_url}")
    try:
        # Fetch the RSS feed content using requests to handle potential issues
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        }
        response = requests.get(request.rss_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Parse the content with feedparser
        feed = feedparser.parse(response.content)
        
        items = []
        for entry in feed.entries[:50]:
            title = entry.get('title', '')
            published = entry.get('published', '')
            subtitle_group = extract_subtitle_group(title)
            size = extract_file_size(entry, request.rss_url)
            formatted_date = format_published_date(published)
            
            item = schemas.RSSItem(
                title=title,
                link=entry.get('link', ''),
                published=formatted_date,
                size=size,
                subtitle_group=subtitle_group,
                task_exists=False
            )
            items.append(item)
            
        logger.info(f"Successfully parsed {len(items)} items from RSS feed")
        return items
        
    except Exception as e:
        logger.error(f"Error parsing RSS: {e}")
        raise HTTPException(status_code=400, detail=f"Error parsing RSS: {str(e)}")

# RSS preview with rule filtering endpoint
@app.post("/rss/preview_filtered", response_model=List[schemas.RSSItem])
def preview_rss_filtered(request: schemas.RSSPreviewFilteredRequest, db: Session = Depends(get_db)):
    logger.debug(f"Previewing RSS with rule filtering: {request.rss_url}, rule_id: {request.rule_id}")
    try:
        rule = crud.get_rule(db, rule_id=request.rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        }
        response = requests.get(request.rss_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        items = []
        filtered_count = 0
        
        from scheduler import matches_filters
        
        for entry in feed.entries[:100]:
            if not matches_filters(entry, rule):
                filtered_count += 1
                continue
            
            if len(items) >= rule.max_tasks:
                break
                
            title = entry.get('title', '')
            published = entry.get('published', '')
            subtitle_group = extract_subtitle_group(title)
            size = extract_file_size(entry, request.rss_url)
            formatted_date = format_published_date(published)
            
            item = schemas.RSSItem(
                title=title,
                link=entry.get('link', ''),
                published=formatted_date,
                size=size,
                subtitle_group=subtitle_group,
                task_exists=False
            )
            items.append(item)
            
        logger.info(f"Successfully parsed {len(items)} filtered items from RSS feed (filtered out {filtered_count} items)")
        return items
        
    except Exception as e:
        logger.error(f"Error parsing RSS with filtering: {e}")
        raise HTTPException(status_code=400, detail=f"Error parsing RSS with filtering: {str(e)}")

def extract_subtitle_group(title: str) -> str:
    """Extract subtitle group from title"""
    try:
        import re
        # Pattern: [GroupName] or (GroupName) at the beginning, case-insensitive
        match = re.match(r'[\(\[](.+?)[\)\]]', title, re.IGNORECASE)
        if match:
            return match.group(1)
        return "未知字幕组"
    except Exception:
        return "未知字幕组"

def extract_file_size(entry, rss_url: str) -> str:
    """Extract file size from RSS entry"""
    try:
        import re
        
        # Method 1: Check enclosures (most reliable)
        if hasattr(entry, 'enclosures') and entry.enclosures:
            enclosure = entry.enclosures[0]
            if hasattr(enclosure, 'length') and enclosure.length:
                try:
                    size_bytes = int(enclosure.length)
                    if size_bytes > 1024 * 1024 * 1024:
                        return f"{size_bytes / (1024*1024*1024):.1f} GB"
                    return f"{size_bytes / (1024*1024):.1f} MB"
                except (ValueError, TypeError):
                    pass

        # Method 2: Check for a 'size' field in the entry
        if hasattr(entry, 'size'):
            return entry.size
        if 'size' in entry:
            return entry['size']

        # Method 3: Nyaa-specific size field
        if 'nyaa.si' in rss_url.lower():
            if hasattr(entry, 'nyaa_size'):
                return entry.nyaa_size
            if 'nyaa_size' in entry:
                return entry['nyaa_size']

        # Method 4: Extract from description (Mikan format)
        description = entry.get('description', '')
        if 'mikan' in rss_url.lower():
            mikan_size_match = re.search(r'\[([0-9.]+\s*[KMGT]?B)\]', description)
            if mikan_size_match:
                return mikan_size_match.group(1)

        # Method 5: General extraction from title and description
        title = entry.get('title', '')
        search_text = f"{title} {description}"
        size_patterns = [
            r'(\d+\.?\d*\s*(?:GiB|MiB|GB|MB|TiB|TB))'
        ]
        for pattern in size_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                return match.group(1)

        return "未知"
    except Exception as e:
        logger.debug(f"Error extracting size: {e}")
        return "未知"

def format_published_date(published: str) -> str:
    """Format published date to be more user-friendly and robust"""
    try:
        if not published:
            return "未知时间"
        
        # feedparser already tries to parse the date, let's use its result
        # if it's available and is a struct_time
        if hasattr(feedparser, '_parse_date') and isinstance(published, str):
             # Manually parse if feedparser fails
            try:
                from datetime import datetime, timezone
                parsed_tuple = feedparser._parse_date(published)
                if parsed_tuple:
                    dt = datetime(*parsed_tuple[:6])
                    return dt.replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                logger.debug(f"feedparser date parsing failed for: {published}")

        # Fallback to manual parsing if feedparser's internal method isn't available or fails
        from datetime import datetime, timezone
        date_formats = [
            '%a, %d %b %Y %H:%M:%S %z',
            '%a, %d %b %Y %H:%M:%S',
      '%Y-%m-%dT%H:%M:%S.%f%z',
            '%Y-%m-%dT%H:%M:%S.%f',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S',
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(published, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue
        
        logger.debug(f"Could not parse date with any format, returning original: {published}")
        return published

    except Exception as e:
        logger.debug(f"Error formatting date: {e}")
        return published or "未知时间"

def extract_size_from_description(description: str) -> str:
    """Extract file size from description"""
    try:
        import re
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
def test_aria2_connection(config: schemas.Aria2ConfigCreate = None, db: Session = Depends(get_db)):
    logger.debug("Testing Aria2 connection")
    
    # Use provided config for testing, or fall back to saved config
    if config is None:
        config = crud.get_aria2_config(db)
        if not config:
            raise HTTPException(status_code=404, detail="Aria2 config not found")
    
    try:
        protocol = "https" if config.use_ssl else "http"
        url = f"{protocol}://{config.host}:{config.port}/{config.rpc_path}"
        
        logger.debug(f"Testing Aria2 connection to: {url}")
        
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
            logger.info(f"Aria2 connection test successful: {result['result']['version']}")
            return {"status": "success", "version": result["result"]["version"]}
        else:
            logger.error(f"Invalid Aria2 response: {result}")
            return {"status": "error", "message": "Invalid response from Aria2"}
            
    except Exception as e:
        logger.error(f"Aria2 connection test failed: {e}")
        return {"status": "error", "message": str(e)}
