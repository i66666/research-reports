import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const execFileP = promisify(execFile)

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const zsxqCli =
  process.env.ZSXQ_CLI ||
  "C:\\Users\\Admin\\AppData\\Local\\nvm\\v22.22.3\\node_modules\\zsxq-cli\\node_modules\\@zsxq\\cli-win32-x64\\bin\\zsxq-cli.exe"

const groupId = process.env.ZSXQ_GROUP_ID || "28855458518111"
const obsidianRoot = process.env.RESEARCH_OBSIDIAN_ROOT || "D:\\obsidian笔记\\研报库"
const rawRoot = process.env.RESEARCH_RAW_ROOT || "D:\\codex\\股票工作区\\zsxq-research-raw"
const shortRoot = process.env.RESEARCH_SHORT_ROOT || "D:\\codex\\股票工作区\\zsxq-research-short"
const defaultLimit = Number(process.env.ZSXQ_LIMIT || 30)
const maxPages = Number(process.env.ZSXQ_MAX_PAGES || 20)
const minPublishChars = Number(process.env.RESEARCH_MIN_CHARS || 120)
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://127.0.0.1:7890"

const args = parseArgs(process.argv.slice(2))
const targetDate = args.date || localDate(new Date())
const dryRun = Boolean(args["dry-run"])

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith("--")) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith("--")) {
      out[key] = true
    } else {
      out[key] = next
      i += 1
    }
  }
  return out
}

function localDate(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

async function callTool(name, params = {}) {
  const env = {
    ...process.env,
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
  }
  let lastError
  const attempts = Number(process.env.ZSXQ_RETRIES || 5)
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { stdout } = await execFileP(
        zsxqCli,
        ["api", "call", name, "--params", JSON.stringify(params), "--format", "json"],
        { env, timeout: 120_000, maxBuffer: 80 * 1024 * 1024 },
      )
      return JSON.parse(stdout)
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(2500 * attempt)
    }
  }
  throw lastError
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function unwrap(result) {
  if (Array.isArray(result)) return result
  if (!result || typeof result !== "object") return result
  return (
    result.data ??
    result.result ??
    result.topic ??
    result.items ??
    result.topics ??
    result.list ??
    result.body ??
    result
  )
}

function findTopics(payload) {
  const seen = new Set()
  const topics = []

  function walk(value) {
    if (!value || typeof value !== "object") return
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }

    const id = topicId(value)
    if (id && !seen.has(id) && looksLikeTopic(value)) {
      seen.add(id)
      topics.push(value)
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") walk(child)
    }
  }

  walk(payload)
  return topics
}

function topicId(topic) {
  return String(topic.topic_id ?? topic.topicId ?? topic.id ?? topic.topic?.topic_id ?? "").trim()
}

function looksLikeTopic(value) {
  return Boolean(
    value.topic_id ||
      value.topicId ||
      value.talk ||
      value.question ||
      value.task ||
      value.solution ||
      value.article ||
      value.create_time ||
      value.createTime,
  )
}

function createTime(topic) {
  return (
    topic.create_time ??
    topic.createTime ??
    topic.created_at ??
    topic.createdAt ??
    topic.topic?.create_time ??
    ""
  )
}

function isTargetDate(topic, date) {
  const raw = String(createTime(topic))
  return raw.startsWith(date) || raw.slice(0, 10) === date
}

function nextEndTime(payload) {
  const candidates = []
  function walk(value) {
    if (!value || typeof value !== "object") return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    for (const key of ["next_end_time", "nextEndTime", "end_time", "endTime"]) {
      if (typeof value[key] === "string" && value[key]) candidates.push(value[key])
    }
    Object.values(value).forEach(walk)
  }
  walk(payload)
  return candidates[0] || ""
}

function hasMore(payload) {
  let found = false
  function walk(value) {
    if (!value || typeof value !== "object" || found) return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value.has_more === true || value.hasMore === true) found = true
    Object.values(value).forEach(walk)
  }
  walk(payload)
  return found
}

function plainText(value) {
  if (value == null) return ""
  if (typeof value === "string") return decodeHtmlish(value)
  if (typeof value !== "object") return String(value)

  const parts = []
  for (const key of [
    "text",
    "content",
    "title",
    "description",
    "article",
    "article_content",
    "question",
    "answer",
  ]) {
    if (typeof value[key] === "string") parts.push(value[key])
  }
  for (const key of ["topic", "talk", "task", "solution", "question", "article"]) {
    if (value[key] && typeof value[key] === "object") parts.push(plainText(value[key]))
  }
  return decodeHtmlish(parts.filter(Boolean).join("\n\n"))
}

