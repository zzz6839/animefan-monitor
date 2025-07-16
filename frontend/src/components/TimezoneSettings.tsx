import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimezone, TIMEZONE_OPTIONS } from '../contexts/TimezoneContext';

interface TimezoneSettingsProps {
  open: boolean;
  onClose: () => void;
}

function TimezoneSettings({ open, onClose }: TimezoneSettingsProps) {
  const { t } = useLanguage();
  const { timezone, setTimezone, formatDateTime } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);

  const handleSave = () => {
    setTimezone(selectedTimezone);
    onClose();
  };

  const handleCancel = () => {
    setSelectedTimezone(timezone);
    onClose();
  };

  const getCurrentTime = (tz: string) => {
    try {
      return new Date().toLocaleString('zh-CN', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid timezone';
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon />
          {t('timezone.title')}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('timezone.description')}
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
            <Typography variant="body2">
              {t('timezone.current_time')}: <strong>{getCurrentTime(selectedTimezone)}</strong>
            </Typography>
          </Alert>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>{t('timezone.select_timezone')}</InputLabel>
          <Select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
            label={t('timezone.select_timezone')}
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>{option.label}</Typography>
                  <Chip 
                    size="small" 
                    label={getCurrentTime(option.value).split(' ')[1]} 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('timezone.preview')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('timezone.sample_date')}: {formatDateTime(new Date().toISOString())}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>{t('button.cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('button.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TimezoneSettings;