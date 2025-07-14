<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Checkbox, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { PlusOutline, EditOutline, TrashOutline, RefreshOutline, CogOutline, PlayOutline } from 'flowbite-svelte-icons';
  import type { DownloadRule, RSSFeedItem } from '$lib/types';
  import apiClient from '$lib/api';
  import toast from 'svelte-french-toast';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';

  dayjs.extend(relativeTime);

  let rules: DownloadRule[] = [];
  let selectedRule: DownloadRule | null = null;
  let previewItems: RSSFeedItem[] = [];
  let showPreview = false;

  async function fetchRules() {
    try {
      const response = await apiClient.get('/api/rules');
      rules = response.data;
    } catch (error) {
      toast.error('Failed to fetch rules');
    }
  }

  async function fetchPreviewItems() {
    if (!selectedRule) return;
    // This is a placeholder, as the backend doesn't have a preview endpoint yet.
    // In a real implementation, you would fetch this from the backend.
    previewItems = []; 
  }

  function handleRuleSelection(rule: DownloadRule) {
    selectedRule = rule;
    if (showPreview) {
      fetchPreviewItems();
    }
  }

  onMount(fetchRules);
</script>

<div class="container mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">自动下载</h1>

  <div class="flex items-center space-x-2 mb-4">
    <Button><PlayOutline class="w-5 h-5 mr-2" />运行规则</Button>
    <Button href="/rules/new"><PlusOutline class="w-5 h-5 mr-2" />新建自动下载规则</Button>
    <Button color="light" on:click={() => selectedRule && (window.location.href = `/rules/${selectedRule.id}`)} disabled={!selectedRule}><EditOutline class="w-5 h-5 mr-2" />编辑规则</Button>
    <Button color="red" disabled={!selectedRule}><TrashOutline class="w-5 h-5 mr-2" />删除规则</Button>
    <Button href="/settings"><CogOutline class="w-5 h-5 mr-2" />下载器设置</Button>
    <Button color="light" on:click={fetchRules}><RefreshOutline class="w-5 h-5" /></Button>
  </div>

  <Table>
    <TableHead>
      <TableHeadCell>启用</TableHeadCell>
      <TableHeadCell>名称</TableHeadCell>
      <TableHeadCell>字幕组</TableHeadCell>
      <TableHeadCell>RSS地址</TableHeadCell>
      <TableHeadCell>最多创建任务数</TableHeadCell>
      <TableHeadCell>创建时间</TableHeadCell>
      <TableHeadCell>最近更新时间</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each rules as rule}
        <TableBodyRow on:click={() => handleRuleSelection(rule)} class={selectedRule?.id === rule.id ? 'bg-blue-100 dark:bg-gray-700' : ''}>
          <TableBodyCell><Checkbox bind:checked={rule.enabled} /></TableBodyCell>
          <TableBodyCell>{rule.name}</TableBodyCell>
          <TableBodyCell>{rule.subtitle_group}</TableBodyCell>
          <TableBodyCell>{rule.rss_url}</TableBodyCell>
          <TableBodyCell>{rule.max_tasks}</TableBodyCell>
          <TableBodyCell>{dayjs(rule.created_at).fromNow()}</TableBodyCell>
          <TableBodyCell>{rule.last_updated ? dayjs(rule.last_updated).fromNow() : '未知'}</TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>

  <div class="mt-4">
    <Checkbox bind:checked={showPreview}>预览选中的规则</Checkbox>
  </div>

  {#if showPreview && selectedRule}
    <div class="mt-4">
      <h2 class="text-xl font-bold mb-2">预览: {selectedRule.name}</h2>
      <Table>
        <TableHead>
          <TableHeadCell>标题</TableHeadCell>
          <TableHeadCell>任务已存在</TableHeadCell>
          <TableHeadCell>类型</TableHeadCell>
          <TableHeadCell>字幕组</TableHeadCell>
          <TableHeadCell>大小</TableHeadCell>
          <TableHeadCell>发布日期</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each previewItems as item}
            <TableBodyRow>
              <TableBodyCell>{item.title}</TableBodyCell>
              <TableBodyCell>{item.task_exists ? '是' : '否'}</TableBodyCell>
              <TableBodyCell>{item.type}</TableBodyCell>
              <TableBodyCell>{item.subtitle_group}</TableBodyCell>
              <TableBodyCell>{item.size}</TableBodyCell>
              <TableBodyCell>{dayjs(item.release_date).fromNow()}</TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>
