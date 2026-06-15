import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = path.join(repoRoot, "content")
const minPublishScore = 120
const sources = [
  "D:\\obsidian笔记\\研报库",
  path.join(repoRoot, "obsidian笔记", "研报库"),
  contentRoot,
]

const categoryRules = [
  ["AI大模型与算力", /AI|大模型|智谱|Kimi|Claude|Anthropic|Token|算力|GPU|服务器|芯片/i],
  ["光通信与CPO", /CPO|光模块|光纤|MPO|NPO|硅光|光通信|光互联|相干/i],
  ["PCB与电子材料", /PCB|CCL|电子布|铜箔|MLCC|电容|PI膜|基板|玻纤/i],
  ["半导体与设备", /半导体|存储|设备|晶圆|光刻|封装|射频|引线框/i],
  ["新能源与电力", /锂电|电新|光伏|储能|电池|阳光电源|福斯特|德业/i],
  ["军工与航天", /军工|商业航天|SpaceX|卫星|火箭|弹药|航天/i],
  ["周期资源与化工", /煤|油运|化工|制冷剂|钾肥|铋|黄金|有色|粘胶|染料|甲醇/i],
  ["消费与医药", /消费|食品|白酒|医药|创新药|农业|生猪|牧业|零售/i],
  ["宏观策略", /宏观|策略|周观点|流动性|FOMC|债券|金融|券商|地产/i],
]

function isDateDir(name) {
  return /^\d{4}-\d{2}-\d{2}$/.test(name)
}

function readUtf8(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const data = {}
  if (!match) return { data, body: text }

  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    value = value.replace(/^["']|["']$/g, "")
    data[key] = value
  }
  return { data, body: text.slice(match[0].length) }
}

function stripEmojiAndPunct(value) {
  return value
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "")
}

function normalizeKey(title) {
  const clean = stripEmojiAndPunct(title)
    .replace(/\.{2,}|…+/g, "")
    .replace(/_\d+$/g, "")
    .toLowerCase()
  return clean.slice(0, 28) || "untitled"
}

function displayTitleFrom(file, fmTitle) {
  const title = fmTitle || path.basename(file, ".md")
  return title.replace(/\.{2,}|…+/g, "...").trim()
}

function scoreContent(text) {
  const { body } = parseFrontmatter(text)
  const compact = body
    .replace(/^>.*$/gm, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/暂无/g, "")
    .replace(/（催化→传导→标的推演）详见原文分析。/g, "")
    .replace(/\s+/g, "")

  let score = compact.length
  if (/##\s*原文内容[\s\S]*##\s*投资逻辑\s*\r?\n暂无[\s\S]*##\s*风险提示\s*\r?\n暂无/.test(body)) {
    score -= 300
  }
  if (/##\s*核心判断[\s\S]*##\s*论据与数据[\s\S]*##\s*投资逻辑链/.test(body) && compact.length < 180) {
    score -= 180
  }
  return score
}

function safeFileName(title) {
  const base = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return (base || "未命名研报") + ".md"
}

function ensureUnique(name, used) {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const ext = path.extname(name)
  const stem = path.basename(name, ext)
  let i = 1
  while (used.has(`${stem}_${i}${ext}`)) i += 1
  const next = `${stem}_${i}${ext}`
  used.add(next)
  return next
}

function normalizeMarkdown(text, title, date) {
  const { body } = parseFrontmatter(text)
  const cleanedBody = body
    .replace(/^\s*> 来源：知识星球「调研纪要」\s*$/gm, "")
    .trimEnd()
  return `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\ntags: [调研纪要]\n---\n\n> 来源：知识星球「调研纪要」\n\n${cleanedBody}\n`
}

function categoryOf(title) {
  for (const [category, regex] of categoryRules) {
    if (regex.test(title)) return category
  }
  return "其他"
}

