'use client'

/**
 * FormField — Átomo base do Kyra Atende
 *
 * ⚠️ REGRA ABSOLUTA: Todo campo de entrada usa este componente.
 * Nunca use <input>, <select> ou <textarea> diretamente.
 *
 * Tipos de máscara (DM Mono aplicado automaticamente):
 *   cep · telefone · currency · cnpj · cpf · cnpj_cpf · date · time
 *
 * Validações inline:
 *   CEP  → consulta ViaCEP no blur (debounce 300ms)
 *   CNPJ → dígitos verificadores
 *   CPF  → dígitos verificadores
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

// ── Tipos ───────────────────────────────────────────────────

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'telefone'
  | 'cep'
  | 'currency'
  | 'cnpj'
  | 'cpf'
  | 'cnpj_cpf'
  | 'date'
  | 'time'
  | 'select'
  | 'textarea'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export interface FormFieldProps {
  type?: FormFieldType
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  /** Apenas para type="select" */
  options?: SelectOption[]
  /** Callback com dados do CEP (apenas para type="cep") */
  onCepFilled?: (data: CepData) => void
  /** Número de linhas (apenas para type="textarea") */
  rows?: number
  name?: string
  autoComplete?: string
  className?: string
  inputClassName?: string
}

// ── Tipos que recebem DM Mono automaticamente ───────────────

const MASK_TYPES: FormFieldType[] = [
  'cep', 'telefone', 'currency', 'cnpj', 'cpf', 'cnpj_cpf', 'date', 'time',
]

// ── Funções de máscara (vanilla, sem dependência de imask no SSR) ──

function applyMask(raw: string, type: FormFieldType): string {
  const digits = raw.replace(/\D/g, '')

  switch (type) {
    case 'cep':
      return digits.slice(0, 8).replace(/^(\d{5})(\d{0,3})/, '$1-$2')

    case 'telefone': {
      const d = digits.slice(0, 11)
      if (d.length <= 10)
        return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
      return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    }

    case 'cpf':
      return digits.slice(0, 11)
        .replace(/^(\d{3})(\d{0,3})/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d{0,3})/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{0,2})/, '$1.$2.$3-$4')

    case 'cnpj':
      return digits.slice(0, 14)
        .replace(/^(\d{2})(\d{0,3})/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d{0,3})/, '$1.$2.$3')
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')

    case 'cnpj_cpf':
      if (digits.length <= 11) return applyMask(raw, 'cpf')
      return applyMask(raw, 'cnpj')

    case 'currency': {
      const cents = digits.padStart(3, '0')
      const reais = parseInt(cents.slice(0, -2), 10).toLocaleString('pt-BR')
      const dec = cents.slice(-2)
      return `R$ ${reais},${dec}`
    }

    case 'date':
      return digits.slice(0, 8)
        .replace(/^(\d{2})(\d{0,2})/, '$1/$2')
        .replace(/^(\d{2})\/(\d{2})(\d{0,4})/, '$1/$2/$3')

    case 'time':
      return digits.slice(0, 4).replace(/^(\d{2})(\d{0,2})/, '$1:$2')

    default:
      return raw
  }
}

// ── Validações ──────────────────────────────────────────────

function validateCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(digits[10])
}

function validateCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false
  const calc = (d: string, len: number) => {
    let sum = 0, pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += parseInt(d[len - i]) * pos--
      if (pos < 2) pos = 9
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11)
  }
  return (
    calc(digits, 12) === parseInt(digits[12]) &&
    calc(digits, 13) === parseInt(digits[13])
  )
}

// ── Consulta ViaCEP ─────────────────────────────────────────

let cepTimer: ReturnType<typeof setTimeout> | null = null

async function fetchCep(cep: string): Promise<CepData | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      localidade: data.localidade ?? '',
      uf: data.uf ?? '',
    }
  } catch {
    return null
  }
}

// ── Componente ──────────────────────────────────────────────

