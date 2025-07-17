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
  Chip,
  Grid
} from '@mui/material';
import { Brightness4, Brightness7, Language as LanguageIcon } from '@mui/icons-material';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { useTimezone } from './contexts/TimezoneContext';
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
  const { formatDate, formatTime } = useTimezone();

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
        // Try filtered preview first - this should match what the scheduler will actually download
        console.log('Using filtered preview with rule ID:', ruleId);
        try {
          response = await axios.post(`${API_BASE}/rss/preview_filtered`, {
            rss_url: rssUrl,
            rule_id: ruleId
          });
          console.log('Filtered preview response:', response.data);
          setPreviewItems(response.data);

          if (response.data.length >= 0) {
            console.log(`Filtered preview loaded: ${response.data.length} items match the rule criteria`);
          }
          return; // Success with filtered preview
        } catch (error) {
          console.warn('Filtered preview failed, falling back to unfiltered:', error);
          // Fall through to unfiltered preview
        }
      }

      // Fallback: Use unfiltered preview
      console.log('Using unfiltered preview');
      response = await axios.post(`${API_BASE}/rss/preview`, { rss_url: rssUrl });
      console.log('Unfiltered preview response:', response.data);
      setPreviewItems(response.data);

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
      <Box sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Chip
          icon={<LanguageIcon />}
          label={language === 'zh' ? '中/EN' : 'EN/中'}
          onClick={toggleLanguage}
          variant="outlined"
          sx={{
            cursor: 'pointer',
            height: 40  // Match IconButton height
          }}
        />
        <IconButton
          onClick={toggleDarkMode}
          color="inherit"
          sx={{
            width: 40,
            height: 40
          }}
        >
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

        {/* Main layout with optional right panel */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Main Table - Always full width */}
          <Box sx={{ flex: 1 }}>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      padding="checkbox"
                      sx={{
                        width: 50,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed'
                      }}
                    >
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
                    <TableCell
                      sx={{
                        width: 80,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <TableSortLabel
                        active={sortBy === 'enabled'}
                        direction={sortBy === 'enabled' ? sortOrder : 'asc'}
                        onClick={() => handleSort('enabled')}
                      >
                        {t('table.enabled')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sx={{
                        minWidth: 120,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <TableSortLabel
                        active={sortBy === 'name'}
                        direction={sortBy === 'name' ? sortOrder : 'asc'}
                        onClick={() => handleSort('name')}
                      >
                        {t('table.name')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 100,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <TableSortLabel
                        active={sortBy === 'subtitle_group'}
                        direction={sortBy === 'subtitle_group' ? sortOrder : 'asc'}
                        onClick={() => handleSort('subtitle_group')}
                      >
                        {t('table.subtitle_group')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sx={{
                        minWidth: showPreview ? 200 : 300,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {t('table.rss_url')}
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 100,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <TableSortLabel
                        active={sortBy === 'max_tasks'}
                        direction={sortBy === 'max_tasks' ? sortOrder : 'asc'}
                        onClick={() => handleSort('max_tasks')}
                      >
                        {t('table.max_tasks')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 150,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <TableSortLabel
                        active={sortBy === 'creation_time'}
                        direction={sortBy === 'creation_time' ? sortOrder : 'asc'}
                        onClick={() => handleSort('creation_time')}
                      >
                        {t('table.creation_time')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 150,
                        writingMode: 'horizontal-tb',
                        textOrientation: 'mixed',
                        whiteSpace: 'nowrap'
                      }}
                    >
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
                            maxWidth: showPreview ? 200 : 300,
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
                          {formatDate(rule.creation_time)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(rule.creation_time)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {rule.last_update_time ? (
                          <>
                            <Typography variant="body2">
                              {formatDate(rule.last_update_time)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(rule.last_update_time)}
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

          </Box>

          {/* Right Panel - Preview with toggle */}
          <Box sx={{ width: showPreview ? '500px' : 'auto', flexShrink: 0 }}>
            {/* Preview toggle checkbox aligned with table header */}
            <Box sx={{
              height: '56px', // Match table header height
              display: 'flex',
              alignItems: 'center',
              pl: 2,
              mb: 2
            }}>
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

            {showPreview && (
              <Paper sx={{ p: 2, height: '600px', overflow: 'auto', position: 'sticky', top: 16 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {t('preview.title')}
                  </Typography>
                  {selectedRule && (
                    <Chip
                      size="small"
                      color="primary"
                      label={t('preview.filtered')}
                      sx={{ fontSize: '0.7rem', ml: 1 }}
                    />
                  )}
                </Box>

                {selectedRule ? (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      {selectedRule.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      {previewItems.length > 0 ? t('preview.count', { count: previewItems.length }) : t('preview.no_items')}
                    </Typography>

                    {previewItems.length > 0 ? (
                      <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
                        {previewItems.map((item, index) => (
                          <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 'bold',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                mb: 1
                              }}
                              title={item.title}
                            >
                              {item.title}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {t('preview.table.subtitle_group')}: {item.subtitle_group === "未知字幕组" ? t('status.unknown_group') : item.subtitle_group}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('preview.table.size')}: {item.size}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('preview.table.task_status')}: {item.task_exists ? t('status.exists') : t('status.new_task')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('preview.table.publish_time')}: {item.published && item.published !== "未知时间" ?
                                  formatDate(item.published) :
                                  (item.published === "未知时间" ? t('status.unknown_time') : item.published)
                                }
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('preview.no_items')}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('preview.select_rule')}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </Box>

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
