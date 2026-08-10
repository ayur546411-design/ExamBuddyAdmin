import { useEffect, useRef, useState } from 'react'

export default function usePolling(fn, interval = 3000, enabled = false){
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(enabled)
  const timer = useRef(null)

  async function pollOnce(){
    try{
      const res = await fn()
      setData(res)
      setError(null)
      return res
    }catch(err){
      setError(err)
      return null
    }
  }

  useEffect(()=>{
    if(!running) return
    let cancelled = false
    const loop = async ()=>{
      if(cancelled) return
      await pollOnce()
      if(cancelled) return
      timer.current = setTimeout(loop, interval)
    }
    loop()
    return ()=>{ cancelled = true; if(timer.current) clearTimeout(timer.current) }
  }, [running, interval])

  return { data, error, running, start: ()=>setRunning(true), stop: ()=>setRunning(false), pollOnce }
}