function decodeHtmlish(text) {
  return text
    .replace(/<e\s+type="web"\s+href="([^"]+)"[^>]*>(.*?)<\/e>/g, (_m, href, label) => {
      const url = safeDecodeUri(href)
      return `[${label || url}](${url})`
    })
    .replace(/<e\s+type="web"\s+href="([^"]+)"[^>]*\/>/g, (_m, href) => {
      const url = safeDecodeUri(href)
      return `[原文链接](${url})`
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function safeDecodeUri(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function collectAttachments(value, out = []) {
  if (!value || typeof value !== "object") return out
  if (Array.isArray(value)) {
    value.forEach((item) => collectAttachments(item, out))
    return out
  }

  const url = value.url || value.href || value.download_url || value.file_url || value.image_url
  const name = value.name || value.title || value.file_name || value.filename || value.original_name
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    out.push({ name: String(name || url).trim(), url })
  } else if (value.file_id || value.image_id) {
    out.push({
      name: String(name || value.file_id || value.image_id).trim(),
      url: String(value.file_id || value.image_id),
    })
  }

  for (const child of Object.values(value)) collectAttachments(child, out)
  return out
}

function titleOf(topic, detail) {
  const text = plainText(detail || topic)
  const firstLine = text.split("\n").map((x) => x.trim()).find(Boolean) || plainText((detail || topic)?.title) || "未命名研报"
  return firstLine
    .replace(/^#+\s*/, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "未命名研报"
}

function effectiveLength(text) {
  return text
    .replace(/^>.*$/gm, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/暂无/g, "")
    .replace(/\s+/g, "").length
}

function safeFileName(title, id) {
  const stem = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70)
  return `${stem || "未命名研报"}__${id}.md`
}

function markdownFor(topic, detail) {
  const id = topicId(detail) || topicId(topic)
  const date = String(createTime(detail) || createTime(topic)).slice(0, 10) || targetDate
  const title = titleOf(topic, detail)
  const body = plainText(detail || topic)
  const attachments = collectAttachments(detail || topic)
  const attachmentLines = attachments.length
    ? [
        "",
        "## 附件/链接",
        ...attachments.map((item) =>
          /^https?:\/\//.test(item.url) ? `- [${item.name}](${item.url})` : `- ${item.name}（id: ${item.url}）`,
        ),
      ].join("\n")
    : ""

  return {
    title,
    text: `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\ntags: [调研纪要]\ntopic_id: "${id}"\n---\n\n> 来源：知识星球「调研纪要」\n> topic_id: ${id}\n\n## 原文\n${body || "（详情为空，已进入短文待补抓流程）"}${attachmentLines}\n`,
  }
}

function removeExistingTopicFiles(dirs, id) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (dirent.isFile() && dirent.name.includes(`__${id}.md`)) {
        fs.rmSync(path.join(dir, dirent.name), { force: true })
      }
    }
  }
}

async function fetchDateTopics(date) {
  const byId = new Map()
  let endTime = args["end-time"] || ""

  for (let page = 1; page <= maxPages; page += 1) {
    const params = { group_id: groupId, limit: defaultLimit, scope: "all" }
    if (endTime) params.end_time = endTime

    const result = await callTool("get_group_topics", params)
    const topics = findTopics(unwrap(result))
    for (const topic of topics) {
      const id = topicId(topic)
      if (id && isTargetDate(topic, date)) byId.set(id, topic)
    }

    const newestDate = topics.map((topic) => String(createTime(topic)).slice(0, 10)).filter(Boolean)
    const minDate = newestDate.sort()[0]
    if (minDate && minDate < date) break
    if (!hasMore(result)) break

    const next = nextEndTime(result)
    if (!next || next === endTime) break
    endTime = next
  }

  return [...byId.values()]
}

async function main() {
  if (!fs.existsSync(zsxqCli)) throw new Error(`zsxq-cli not found: ${zsxqCli}`)

  const topics = await fetchDateTopics(targetDate)
  const rawDir = path.join(rawRoot, targetDate)
  const mdDir = path.join(obsidianRoot, targetDate)
  const shortDir = path.join(shortRoot, targetDate)
  fs.mkdirSync(rawDir, { recursive: true })
  fs.mkdirSync(mdDir, { recursive: true })
  fs.mkdirSync(shortDir, { recursive: true })

  const stats = { list_topics: topics.length, details_ok: 0, published: 0, short: 0, failed: 0 }
  const failures = []

  for (const topic of topics) {
    const id = topicId(topic)
    try {
      const detailResult = await callTool("get_topic_info", { topic_id: id })
      const detail = unwrap(detailResult)
      const rawPath = path.join(rawDir, `${id}.json`)
      const { title, text } = markdownFor(topic, detail)
      const target = path.join(effectiveLength(text) >= minPublishChars ? mdDir : shortDir, safeFileName(title, id))

      if (!dryRun) {
        removeExistingTopicFiles([mdDir, shortDir], id)
        fs.writeFileSync(rawPath, JSON.stringify(detailResult, null, 2), "utf8")
        fs.writeFileSync(target, text, "utf8")
      }

      stats.details_ok += 1
      if (effectiveLength(text) >= minPublishChars) stats.published += 1
      else stats.short += 1
    } catch (error) {
      stats.failed += 1
      failures.push({ topic_id: id, error: String(error.message || error).slice(0, 500) })
      const failPath = path.join(shortDir, `${id}.error.txt`)
      if (!dryRun) fs.writeFileSync(failPath, String(error.stack || error.message || error), "utf8")
    }
  }

  console.log(JSON.stringify({ date: targetDate, group_id: groupId, dry_run: dryRun, stats, failures }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message || error)
  process.exit(1)
})
