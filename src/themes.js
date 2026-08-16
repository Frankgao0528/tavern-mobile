// 主题系统：CSS 变量覆盖 + 预设主题 + 自定义颜色
export const THEMES = {
  'deep-tavern': {
    label: '深夜酒馆',
    desc: '深紫烛光，经典酒馆氛围',
    vars: {
      '--bg': '#14101d',
      '--bg2': '#1b1526',
      '--bg3': '#221a30',
      '--bg-hover': '#2a2038',
      '--border': '#332a44',
      '--text': '#e8e2f2',
      '--text-dim': '#9a8fb5',
      '--accent': '#d4a94f',
      '--accent2': '#a78bda',
      '--gold': '#f0c674',
      '--red': '#e06c75',
      '--green': '#98c379',
    },
  },
  'starry-night': {
    label: '星夜',
    desc: '深蓝夜幕，星光粒子',
    vars: {
      '--bg': '#0c1120',
      '--bg2': '#111830',
      '--bg3': '#182142',
      '--bg-hover': '#1f2a4f',
      '--border': '#2a3762',
      '--text': '#e6ecff',
      '--text-dim': '#8fa1cc',
      '--accent': '#7aa2f7',
      '--accent2': '#9eceeb',
      '--gold': '#c0caf5',
      '--red': '#f7768e',
      '--green': '#9ece6a',
    },
  },
  sakura: {
    label: '樱花',
    desc: '粉紫渐变，花瓣飘落',
    vars: {
      '--bg': '#221222',
      '--bg2': '#2b172b',
      '--bg3': '#361d35',
      '--bg-hover': '#402540',
      '--border': '#4a2a4a',
      '--text': '#fdeef7',
      '--text-dim': '#c99ac4',
      '--accent': '#ff8fbf',
      '--accent2': '#c58bf0',
      '--gold': '#ffc6dd',
      '--red': '#ff6b8a',
      '--green': '#9be8c1',
    },
  },
  moonlight: {
    label: '月光',
    desc: '银蓝清冷，安静优雅',
    vars: {
      '--bg': '#11161d',
      '--bg2': '#171e27',
      '--bg3': '#1e2833',
      '--bg-hover': '#26323f',
      '--border': '#2f3d4c',
      '--text': '#e8eef4',
      '--text-dim': '#8fa3b5',
      '--accent': '#8fb8d8',
      '--accent2': '#a0b9cc',
      '--gold': '#cfe0ec',
      '--red': '#e0736f',
      '--green': '#8fc9a0',
    },
  },
}

// 自定义颜色映射：几个关键色 -> CSS 变量组
export const CUSTOM_COLOR_FIELDS = [
  { key: 'accent', label: '主色调（按钮/高亮）', var: '--accent' },
  { key: 'accent2', label: '辅助色（标题/强调）', var: '--accent2' },
  { key: 'bg', label: '背景色', var: '--bg' },
  { key: 'bg2', label: '面板色', var: '--bg2' },
  { key: 'bg3', label: '浮层色', var: '--bg3' },
  { key: 'text', label: '文字色', var: '--text' },
]

export const PARTICLE_TYPES = {
  none: { label: '关闭', desc: '无特效' },
  stars: { label: '星光', desc: '点点星光闪烁' },
  sakura: { label: '樱花', desc: '粉色花瓣飘落' },
  ember: { label: '金尘', desc: '烛火般的金色尘埃上浮' },
}

/** 把主题应用为页面 CSS 变量 */
export function applyTheme(theme) {
  const t = theme || { name: 'deep-tavern', particles: 'none' }
  const base = THEMES[t.name] || THEMES['deep-tavern']
  const vars = { ...base.vars }
  // 自定义颜色覆盖
  if (t.customColors && t.name === 'custom') {
    CUSTOM_COLOR_FIELDS.forEach((f) => {
      if (t.customColors[f.key]) vars[f.var] = t.customColors[f.key]
    })
  }
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}
