import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, Button, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
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

function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [aria2SettingsOpen, setAria2SettingsOpen] = useState(false);

  useEffect(() => {
    axios.get('/api/rules/')
      .then(response => {
        setRules(response.data);
      })
      .catch(error => {
        console.error('Error fetching rules:', error);
      });
  }, []);

  const handleEditRuleOpen = () => {
    setEditRuleOpen(true);
  };

  const handleEditRuleClose = () => {
    setEditRuleOpen(false);
  };

  const handleAria2SettingsOpen = () => {
    setAria2SettingsOpen(true);
  };

  const handleAria2SettingsClose = () => {
    setAria2SettingsOpen(false);
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        自动下载
      </Typography>
      <div>
        <Button variant="contained" color="primary">运行规则</Button>
        <Button variant="contained" style={{ marginLeft: '10px' }} onClick={handleEditRuleOpen}>新建自动下载规则</Button>
        <Button variant="contained" style={{ marginLeft: '10px' }} onClick={handleEditRuleOpen}>编辑规则</Button>
        <Button variant="contained" style={{ marginLeft: '10px' }}>删除规则</Button>
        <Button variant="contained" style={{ marginLeft: '10px' }} onClick={handleAria2SettingsOpen}>下载器设置</Button>
      </div>
      <TableContainer component={Paper} style={{ marginTop: '20px' }}>
        <Table>
          <TableHead>
            <TableRow>
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
              <TableRow key={rule.id}>
                <TableCell><Checkbox checked={rule.enabled} /></TableCell>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{rule.subtitle_group}</TableCell>
                <TableCell>{rule.rss_url}</TableCell>
                <TableCell>{rule.max_tasks}</TableCell>
                <TableCell>{new Date(rule.creation_time).toLocaleString()}</TableCell>
                <TableCell>{rule.last_update_time ? new Date(rule.last_update_time).toLocaleString() : '未知'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <EditRule open={editRuleOpen} onClose={handleEditRuleClose} />
      <Aria2Settings open={aria2SettingsOpen} onClose={handleAria2SettingsClose} />
    </Container>
  );
}

export default App;
