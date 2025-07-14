from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class DownloadRule(Base):
    __tablename__ = "download_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rss_url = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    subtitle_group = Column(String, default="<全部>")
    max_tasks = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, nullable=True)
    min_size_mb = Column(Float, nullable=True)
    after_date = Column(DateTime, nullable=True)
    download_latest_only = Column(Boolean, default=False)
    auto_create_tasks = Column(Boolean, default=True)

class Aria2Config(Base):
    __tablename__ = "aria2_config"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False, default=6800)
    rpc_path = Column(String, default="jsonrpc")
    use_ssl = Column(Boolean, default=False)
    secret_token = Column(String, nullable=True)
    download_dir = Column(String, default="/downloads")
    last_updated = Column(DateTime, default=datetime.utcnow)
