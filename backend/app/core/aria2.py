import logging
import aria2p
from typing import Optional
from ..models import Aria2Config

logger = logging.getLogger(__name__)

class Aria2Client:
    def __init__(self):
        self._api = None
        self._config = None

    def connect(self, config: Aria2Config) -> bool:
        """Connect to Aria2 RPC server using provided configuration."""
        try:
            self._api = aria2p.API(
                aria2p.Client(
                    host=config.host,
                    port=config.port,
                    secret=config.secret_token
                )
            )
            
            # Test connection by getting version
            version = self._api.get_version()
            logger.info(f"Connected to Aria2 {version}")
            
            self._config = config
            return True

        except Exception as e:
            logger.error(f"Failed to connect to Aria2: {str(e)}")
            self._api = None
            self._config = None
            return False

    def disconnect(self) -> None:
        """Disconnect from Aria2 RPC server."""
        self._api = None
        self._config = None

    def is_connected(self) -> bool:
        """Check if connected to Aria2 RPC server."""
        return self._api is not None

    def add_download(self, url: str, filename: Optional[str] = None) -> Optional[str]:
        """Add a new download task to Aria2."""
        if not self.is_connected():
            logger.error("Not connected to Aria2")
            return None

        try:
            options = {
                "dir": self._config.download_dir,
            }
            
            if filename:
                options["out"] = filename

            download = self._api.add_uris([url], options=options)
            logger.info(f"Added download task: {download.gid}")
            return download.gid

        except Exception as e:
            logger.error(f"Failed to add download: {str(e)}")
            return None

    def get_download_status(self, gid: str) -> Optional[dict]:
        """Get the status of a download task."""
        if not self.is_connected():
            logger.error("Not connected to Aria2")
            return None

        try:
            download = self._api.get_download(gid)
            return {
                "gid": download.gid,
                "status": download.status,
                "progress": download.progress,
                "download_speed": download.download_speed,
                "completed_length": download.completed_length,
                "total_length": download.total_length,
            }

        except Exception as e:
            logger.error(f"Failed to get download status: {str(e)}")
            return None

    def test_connection(self) -> tuple[bool, str]:
        """Test the connection to Aria2 RPC server."""
        if not self.is_connected():
            return False, "Not connected to Aria2"

        try:
            version = self._api.get_version()
            return True, f"Connected to Aria2 {version}"
        except Exception as e:
            return False, f"Failed to connect: {str(e)}"

# Global Aria2 client instance
aria2_client = Aria2Client()
