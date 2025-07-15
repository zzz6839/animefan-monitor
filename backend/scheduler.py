from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
import feedparser
import logging

from . import crud, models
from .database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_rss_feeds():
    db: Session = SessionLocal()
    try:
        rules = crud.get_rules(db)
        for rule in rules:
            if rule.enabled:
                logger.info(f"Checking RSS feed for rule: {rule.name}")
                feed = feedparser.parse(rule.rss_url)
                for entry in feed.entries:
                    # Here you would add logic to check if the entry is new
                    # and if it matches any filters.
                    # For now, we'll just log the title.
                    logger.info(f"Found entry: {entry.title}")
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(check_rss_feeds, 'interval', minutes=10)
