const token = (index) => `\u0001${index}\u0001`

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeHref(value) {
  const href = String(value || '').trim()
  return /^(https?:\/\/|mailto:|#)/i.test(href) ? escapeHtml(href) : '#'
}

function inlineMarkdown(value) {
  const tokens = []
  const stash = (html) => {
    const index = tokens.push(html) - 1
    return token(index)
  }

  let text = String(value || '')
  text = text.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`))
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => (
    stash(`<img src="${safeHref(src)}" alt="${escapeHtml(alt)}" loading="lazy">`)
  ))
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => (
    stash(`<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
  ))
  text = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
    .replace(/(^|[^_])_([^_\n]+)_([^_]|$)/g, '$1<em>$2</em>$3')
    .replace(/\n/g, '<br>')

  return text.replace(/\u0001(\d+)\u0001/g, (_, index) => tokens[Number(index)] || '')
}

function renderTable(lines) {
  const rows = lines.map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()))
  if (rows.length < 2 || !rows[1].every((cell) => /^:?-{3,}:?$/.test(cell))) return ''
  const head = rows[0].map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')
  const body = rows.slice(2).map((row) => (
    `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`
  )).join('')
  return `<div class="md-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

export function renderMarkdown(source) {
  const text = String(source || '').replace(/\r\n?/g, '\n')
  const blocks = []
  const withCodeTokens = text.replace(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm, (_, language, code) => {
    const className = String(language || '').trim().replace(/[^a-zA-Z0-9_-]/g, '')
    const classAttr = className ? ` class="language-${className}"` : ''
    const index = blocks.push(`<pre class="md-code-block"><code${classAttr}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`) - 1
    return token(index)
  })

  const lines = withCodeTokens.split('\n')
  const output = []
  let paragraph = []
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join('\n'))}</p>`)
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      continue
    }
    const codeMatch = trimmed.match(/^\u0001(\d+)\u0001$/)
    if (codeMatch) {
      flushParagraph()
      output.push(blocks[Number(codeMatch[1])] || '')
      continue
    }
    if (/^\|/.test(trimmed) && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      flushParagraph()
      const tableLines = [line, lines[index + 1]]
      index += 2
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        tableLines.push(lines[index])
        index += 1
      }
      index -= 1
      output.push(renderTable(tableLines))
      continue
    }
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length
      output.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }
    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      flushParagraph()
      output.push('<hr>')
      continue
    }
    if (/^>\s?/.test(trimmed)) {
      flushParagraph()
      const quoteLines = []
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      index -= 1
      output.push(`<blockquote>${inlineMarkdown(quoteLines.join('\n'))}</blockquote>`)
      continue
    }
    const unordered = trimmed.match(/^[-*+]\s+(.+)$/)
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      flushParagraph()
      const orderedList = Boolean(ordered)
      const items = []
      while (index < lines.length) {
        const current = lines[index].trim()
        const match = current.match(orderedList ? /^\d+[.)]\s+(.+)$/ : /^[-*+]\s+(.+)$/)
        if (!match) break
        items.push(`<li>${inlineMarkdown(match[1])}</li>`)
        index += 1
      }
      index -= 1
      output.push(`<${orderedList ? 'ol' : 'ul'}>${items.join('')}</${orderedList ? 'ol' : 'ul'}>`)
      continue
    }
    paragraph.push(line)
  }

  flushParagraph()
  return output.join('')
}
