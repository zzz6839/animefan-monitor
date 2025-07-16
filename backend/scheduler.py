from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
import feedparser
import logging
import requests
import json
import datetime
from typing import List, Dict, Any

import crud
from database import SessionLocal

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def send_to_aria2(aria2_config, download_url: str, filename: str = None) -> bool:
    """Send download task to Aria2 via RPC"""
    try:
        protocol = "https" if aria2_config.use_ssl else "http"
        rpc_url = f"{protocol}://{aria2_config.host}:{aria2_config.port}/{aria2_config.rpc_path}"
        
        # Determine if this is a torrent URL or regular download
        is_torrent = download_url.endswith('.torrent') or 'torrent' in download_url.lower()
        
        # Prepare RPC payload
        if is_torrent:
            # For torrent files, use addTorrent method
            payload = {
                "jsonrpc": "2.0",
                "method": "aria2.addTorrent",
                "id": f"torrent_{datetime.datetime.now().timestamp()}",
                "params": []
            }
        else:
            # For regular URLs, use addUri method
            payload = {
                "jsonrpc": "2.0",
                "method": "aria2.addUri",
                "id": f"download_{datetime.datetime.now().timestamp()}",
                "params": []
            }
        
        # Add token if configured
        if aria2_config.token:
            payload["params"].append(f"token:{aria2_config.token}")
        
        if is_torrent:
            # For torrents, we need to download the .torrent file first and pass it as base64
            try:
                import base64
                torrent_response = requests.get(download_url, timeout=30)
                torrent_response.raise_for_status()
                torrent_data = base64.b64encode(torrent_response.content).decode('utf-8')
                payload["params"].append(torrent_data)
            except Exception as e:
                logger.error(f"Failed to download torrent file: {e}")
                # Fallback to addUri method
                payload["method"] = "aria2.addUri"
                payload["params"] = []
                if aria2_config.token:
                    payload["params"].append(f"token:{aria2_config.token}")
                payload["params"].append([download_url])
        else:
            # Add download URL for regular downloads
            payload["params"].append([download_url])
        
        # Add options
        options = {
            "dir": aria2_config.download_path,
            "continue": "true",  # Enable resume
            "max-tries": "3",    # Retry failed downloads
        }
        if filename and not is_torrent:
            # Only set filename for non-torrent downloads
            options["out"] = filename
            
        payload["params"].append(options)
        
        # Send request
        logger.debug(f"Sending Aria2 RPC request: {payload['method']} to {rpc_url}")
        response = requests.post(rpc_url, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        if "result" in result:
            logger.info(f"Successfully added {'torrent' if is_torrent else 'download'} task: {result['result']}")
            return True
        else:
            error_msg = result.get('error', {}).get('message', 'Unknown error')
            logger.error(f"Aria2 RPC error: {error_msg}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send download task to Aria2: {e}")
        return False

def get_torrent_url(entry: Dict[str, Any], rss_url: str) -> str:
    """Extract the correct torrent URL based on RSS source"""
    try:
        # Handle Mikan RSS format
        if 'mikan.tangbai.cc' in rss_url:
            # For Mikan, the torrent URL is in enclosure
            if hasattr(entry, 'enclosures') and entry.enclosures:
                return entry.enclosures[0].href
            # Fallback: check if there's a direct torrent link
            link = entry.get('link', '')
            if '.torrent' in link:
                return link
                
        # Handle Nyaa RSS format  
        elif 'nyaa.si' in rss_url:
            # For Nyaa, the link IS the torrent URL
            return entry.get('link', '')
        
        # Generic fallback: use the link if it looks like a torrent
        link = entry.get('link', '')
        if '.torrent' in link or 'torrent' in link.lower():
            return link
            
        return link  # Return the link anyway, let Aria2 handle it
        
    except Exception as e:
        logger.error(f"Error extracting torrent URL: {e}")
        return entry.get('link', '')

def matches_filters(entry: Dict[str, Any], rule) -> bool:
    """Check if RSS entry matches rule filters"""
    try:
        # Check size filter
        if rule.max_size_mb:
            # Try to extract size from entry (this depends on RSS feed format)
            size_str = entry.get('size', '0')
            try:
                # Parse size string (e.g., "386.2MB" -> 386.2)
                size_mb = float(''.join(filter(str.isdigit or '.'.__eq__, size_str)))
                if size_mb > rule.max_size_mb:
                    logger.debug(f"Entry {entry.get('title', '')} exceeds size limit: {size_mb}MB > {rule.max_size_mb}MB")
                    return False
            except (ValueError, TypeError):
                logger.debug(f"Could not parse size for entry: {entry.get('title', '')}")
        
        # Check time filter
        if rule.download_after:
            try:
                entry_date = datetime.datetime.strptime(entry.get('published', ''), '%a, %d %b %Y %H:%M:%S %z')
                if entry_date < rule.download_after:
                    logger.debug(f"Entry {entry.get('title', '')} is too old")
                    return False
            except (ValueError, TypeError):
                logger.debug(f"Could not parse date for entry: {entry.get('title', '')}")
        
        # Check subtitle group filter (if not "全部")
        if rule.subtitle_group != "<全部>":
            title = entry.get('title', '').lower()
            if rule.subtitle_group.lower() not in title:
                logger.debug(f"Entry {entry.get('title', '')} doesn't match subtitle group filter")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error checking filters for entry: {e}")
        return False

def check_rss_feeds():
    """Main function to check all enabled RSS rules"""
    db: Session = SessionLocal()
    try:
        # Get Aria2 configuration
        aria2_config = crud.get_aria2_config(db)
        if not aria2_config:
            logger.warning("No Aria2 configuration found, skipping RSS check")
            return
        
        # Get all enabled rules
        rules = crud.get_rules(db)
        enabled_rules = [rule for rule in rules if rule.enabled]
        
        if not enabled_rules:
            logger.info("No enabled rules found")
            return
        
        logger.info(f"Checking {len(enabled_rules)} enabled RSS rules")
        
        for rule in enabled_rules:
            try:
                logger.info(f"Checking RSS feed for rule: {rule.name}")
                
                # Parse RSS feed
                feed = feedparser.parse(rule.rss_url)
                
                if feed.bozo:
                    logger.warning(f"RSS feed parsing warning for {rule.name}: {feed.bozo_exception}")
                
                if not feed.entries:
                    logger.warning(f"No entries found in RSS feed for rule: {rule.name}")
                    continue
                
                logger.info(f"Found {len(feed.entries)} entries in RSS feed for rule: {rule.name}")
                
                # Process entries (limit by max_tasks)
                processed_count = 0
                for entry in feed.entries:
                    if processed_count >= rule.max_tasks:
                        logger.info(f"Reached max tasks limit ({rule.max_tasks}) for rule: {rule.name}")
                        break
                    
                    # Check if entry matches filters
                    if not matches_filters(entry, rule):
                        continue
                    
                    # Check if we should create download task automatically
                    if rule.auto_create_tasks:
                        # Extract the correct torrent URL based on RSS source
                        torrent_url = get_torrent_url(entry, rule.rss_url)
                        
                        if torrent_url:
                            title = entry.get('title', 'Unknown')
                            logger.info(f"Creating download task for: {title}")
                            logger.debug(f"Torrent URL: {torrent_url}")
                            
                            success = send_to_aria2(aria2_config, torrent_url, title)
                            if success:
                                processed_count += 1
                                logger.info(f"Successfully created download task for: {title}")
                            else:
                                logger.error(f"Failed to create download task for: {title}")
                        else:
                            logger.warning(f"No torrent URL found for entry: {entry.get('title', '')}")
                    else:
                        logger.info(f"Auto-create disabled for rule {rule.name}, skipping: {entry.get('title', '')}")
                
                # Update last update time
                rule.last_update_time = datetime.datetime.utcnow()
                db.commit()
                
                logger.info(f"Completed checking rule: {rule.name}, processed {processed_count} tasks")
                
            except Exception as e:
                logger.error(f"Error processing rule {rule.name}: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Error in RSS feed check: {e}")
    finally:
        db.close()

def check_individual_rule(rule_id: int):
    """Check a specific rule manually"""
    db: Session = SessionLocal()
    try:
        rule = crud.get_rule(db, rule_id)
        if not rule:
            logger.error(f"Rule {rule_id} not found")
            return
        
        if not rule.enabled:
            logger.warning(f"Rule {rule.name} is disabled")
            return
        
        # Get Aria2 configuration
        aria2_config = crud.get_aria2_config(db)
        if not aria2_config:
            logger.error("No Aria2 configuration found")
            return
        
        logger.info(f"Manually checking rule: {rule.name}")
        
        # Parse RSS feed
        feed = feedparser.parse(rule.rss_url)
        
        if not feed.entries:
            logger.warning(f"No entries found in RSS feed for rule: {rule.name}")
            return
        
        # Process entries
        processed_count = 0
        for entry in feed.entries:
            if processed_count >= rule.max_tasks:
                break
            
            if not matches_filters(entry, rule):
                continue
            
            download_url = entry.get('link', '')
            if download_url:
                title = entry.get('title', 'Unknown')
                success = send_to_aria2(aria2_config, download_url, title)
                if success:
                    processed_count += 1
        
        # Update last update time
        rule.last_update_time = datetime.datetime.utcnow()
        db.commit()
        
        logger.info(f"Manual check completed for rule: {rule.name}, processed {processed_count} tasks")
        
    except Exception as e:
        logger.error(f"Error in manual rule check: {e}")
    finally:
        db.close()

# Create scheduler
scheduler = BackgroundScheduler()

def start_scheduler():
    """Start the background scheduler"""
    if not scheduler.running:
        # Add the main RSS checking job
        scheduler.add_job(
            check_rss_feeds, 
            'interval', 
            minutes=10,  # Default interval, individual rules can have their own intervals
            id='rss_check_job'
        )
        scheduler.start()
        logger.info("RSS monitoring scheduler started")

def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("RSS monitoring scheduler stopped")
