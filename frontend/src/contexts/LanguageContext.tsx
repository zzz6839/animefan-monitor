import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
type TranslationKey = string;
type TranslationDict = Record<TranslationKey, string>;

const translations: Record<Language, TranslationDict> = {
  zh: {
    // Header
    'app.title': '自动下载 (作品监控列表)',

    // Buttons
    'button.run_rules': '运行规则',
    'button.create_rule': '新建自动下载规则',
    'button.edit_rule': '编辑规则',
    'button.delete_rules': '删除规则',
    'button.downloader_settings': '下载器设置',
    'button.save': '保存',
    'button.cancel': '取消',
    'button.save_rule': '保存规则',


    // Table headers
    'table.select_all': '全选/取消全选',
    'table.enabled': '启用',
    'table.name': '名称',
    'table.subtitle_group': '字幕组',
    'table.rss_url': 'RSS地址',
    'table.max_tasks': '最多任务数',
    'table.creation_time': '创建时间',
    'table.last_update': '最近更新',

    // Preview
    'preview.label': '预览选中的规则',
    'preview.title': '预览',
    'preview.filtered': '已过滤',
    'preview.count': '显示 {count} 个符合条件的项目',
    'preview.no_items': '无符合条件的项目',
    'preview.no_rule': '该规则当前没有符合条件的项目',
    'preview.select_rule': '请选择一个规则查看预览',

    // Preview table headers
    'preview.table.title': '标题',
    'preview.table.task_status': '任务状态',
    'preview.table.type': '类型',
    'preview.table.subtitle_group': '字幕组',
    'preview.table.size': '大小',
    'preview.table.publish_time': '发布时间',

    // Status
    'status.exists': '已存在',
    'status.new_task': '新任务',
    'status.video': '视频',
    'status.unknown_group': '未知字幕组',
    'status.all_groups': '全部',
    'status.unknown': '未知',
    'status.unknown_time': '未知时间',

    // Messages
    'message.rules_updated': '规则状态已更新',
    'message.rules_run_success': '规则运行成功',
    'message.rules_deleted': '规则删除成功',
    'message.fetch_rules_error': '获取规则失败',
    'message.update_rule_error': '更新规则状态失败',
    'message.run_rules_error': '运行规则失败',
    'message.delete_rules_error': '删除规则失败',
    'message.preview_error': '获取预览失败',
    'message.select_rules_to_run': '请选择要运行的规则',
    'message.select_rule_to_edit': '请选择一个规则进行编辑',
    'message.select_rules_to_delete': '请选择要删除的规则',
    'message.confirm_delete': '确定要删除 {count} 个规则吗？',

    // Edit Rule Dialog
    'edit_rule.title_create': '新建自动下载规则',
    'edit_rule.title_edit': '编辑自动下载规则',
    'edit_rule.rss_url': 'RSS地址',
    'edit_rule.rss_url_placeholder': '输入RSS订阅地址',
    'edit_rule.rule_name': '为此规则起个名字',
    'edit_rule.rule_name_placeholder': '例如：更衣人偶',
    'edit_rule.more_options': '更多选项',
    'edit_rule.enable_immediately': '立刻启用此规则',
    'edit_rule.auto_create_tasks': '发现新资源后自动创建下载任务',
    'edit_rule.max_tasks': '每次更新时最多创建',
    'edit_rule.max_tasks_unit': '个下载任务',
    'edit_rule.monitor_interval': '监控间隔',
    'edit_rule.monitor_interval_unit': '分钟',
    'edit_rule.download_after': '只下载指定时间之后的新资源',
    'edit_rule.download_latest': '存在多个同名资源时只下载最新版本的资源',
    'edit_rule.max_size': '只下载体积小于',
    'edit_rule.max_size_unit': 'MB的资源',
    'edit_rule.preview_title': '结果预览',
    'edit_rule.loading': '加载中...',
    'edit_rule.no_preview': '无法获取预览数据，请检查RSS地址是否正确',
    'edit_rule.enter_rss_url': '请输入RSS地址以查看预览',
    'edit_rule.filter_summary': '共 {total} 个项目，应用过滤器后显示 {filtered} 个',
    'edit_rule.filter_limit': ' (限制为前 {limit} 个)',

    // Aria2 Settings
    'aria2.title': '配置 Aria2',
    'aria2.rpc_address': 'Aria2服务器的 RPC 地址/路径:',
    'aria2.test_connection': '测试连接 Aria2 服务器',
    'aria2.testing_connection': '测试连接中...',
    'aria2.connection_success': '连接成功！Aria2 版本: {version}',
    'aria2.connection_failed': '连接测试失败，请检查配置',
    'aria2.host_label': '服务器名称或IP地址',
    'aria2.port_label': '端口',
    'aria2.rpc_path_label': 'RPC 路径',
    'aria2.ssl_label': '启用 SSL/TLS 加密',
    'aria2.token_label': '[可选] 密码令牌',
    'aria2.token_helper': '如果Aria2配置了rpc-secret，请在此输入',
    'aria2.download_path_label': '默认下载位置',
    'aria2.download_path_helper': 'Aria2服务器上的下载目录路径',

    // Timezone Settings
    'timezone.title': '时区设置',
    'timezone.description': '设置应用程序显示时间的时区。这将影响所有日期和时间的显示。',
    'timezone.current_time': '当前时间',
    'timezone.select_timezone': '选择时区',
    'timezone.preview': '预览',
    'timezone.sample_date': '示例日期',
  },
  en: {
    // Header
    'app.title': 'Auto Download (Anime Monitor List)',

    // Buttons
    'button.run_rules': 'Run Rules',
    'button.create_rule': 'Create New Rule',
    'button.edit_rule': 'Edit Rule',
    'button.delete_rules': 'Delete Rules',
    'button.downloader_settings': 'Downloader Settings',
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.save_rule': 'Save Rule',


    // Table headers
    'table.select_all': 'Select All/Deselect All',
    'table.enabled': 'Enabled',
    'table.name': 'Name',
    'table.subtitle_group': 'Subtitle Group',
    'table.rss_url': 'RSS URL',
    'table.max_tasks': 'Max Tasks',
    'table.creation_time': 'Created',
    'table.last_update': 'Last Update',

    // Preview
    'preview.label': 'Preview Selected Rule',
    'preview.title': 'Preview',
    'preview.filtered': 'Filtered',
    'preview.count': 'Showing {count} matching items',
    'preview.no_items': 'No matching items',
    'preview.no_rule': 'This rule currently has no matching items',
    'preview.select_rule': 'Please select a rule to preview',

    // Preview table headers
    'preview.table.title': 'Title',
    'preview.table.task_status': 'Task Status',
    'preview.table.type': 'Type',
    'preview.table.subtitle_group': 'Subtitle Group',
    'preview.table.size': 'Size',
    'preview.table.publish_time': 'Published',

    // Status
    'status.exists': 'Exists',
    'status.new_task': 'New Task',
    'status.video': 'Video',
    'status.unknown_group': 'Unknown Group',
    'status.all_groups': 'All',
    'status.unknown': 'Unknown',
    'status.unknown_time': 'Unknown Time',

    // Messages
    'message.rules_updated': 'Rule status updated',
    'message.rules_run_success': 'Rules executed successfully',
    'message.rules_deleted': 'Rules deleted successfully',
    'message.fetch_rules_error': 'Failed to fetch rules',
    'message.update_rule_error': 'Failed to update rule status',
    'message.run_rules_error': 'Failed to run rules',
    'message.delete_rules_error': 'Failed to delete rules',
    'message.preview_error': 'Failed to fetch preview',
    'message.select_rules_to_run': 'Please select rules to run',
    'message.select_rule_to_edit': 'Please select one rule to edit',
    'message.select_rules_to_delete': 'Please select rules to delete',
    'message.confirm_delete': 'Are you sure you want to delete {count} rule(s)?',

    // Edit Rule Dialog
    'edit_rule.title_create': 'Create New Auto Download Rule',
    'edit_rule.title_edit': 'Edit Auto Download Rule',
    'edit_rule.rss_url': 'RSS URL',
    'edit_rule.rss_url_placeholder': 'Enter RSS feed URL',
    'edit_rule.rule_name': 'Give this rule a name',
    'edit_rule.rule_name_placeholder': 'e.g., My Dress-Up Darling',
    'edit_rule.more_options': 'More Options',
    'edit_rule.enable_immediately': 'Enable this rule immediately',
    'edit_rule.auto_create_tasks': 'Automatically create download tasks when new resources are found',
    'edit_rule.max_tasks': 'Create at most',
    'edit_rule.max_tasks_unit': 'download tasks per update',
    'edit_rule.monitor_interval': 'Monitor interval',
    'edit_rule.monitor_interval_unit': 'minutes',
    'edit_rule.download_after': 'Only download new resources after specified time',
    'edit_rule.download_latest': 'Only download the latest version when multiple resources with the same name exist',
    'edit_rule.max_size': 'Only download resources smaller than',
    'edit_rule.max_size_unit': 'MB',
    'edit_rule.preview_title': 'Preview Results',
    'edit_rule.loading': 'Loading...',
    'edit_rule.no_preview': 'Unable to get preview data, please check if the RSS URL is correct',
    'edit_rule.enter_rss_url': 'Please enter RSS URL to view preview',
    'edit_rule.filter_summary': 'Total {total} items, showing {filtered} after filtering',
    'edit_rule.filter_limit': ' (limited to first {limit})',

    // Aria2 Settings
    'aria2.title': 'Configure Aria2',
    'aria2.rpc_address': 'Aria2 server RPC address/path:',
    'aria2.test_connection': 'Test Aria2 Server Connection',
    'aria2.testing_connection': 'Testing connection...',
    'aria2.connection_success': 'Connection successful! Aria2 version: {version}',
    'aria2.connection_failed': 'Connection test failed, please check configuration',
    'aria2.host_label': 'Server name or IP address',
    'aria2.port_label': 'Port',
    'aria2.rpc_path_label': 'RPC Path',
    'aria2.ssl_label': 'Enable SSL/TLS encryption',
    'aria2.token_label': '[Optional] Password Token',
    'aria2.token_helper': 'Enter here if Aria2 is configured with rpc-secret',
    'aria2.download_path_label': 'Default download location',
    'aria2.download_path_helper': 'Download directory path on Aria2 server',

    // Timezone Settings
    'timezone.title': 'Timezone Settings',
    'timezone.description': 'Set the timezone for displaying dates and times in the application. This affects all date and time displays.',
    'timezone.current_time': 'Current time',
    'timezone.select_timezone': 'Select timezone',
    'timezone.preview': 'Preview',
    'timezone.sample_date': 'Sample date',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = (translations[language] as Record<string, string>)[key] || key;

    // Replace parameters in the text
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};