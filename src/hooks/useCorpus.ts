import { useEffect, useState } from 'react'
import { loadCorpus, type CorpusData } from '../lib/loadCorpus'

interface CorpusState {
  data: CorpusData | null
  loading: boolean
  progress: number
  error: string | null
}

export function useCorpus(): CorpusState {
  const [state, setState] = useState<CorpusState>({
    data: null,
    loading: true,
    progress: 0,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    loadCorpus((loaded, total) => {
      if (!cancelled) setState((s) => ({ ...s, progress: loaded / total }))
    })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, progress: 1, error: null })
      })
      .catch((err: Error) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
