import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  FormControlLabel,
  Alert,
  Snackbar,
  IconButton
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from './contexts/ThemeContext';
import { API_BASE } from './config/api';
import EditRule from './components/EditRule';
import Aria2Settings from './components/Aria2Settings';

interface Rule {
  id: number;
  name: string;
  enabled: boolean;
  rss_url: string;
  max_tasks: number;
  creation_time: string;
  last_update_time: string | null;
  subtitle_group: string;
}

interface RSSItem {
  title: string;
  link: string;
  published: string;
  size: string;
  subtitle_group: string;
  task_exists: boolean;
}

function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [previewItems, setPreviewItems] = useState<RSSItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [aria2SettingsOpen, setAria2SettingsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const { darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    console.log('App starting, API_BASE:', API_BASE);
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API_BASE}/rules/`);
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
      showSnackbar('获取规则失败', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleRuleToggle = async (ruleId: number) => {
    try {
      await axios.post(`${API_BASE}/rules/${ruleId}/toggle`);
      fetchRules();
      showSnackbar('规则状态已更新', 'success');
    } catch (error) {
      console.error('Error toggling rule:', error);
      showSnackbar('更新规则状态失败', 'error');
    }
  };

  const handleRunRules = async () => {
    if (selectedRuleIds.length === 0) {
      showSnackbar('请选择要运行的规则', 'error');
      return;
    }

    try {
      for (const ruleId of selectedRuleIds) {
        await axios.post(`${API_BASE}/rules/${ruleId}/run`);
      }
      showSnackbar('规则运行成功', 'success');
    } catch (error) {
      console.error('Error running rules:', error);
      showSnackbar('运行规则失败', 'error');
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setEditRuleOpen(true);
  };

  const handleEditRule = () => {
    if (selectedRuleIds.length !== 1) {
      showSnackbar('请选择一个规则进行编辑', 'error');
      return;
    }
    const rule = rules.find(r => r.id === selectedRuleIds[0]);
    setEditingRule(rule || null);
    setEditRuleOpen(true);
  };

  const handleDeleteRules = async () => {
    if (selectedRuleIds.length === 0) {
      showSnackbar('请选择要删除的规则', 'error');
      return;
    }

    if (!confirm(`确定要删除 ${selectedRuleIds.length} 个规则吗？`)) {
      return;
    }

    try {
      for (const ruleId of selectedRuleIds) {
        await axios.delete(`${API_BASE}/rules/${ruleId}`);
      }
      setSelectedRuleIds([]);
      fetchRules();
      showSnackbar('规则删除成功', 'success');
    } catch (error) {
      console.error('Error deleting rules:', error);
      showSnackbar('删除规则失败', 'error');
    }
  };

  const handleRuleSelect = (ruleId: number, checked: boolean) => {
    if (checked) {
      setSelectedRuleIds([...selectedRuleIds, ruleId]);
    } else {
      setSelectedRuleIds(selectedRuleIds.filter(id => id !== ruleId));
    }
  };

  const handleRowClick = (rule: Rule) => {
    setSelectedRule(rule);
    if (showPreview) {
      fetchPreview(rule.rss_url, rule.id);
    }
  };

  const fetchPreview = async (rssUrl: string, ruleId?: number) => {
    try {
      console.log('Fetching preview for:', { rssUrl, ruleId });
      let response;
      if (ruleId) {
        // Use filtered preview when a rule is selected
        console.log('Using filtered preview with rule ID:', ruleId);
        response = await axios.post(`${API_BASE}/rss/preview_filtered`, {
          rss_url: rssUrl,
          rule_id: ruleId
        });
      } else {
        // Use unfiltered preview as fallback
        console.log('Using unfiltered preview');
        response = await axios.post(`${API_BASE}/rss/preview`, { rss_url: rssUrl });
      }
      console.log('Preview response:', response.data);
      setPreviewItems(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      showSnackbar('获取预览失败', 'error');
      setPreviewItems([]);
    }
  };

  const handlePreviewToggle = (checked: boolean) => {
    console.log('Preview toggle:', { checked, selectedRule });
    setShowPreview(checked);
    if (checked && selectedRule) {
      console.log('Fetching preview for selected rule:', selectedRule);
      fetchPreview(selectedRule.rss_url, selectedRule.id);
    } else {
      setPreviewItems([]);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative' }}>
      {/* Dark/Light mode toggle - fixed to top right */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
        <IconButton onClick={toggleDarkMode} color="inherit">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Box>

      {/* Main content starting from top left */}
      <Container maxWidth="xl" sx={{ pt: 2, pb: 2, pl: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
          自动下载 (作品监控列表)
        </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleRunRules}
          disabled={selectedRuleIds.length === 0}
        >
          运行规则
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateRule}
        >
          新建自动下载规则
        </Button>
        <Button
          variant="contained"
          color="info"
          onClick={handleEditRule}
          disabled={selectedRuleIds.length !== 1}
        >
          编辑规则
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteRules}
          disabled={selectedRuleIds.length === 0}
        >
          删除规则
        </Button>
        <Button
          variant="outlined"
          onClick={() => setAria2SettingsOpen(true)}
        >
          下载器设置
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 50 }}>
                <Checkbox
                  indeterminate={selectedRuleIds.length > 0 && selectedRuleIds.length < rules.length}
                  checked={rules.length > 0 && selectedRuleIds.length === rules.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRuleIds(rules.map(r => r.id));
                    } else {
                      setSelectedRuleIds([]);
                    }
                  }}
                  title="全选/取消全选"
                />
              </TableCell>
              <TableCell sx={{ width: 80 }}>启用</TableCell>
              <TableCell sx={{ minWidth: 120 }}>名称</TableCell>
              <TableCell sx={{ width: 100 }}>字幕组</TableCell>
              <TableCell sx={{ minWidth: 300 }}>RSS地址</TableCell>
              <TableCell sx={{ width: 100 }}>最多任务数</TableCell>
              <TableCell sx={{ width: 150 }}>创建时间</TableCell>
              <TableCell sx={{ width: 150 }}>最近更新</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map(rule => (
              <TableRow
                key={rule.id}
                hover
                selected={selectedRule?.id === rule.id}
                onClick={() => handleRowClick(rule)}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRuleIds.includes(rule.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRuleSelect(rule.id, e.target.checked);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={rule.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRuleToggle(rule.id);
                    }}
                    color="success"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: rule.enabled ? 'bold' : 'normal' }}>
                  {rule.name}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color={rule.subtitle_group === "<全部>" ? "text.secondary" : "text.primary"}>
                    {rule.subtitle_group === "<全部>" ? "全部" : rule.subtitle_group}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={rule.rss_url}
                  >
                    {rule.rss_url}
                  </Typography>
                </TableCell>
                <TableCell align="center">{rule.max_tasks}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(rule.creation_time).toLocaleDateString('zh-CN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(rule.creation_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </TableCell>
                <TableCell>
                  {rule.last_update_time ? (
                    <>
                      <Typography variant="body2">
                        {new Date(rule.last_update_time).toLocaleDateString('zh-CN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rule.last_update_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">未知</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={showPreview}
              onChange={(e) => handlePreviewToggle(e.target.checked)}
            />
          }
          label="预览选中的规则"
        />
      </Box>

      {showPreview && selectedRule && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              预览: {selectedRule.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {previewItems.length > 0 ? `显示 ${previewItems.length} 个符合条件的项目` : '无符合条件的项目'}
            </Typography>
          </Box>

          {previewItems.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 400 }}>标题</TableCell>
                    <TableCell sx={{ width: 100 }}>任务状态</TableCell>
                    <TableCell sx={{ width: 80 }}>类型</TableCell>
                    <TableCell sx={{ width: 120 }}>字幕组</TableCell>
                    <TableCell sx={{ width: 100 }}>大小</TableCell>
                    <TableCell sx={{ width: 150 }}>发布时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewItems.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.4
                          }}
                          title={item.title}
                        >
                          {item.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={item.task_exists ? "success.main" : "text.secondary"}
                          sx={{ fontWeight: item.task_exists ? 'bold' : 'normal' }}
                        >
                          {item.task_exists ? '已存在' : '新任务'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          视频
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={item.subtitle_group === "未知字幕组" ? "text.secondary" : "text.primary"}
                        >
                          {item.subtitle_group}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.size}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.published && item.published !== "未知时间" ?
                            new Date(item.published).toLocaleDateString('zh-CN') :
                            item.published
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {selectedRule ? '该规则当前没有符合条件的项目' : '请选择一个规则查看预览'}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      <EditRule
        open={editRuleOpen}
        onClose={() => {
          setEditRuleOpen(false);
          setEditingRule(null);
          fetchRules();
        }}
        rule={editingRule}
      />

      <Aria2Settings
        open={aria2SettingsOpen}
        onClose={() => setAria2SettingsOpen(false)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Container>
    </Box>
  );
}

export default App;
