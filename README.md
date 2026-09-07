# STEC AgentOps Workshop Web

这是 STEC AgentOps 培训课的配套源码项目：一个完整的 localhost Web 应用，通过官方 Agent SDK 连接平台托管的 Agent。课堂上，你将用它直观地看到 Session、流式消息、工具调用和 Workspace 文件的完整应用链路。

本仓库不是脚手架，也不是黑盒 npm 应用——你下载后得到的就是课堂讲解和实际运行的全部源码。建议先按下面的「快速开始」把应用跑起来，再沿第 5 节的学习路线逐步读懂代码。

开始前，请向讲师拿到以下三样东西（课堂统一提供，每人相同）：

- 培训环境的平台地址（`AGENTOPS_BASE_URL`，`.env.example` 中已预填，通常不用改）
- 培训 API Key（`AGENTOPS_API_KEY`）
- 培训 Agent ID（`AGENTOPS_AGENT_ID`）

此外，你还需要为自己填写一个全班唯一的 `AGENTOPS_END_USER_ID`，用来隔离你自己的 Session、消息和 Workspace 文件，规则见第 2 节。

## 快速开始

已安装 Node.js 22.12 及以上（建议 Node 24 LTS）的同学直接执行；还没有的话，请先按第 1 节安装。

```bash
npm install
cp .env.example .env.local
```

编辑 `.env.local`，填入讲师提供的三项信息和你自己的 `AGENTOPS_END_USER_ID`（见第 2 节），然后：

```bash
npm run preflight   # 自动检查环境与配置
npm run dev         # 启动应用
```