function collectCandidates() {
  const byDate = new Map()

  for (const source of sources) {
    if (!fs.existsSync(source)) continue
    for (const dirent of fs.readdirSync(source, { withFileTypes: true })) {
      if (!dirent.isDirectory() || !isDateDir(dirent.name)) continue
      const date = dirent.name
      const dateRoot = path.join(source, date)
      for (const fileDirent of fs.readdirSync(dateRoot, { withFileTypes: true })) {
        if (!fileDirent.isFile() || !fileDirent.name.endsWith(".md")) continue
        const file = path.join(dateRoot, fileDirent.name)
        const text = readUtf8(file)
        const { data } = parseFrontmatter(text)
        const title = displayTitleFrom(file, data.title)
        const key = normalizeKey(title)
        const score = scoreContent(text)

        if (!byDate.has(date)) byDate.set(date, new Map())
        const day = byDate.get(date)
        const prev = day.get(key)
        const candidate = { file, text, title, date, score, size: Buffer.byteLength(text, "utf8") }
        if (!prev || candidate.score > prev.score || (candidate.score === prev.score && candidate.size > prev.size)) {
          day.set(key, candidate)
        }
      }
    }
  }

  return byDate
}

function resetPublishedDateDirs(dates) {
  fs.mkdirSync(contentRoot, { recursive: true })
  for (const dirent of fs.readdirSync(contentRoot, { withFileTypes: true })) {
    if (dirent.isDirectory() && isDateDir(dirent.name)) {
      fs.rmSync(path.join(contentRoot, dirent.name), { recursive: true, force: true })
    }
  }
  for (const date of dates) {
    fs.mkdirSync(path.join(contentRoot, date), { recursive: true })
  }
}

function writeContent(byDate) {
  const indexItems = []
  resetPublishedDateDirs([...byDate.keys()])

  for (const [date, candidates] of [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const used = new Set()
    const written = []
    const targetDir = path.join(contentRoot, date)
    const sorted = [...candidates.values()].sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"))

    for (const item of sorted) {
      if (item.score < minPublishScore) continue
      const filename = ensureUnique(safeFileName(item.title), used)
      const target = path.join(targetDir, filename)
      fs.writeFileSync(target, normalizeMarkdown(item.text, path.basename(filename, ".md"), date), "utf8")
      written.push({ title: path.basename(filename, ".md"), category: categoryOf(item.title), score: item.score })
    }

    indexItems.push({ date, items: written })
  }

  writeIndex(indexItems)
}

function writeIndex(days) {
  const lines = [
    "---",
    'title: "调研纪要研报库"',
    "date: 2026-06-14",
    "tags: [索引]",
    "---",
    "",
    "> 来源：知识星球「调研纪要」 | 自动同步 | 优先发布正文更完整的版本",
    "",
    "## 按日期浏览",
    "",
  ]

  for (const day of days) {
    lines.push(`<div id="date-${day.date}">`, "")
    lines.push(`### [[${day.date}/|${day.date}]] — ${day.items.length}篇研报`, "")

    const groups = new Map()
    for (const item of day.items) {
      if (!groups.has(item.category)) groups.set(item.category, [])
      groups.get(item.category).push(item)
    }

    for (const [category, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh-Hans-CN"))) {
      lines.push("<details>")
      lines.push(`<summary><b>${category}</b>（${items.length}篇）</summary>`, "")
      for (const item of items.sort((a, b) => b.score - a.score)) {
        lines.push(`- [[${day.date}/${item.title}]]`)
      }
      lines.push("", "</details>", "")
    }

    lines.push("</div>", "")
  }

  fs.writeFileSync(path.join(contentRoot, "index.md"), lines.join("\n"), "utf8")
}

const byDate = collectCandidates()
writeContent(byDate)

let total = 0
for (const candidates of byDate.values()) total += candidates.size
console.log(`Synced ${total} research notes across ${byDate.size} dates into ${contentRoot}`)
