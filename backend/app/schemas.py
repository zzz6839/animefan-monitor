from datetime import datetime
from typing import Optional
from pydantic import BaseModel, AnyHttpUrl

class Aria2ConfigBase(BaseModel):
    host: str
    port: int = 6800
    rpc_path: str = "jsonrpc"
    use_ssl: bool = False
    secret_token: Optional[str] = None
    download_dir: str = "/downloads"

class Aria2ConfigCreate(Aria2ConfigBase):
    pass

class Aria2Config(Aria2ConfigBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

class DownloadRuleBase(BaseModel):
    name: str
    rss_url: AnyHttpUrl
    enabled: bool = True
    subtitle_group: str = "<全部>"
    max_tasks: int = 15
    min_size_mb: Optional[float] = None
    after_date: Optional[datetime] = None
    download_latest_only: bool = False
    auto_create_tasks: bool = True

class DownloadRuleCreate(DownloadRuleBase):
    pass

class DownloadRule(DownloadRuleBase):
    id: int
    created_at: datetime
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True

class RSSFeedItem(BaseModel):
    title: str
    task_exists: bool
    type: str
    subtitle_group: str
    size: str
    release_date: datetime

class RSSFeedPreview(BaseModel):
    items: list[RSSFeedItem]
    total_count: int