浏览器打开 [http://localhost:3000](http://localhost:3000)，向 Agent 提一个问题，观察流式回答和工具调用。

## 1. 环境准备

- Node.js 24 LTS（22.12 及以上，npm 随 Node.js 自带，无需单独安装）。
- 能访问培训用 AgentOps 地址。
- 讲师提供的平台地址、培训 API Key 和 Agent ID。

### 安装 Node.js

Windows（PowerShell）：

```powershell
winget install OpenJS.NodeJS.LTS
```

macOS（推荐）：从 [Node.js 官方下载页](https://nodejs.org/en/download) 下载 Node.js 24 LTS 的 .pkg 安装包，双击按默认选项安装。

macOS（命令行方式，需已安装 Homebrew）：

```bash
brew install node@24
echo 'export PATH="$(brew --prefix node@24)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

注意不要用 `brew install node`，那会安装最新版而不是 LTS 版本。

使用 fnm 等 Node 版本管理器的同学无需手动切换：项目目录中的 `.node-version` 会被自动读取并切换到 Node 24。

安装完成后重新打开终端并检查版本：

```bash
node --version
npm --version
```

### 国内镜像（中国大陆建议配置）

如果下载 Node.js 安装包很慢，可到 [npmmirror 二进制镜像](https://npmmirror.com/mirrors/node/) 选择 v24 系列最新目录中的安装包（Windows 为 .msi，macOS 为 .pkg）。fnm 用户可配置 `FNM_NODE_DIST_MIRROR=https://npmmirror.com/mirrors/node` 加速。

安装好 Node.js 后、安装项目依赖前，设置 npm 包镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

## 2. 安装与运行

```bash
npm install
cp .env.example .env.local
```

Windows cmd 用户使用 `copy .env.example .env.local`。

编辑 `.env.local`：

```ini
# AgentOps API 地址必须包含 /api/v1 前缀（.env.example 已带，通常不用改）
AGENTOPS_BASE_URL=https://aip-szt.stec.net/agentops/api/v1

# 课堂统一提供；只会由 localhost Node 服务端读取
AGENTOPS_API_KEY=讲师提供的培训Key
AGENTOPS_AGENT_ID=讲师提供的培训AgentID

# 每位学员唯一，统一采用[名字全拼]-[手机号后四位]，如：zhangsan-1234
AGENTOPS_END_USER_ID=zhangsan-1234
```

逐项说明：

- `AGENTOPS_BASE_URL`：平台 API 地址，必须包含 `/api/v1` 前缀。`.env.example` 中已预填，通常不需要修改。
- `AGENTOPS_API_KEY` / `AGENTOPS_AGENT_ID`：课堂统一提供，只会被 localhost Node 服务端读取，不会出现在浏览器里。
- `AGENTOPS_END_USER_ID`：你在全班学员中的唯一标识，统一采用「名字全拼-手机号后四位」，例如 `zhangsan-1234`。它会随每次 SDK 请求发送，平台用它来隔离每位学员的 Session、消息和 Workspace。API Key 和 Agent ID 可以共享，这个值绝不能和别人重复。

填写完成后检查环境：

```bash
npm run preflight
```

它会依次检查：Node 版本是否满足要求、配置项是否齐全、平台是否可连通、平台上的 Agent 配置是否与源码定义一致、工具与模型是否已注册。全部通过时会看到一系列 `✓` 开头的输出；如果报「Agent 配置不一致」，把错误信息发给讲师即可，见第 8 节。

启动应用：

```bash
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

## 3. 无平台环境的演示模式

如果只想先看看界面和源码调用链，可以在 `.env.local` 中配置：

```ini
WORKSHOP_MOCK_MODE=true
```

Mock 模式会在本地模拟 Session、`Mock_STEC_query_financial_indicators` 工具调用、流式回答、文件上传和下载，不会访问 AgentOps，也不需要真实 API Key。它用于提前熟悉页面和事件消费代码，不等同于真实 MCP 服务。

## 4. 项目结构

```text
stec-agentops-workshop-web/
├── server/
│   ├── config.ts          # 读取并校验 .env.local
│   ├── workshop-agent.ts  # Agent、工具、Skills、MCP 与运行时权限定义
│   ├── service.ts         # Agent SDK 适配与本地 Mock 服务
│   └── index.ts           # localhost API、流式代理、Workspace 路由
├── shared/
│   └── contracts.ts       # 浏览器与服务端共享的数据契约
├── src/
│   ├── components/        # 会话、聊天、工具和 Workspace 界面
│   ├── features/chat/     # Agent 事件到 UI 状态的 reducer
│   ├── lib/api.ts         # localhost API 与 NDJSON 流消费
│   ├── App.tsx            # 页面编排与核心交互
│   └── styles.css         # 设计系统和响应式布局
├── scripts/
│   ├── provision-agent.ts # 讲师初始化或更新平台 Agent（见附录）
│   └── preflight.ts       # 运行前的环境与 Agent 检查
└── vendor/                # 随源码分发的固定版本 Agent SDK
```

## 5. 学习路线：从 Agent 定义到一条消息

建议按下面的顺序阅读源码。先从「Agent 是如何定义的」看起，打开 `server/workshop-agent.ts`：

```ts
export const WORKSHOP_AGENT_DEFINITION: AgentCreateParams = {
  name: WORKSHOP_AGENT_NAME,        // "STEC AgentOps Workshop Agent"
  model: WORKSHOP_AGENT_MODEL,      // "qwen3.8-max"
  systemPrompt: WORKSHOP_SYSTEM_PROMPT,
  tools: [...WORKSHOP_BUILTIN_TOOLS],
  skills: [...WORKSHOP_SKILLS],
  mcpServers: [WORKSHOP_MCP_SERVER],
};
```

这份定义由讲师同步到平台（`scripts/provision-agent.ts` 使用 `client.agents.list()`、`create()` 和 `update()` 完成），操作细节见文末附录。应用运行时不再修改 Agent，而是使用 `.env.local` 中的 Agent ID 创建 Session。

一条消息的完整调用链如下：

```text
ChatComposer 提交消息
        ↓
App.tsx 调用 streamMessage()
        ↓
POST /api/sessions/:id/messages/stream
        ↓
server/service.ts 调用 client.messages.stream()
        ↓
Agent SDK 先建立 subscribe，再向 AgentOps 发送消息
        ↓
Session / part / tool / subagent.progress / agent.done 事件
        ↓
本地服务端转成 NDJSON
        ↓
chatReducer 按 partId / subagentRunId 聚合正文、思考、工具和子代理状态
        ↓
ConversationView 实时渲染
```

沿这条链路依次查看以下文件：

1. `server/workshop-agent.ts`：定义 Agent 能做什么。
2. `scripts/provision-agent.ts`：把 Agent 定义发布到平台（讲师操作，见附录）。
3. `src/components/ChatComposer.tsx`：从页面提交问题。
4. `src/App.tsx` 与 `src/lib/api.ts`：调用 localhost 流式接口。
5. `server/index.ts` 与 `server/service.ts`：通过 Agent SDK 创建 Session、发送消息并转发事件。
6. `src/features/chat/chat-state.ts`：将增量事件聚合成页面状态。
7. `src/components/ConversationView.tsx`：渲染正文、思考过程和工具调用。

## 6. 深入理解

### 6.1 为什么需要 localhost 服务端

浏览器不能直接持有培训 API Key。应用将 Agent SDK 放在本地 Node 服务端运行：

```text
Browser → localhost API → Agent SDK → AgentOps
                           ↑
                    API Key 只在这里
```

`.env.local` 已被 `.gitignore` 排除。不要把真实 Key 写进 `.env.example`、源码、截图或提交记录。

### 6.2 Runtime Context、MCP 与 Skills

`server/workshop-agent.ts` 中的 `WORKSHOP_RUNTIME_CONTEXT` 会随 Session 和每条消息传给 AgentOps：

```ts
{
  tool_permission: {
    allow: [/* 共 12 项：6 个内置工具 + 6 个 Mock_STEC MCP 工具 */]
  }
}
```

这是调用方对本次运行的工具授权。本 Workshop 开放 Agent 已配置的全部工具；实际业务应用应根据场景收窄白名单。

MCP 连接属于 Agent 定义：`server/workshop-agent.ts` 中注册的 MCP 服务器名为 `mock-stec-business-data`，采用 Streamable HTTP 连接，服务端点路径为 `Mock_STEC`。AgentOps 运行时连接该服务，将其六个 `Mock_STEC_` 前缀的工具注册进 Agent 的 ToolPack。Skills 也属于 Agent 定义；平台只在任务需要时渐进式加载 Skill 内容，应用无需直接调用内部的 `load_skill` 工具。

### 6.3 Workspace

右侧 Workspace 面板对应当前 Session：

- 上传：浏览器把文件交给 localhost 服务端，服务端通过 SDK 上传至 Session Workspace。
- 列表：读取当前 Session 根目录的文件与文件夹；文件夹只展示，不提供下载操作。
- 下载：localhost 服务端将 SDK 返回的文件流直接转发给浏览器。

Mock 模式同样支持上传、列表和下载，便于无平台环境演示。

### 6.4 Agent SDK 的分发方式

当前仓库已将平台的 Agent SDK 包含在项目目录下，不依赖额外的网络下载即可安装：

```json
"@aip/agent-sdk": "file:./vendor/aip-agent-sdk-1.2.0.tgz"
```

实际业务应用中可采用 HTTPS 下载地址，替换依赖值并重新执行 `npm install` 生成 lockfile：

```json
"@aip/agent-sdk": "https://aip-szt.stec.net/agentops/sdk/aip-agent-sdk-js-1.2.0.tgz"
```

## 7. 开发验证

课堂体验时用 `npm run dev`：它同时启动带热更新的 vite 开发服务器（3000 端口）和 Node 服务（8787 端口），页面请求由前者代理给后者。当你动手修改了源码，用本节命令验证改动没有破坏现有功能：

```bash
npm run typecheck   # 类型检查全部 TypeScript，不启动应用
npm run test        # 运行单元测试
npm run build       # 编译前端（dist/）与服务端（server-dist/）产物
```

构建完成后，可以绕开 vite 开发服务器，直接用产物运行应用：

```bash
npm run start
```

此时由单个 Node 进程同时提供静态页面和 `/api` 接口，没有热更新，默认地址为 `http://localhost:8787`；如需统一为 3000，可在 `.env.local` 设置 `WORKSHOP_SERVER_PORT=3000`。

## 8. 常见问题

### `npm install` 提示 Node 版本不符（EBADENGINE）或 `npm run preflight` 被拦截

项目要求 Node.js 22.12 及以上，建议安装 Node 24 LTS。分情况处理：

- 装错或装旧了版本：从 [Node.js 官方下载页](https://nodejs.org/en/download) 下载安装 Node.js 24 LTS（会直接覆盖旧版本），重新打开终端确认 `node --version` 输出 v24。
- 使用 fnm 等版本管理器：在项目目录运行 `fnm install` 即可（会自动读取 `.node-version`）。
- 已经装了 24 但 `node --version` 仍显示旧版本：机器上有多个 Node 安装，PATH 先找到了旧的。运行 `where.exe node`（Windows）或 `which -a node`（macOS）列出全部安装，删除旧版本。

### `npm run preflight` 提示环境变量缺失

确认已将 `.env.example` 复制为 `.env.local`，并填写四个必填项。

### 页面提示 401 或 403

检查 API Key、Agent ID、平台地址和自己的 `AGENTOPS_END_USER_ID`。`npm run preflight` 还会检查平台 Agent 是否与源码定义一致，以及模型和工具是否已注册。

### `npm run preflight` 提示 Agent 配置不一致

请把错误中的字段名发给讲师，由讲师按附录的步骤查看差异并决定是否同步；学员不要自行更新共享 Agent。

### 多位学员看到了同一批 Session

检查 `AGENTOPS_END_USER_ID` 是否重复。API Key 和 Agent ID 可以共享，`end_user_id` 必须唯一。

### GitHub 无法访问

使用讲师提供的同版本压缩包。

## 附录：讲师操作——初始化与更新培训 Agent

> 本节内容仅需讲师执行，学员无需操作，可直接跳过。

培训 Agent 的完整定义位于 `server/workshop-agent.ts`，其中包括：

- Agent 名称：`STEC AgentOps Workshop Agent`
- 默认模型：`qwen3.8-max`
- STEC 经营数据分析 System Prompt
- 平台内置工具和 `pdf`、`docx`、`pptx`、`xlsx` Skills
- 名为 `mock-stec-business-data` 的 Streamable HTTP MCP（服务端点路径为 `Mock_STEC`）
- 本次 Session 允许使用的全部工具（`WORKSHOP_RUNTIME_CONTEXT`）

### 初始化或更新

讲师先在 `.env.local` 中填写平台地址和具备 Agent 管理权限的 API Key，然后运行：

```bash
npm run agent:provision
```

脚本会按名称查找 Agent：不存在时创建；配置一致时直接复用；配置不一致时只展示差异，不会自动覆盖。确认要把平台 Agent 更新为当前源码定义时运行：

```bash
npm run agent:provision -- --update
```

成功后脚本会输出：

```ini
AGENTOPS_AGENT_ID=agent_xxx
```

### 分发给学员

讲师将培训环境地址、课堂 API Key 和上面的 Agent ID 发给学员即可，学员不需要执行 `agent:provision`。

### 学员反馈「Agent 配置不一致」时

学员只需把错误中的字段名发给讲师。讲师运行 `npm run agent:provision` 查看差异，确认后使用 `npm run agent:provision -- --update` 同步平台 Agent。

## License

本项目采用 [MIT License](LICENSE)。
