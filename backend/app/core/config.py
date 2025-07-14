from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Anime Fan Monitor"

    # CORS settings
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # RSS Feed settings
    DEFAULT_MONITOR_INTERVAL: int = 600  # 10 minutes in seconds
    MAX_RSS_ITEMS: int = 100
    RSS_TIMEOUT: int = 30  # seconds

    # Aria2 settings
    DEFAULT_ARIA2_PORT: int = 6800
    DEFAULT_ARIA2_PATH: str = "jsonrpc"
    DEFAULT_DOWNLOAD_DIR: str = "/downloads"
    
    # SQLite settings
    SQLITE_DATABASE_URL: str = "sqlite+aiosqlite:///./anime_monitor.db"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
