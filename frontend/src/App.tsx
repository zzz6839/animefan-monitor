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
      let response;
      if (ruleId) {
        // Use filtered preview when a rule is selected
        response = await axios.post(`${API_BASE}/rss/preview_filtered`, { 
          rss_url: rssUrl, 
          rule_id: ruleId 
        });
      } else {
        // Use unfiltered preview as fallback
        response = await axios.post(`${API_BASE}/rss/preview`, { rss_url: rssUrl });
      }
      setPreviewItems(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      showSnackbar('获取预览失败', 'error');
    }
  };

  const handlePreviewToggle = (checked: boolean) => {
    setShowPreview(checked);
    if (checked && selectedRule) {
      fetchPreview(selectedRule.rss_url, selectedRule.id);
    } else {
      setPreviewItems([]);
    }
  };

  return (
    <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            自动下载
          </Typography>
          <IconButton onClick={toggleDarkMode} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRunRules}
            sx={{ mr: 1 }}
          >
            运行规则
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateRule}
            sx={{ mr: 1 }}
          >
            新建自动下载规则
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEditRule}
            sx={{ mr: 1 }}
          >
            编辑规则
          </Button>
          <Button 
            variant="contained" 
            onClick={handleDeleteRules}
            sx={{ mr: 1 }}
          >
            删除规则
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setAria2SettingsOpen(true)}
          >
            下载器设置
          </Button>
        </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
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
                />
              </TableCell>
              <TableCell>启用</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>字幕组</TableCell>
              <TableCell>RSS地址</TableCell>
              <TableCell>最多创建任务数</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>最近更新时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map(rule => (
              <TableRow 
                key={rule.id}
                hover
                selected={selectedRule?.id === rule.id}
                onClick={() => handleRowClick(rule)}
                sx={{ cursor: 'pointer' }}
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
                  />
                </TableCell>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{rule.subtitle_group}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rule.rss_url}
                </TableCell>
                <TableCell>{rule.max_tasks}</TableCell>
                <TableCell>{new Date(rule.creation_time).toLocaleString('zh-CN')}</TableCell>
                <TableCell>
                  {rule.last_update_time ? new Date(rule.last_update_time).toLocaleString('zh-CN') : '未知'}
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
          <Typography variant="h6" gutterBottom>
            预览: {selectedRule.name}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>标题</TableCell>
                  <TableCell>任务已存在</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>字幕组</TableCell>
                  <TableCell>大小</TableCell>
                  <TableCell>发布日期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </TableCell>
                    <TableCell>{item.task_exists ? '是' : '否'}</TableCell>
                    <TableCell>视频</TableCell>
                    <TableCell>{item.subtitle_group}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.published}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
  );
}

export default App;
