export interface DownloadRule {
  id: string;
  name: string;
  subtitle_group: string;
  rss_url: string;
  max_tasks: number;
  enabled: boolean;
  created_at: string;
  last_updated: string | null;
  filters?: {
    include?: string[];
    exclude?: string[];
    min_size?: number;
    max_size?: number;
  };
}

export interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pub_date: string;
  torrent_url: string;
  size: string;
  type: string;
  subtitle_group: string;
  task_exists: boolean;
  release_date: string;
}

export interface DownloadTask {
  id: string;
  title: string;
  url: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  size: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  aria2_url: string;
  aria2_secret: string;
  download_dir: string;
  rss_check_interval: number;
  max_concurrent_downloads: number;
}
