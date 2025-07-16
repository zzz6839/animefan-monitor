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
        
        # Prepare RPC payload according to Aria2 1.36 manual
        if is_torrent:
            # For torrent files, download the .torrent file first and pass it as base64
            try:
                import base64
                torrent_response = requests.get(download_url, timeout=30)
                torrent_response.raise_for_status()
                torrent_data = base64.b64encode(torrent_response.content).decode('utf-8')
                
                # Correct format for aria2.addTorrent:
                # If secret token is set: aria2.addTorrent(secret, torrent, [uris], [options], [position])
                # If no secret: aria2.addTorrent(torrent, [uris], [options], [position])
                payload = {
                    "jsonrpc": "2.0",
                    "method": "aria2.addTorrent",
                    "id": f"torrent_{int(datetime.datetime.now().timestamp())}",
                    "params": []
                }
                
                # Add secret token if configured (must be first parameter)
                if aria2_config.token:
                    payload["params"].append(f"token:{aria2_config.token}")
                
                # Add torrent data (base64 encoded)
                payload["params"].append(torrent_data)
                
                # Add empty uris array (optional additional sources)
                payload["params"].append([])
                
                # Add options
                options = {
                    "dir": aria2_config.download_path,
                    "continue": "true",
                    "max-tries": "3"
                }
                payload["params"].append(options)
                
            except Exception as e:
                logger.error(f"Failed to download torrent file: {e}")
                return False
        else:
            # For regular URLs, use addUri method
            # If secret token is set: aria2.addUri(secret, uris, [options], [position])
            # If no secret: aria2.addUri(uris, [options], [position])
            payload = {
                "jsonrpc": "2.0",
                "method": "aria2.addUri",
                "id": f"download_{int(datetime.datetime.now().timestamp())}",
                "params": []
            }
            
            # Add secret token if configured (must be first parameter)
            if aria2_config.token:
                payload["params"].append(f"token:{aria2_config.token}")
            
            # Add download URLs array
            payload["params"].append([download_url])
            
            # Add options
            options = {
                "dir": aria2_config.download_path,
                "continue": "true",
                "max-tries": "3"
            }
            if filename:
                options["out"] = filename
                
            payload["params"].append(options)
        
        # Send request
        logger.debug(f"Sending Aria2 RPC request: {payload['method']} to {rpc_url}")
        logger.debug(f"Payload: {payload}")
        
        response = requests.post(rpc_url, json=payload, timeout=30)
        
        # Log the response for debugging
        logger.debug(f"Aria2 response status: {response.status_code}")
        logger.debug(f"Aria2 response: {response.text}")
        
        response.raise_for_status()
        
        result = response.json()
        if "result" in result:
            logger.info(f"Successfully added {'torrent' if is_torrent else 'download'} task: {result['result']}")
            return True
        else:
            error_msg = result.get('error', {}).get('message', 'Unknown error')
            error_code = result.get('error', {}).get('code', 'Unknown code')
            logger.error(f"Aria2 RPC error: {error_code} - {error_msg}")
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
        title = entry.get('title', '')
        
        # Check size filter
        if rule.max_size_mb:
            # Try to extract size from multiple sources
            size_mb = 0
            
            # Method 1: Check if entry has size field
            if hasattr(entry, 'nyaa_size'):
                size_str = entry.nyaa_size
            elif 'nyaa_size' in entry:
                size_str = entry['nyaa_size']
            else:
                size_str = entry.get('size', '')
            
            # Method 2: Extract from title or description
            if not size_str:
                import re
                # Look for size patterns in title
                size_patterns = [
                    r'(\d+\.?\d*)\s*GB',
                    r'(\d+\.?\d*)\s*MB',
                    r'(\d+\.?\d*)\s*GiB',
                    r'(\d+\.?\d*)\s*MiB'
                ]
                
                for pattern in size_patterns:
                    match = re.search(pattern, title, re.IGNORECASE)
                    if match:
                        size_value = float(match.group(1))
                        if 'GB' in match.group(0).upper() or 'GIB' in match.group(0).upper():
                            size_mb = size_value * 1024
                        else:
                            size_mb = size_value
                        break
            else:
                # Parse size string (e.g., "386.2 MiB" -> 386.2)
                try:
                    import re
                    size_match = re.search(r'(\d+\.?\d*)\s*(GB|MB|GiB|MiB)', size_str, re.IGNORECASE)
                    if size_match:
                        size_value = float(size_match.group(1))
                        unit = size_match.group(2).upper()
                        if unit in ['GB', 'GIB']:
                            size_mb = size_value * 1024
                        else:
                            size_mb = size_value
                except (ValueError, TypeError):
                    logger.debug(f"Could not parse size string: {size_str}")
            
            if size_mb > 0 and size_mb > rule.max_size_mb:
                logger.debug(f"Entry {title} exceeds size limit: {size_mb}MB > {rule.max_size_mb}MB")
                return False
        
        # Check time filter
        if rule.download_after:
            try:
                # Try to get published date from multiple sources
                published = None
                
                # Method 1: Standard RSS published field
                if entry.get('published'):
                    published = entry.get('published')
                
                # Method 2: Mikan-specific nested torrent pubDate field
                # Feedparser handles namespaces by prefixing with namespace name
                # For Mikan's namespace "https://mikan.tangbai.cc/0.1/", feedparser might use different patterns
                elif hasattr(entry, 'torrent_pubdate'):
                    published = entry.torrent_pubdate
                elif 'torrent_pubdate' in entry:
                    published = entry['torrent_pubdate']
                # Try common feedparser namespace patterns for Mikan
                elif hasattr(entry, 'mikan_pubdate'):
                    published = entry.mikan_pubdate
                elif 'mikan_pubdate' in entry:
                    published = entry['mikan_pubdate']
                
                # Method 3: Check for Mikan's torrent namespace pubDate
                # Based on the XML structure: <torrent xmlns="https://mikan.tangbai.cc/0.1/"><pubDate>...</pubDate></torrent>
                # Feedparser should parse this as a namespaced element
                if not published:
                    # Try accessing the torrent namespace directly
                    # Feedparser often creates attributes like: entry.torrent_pubdate or similar
                    torrent_date_fields = [
                        'torrent_pubdate',
                        'torrent_pubDate', 
                        'mikan_pubdate',
                        'mikan_pubDate',
                        'pubdate',
                        'pubDate'
                    ]
                    
                    for field in torrent_date_fields:
                        # Try as attribute
                        if hasattr(entry, field):
                            value = getattr(entry, field)
                            if value and isinstance(value, str):
                                published = value
                                logger.debug(f"Found date in attribute {field}: {published}")
                                break
                        # Try as dictionary key
                        elif field in entry:
                            value = entry[field]
                            if value and isinstance(value, str):
                                published = value
                                logger.debug(f"Found date in key {field}: {published}")
                                break
                
                # Method 4: Try to access feedparser's namespace handling
                # Feedparser stores namespaced elements in a special way
                if not published:
                    # Check if feedparser parsed the torrent namespace
                    # It might be stored as a nested dictionary or with namespace prefixes
                    try:
                        # Method 4a: Check for namespace-prefixed keys in the entry
                        for key in entry.keys():
                            if 'torrent' in key.lower() and isinstance(entry[key], dict):
                                # Found a torrent namespace dict, look for pubDate inside
                                torrent_data = entry[key]
                                if 'pubdate' in torrent_data or 'pubDate' in torrent_data:
                                    published = torrent_data.get('pubdate') or torrent_data.get('pubDate')
                                    logger.debug(f"Found date in torrent namespace dict: {published}")
                                    break
                        
                        # Method 4b: Check for direct namespace URL keys
                        if not published:
                            namespace_url = "https://mikan.tangbai.cc/0.1/"
                            if namespace_url in entry:
                                ns_data = entry[namespace_url]
                                if isinstance(ns_data, dict) and ('pubdate' in ns_data or 'pubDate' in ns_data):
                                    published = ns_data.get('pubdate') or ns_data.get('pubDate')
                                    logger.debug(f"Found date in namespace URL key: {published}")
                        
                        # Method 4c: Comprehensive search through all entry data
                        if not published:
                            logger.debug(f"DEBUG: Searching all entry data for date...")
                            logger.debug(f"DEBUG: Entry keys: {list(entry.keys())}")
                            
                            # First, let's see what feedparser actually parsed - show ALL entry data
                            for key, value in entry.items():
                                logger.debug(f"DEBUG: Entry[{key}] = {repr(value)} (type: {type(value)})")
                            
                            # Search through all keys and attributes for any date-like content
                            all_fields = list(entry.keys()) + [attr for attr in dir(entry) if not attr.startswith('_') and not callable(getattr(entry, attr, None))]
                            
                            for field in all_fields:
                                try:
                                    if field in entry:
                                        value = entry[field]
                                    else:
                                        value = getattr(entry, field, None)
                                    
                                    # Check if this field contains a date
                                    if value and isinstance(value, str):
                                        if ('2025' in value or '2024' in value) and ('T' in value or '-' in value):
                                            published = value
                                            logger.debug(f"Found potential date in {field}: {published}")
                                            break
                                    # Check if it's a nested structure (dict)
                                    elif isinstance(value, dict):
                                        for sub_key, sub_value in value.items():
                                            if isinstance(sub_value, str) and ('2025' in sub_value or '2024' in sub_value):
                                                published = sub_value
                                                logger.debug(f"Found date in nested {field}.{sub_key}: {published}")
                                                break
                                        if published:
                                            break
                                    # Check if it's a list of structures
                                    elif isinstance(value, list):
                                        for i, item in enumerate(value):
                                            if isinstance(item, dict):
                                                for sub_key, sub_value in item.items():
                                                    if isinstance(sub_value, str) and ('2025' in sub_value or '2024' in sub_value):
                                                        published = sub_value
                                                        logger.debug(f"Found date in list {field}[{i}].{sub_key}: {published}")
                                                        break
                                                if published:
                                                    break
                                            elif isinstance(item, str) and ('2025' in item or '2024' in item):
                                                published = item
                                                logger.debug(f"Found date in list {field}[{i}]: {published}")
                                                break
                                        if published:
                                            break
                                except:
                                    continue
                            
                            # Method 4d: Check if the date is embedded in the title or other fields
                            if not published:
                                # Sometimes the date might be in the title or description
                                import re
                                date_pattern = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)'
                                
                                # Check title
                                title_match = re.search(date_pattern, title)
                                if title_match:
                                    published = title_match.group(1)
                                    logger.debug(f"Found date in title: {published}")
                                
                                # Check description
                                if not published:
                                    description = entry.get('description', '') or entry.get('summary', '')
                                    desc_match = re.search(date_pattern, description)
                                    if desc_match:
                                        published = desc_match.group(1)
                                        logger.debug(f"Found date in description: {published}")
                    except Exception as e:
                        logger.debug(f"Error in namespace search: {e}")
                
                if published:
                    # Try multiple date formats including Mikan's ISO format
                    date_formats = [
                        '%Y-%m-%dT%H:%M:%S.%f',      # Mikan format: 2025-07-10T00:01:54.535937
                        '%Y-%m-%dT%H:%M:%S',         # ISO format without microseconds
                        '%a, %d %b %Y %H:%M:%S %z',  # RFC 2822 with timezone
                        '%a, %d %b %Y %H:%M:%S',     # RFC 2822 without timezone
                        '%Y-%m-%d %H:%M:%S',         # Simple ISO format
                        '%Y-%m-%dT%H:%M:%S%z',       # ISO with timezone
                        '%Y-%m-%dT%H:%M:%SZ'         # ISO UTC
                    ]
                    
                    # Special handling for Mikan's microsecond format
                    # Python's %f expects exactly 6 digits, but Mikan might have variable digits
                    if '.' in published and 'T' in published:
                        # Try to normalize the microseconds to 6 digits
                        try:
                            parts = published.split('.')
                            if len(parts) == 2:
                                date_part = parts[0]
                                microsec_part = parts[1]
                                # Pad or truncate to 6 digits
                                if len(microsec_part) < 6:
                                    microsec_part = microsec_part.ljust(6, '0')
                                elif len(microsec_part) > 6:
                                    microsec_part = microsec_part[:6]
                                normalized_date = f"{date_part}.{microsec_part}"
                                logger.debug(f"Normalized date: {published} -> {normalized_date}")
                                published = normalized_date
                        except Exception as e:
                            logger.debug(f"Error normalizing date: {e}")
                    
                    entry_date = None
                    for fmt in date_formats:
                        try:
                            entry_date = datetime.datetime.strptime(published, fmt)
                            break
                        except ValueError:
                            continue
                    
                    if entry_date:
                        # Convert rule.download_after to datetime if it's a string
                        if isinstance(rule.download_after, str):
                            filter_date = datetime.datetime.fromisoformat(rule.download_after.replace('Z', '+00:00'))
                        else:
                            filter_date = rule.download_after
                        
                        # Make both dates timezone-aware or naive for comparison
                        if entry_date.tzinfo is None and filter_date.tzinfo is not None:
                            entry_date = entry_date.replace(tzinfo=datetime.timezone.utc)
                        elif entry_date.tzinfo is not None and filter_date.tzinfo is None:
                            filter_date = filter_date.replace(tzinfo=datetime.timezone.utc)
                        
                        if entry_date < filter_date:
                            logger.debug(f"Entry {title} is too old: {entry_date} < {filter_date}")
                            return False
                    else:
                        logger.debug(f"Could not parse date for entry: {title} - {published}")
                        logger.debug(f"Tried formats: {date_formats}")
                else:
                    logger.debug(f"No published date found for entry: {title}")
            except Exception as e:
                logger.debug(f"Error parsing date for entry {title}: {e}")
        
        # Check subtitle group filter (if not "全部")
        if rule.subtitle_group != "<全部>":
            if rule.subtitle_group.lower() not in title.lower():
                logger.debug(f"Entry {title} doesn't match subtitle group filter: {rule.subtitle_group}")
                return False
        
        logger.debug(f"Entry {title} passed all filters")
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
        
        logger.info(f"Found {len(feed.entries)} entries in RSS feed for rule: {rule.name}")
        
        # Process entries with proper filtering
        processed_count = 0
        for entry in feed.entries:
            if processed_count >= rule.max_tasks:
                logger.info(f"Reached max tasks limit ({rule.max_tasks}) for rule: {rule.name}")
                break
            
            # Apply all filters
            if not matches_filters(entry, rule):
                logger.debug(f"Entry filtered out: {entry.get('title', '')}")
                continue
            
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
