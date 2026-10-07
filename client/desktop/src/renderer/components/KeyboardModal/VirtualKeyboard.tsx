// Global sanal klavye — App root'a bir kez mount edilir.
// Her <input type=text|email|password|search|url|tel> ve <textarea> odaklandığında
// KeyboardModal açılır. Onaylanınca native input value React state ile senkron
// güncellenir (native setter override + input event dispatch).
//
// Bypass: input'a data-no-keyboard="true" koyulursa klavye açılmaz.
// Numeric input (type="number") zaten NumpadModal ile ayrı yönetilir — burada dokunulmaz.

import { useEffect, useRef, useState } from 'react'
import KeyboardModal from './KeyboardModal'

type TargetEl = HTMLInputElement | HTMLTextAreaElement

const TEXT_INPUT_TYPES = new Set(['text', 'email', 'password', 'search', 'url', 'tel'])

function isTextTarget(el: EventTarget | null): el is TargetEl {
  if (!(el instanceof HTMLElement)) return false
  if (el.hasAttribute('data-no-keyboard')) return false
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled
  if (el instanceof HTMLInputElement) {
    if (el.readOnly || el.disabled) return false
    return TEXT_INPUT_TYPES.has(el.type)
  }
  return false
}

/** React state'i tetikleyecek şekilde native input value setter'ı çağır. */
function setNativeValue(el: TargetEl, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function inferLabel(el: TargetEl): string {
  // Sıralı yakalayış: aria-label → placeholder → name → önceki <label>
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.toUpperCase()

  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder.toUpperCase()

  if (el.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)
    if (label?.textContent) return label.textContent.trim().toUpperCase()
  }

  const parentLabel = el.closest('label')
  if (parentLabel?.textContent) {
    const txt = parentLabel.textContent.replace(el.value, '').trim()
    if (txt) return txt.toUpperCase()
  }

  const name = el.getAttribute('name')
  if (name) return name.toUpperCase()

  return 'METİN'
}

export default function VirtualKeyboard() {
  const [target, setTarget] = useState<TargetEl | null>(null)
  // Modal onConfirm'den sonra tekrar focus event tetiklenmesin diye kısa kilit
  const suppressUntilRef = useRef(0)

  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      if (Date.now() < suppressUntilRef.current) return
      if (!isTextTarget(e.target)) return
      // Modal içindeki input'lara kendi de focus alabilir — target set edildiyse dokunma
      setTarget((prev) => prev ?? (e.target as TargetEl))
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  function handleConfirm(value: string) {
    if (target) {
      setNativeValue(target, value)
      target.blur()
    }
    suppressUntilRef.current = Date.now() + 250
    setTarget(null)
  }

  function handleClose() {
    target?.blur()
    suppressUntilRef.current = Date.now() + 250
    setTarget(null)
  }

  if (!target) return null

  const maxLength = target.maxLength > 0 ? target.maxLength : undefined

  return (
    <KeyboardModal
      initialValue={target.value}
      label={inferLabel(target)}
      maxLength={maxLength}
      onConfirm={handleConfirm}
      onClose={handleClose}
    />
  )
}
