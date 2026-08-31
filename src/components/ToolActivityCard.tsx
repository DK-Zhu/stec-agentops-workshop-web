import { CheckCircle2, ChevronDown, CircleAlert, LoaderCircle, Wrench } from "lucide-react";
import { useState } from "react";
import type { ToolActivity } from "../features/chat/chat-state";

const toolLabels: Record<string, string> = {
  Mock_STEC_query_market_indicators: "查询市场指标",
  Mock_STEC_query_financial_indicators: "查询财务指标",
  Mock_STEC_org_name_lookup: "解析公司名称",
  Mock_STEC_get_indicator_list: "获取指标目录",
  Mock_STEC_get_database_schema: "读取数据表结构",
  Mock_STEC_execute_sql_query: "执行只读 SQL 查询",
  read: "读取文件",
  web_search: "联网检索",
  bash: "代码执行",
  load_skill: "加载 Skill",
};

export function ToolActivityCard({ tool }: { tool: ToolActivity }) {
  const [expanded, setExpanded] = useState(false);
  const running = tool.status === "running";
  const failed = tool.status === "error";
  const Icon = running ? LoaderCircle : failed ? CircleAlert : CheckCircle2;

  return (
    <div className={`tool-card ${tool.status}`}>
      <button className="tool-summary" onClick={() => setExpanded((value) => !value)}>
        <span className="tool-symbol"><Wrench size={17} /></span>
        <span className="tool-copy">
          <strong>{running ? "正在调用" : failed ? "调用失败" : "调用完成"} · {toolLabels[tool.name] ?? tool.name}</strong>
          <span>工具：{tool.name}</span>
        </span>
        <Icon className={running ? "spin" : ""} size={18} />
        <ChevronDown className={expanded ? "rotate" : ""} size={17} />
      </button>
      {expanded ? (
        <div className="tool-detail">
          <div><span>输入</span><pre>{JSON.stringify(tool.input, null, 2)}</pre></div>
          {tool.output !== undefined ? <div><span>输出</span><pre>{typeof tool.output === "string" ? tool.output : JSON.stringify(tool.output, null, 2)}</pre></div> : null}
        </div>
      ) : null}
    </div>
  );
}
