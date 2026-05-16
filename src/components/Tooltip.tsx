import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  children: React.ReactNode
  content: React.ReactNode
  interactive?: boolean
}

export function Tooltip({ children, content, interactive }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({
      top: r.top - 8,
      left: r.left + r.width / 2,
    })
    setVisible(true)
  }, [])

  const hide = useCallback(() => setVisible(false), [])

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={hide} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
      </span>
      {visible && createPortal(
        <div
          className={`tooltip${interactive ? ' tooltip-interactive' : ''}`}
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={interactive ? show : undefined}
          onMouseLeave={interactive ? hide : undefined}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
