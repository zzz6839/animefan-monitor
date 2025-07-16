import { useState, useEffect, useMemo } from 'react';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Checkbox, 
  FormControlLabel,
  Grid,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { API_BASE } from '../config/api';
import axios from 'axios';

interface Rule {
  id: number;
  name: string;
  enabled: boolean;
  rss_url: string;
  max_tasks: number;
  creation_time: string;
  last_update_time: string | null;
  subtitle_group: string;
  download_after?: string;
  download_latest?: boolean;
  max_size_mb?: number;
  auto_create_tasks?: boolean;
  monitor_interval?: number;
}

interface RSSItem {
  title: string;
  link: string;
  published: string;
  size: string;
  subtitle_group: string;
  task_exists: boolean;
}

interface EditRuleProps {
  open: boolean;
  onClose: () => void;
  rule?: Rule | null;
}

function EditRule({ open, onClose, rule }: EditRuleProps) {
  const [name, setName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [maxTasks, setMaxTasks] = useState(15);
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [downloadAfter, setDownloadAfter] = useState('');
  const [downloadLatest, setDownloadLatest] = useState(false);
  const [maxSizeMb, setMaxSizeMb] = useState('');
  const [monitorInterval, setMonitorInterval] = useState(10);
  const [previewItems, setPreviewItems] = useState<RSSItem[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [filterUpdateTrigger, setFilterUpdateTrigger] = useState(0);

  useEffect(() => {
    if (open) {
      if (rule) {
        // Editing existing rule
        setName(rule.name);
        setRssUrl(rule.rss_url);
        setEnabled(rule.enabled);
        setMaxTasks(rule.max_tasks);
        setAutoCreateTasks(rule.auto_create_tasks ?? true);
        setDownloadAfter(rule.download_after || '');
        setDownloadLatest(rule.download_latest ?? false);
        setMaxSizeMb(rule.max_size_mb?.toString() || '');
        setMonitorInterval(rule.monitor_interval ?? 10);
        if (rule.rss_url) {
          fetchPreview(rule.rss_url);
        }
      } else {
        // Creating new rule
        resetForm();
      }
    }
  }, [open, rule]);

  // Auto-refresh preview when filters change
  useEffect(() => {
    if (rssUrl.trim() && previewItems.length > 0) {
      // Trigger a re-render to update the filtered preview
      setFilterUpdateTrigger(prev => prev + 1);
    }
  }, [maxTasks, downloadAfter, downloadLatest, maxSizeMb]);

  const resetForm = () => {
    setName('');
    setRssUrl('');
    setEnabled(true);
    setMaxTasks(15);
    setAutoCreateTasks(true);
    setDownloadAfter('');
    setDownloadLatest(false);
    setMaxSizeMb('');
    setMonitorInterval(10);
    setPreviewItems([]);
  };

  const fetchPreview = async (url: string) => {
    if (!url.trim()) return;
    
    setIsLoadingPreview(true);
    try {
      const response = await axios.post(`${API_BASE}/rss/preview`, { rss_url: url });
      setPreviewItems(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      setPreviewItems([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Memoized filtered preview items to avoid recalculation
  const filteredPreviewItems = useMemo(() => {
    if (!previewItems.length) return [];

    let filteredItems = previewItems.filter(item => {
      // Apply size filter
      if (maxSizeMb && maxSizeMb.trim()) {
        const sizeLimit = parseInt(maxSizeMb);
        if (isNaN(sizeLimit)) return true; // If invalid size limit, don't filter
        
        // Parse size from different formats (e.g., "386.2 MiB", "1.2 GB", "500 MB")
        let itemSizeMB = 0;
        const sizeStr = item.size || '';
        const sizeMatch = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|GiB|MiB|TB|TiB)/i);
        
        if (sizeMatch) {
          const sizeValue = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toUpperCase();
          
          switch (unit) {
            case 'GB':
            case 'GIB':
              itemSizeMB = sizeValue * 1024;
              break;
            case 'TB':
            case 'TIB':
              itemSizeMB = sizeValue * 1024 * 1024;
              break;
            case 'MB':
            case 'MIB':
            default:
              itemSizeMB = sizeValue;
              break;
          }
        } else {
          // Try to extract just numbers (fallback)
          const numMatch = sizeStr.match(/(\d+\.?\d*)/);
          if (numMatch) {
            itemSizeMB = parseFloat(numMatch[1]);
          }
        }
        
        if (itemSizeMB > sizeLimit) {
          return false;
        }
      }

      // Apply time filter
      if (downloadAfter && downloadAfter.trim()) {
        try {
          const filterDate = new Date(downloadAfter);
          
          // Parse item date - now simplified since backend returns ISO format
          let itemDate: Date | null = null;
          
          const publishedStr = item.published;
          if (publishedStr && publishedStr !== "未知时间") {
            // Backend now returns ISO format dates, so direct parsing should work
            itemDate = new Date(publishedStr);
            
            // If direct parsing fails, try some fallback formats
            if (isNaN(itemDate.getTime())) {
              // Handle any remaining relative time formats (fallback)
              if (publishedStr.includes('分钟前')) {
                const minutes = parseInt(publishedStr.match(/(\d+)分钟前/)?.[1] || '0');
                itemDate = new Date(Date.now() - minutes * 60 * 1000);
              } else if (publishedStr.includes('小时前')) {
                const hours = parseInt(publishedStr.match(/(\d+)小时前/)?.[1] || '0');
                itemDate = new Date(Date.now() - hours * 60 * 60 * 1000);
              } else if (publishedStr.includes('天前')) {
                const days = parseInt(publishedStr.match(/(\d+)天前/)?.[1] || '0');
                itemDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
              } else if (publishedStr.includes('刚刚')) {
                itemDate = new Date();
              } else if (publishedStr.includes('昨天')) {
                const timeMatch = publishedStr.match(/昨天\s*(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  yesterday.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
                  itemDate = yesterday;
                } else {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  itemDate = yesterday;
                }
              } else {
                // Try RFC 2822 format (common in RSS feeds)
                try {
                  itemDate = new Date(publishedStr);
                } catch (e) {
                  console.debug('Could not parse date:', publishedStr);
                }
              }
            }
          }
          
          // Debug logging for troubleshooting
          console.log('Date filter debug:', {
            filterDate: filterDate.toISOString(),
            filterDateLocal: filterDate.toLocaleString(),
            publishedStr,
            itemDate: itemDate?.toISOString(),
            itemDateLocal: itemDate?.toLocaleString(),
            isValidFilter: !isNaN(filterDate.getTime()),
            isValidItem: itemDate && !isNaN(itemDate.getTime()),
            comparison: itemDate && itemDate < filterDate ? 'FILTERED OUT (too old)' : 'INCLUDED (recent enough)',
            timeDiff: itemDate ? `${Math.round((itemDate.getTime() - filterDate.getTime()) / (1000 * 60 * 60))} hours` : 'N/A'
          });
          
          // Apply the filter: exclude items older than the specified date
          if (!isNaN(filterDate.getTime()) && itemDate && !isNaN(itemDate.getTime())) {
            if (itemDate < filterDate) {
              return false; // Filter out items older than the specified date
            }
          } else {
            // If we can't parse the date, include the item (fail-safe)
            console.warn('Could not parse date, including item:', publishedStr);
          }
        } catch (error) {
          console.debug('Date parsing error:', error);
        }
      }

      // Apply latest version filter (basic implementation)
      // This is a simplified version - in practice, you'd need more sophisticated logic
      if (downloadLatest) {
        // For now, we'll just show all items since implementing proper duplicate detection
        // would require more complex logic based on episode numbers, etc.
        // TODO: Implement proper duplicate detection based on episode numbers
      }

      return true;
    });

    // Apply max tasks limit
    return filteredItems.slice(0, maxTasks);
  }, [previewItems, maxTasks, downloadAfter, downloadLatest, maxSizeMb]);

  // Trigger preview refresh when filters change
  const refreshPreviewWithFilters = () => {
    if (rssUrl.trim()) {
      fetchPreview(rssUrl);
    }
  };

  const handleRssUrlChange = (url: string) => {
    setRssUrl(url);
    if (url.trim()) {
      fetchPreview(url);
    } else {
      setPreviewItems([]);
    }
  };

  const handleSave = async () => {
    const ruleData = {
      name,
      rss_url: rssUrl,
      enabled,
      max_tasks: maxTasks,
      auto_create_tasks: autoCreateTasks,
      download_after: downloadAfter || null,
      download_latest: downloadLatest,
      max_size_mb: maxSizeMb ? parseInt(maxSizeMb) : null,
      monitor_interval: monitorInterval,
      subtitle_group: "<全部>"
    };

    try {
      if (rule) {
        await axios.put(`${API_BASE}/rules/${rule.id}`, ruleData);
      } else {
        await axios.post(`${API_BASE}/rules/`, ruleData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        {rule ? '编辑自动下载规则' : '新建自动下载规则'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Left Panel - Settings */}
          <Grid item xs={12} md={6}>
            <Box sx={{ pr: 2 }}>
              <Typography variant="h6" gutterBottom>
                RSS地址
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={rssUrl}
                onChange={(e) => handleRssUrlChange(e.target.value)}
                placeholder="输入RSS订阅地址"
                sx={{ mb: 3 }}
              />

              <Typography variant="h6" gutterBottom>
                为此规则起个名字
              </Typography>
              <TextField
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：更衣人偶"
                sx={{ mb: 3 }}
              />

              <Typography variant="h6" gutterBottom>
                更多选项
              </Typography>
              <Box sx={{ pl: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={enabled} 
                      onChange={(e) => setEnabled(e.target.checked)} 
                    />
                  }
                  label="立刻启用此规则"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={autoCreateTasks} 
                      onChange={(e) => setAutoCreateTasks(e.target.checked)} 
                    />
                  }
                  label="发现新资源后自动创建下载任务"
                />

                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <Typography sx={{ mr: 1 }}>每次更新时最多创建</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={maxTasks}
                    onChange={(e) => setMaxTasks(parseInt(e.target.value) || 15)}
                    sx={{ width: 80, mx: 1 }}
                  />
                  <Typography>个下载任务</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <Typography sx={{ mr: 1 }}>监控间隔</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={monitorInterval}
                    onChange={(e) => setMonitorInterval(parseInt(e.target.value) || 10)}
                    sx={{ width: 80, mx: 1 }}
                  />
                  <Typography>分钟</Typography>
                </Box>

                <Box sx={{ my: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={!!downloadAfter} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDownloadAfter(new Date().toISOString().slice(0, 16));
                          } else {
                            setDownloadAfter('');
                          }
                        }} 
                      />
                    }
                    label="只下载指定时间之后的新资源"
                  />
                  {downloadAfter && (
                    <TextField
                      type="datetime-local"
                      size="small"
                      value={downloadAfter}
                      onChange={(e) => setDownloadAfter(e.target.value)}
                      sx={{ ml: 4, mt: 1 }}
                    />
                  )}
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={downloadLatest} 
                      onChange={(e) => setDownloadLatest(e.target.checked)} 
                    />
                  }
                  label="存在多个同名资源时只下载最新版本的资源"
                />

                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <Checkbox 
                    checked={!!maxSizeMb} 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMaxSizeMb('1000');
                      } else {
                        setMaxSizeMb('');
                      }
                    }} 
                  />
                  <Typography sx={{ mr: 1 }}>只下载体积小于</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={maxSizeMb}
                    onChange={(e) => setMaxSizeMb(e.target.value)}
                    disabled={!maxSizeMb}
                    sx={{ width: 100, mx: 1 }}
                  />
                  <Typography>MB的资源</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right Panel - Preview */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '600px', overflow: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  结果预览
                </Typography>
                <IconButton 
                  onClick={() => fetchPreview(rssUrl)}
                  disabled={!rssUrl.trim() || isLoadingPreview}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
              
{isLoadingPreview ? (
                <Typography>加载中...</Typography>
              ) : previewItems.length > 0 ? (
                <>
                  {/* Filter Summary */}
                  <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      共 {previewItems.length} 个项目，应用过滤器后显示 {filteredPreviewItems.length} 个
                      {maxTasks < filteredPreviewItems.length && ` (限制为前 ${maxTasks} 个)`}
                    </Typography>
                  </Box>
                  
                  <List dense>
                    {filteredPreviewItems.map((item, index) => (
                      <Box key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {item.title}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  字幕组: {item.subtitle_group}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  大小: {item.size}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  发布于 {item.published}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < filteredPreviewItems.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                </>
              ) : rssUrl.trim() ? (
                <Typography color="text.secondary">
                  无法获取预览数据，请检查RSS地址是否正确
                </Typography>
              ) : (
                <Typography color="text.secondary">
                  请输入RSS地址以查看预览
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存规则
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditRule;
