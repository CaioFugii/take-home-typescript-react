import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { setAccessToken } from '../services/api'

afterEach(() => {
  cleanup()
  setAccessToken(null)
})
