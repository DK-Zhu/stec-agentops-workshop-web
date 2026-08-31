import { Bot, CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import type { SubagentActivity } from "../features/chat/chat-state";

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
};

export function SubagentActivityCard({ subagent }: { subagent: SubagentActivity }) {
  const running = subagent.status === "running";
  const failed = subagent.status === "error";
  const Icon = running ? LoaderCircle : failed ? CircleAlert : CheckCircle2;
  const title = subagent.name ?? subagent.description;
  const statusText = running ? "执行中" : failed ? "异常结束" : "已完成";

  return (
    <div className={`subagent-card ${subagent.status}`}>
      <span className="subagent-symbol"><Bot size={17} /></span>
      <span className="subagent-copy">
        <strong>子代理{statusText} · {title}</strong>
        <span>{subagent.description}{subagent.background ? " · 后台运行" : ""}</span>
        {subagent.toolName ? (
          <span className="subagent-tool">
            当前工具：{toolLabels[subagent.toolName] ?? subagent.toolName}
          </span>
        ) : null}
        {subagent.inputPreview ? (
          <code title={subagent.inputPreview}>{subagent.inputPreview}</code>
        ) : null}
        {!running && subagent.outcome && subagent.outcome !== "completed" ? (
          <span className="subagent-outcome">状态：{subagent.outcome}</span>
        ) : null}
      </span>
      <Icon className={running ? "spin" : ""} size={18} />
    </div>
  );
}
