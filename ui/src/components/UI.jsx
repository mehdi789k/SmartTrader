import React from 'react'
import PropTypes from 'prop-types'

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-2xl shadow text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400 disabled:text-white',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 disabled:bg-slate-500 disabled:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400 disabled:text-white',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 disabled:bg-emerald-400 disabled:text-white',
    ghost: 'bg-slate-900/10 text-slate-900 border border-slate-300 hover:bg-slate-900/20 focus:ring-slate-400 disabled:border-slate-200 disabled:text-slate-400',
    outline: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500 disabled:bg-slate-100',
  }
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3 text-lg',
  }
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'ghost', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  type: PropTypes.string,
}

export const Card = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'rounded-[24px] bg-white/95 p-6 shadow-lg shadow-slate-200/20 ring-1 ring-slate-200/40 backdrop-blur-xl',
    dark: 'rounded-[24px] border border-slate-800 bg-slate-950/95 p-6 shadow-lg shadow-black/15 backdrop-blur-xl',
  }

  return (
    <div className={`${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  )
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'dark']),
}

export const Input = ({
  label,
  error,
  className = '',
  ...props
}) => (
  <div className='mb-4'>
    {label && <label className='block text-sm font-medium text-gray-700 mb-2'>{label}</label>}
    <input
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${className}`}
      {...props}
    />
    {error && <p className='text-red-500 text-sm mt-1'>{error}</p>}
  </div>
)

Input.propTypes = {
  label: PropTypes.node,
  error: PropTypes.string,
  className: PropTypes.string,
}

export const Alert = ({ type = 'info', message }) => {
  const colors = {
    info: 'bg-sky-500/10 text-sky-200 border-sky-400/30',
    success: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30',
    warning: 'bg-amber-500/10 text-amber-200 border-amber-400/30',
    error: 'bg-rose-500/10 text-rose-200 border-rose-400/30',
  }
  const role = type === 'error' ? 'alert' : 'status'
  const live = type === 'error' ? 'assertive' : 'polite'
  
  return (
    <div className={`rounded-3xl border-l-4 p-4 mb-4 backdrop-blur ${colors[type]}`} role={role} aria-live={live}>
      {message}
    </div>
  )
}

Alert.propTypes = {
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  message: PropTypes.node.isRequired,
}

export const Badge = ({ children, variant = 'gray', className = '' }) => {
  const colors = {
    gray: 'bg-slate-200/20 text-slate-200 border border-slate-700/70',
    blue: 'bg-sky-500/10 text-sky-300 border border-sky-400/20',
    green: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20',
    red: 'bg-rose-500/10 text-rose-300 border border-rose-400/20',
    yellow: 'bg-amber-500/10 text-amber-300 border border-amber-400/20',
    purple: 'bg-violet-500/10 text-violet-300 border border-violet-400/20',
    teal: 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/20',
  }
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${colors[variant]} ${className}`}>
      {children}
    </span>
  )
}

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.string,
  className: PropTypes.string,
}

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className={`inline-block animate-spin ${sizes[size]} ${className}`}>
      <svg className='h-full w-full text-current' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    </div>
  )
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
}

export const Modal = ({ open, title, children, onCancel, onConfirm, confirmLabel = 'تأیید', cancelLabel = 'انصراف' }) => {
  if (!open) return null
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center' role='dialog' aria-modal='true' aria-labelledby='modal-title'>
      <div className='fixed inset-0 bg-black/50' onClick={onCancel} />
      <div className='relative z-10 max-w-lg w-full'>
        <div className='rounded-[28px] bg-slate-950/95 p-6 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl'>
          {title && <h3 id='modal-title' className='text-lg font-semibold mb-3 text-slate-100'>{title}</h3>}
          <div className='mb-4 text-slate-200'>{children}</div>
          <div className='flex justify-end gap-2'>
            <button onClick={onCancel} className='rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800'>
              {cancelLabel}
            </button>
            <button onClick={onConfirm} className='rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500'>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

Modal.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.node,
  children: PropTypes.node,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
}
