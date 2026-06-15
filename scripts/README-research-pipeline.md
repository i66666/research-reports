# Research Report Pipeline

Run the full Knowledge Planet research sync:

```powershell
powershell -ExecutionPolicy Bypass -File D:\quartz\quartz-4.0.8\scripts\run-research-pipeline.ps1
```

Run for a specific date:

```powershell
powershell -ExecutionPolicy Bypass -File D:\quartz\quartz-4.0.8\scripts\run-research-pipeline.ps1 -Date 2026-06-15
```

Pipeline:

1. Fetch topic list from `group_id=28855458518111`.
2. Fetch each topic detail with `get_topic_info`.
3. Save raw JSON to `D:\codex\股票工作区\zsxq-research-raw\YYYY-MM-DD`.
4. Save low-information or failed items to `D:\codex\股票工作区\zsxq-research-short\YYYY-MM-DD`.
5. Save publishable Markdown to `D:\obsidian笔记\研报库\YYYY-MM-DD`.
6. Rebuild Quartz `content/` with dedupe and quality filtering.
7. Build and push GitHub Pages.
