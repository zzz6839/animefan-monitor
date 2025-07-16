import { useState, useEffect, useMemo } from 'react';
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
  IconButton,
  TableSortLabel,
  Chip
} from '@mui/material';
import { Brightness4, Brightness7, Language as LanguageIcon } from '@mui/icons-material';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
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
  download_after?: string;
  download_latest?: boolean;
  max_size_mb?: number | null;
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
  
  // Sorting state
  const [sortBy, setSortBy] = useState<keyof Rule>(() => {
    return (localStorage.getItem('tableSortBy') as keyof Rule) || 'creation_time';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('tableSortOrder') as 'asc' | 'desc') || 'desc';
  });
  
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    console.log('App starting, API_BASE:', API_BASE);
    fetchRules();
  }, []);

  // Save sorting preferences to localStorage
  useEffect(() => {
    localStorage.setItem('tableSortBy', sortBy);
    localStorage.setItem('tableSortOrder', sortOrder);
  }, [sortBy, sortOrder]);

  // Sorted rules
  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === null) return sortOrder === 'asc' ? 1 : -1;
      
      // Handle date strings
      if (sortBy === 'creation_time' || sortBy === 'last_update_time') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue! < bValue!) return sortOrder === 'asc' ? -1 : 1;
      if (aValue! > bValue!) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rules, sortBy, sortOrder]);

  const handleSort = (column: keyof Rule) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API_BASE}/rules/`);
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
      showSnackbar(t('message.fetch_rules_error'), 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleRuleToggle = async (ruleId: number) => {
    try {
      await axios.post(`${API_BASE}/rules/${ruleId}/toggle`);
      fetchRules();
      showSnackbar(t('message.rules_updated'), 'success');
    } catch (error) {
      console.error('Error toggling rule:', error);
      showSnackbar(t('message.update_rule_error'), 'error');
    }
  };

  const handleRunRules = async () => {
    if (selectedRuleIds.length === 0) {
      showSnackbar(t('message.select_rules_to_run'), 'error');
      return;
    }

    try {
      for (const ruleId of selectedRuleIds) {
        await axios.post(`${API_BASE}/rules/${ruleId}/run`);
      }
      showSnackbar(t('message.rules_run_success'), 'success');
    } catch (error) {
      console.error('Error running rules:', error);
      showSnackbar(t('message.run_rules_error'), 'error');
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setEditRuleOpen(true);
  };

  const handleEditRule = () => {
    if (selectedRuleIds.length !== 1) {
      showSnackbar(t('message.select_rule_to_edit'), 'error');
      return;
    }
    const rule = rules.find(r => r.id === selectedRuleIds[0]);
    setEditingRule(rule || null);
    setEditRuleOpen(true);
  };

  const handleDeleteRules = async () => {
    if (selectedRuleIds.length === 0) {
      showSnackbar(t('message.select_rules_to_delete'), 'error');
      return;
    }

    if (!confirm(t('message.confirm_delete', { count: selectedRuleIds.length }))) {
      return;
    }

    try {
      for (const ruleId of selectedRuleIds) {
        await axios.delete(`${API_BASE}/rules/${ruleId}`);
      }
      setSelectedRuleIds([]);
      fetchRules();
      showSnackbar(t('message.rules_deleted'), 'success');
    } catch (error) {
      console.error('Error deleting rules:', error);
      showSnackbar(t('message.delete_rules_error'), 'error');
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
        // Use filtered preview when a rule is selected - this shows the same results as the edit rule page
        console.log('Using filtered preview with rule ID:', ruleId);
        response = await axios.post(`${API_BASE}/rss/preview_filtered`, {
          rss_url: rssUrl,
          rule_id: ruleId
        });
        console.log('Filtered preview response:', response.data);
      } else {
        // Use unfiltered preview as fallback
        console.log('Using unfiltered preview');
        response = await axios.post(`${API_BASE}/rss/preview`, { rss_url: rssUrl });
        console.log('Unfiltered preview response:', response.data);
      }
      setPreviewItems(response.data);
      
      // Show success message to confirm filtering is working
      if (ruleId && response.data.length >= 0) {
        console.log(`Filtered preview loaded: ${response.data.length} items match the rule criteria`);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      showSnackbar(t('message.preview_error'), 'error');
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
      {/* Language and Dark/Light mode toggles - fixed to top right */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', gap: 1 }}>
        <Chip
          icon={<LanguageIcon />}
          label={language === 'zh' ? '中/EN' : 'EN/中'}
          onClick={toggleLanguage}
          variant="outlined"
          sx={{ cursor: 'pointer' }}
        />
        <IconButton onClick={toggleDarkMode} color="inherit">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Box>

      {/* Main content starting from top left */}
      <Container maxWidth="xl" sx={{ pt: 2, pb: 2, pl: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
          {t('app.title')}
        </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleRunRules}
          disabled={selectedRuleIds.length === 0}
        >
          {t('button.run_rules')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateRule}
        >
          {t('button.create_rule')}
        </Button>
        <Button
          variant="contained"
          color="info"
          onClick={handleEditRule}
          disabled={selectedRuleIds.length !== 1}
        >
          {t('button.edit_rule')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteRules}
          disabled={selectedRuleIds.length === 0}
        >
          {t('button.delete_rules')}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setAria2SettingsOpen(true)}
        >
          {t('button.downloader_settings')}
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 50 }}>
                <Checkbox
                  indeterminate={selectedRuleIds.length > 0 && selectedRuleIds.length < rules.length}
                  checked={sortedRules.length > 0 && selectedRuleIds.length === sortedRules.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRuleIds(sortedRules.map(r => r.id));
                    } else {
                      setSelectedRuleIds([]);
                    }
                  }}
                  title={t('table.select_all')}
                />
              </TableCell>
              <TableCell sx={{ width: 80 }}>
                <TableSortLabel
                  active={sortBy === 'enabled'}
                  direction={sortBy === 'enabled' ? sortOrder : 'asc'}
                  onClick={() => handleSort('enabled')}
                >
                  {t('table.enabled')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ minWidth: 120 }}>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  {t('table.name')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 100 }}>
                <TableSortLabel
                  active={sortBy === 'subtitle_group'}
                  direction={sortBy === 'subtitle_group' ? sortOrder : 'asc'}
                  onClick={() => handleSort('subtitle_group')}
                >
                  {t('table.subtitle_group')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ minWidth: 300 }}>{t('table.rss_url')}</TableCell>
              <TableCell sx={{ width: 100 }}>
                <TableSortLabel
                  active={sortBy === 'max_tasks'}
                  direction={sortBy === 'max_tasks' ? sortOrder : 'asc'}
                  onClick={() => handleSort('max_tasks')}
                >
                  {t('table.max_tasks')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 150 }}>
                <TableSortLabel
                  active={sortBy === 'creation_time'}
                  direction={sortBy === 'creation_time' ? sortOrder : 'asc'}
                  onClick={() => handleSort('creation_time')}
                >
                  {t('table.creation_time')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 150 }}>
                <TableSortLabel
                  active={sortBy === 'last_update_time'}
                  direction={sortBy === 'last_update_time' ? sortOrder : 'asc'}
                  onClick={() => handleSort('last_update_time')}
                >
                  {t('table.last_update')}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRules.map(rule => (
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
                    {rule.subtitle_group === "<全部>" ? t('status.all_groups') : rule.subtitle_group}
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
                    {new Date(rule.creation_time).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(rule.creation_time).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </TableCell>
                <TableCell>
                  {rule.last_update_time ? (
                    <>
                      <Typography variant="body2">
                        {new Date(rule.last_update_time).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rule.last_update_time).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('status.unknown')}</Typography>
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
          label={t('preview.label')}
        />
      </Box>

      {showPreview && selectedRule && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {t('preview.title')}: {selectedRule.name}
              </Typography>
              <Chip 
                size="small" 
                color="primary" 
                label={t('preview.filtered')} 
                sx={{ fontSize: '0.7rem' }} 
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {previewItems.length > 0 ? t('preview.count', { count: previewItems.length }) : t('preview.no_items')}
            </Typography>
          </Box>

          {previewItems.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 400 }}>{t('preview.table.title')}</TableCell>
                    <TableCell sx={{ width: 100 }}>{t('preview.table.task_status')}</TableCell>
                    <TableCell sx={{ width: 80 }}>{t('preview.table.type')}</TableCell>
                    <TableCell sx={{ width: 120 }}>{t('preview.table.subtitle_group')}</TableCell>
                    <TableCell sx={{ width: 100 }}>{t('preview.table.size')}</TableCell>
                    <TableCell sx={{ width: 150 }}>{t('preview.table.publish_time')}</TableCell>
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
                          {item.task_exists ? t('status.exists') : t('status.new_task')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {t('status.video')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={item.subtitle_group === "未知字幕组" ? "text.secondary" : "text.primary"}
                        >
                          {item.subtitle_group === "未知字幕组" ? t('status.unknown_group') : item.subtitle_group}
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
                            new Date(item.published).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US') :
                            (item.published === "未知时间" ? t('status.unknown_time') : item.published)
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
                {selectedRule ? t('preview.no_rule') : t('preview.select_rule')}
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
