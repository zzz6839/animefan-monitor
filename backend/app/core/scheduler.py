import logging
import feedparser
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any

from ..models import DownloadRule, Aria2Config
from ..crud import get_download_rules, get_aria2_config
from .config import settings

logger = logging.getLogger(__name__)

class RSSMonitorScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._job = None
        self._running = False

    async def process_rss_feed(self, rule: DownloadRule, aria2_config: Aria2Config) -> None:
        """Process a single RSS feed according to its rule."""
        try:
            feed = feedparser.parse(rule.rss_url, timeout=settings.RSS_TIMEOUT)
            
            if feed.bozo:  # Feed parsing error
                logger.error(f"Error parsing feed {rule.rss_url}: {feed.bozo_exception}")
                return

            for entry in feed.entries[:settings.MAX_RSS_ITEMS]:
                # Basic entry validation
                if not hasattr(entry, 'title') or not hasattr(entry, 'link'):
                    continue

                # Apply rule filters
                if rule.subtitle_group != "<全部>" and rule.subtitle_group not in entry.title:
                    continue

                if rule.after_date and hasattr(entry, 'published_parsed'):
                    entry_date = datetime(*entry.published_parsed[:6])
                    if entry_date < rule.after_date:
                        continue

                # TODO: Implement size filtering when available in feed
                # TODO: Add task existence check
                # TODO: Implement Aria2 download task creation

                logger.info(f"Processing entry: {entry.title}")

        except Exception as e:
            logger.error(f"Error processing feed {rule.rss_url}: {str(e)}")

    async def check_feeds(self, db: AsyncSession) -> None:
        """Check all enabled RSS feeds."""
        try:
            rules = await get_download_rules(db)
            aria2_config = await get_aria2_config(db)

            if not aria2_config:
                logger.error("Aria2 configuration not found. Skipping RSS check.")
                return

            enabled_rules = [rule for rule in rules if rule.enabled]
            
            # Process feeds concurrently
            tasks = [self.process_rss_feed(rule, aria2_config) for rule in enabled_rules]
            await asyncio.gather(*tasks)

        except Exception as e:
            logger.error(f"Error checking feeds: {str(e)}")

    def start(self, interval: int = settings.DEFAULT_MONITOR_INTERVAL) -> None:
        """Start the RSS monitor scheduler."""
        if self._running:
            return

        self._job = self.scheduler.add_job(
            self.check_feeds,
            trigger=IntervalTrigger(seconds=interval),
            id='rss_monitor',
            replace_existing=True
        )
        
        self.scheduler.start()
        self._running = True
        logger.info(f"RSS monitor scheduler started with {interval}s interval")

    def stop(self) -> None:
        """Stop the RSS monitor scheduler."""
        if self._running:
            if self._job:
                self._job.remove()
                self._job = None
            self.scheduler.shutdown()
            self._running = False
            logger.info("RSS monitor scheduler stopped")

    def update_interval(self, interval: int) -> None:
        """Update the monitoring interval."""
        if self._running and self._job:
            self._job.reschedule(trigger=IntervalTrigger(seconds=interval))
            logger.info(f"RSS monitor interval updated to {interval}s")

# Global scheduler instance
scheduler = RSSMonitorScheduler()
