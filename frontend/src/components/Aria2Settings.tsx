import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Alert,
  Link,
  CircularProgress
} from '@mui/material';
import { API_BASE } from '../config/api';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

interface Aria2SettingsProps {
  open: boolean;
  onClose: () => void;
}

function Aria2Settings({ open, onClose }: Aria2SettingsProps) {
  const { t } = useLanguage();
  const [host, setHost] = useState('192.168.1.219');
  const [port, setPort] = useState(6800);
  const [rpcPath, setRpcPath] = useState('jsonrpc');
  const [useSsl, setUseSsl] = useState(false);
  const [token, setToken] = useState('');
  const [downloadPath, setDownloadPath] = useState('/downloads');
  const [testResult, setTestResult] = useState<{ status: string; message?: string; version?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE}/aria2_config/`);
      const config = response.data;
      setHost(config.host);
      setPort(config.port);
      setRpcPath(config.rpc_path);
      setUseSsl(config.use_ssl);
      setToken(config.token || '');
      setDownloadPath(config.download_path);
    } catch (error) {
      console.error('Error fetching Aria2 config:', error);
      // Set default values if no config exists
      setHost('192.168.1.219');
      setPort(6800);
      setRpcPath('jsonrpc');
      setUseSsl(false);
      setToken('');
      setDownloadPath('/downloads');
    }
  };

  const getRpcUrl = () => {
    const protocol = useSsl ? 'https' : 'http';
    return `${protocol}://${host}:${port}/${rpcPath}`;
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post(`${API_BASE}/aria2_config/test`);
      setTestResult(response.data);
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({
        status: 'error',
        message: t('aria2.connection_failed')
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_BASE}/aria2_config/`, {
        host: host,
        port: port,
        rpc_path: rpcPath,
        use_ssl: useSsl,
        token: token,
        download_path: downloadPath,
      });
      onClose();
    } catch (error) {
      console.error('Error saving Aria2 config:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('aria2.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('aria2.rpc_address')}
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
            {getRpcUrl()}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleTestConnection}
              disabled={isTesting}
              sx={{ textDecoration: 'none' }}
            >
              {isTesting ? (
                <>
                  <CircularProgress size={14} sx={{ mr: 1 }} />
                  {t('aria2.testing_connection')}
                </>
              ) : (
                t('aria2.test_connection')
              )}
            </Link>
          </Box>

          {testResult && (
            <Alert
              severity={testResult.status === 'success' ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {testResult.status === 'success'
                ? t('aria2.connection_success', { version: testResult.version || 'Unknown' })
                : (testResult.message || t('aria2.connection_failed'))
              }
            </Alert>
          )}
        </Box>

        <TextField
          autoFocus
          margin="dense"
          label={t('aria2.host_label')}
          type="text"
          fullWidth
          value={host}
          onChange={(e) => setHost(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label={t('aria2.port_label')}
          type="number"
          fullWidth
          value={port}
          onChange={(e) => setPort(parseInt(e.target.value, 10) || 6800)}
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label={t('aria2.rpc_path_label')}
          type="text"
          fullWidth
          value={rpcPath}
          onChange={(e) => setRpcPath(e.target.value)}
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={useSsl}
              onChange={(e) => setUseSsl(e.target.checked)}
            />
          }
          label={t('aria2.ssl_label')}
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label={t('aria2.token_label')}
          type="password"
          fullWidth
          value={token}
          onChange={(e) => setToken(e.target.value)}
          helperText={t('aria2.token_helper')}
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label={t('aria2.download_path_label')}
          type="text"
          fullWidth
          value={downloadPath}
          onChange={(e) => setDownloadPath(e.target.value)}
          helperText={t('aria2.download_path_helper')}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('button.cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('button.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Aria2Settings;
