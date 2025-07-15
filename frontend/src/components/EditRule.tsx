import { useState, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Checkbox, FormControlLabel } from '@mui/material';
import axios from 'axios';

interface EditRuleProps {
  open: boolean;
  onClose: () => void;
}

function EditRule({ open, onClose }: EditRuleProps) {
  const [name, setName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [maxTasks, setMaxTasks] = useState(15);

  const handleSave = () => {
    axios.post('/api/rules/', {
      name: name,
      rss_url: rssUrl,
      enabled: enabled,
      max_tasks: maxTasks,
    })
    .then(() => {
      onClose();
    })
    .catch(error => {
      console.error('Error saving rule:', error);
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogTitle>编辑自动下载规则</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="规则名称"
          type="text"
          fullWidth
          variant="standard"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          margin="dense"
          id="rss_url"
          label="RSS地址"
          type="text"
          fullWidth
          variant="standard"
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
        />
        <FormControlLabel control={<Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />} label="立刻启用此规则" />
        <TextField
          margin="dense"
          id="max_tasks"
          label="每次更新时最多创建 X 个下载任务"
          type="number"
          fullWidth
          variant="standard"
          value={maxTasks}
          onChange={(e) => setMaxTasks(parseInt(e.target.value, 10))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存规则</Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditRule;
