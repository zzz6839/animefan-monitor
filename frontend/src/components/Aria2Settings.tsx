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
import axios from 'axios';

interface Aria2SettingsProps {
  open: boolean;
  onClose: () => void;
}

function Aria2Settings({ open, onClose }: Aria2SettingsProps) {
  const [host, setHost] = useState('192.168.1.219');
  const [port, setPort] = useState(6800);
  const [rpcPath, setRpcPath] = useState('jsonrpc');
  const [useSsl, setUseSsl] = useState(false);
  const [token, setToken] = useState('');
  const [downloadPath, setDownloadPath] = useState('/downloads');
  const [testResult, setTestResult] = useState<{ status: string; message?: string; version?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const API_BASE = 'http://localhost:58000';

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
        message: '连接测试失败，请检查配置'
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
      <DialogTitle>配置 Aria2</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Aria2服务器的 RPC 地址/路径:
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
                  测试连接中...
                </>
              ) : (
                '测试连接 Aria2 服务器'
              )}
            </Link>
          </Box>

          {testResult && (
            <Alert
              severity={testResult.status === 'success' ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {testResult.status === 'success'
                ? `连接成功！Aria2 版本: ${testResult.version}`
                : testResult.message
              }
            </Alert>
          )}
        </Box>

        <TextField
          autoFocus
          margin="dense"
          label="服务器名称或IP地址"
          type="text"
          fullWidth
          value={host}
          onChange={(e) => setHost(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label="端口"
          type="number"
          fullWidth
          value={port}
          onChange={(e) => setPort(parseInt(e.target.value, 10) || 6800)}
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label="RPC 路径"
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
          label="启用 SSL/TLS 加密"
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label="[可选] 密码令牌"
          type="password"
          fullWidth
          value={token}
          onChange={(e) => setToken(e.target.value)}
          helperText="如果Aria2配置了rpc-secret，请在此输入"
          sx={{ mb: 2 }}
        />

        <TextField
          margin="dense"
          label="默认下载位置"
          type="text"
          fullWidth
          value={downloadPath}
          onChange={(e) => setDownloadPath(e.target.value)}
          helperText="Aria2服务器上的下载目录路径"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Aria2Settings;
