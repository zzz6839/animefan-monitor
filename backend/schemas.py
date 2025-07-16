from pydantic import BaseModel
from typing import Optional
import datetime

class RuleBase(BaseModel):
    name: str
    enabled: bool = True
    rss_url: str
    max_tasks: int = 15
    subtitle_group: str = "<全部>"
    download_after: Optional[datetime.datetime] = None
    download_latest: bool = False
    max_size_mb: Optional[int] = None

class RuleCreate(RuleBase):
    pass

class Rule(RuleBase):
    id: int
    creation_time: datetime.datetime
    last_update_time: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class Aria2ConfigBase(BaseModel):
    host: str
    port: int
    rpc_path: str
    use_ssl: bool = False
    token: Optional[str] = None
    download_path: str

class Aria2ConfigCreate(Aria2ConfigBase):
    pass

class Aria2Config(Aria2ConfigBase):
    id: int

    class Config:
        from_attributes = True
