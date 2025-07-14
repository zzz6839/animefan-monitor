<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Button, Checkbox, Input, Textarea, Label } from 'flowbite-svelte';
  import { RefreshOutline } from 'flowbite-svelte-icons';
  import type { DownloadRule, RSSFeedItem } from '$lib/types';
  import apiClient from '$lib/api';
  import toast from 'svelte-french-toast';
  import dayjs from 'dayjs';

  let rule: DownloadRule = {
    name: '',
    rss_url: '',
    enabled: true,
    subtitle_group: '<全部>',
    max_tasks: 15,
    download_latest_only: false,
    auto_create_tasks: true,
  };
  let previewItems: RSSFeedItem[] = [];
  let isNew = false;

  onMount(async () => {
    const id = $page.params.id;
    if (id === 'new') {
      isNew = true;
    } else {
      try {
        const response = await apiClient.get(`/api/rules/${id}`);
        rule = response.data;
      } catch (error) {
        toast.error('Failed to fetch rule');
      }
    }
  });

  async function saveRule() {
    try {
      if (isNew) {
        await apiClient.post('/api/rules', rule);
        toast.success('Rule created successfully');
      } else {
        await apiClient.put(`/api/rules/${rule.id}`, rule);
        toast.success('Rule updated successfully');
      }
      window.location.href = '/';
    } catch (error) {
      toast.error('Failed to save rule');
    }
  }

  async function fetchPreview() {
    // Placeholder for preview logic
    previewItems = [];
  }
</script>

<div class="container mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">{isNew ? '新建自动下载规则' : '编辑规则'}</h1>

  <div class="grid grid-cols-2 gap-6">
    <!-- Left Pane: Settings -->
    <div>
      <div class="mb-4">
        <Label for="rss-url" class="mb-2">RSS地址</Label>
        <Textarea id="rss-url" bind:value={rule.rss_url} rows="4" placeholder="Enter RSS feed URL" />
        <Button size="sm" class="mt-2">导入 RSS 链接</Button>
      </div>

      <div class="mb-4">
        <Label for="rule-name" class="mb-2">为此规则起个名字</Label>
        <Input id="rule-name" bind:value={rule.name} placeholder="e.g., 更衣人偶" />
      </div>

      <div class="mb-4">
        <h3 class="text-lg font-semibold mb-2">更多选项</h3>
        <div class="space-y-2">
          <Checkbox bind:checked={rule.enabled}>立刻启用此规则</Checkbox>
          <Checkbox bind:checked={rule.auto_create_tasks}>发现新资源后自动创建下载任务</Checkbox>
          <div>
            <Label for="max-tasks" class="inline-block mr-2">每次更新时最多创建</Label>
            <Input id="max-tasks" type="number" bind:value={rule.max_tasks} class="inline-block w-24" />
            <span class="ml-2">个下载任务</span>
          </div>
          <div>
            <Label for="after-date" class="inline-block mr-2">只下载指定时间之后的的新资源</Label>
            <Input id="after-date" type="datetime-local" bind:value={rule.after_date} />
          </div>
          <Checkbox bind:checked={rule.download_latest_only}>存在多个同名资源时只下载最新版本的资源</Checkbox>
          <div>
            <Label for="min-size" class="inline-block mr-2">只下载体积小于</Label>
            <Input id="min-size" type="number" bind:value={rule.min_size_mb} class="inline-block w-24" />
            <span class="ml-2">MB的资源</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Pane: Preview -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-bold">结果预览</h2>
        <Button size="sm" on:click={fetchPreview}><RefreshOutline class="w-5 h-5" /></Button>
      </div>
      <div class="border rounded-lg p-4 h-96 overflow-y-auto">
        {#each previewItems as item}
          <div class="border-b py-2">
            <p class="font-semibold">{item.title}</p>
            <p class="text-sm text-gray-500">{item.subtitle_group} | {item.size} | {dayjs(item.release_date).fromNow()}</p>
          </div>
        {:else}
          <p class="text-gray-500">No items to preview.</p>
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-6 flex justify-end space-x-2">
    <Button on:click={saveRule}>保存规则</Button>
    <Button color="light" href="/">取消</Button>
  </div>
</div>
