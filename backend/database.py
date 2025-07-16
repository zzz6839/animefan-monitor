from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os

# Ensure data directory exists
os.makedirs("./data", exist_ok=True)

DATABASE_URL = "sqlite:///./data/autodownload.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    enabled = Column(Boolean, default=True)
    rss_url = Column(String)
    max_tasks = Column(Integer, default=15)
    creation_time = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    last_update_time = Column(DateTime, nullable=True)
    subtitle_group = Column(String, default="<全部>")
    download_after = Column(DateTime, nullable=True)
    download_latest = Column(Boolean, default=False)
    max_size_mb = Column(Integer, nullable=True)
    auto_create_tasks = Column(Boolean, default=True)
    monitor_interval = Column(Integer, default=10)  # minutes

class Aria2Config(Base):
    __tablename__ = "aria2_config"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String)
    port = Column(Integer)
    rpc_path = Column(String)
    use_ssl = Column(Boolean, default=False)
    token = Column(String, nullable=True)
    download_path = Column(String)

Base.metadata.create_all(bind=engine)
