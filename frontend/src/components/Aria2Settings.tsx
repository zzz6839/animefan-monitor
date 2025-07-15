import { useState, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Checkbox, FormControlLabel } from '@mui/material';
import axios from 'axios';

interface Aria2SettingsProps {
  open: boolean;
  onClose: () => void;
}

function Aria2Settings({ open, onClose }: Aria2SettingsProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState(6800);
  const [rpcPath, setRpcPath] = useState('jsonrpc');
  const [useSsl, setUseSsl] = useState(false);
  const [token, setToken] = useState('');
  const [downloadPath, setDownloadPath] = useState('/downloads');

  useEffect(() => {
    if (open) {
      axios.get('/api/aria2_config/')
        .then(response => {
          const config = response.data;
          setHost(config.host);
          setPort(config.port);
          setRpcPath(config.rpc_path);
          setUseSsl(config.use_ssl);
          setToken(config.token || '');
          setDownloadPath(config.download_path);
        })
        .catch(error => {
          console.error('Error fetching Aria2 config:', error);
        });
    }
  }, [open]);

  const handleSave = () => {
    axios.post('/api/aria2_config/', {
      host: host,
      port: port,
      rpc_path: rpcPath,
      use_ssl: useSsl,
      token: token,
      download_path: downloadPath,
    })
    .then(() => {
      onClose();
    })
    .catch(error => {
      console.error('Error saving Aria2 config:', error);
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>配置 Aria2</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="host"
          label="服务器名称或IP地址"
          type="text"
          fullWidth
          variant="standard"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
        <TextField
          margin="dense"
          id="port"
          label="端口"
          type="number"
          fullWidth
          variant="standard"
          value={port}
          onChange={(e) => setPort(parseInt(e.target.value, 10))}
        />
        <TextField
          margin="dense"
          id="rpc_path"
          label="RPC 路径"
          type="text"
          fullWidth
          variant="standard"
          value={rpcPath}
          onChange={(e) => setRpcPath(e.target.value)}
        />
        <FormControlLabel control={<Checkbox checked={useSsl} onChange={(e) => setUseSsl(e.target.checked)} />} label="启用 SSL/TLS 加密" />
        <TextField
          margin="dense"
          id="token"
          label="[可选] 密码令牌"
          type="text"
          fullWidth
          variant="standard"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <TextField
          margin="dense"
          id="download_path"
          label="默认下载位置"
          type="text"
          fullWidth
          variant="standard"
          value={downloadPath}
          onChange={(e) => setDownloadPath(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}

export default Aria2Settings;
