<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Checkbox, Input, Label } from 'flowbite-svelte';
  import type { Aria2Config } from '$lib/types.ts';
  import apiClient from '$lib/api.ts';
  import toast from 'svelte-french-toast';

  let config: Aria2Config = {
    host: '',
    port: 6800,
    rpc_path: 'jsonrpc',
    use_ssl: false,
    secret_token: '',
    download_dir: '/downloads',
  };

  let connectionStatus = '';

  onMount(async () => {
    try {
      const response = await apiClient.get('/api/aria2/config');
      if (response.data) {
        config = response.data;
      }
    } catch (error) {
      toast.error('Failed to fetch Aria2 config');
    }
  });

  async function saveConfig() {
    try {
      await apiClient.post('/api/aria2/config', config);
      toast.success('Aria2 config saved successfully');
    } catch (error) {
      toast.error('Failed to save Aria2 config');
    }
  }

  async function testConnection() {
    try {
      const response = await apiClient.post('/api/aria2/test', config);
      if (response.data.success) {
        toast.success(response.data.message);
        connectionStatus = `Success: ${response.data.message}`;
      } else {
        toast.error(response.data.message);
        connectionStatus = `Error: ${response.data.message}`;
      }
    } catch (error) {
      toast.error('Failed to test connection');
      connectionStatus = 'Error: Failed to test connection';
    }
  }
</script>

<div class="container mx-auto p-6 max-w-lg">
  <h1 class="text-2xl font-bold mb-4">配置 Aria2</h1>

  <div class="mb-4">
    <p class="text-sm text-gray-600">Aria2服务器的 RPC 地址/路径: <span class="font-mono bg-gray-100 p-1 rounded">{config.use_ssl ? 'https' : 'http'}://{config.host}:{config.port}/{config.rpc_path}</span></p>
    {#if connectionStatus}
      <p class="text-sm mt-2" class:text-green-500={connectionStatus.startsWith('Success')} class:text-red-500={connectionStatus.startsWith('Error')}>{connectionStatus}</p>
    {/if}
  </div>

  <div class="space-y-4">
    <div>
      <Label for="host" class="mb-2">服务器名称或IP地址</Label>
      <Input id="host" bind:value={config.host} placeholder="e.g., 192.168.1.219" />
    </div>
    <div>
      <Label for="port" class="mb-2">端口</Label>
      <Input id="port" type="number" bind:value={config.port} />
    </div>
    <div>
      <Label for="rpc-path" class="mb-2">RPC 路径</Label>
      <Input id="rpc-path" bind:value={config.rpc_path} />
    </div>
    <div>
      <Checkbox bind:checked={config.use_ssl}>启用 SSL/TLS 加密</Checkbox>
    </div>
    <div>
      <Label for="secret-token" class="mb-2">[可选] 密码令牌</Label>
      <Input id="secret-token" type="password" bind:value={config.secret_token} />
    </div>
    <div>
      <Label for="download-dir" class="mb-2">默认下载位置</Label>
      <Input id="download-dir" bind:value={config.download_dir} />
    </div>
  </div>

  <div class="mt-6 flex justify-between">
    <Button on:click={testConnection}>测试连接 Aria2 服务器</Button>
    <div class="space-x-2">
      <Button on:click={saveConfig}>保存</Button>
      <Button color="light" href="/">取消</Button>
    </div>
  </div>
</div>
