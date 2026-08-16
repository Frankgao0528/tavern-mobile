import React, { useEffect, useState } from 'react'

const api = window.tavern

// 模块级缓存：同一张图只读一次
const cache = new Map()

/**
 * 可靠的图片组件：主进程读文件转 base64 显示，不依赖自定义协议
 * props: path（本地图片路径，可选）, className, alt, style
 */
export default function Img({ path, className, alt, style }) {
  const [src, setSrc] = useState(() => (path && cache.has(path) ? cache.get(path) : ''))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!path) {
      setSrc('')
      return
    }
    if (cache.has(path)) {
      setSrc(cache.get(path))
      return
    }
    let on = true
    api.image
      .readBase64(path)
      .then((d) => {
        if (!on) return
        if (d) {
          cache.set(path, d)
          setSrc(d)
          setFailed(false)
        } else {
          setFailed(true)
        }
      })
      .catch(() => on && setFailed(true))
    return () => {
      on = false
    }
  }, [path])

  if (!src) {
    return <div className={`img-loading ${className || ''}`} style={style} aria-label={alt || ''} />
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt || ''}
      style={style}
      onError={() => setFailed(true)}
    />
  )
}