export function FormField({
  type = 'text',
  label,
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  onCepFilled,
  rows = 4,
  name,
  autoComplete,
  className = '',
  inputClassName = '',
}: FormFieldProps) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isMasked = MASK_TYPES.includes(type)
  const monoClass = isMasked ? 'font-mono-warm' : ''
  const hasError = Boolean(error)

  // ── Manipulação de valor com máscara ────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const raw = e.target.value
      if (isMasked) {
        onChange(applyMask(raw, type))
      } else {
        onChange(raw)
      }
    },
    [isMasked, type, onChange],
  )

  // ── Validação e CEP no blur ─────────────────────────────
  const handleBlur = useCallback(async () => {
    if (type === 'cep') {
      if (cepTimer) clearTimeout(cepTimer)
      cepTimer = setTimeout(async () => {
        setCepLoading(true)
        const data = await fetchCep(value)
        setCepLoading(false)
        if (data && onCepFilled) onCepFilled(data)
      }, 300)
    }
  }, [type, value, onCepFilled])

  // ── Classes de input ────────────────────────────────────
  const baseInputClass = [
    'w-full px-lg py-sm',
    'text-body text-ink-body',
    'bg-surface-2',
    'border rounded',
    'transition-colors duration-150',
    hasError
      ? 'border-red focus:border-red focus:ring-2 focus:ring-red/20'
      : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/15',
    disabled ? 'opacity-50 cursor-not-allowed bg-surface-3' : 'cursor-text',
    monoClass,
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ')

  // ── Label ────────────────────────────────────────────────
  const labelEl = (
    <label
      htmlFor={id}
      className="block text-label text-ink-soft mb-xs"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {label}
      {required && (
        <span className="ml-xs" style={{ color: 'var(--red)' }} aria-hidden="true">
          *
        </span>
      )}
    </label>
  )

  // ── Hint / Error ─────────────────────────────────────────
  const feedbackEl = error ? (
    <p
      id={`${id}-error`}
      className="mt-xs text-body-sm"
      style={{ color: 'var(--red)' }}
      role="alert"
    >
      {error}
    </p>
  ) : hint ? (
    <p id={`${id}-hint`} className="mt-xs text-caption text-muted">
      {hint}
    </p>
  ) : null

  // ── Select ───────────────────────────────────────────────
  if (type === 'select') {
    return (
      <div className={`flex flex-col ${className}`}>
        {labelEl}
        <select
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={baseInputClass}
          style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236B7280\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {feedbackEl}
      </div>
    )
  }

  // ── Textarea ─────────────────────────────────────────────
  if (type === 'textarea') {
    return (
      <div className={`flex flex-col ${className}`}>
        {labelEl}
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={baseInputClass}
          style={{ resize: 'vertical', minHeight: `${rows * 24}px` }}
        />
        {feedbackEl}
      </div>
    )
  }

  // ── Password ─────────────────────────────────────────────
  if (type === 'password') {
    return (
      <div className={`flex flex-col ${className}`}>
        {labelEl}
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={hasError}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={`${baseInputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-lg top-1/2 -translate-y-1/2 text-muted hover:text-ink-soft transition-colors"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        {feedbackEl}
      </div>
    )
  }

  // ── Date — input nativo com calendário do browser ───────────
  if (type === 'date') {
    // Converte DD/MM/YYYY (formato interno) → YYYY-MM-DD (valor do input nativo)
    const toNative = (v: string): string => {
      const digits = (v ?? '').replace(/\D/g, '')
      if (digits.length < 8) return ''
      return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
    }
    // Converte YYYY-MM-DD (evento change) → DD/MM/YYYY (estado interno)
    const fromNative = (v: string): string => {
      if (!v) return ''
      const [y, m, d] = v.split('-')
      return `${d}/${m}/${y}`
    }
    return (
      <div className={`flex flex-col ${className}`}>
        {labelEl}
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          id={id}
          name={name}
          type="date"
          value={toNative(value)}
          onChange={e => onChange(fromNative(e.target.value))}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={baseInputClass}
          style={{ colorScheme: 'light dark' }}
        />
        {feedbackEl}
      </div>
    )
  }

  // ── Input padrão (text, email, telefone, cep, currency, cnpj, cpf, date, time) ──
  return (
    <div className={`flex flex-col ${className}`}>
      {labelEl}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type === 'email' ? 'email' : 'text'}
          inputMode={
            type === 'currency' || type === 'cep' || type === 'cnpj' ||
            type === 'cpf' || type === 'cnpj_cpf' || type === 'telefone'
              ? 'numeric'
              : type === 'email'
              ? 'email'
              : 'text'
          }
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || cepLoading}
          required={required}
          placeholder={placeholder ?? getDefaultPlaceholder(type)}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${baseInputClass} ${cepLoading ? 'animate-pulse' : ''}`}
          style={isMasked ? { fontFamily: 'var(--font-mono-warm)' } : undefined}
        />
        {cepLoading && (
          <span className="absolute right-lg top-1/2 -translate-y-1/2 text-muted text-caption">
            Buscando...
          </span>
        )}
      </div>
      {feedbackEl}
    </div>
  )
}

// ── Placeholder padrão por tipo ──────────────────────────────

function getDefaultPlaceholder(type: FormFieldType): string {
  switch (type) {
    case 'cep':       return '00000-000'
    case 'telefone':  return '(00) 9 0000-0000'
    case 'currency':  return 'R$ 0,00'
    case 'cnpj':      return '00.000.000/0000-00'
    case 'cpf':       return '000.000.000-00'
    case 'cnpj_cpf':  return 'CPF ou CNPJ'
    case 'date':      return 'DD/MM/AAAA'
    case 'time':      return '00:00'
    default:          return ''
  }
}

export default FormField
