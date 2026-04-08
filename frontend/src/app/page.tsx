'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, Mic, Play, Pause, Activity, CheckCircle, AlertTriangle, XCircle, Info, FileAudio, BarChart2, Zap, Sliders, Hash } from 'lucide-react'
import WaveSurfer from 'wavesurfer.js'

interface AnalysisResult {
  score: number
  label: string
  snr: number
  transcription: string
  confidence: number
  noise_level: string
  clarity_score: number
  feedback: string[]
  dsp_metrics?: {
    metrics: {
        spectral_flatness: number
        windowed_snr: number
        formant_energy_ratio: number
        zcr: number
    }
    component_scores: {
        base_score: number
        wsnr_score: number
        sf_score: number
        formant_score: number
        p_zcr: number
        p_noise: number
        p_speech: number
    }
  }
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)
  
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  useEffect(() => {
    if (file && waveformRef.current && !wavesurfer.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#30363d',
        progressColor: '#00f0ff',
        cursorColor: '#00f0ff',
        barWidth: 2,
        height: 60,
      })

      wavesurfer.current.on('play', () => setIsPlaying(true))
      wavesurfer.current.on('pause', () => setIsPlaying(false))
      wavesurfer.current.on('finish', () => setIsPlaying(false))
      
      const url = URL.createObjectURL(file)
      wavesurfer.current.load(url)
    } else if (file && wavesurfer.current) {
      const url = URL.createObjectURL(file)
      wavesurfer.current.load(url)
    }
  }, [file])

  const renderFormula = (val: number, min: number, max: number, maxPts: number, result_pts: number, inverse: boolean = false) => {
    const format = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(2);
    const num = inverse ? `(${format(min)} - ${val.toFixed(3)})` : `(${val.toFixed(3)} - ${format(min)})`;
    const denom = inverse ? `${format(min - max)}` : `${format(max - min)}`;
    return (
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 1rem', borderRadius: '8px', marginTop: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#8b949e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ color: 'var(--text-main)', opacity: 0.8 }}>Calculation:</span> <span>min({maxPts}, max(0, {num} / {denom} &times; {maxPts}))</span></span>
         <span style={{ color: '#fff', fontWeight: 'bold' }}>= {result_pts.toFixed(1)} <span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>pts</span></span>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setResult(null)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorder.current = recorder
      audioChunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' })
        const audioFile = new File([audioBlob], 'live_recording.wav', { type: 'audio/wav' })
        setFile(audioFile)
        setResult(null)
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone', err)
      alert('Microphone access denied or unavailable.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const togglePlayback = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause()
    }
  }

  const analyzeAudio = async () => {
    if (!file) return
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Analysis failed')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to analyze audio. Please ensure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'good': return <CheckCircle size={48} className="label-good" />
      case 'moderate': return <AlertTriangle size={48} className="label-moderate" />
      case 'poor': return <XCircle size={48} className="label-poor" />
      default: return <Info size={48} />
    }
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Aether Dynamics</h1>
        <p>Pro-Grade AI Audio Analyzer</p>
      </header>

      <main className="main-grid">
        {/* Left Side: Upload & Controls */}
        <div className="sidebar">
          <section className="panel">
            <h3><Upload size={20} style={{marginRight: '10px'}}/> Upload or Record</h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', marginTop: '1rem' }}>
              <button 
                onClick={isRecording ? stopRecording : startRecording} 
                style={{ flex: 1, padding: '0.8rem', background: isRecording ? '#dc3545' : 'rgba(0, 240, 255, 0.1)', color: isRecording ? '#fff' : 'var(--accent-blue)', border: isRecording ? 'none' : '1px solid var(--accent-blue)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
              >
                {isRecording ? <><span style={{ width: '10px', height: '10px', background: '#fff', borderRadius: '50%' }}></span> STOP RECORDING</> : <><Mic size={18}/> LIVE RECORD</>}
              </button>
            </div>

            <div className="upload-box" onClick={() => document.getElementById('file-input')?.click()}>
              <FileAudio size={56} color="var(--accent-blue)" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.4))' }} />
              <p style={{fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem'}}>{file ? file.name : 'Select or drop audio file'}</p>
              <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>.wav or .mp3 format</p>
              <input 
                id="file-input" 
                type="file" 
                hidden 
                accept="audio/*" 
                onChange={handleFileChange} 
              />
            </div>
            
            <button 
              className="analyze-btn" 
              onClick={analyzeAudio} 
              disabled={!file || loading}
              style={{marginTop: '2rem'}}
            >
              {loading ? 'PROCESSING SIGNAL...' : 'START ANALYSIS'}
            </button>
          </section>

          {file && (
            <section className="panel">
              <h3><Activity size={20} style={{marginRight: '10px'}}/> Waveform</h3>
              <div className="waveform-container" ref={waveformRef}></div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button 
                  onClick={togglePlayback}
                  style={{ background: 'var(--accent-blue)', opacity: 0.8, borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#000', transition: 'transform 0.2s', boxShadow: '0 0 15px rgba(0,240,255,0.4)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" style={{marginLeft: '4px'}} />}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Side: Results */}
        <div className="results-area">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <section className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '3rem' }}>
                <div className="score-gauge-wrapper">
                  <div className="score-gauge-bg"></div>
                  <div 
                    className="score-gauge-fill" 
                    style={{ '--score-deg': `${(result.score / 100) * 360}deg` } as React.CSSProperties}
                  ></div>
                  <div className="score-gauge-content">
                    <span className="score-number">{result.score}<span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>%</span></span>
                    <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px'}}>Quality</span>
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {getLabelIcon(result.label)}
                  <h2 className={`label-${result.label.toLowerCase()}`} style={{fontSize: '2rem', letterSpacing: '2px', textTransform: 'uppercase'}}>{result.label}</h2>
                  <p style={{color: 'var(--text-muted)', letterSpacing: '1px', fontSize: '0.9rem'}}>CLASSIFICATION</p>
                </div>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <section className="panel" style={{padding: '2rem'}}>
                  <h3><Sliders size={20} style={{marginRight: '10px'}}/> Base Metrics</h3>
                  <div className="metrics-panel" style={{marginTop: '1.5rem'}}>
                    <div className="metric-card">
                      <span style={{color: 'var(--text-muted)'}}>Model Confidence</span>
                      <span style={{color: 'var(--text-main)'}}>{(result.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="metric-card">
                      <span style={{color: 'var(--text-muted)'}}>wSNR</span>
                      <span style={{color: 'var(--text-main)'}}>{result.snr} dB</span>
                    </div>
                    <div className="metric-card">
                      <span style={{color: 'var(--text-muted)'}}>Clarity Level</span>
                      <span style={{color: 'var(--text-main)'}}>{result.clarity_score}</span>
                    </div>
                    <div className="metric-card">
                      <span style={{color: 'var(--text-muted)'}}>Ambient Noise</span>
                      <span style={{color: 'var(--text-main)'}}>{result.noise_level}</span>
                    </div>
                  </div>
                </section>

                <section className="panel" style={{padding: '2rem'}}>
                  <h3><Zap size={20} style={{marginRight: '10px'}}/> Intelligence Feedback</h3>
                  <div style={{ marginTop: '1.5rem' }}>
                    {result.feedback.map((item, i) => {
                      let icon = <CheckCircle size={20} color="var(--success)" />;
                      if (item.includes('⚠️')) icon = <AlertTriangle size={20} color="var(--warning)" />;
                      if (item.includes('🛑')) icon = <XCircle size={20} color="var(--danger)" />;
                      
                      return (
                        <div key={i} className="feedback-item">
                           {icon}
                           <span style={{fontSize: '0.95rem'}}>{item.replace('⚠️', '').replace('🛑', '')}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>

              {result.dsp_metrics && (
                <section className="panel">
                  <h3><Sliders size={20} style={{ marginRight: '10px' }} /> Non-Linear Scoring Matrix</h3>
                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                    
                    {/* Base Score Breakdown */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>1. Composite Base Score</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        <span>Sigmoid SNR Score:</span> <span style={{ color: 'var(--accent-blue)' }}>+{result.dsp_metrics.component_scores.wsnr_score.toFixed(1)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        <span>Power Scaling Formant:</span> <span style={{ color: 'var(--success)' }}>+{result.dsp_metrics.component_scores.formant_score.toFixed(1)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        <span>Inv-Quad Flatness:</span> <span style={{ color: 'var(--accent-purple)' }}>+{result.dsp_metrics.component_scores.sf_score.toFixed(1)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontWeight: 'bold' }}>PRE-PENALTY BASE:</span> 
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{result.dsp_metrics.component_scores.base_score.toFixed(1)} <span style={{fontSize: '0.8rem', color: '#8b949e'}}>pts</span></span>
                      </div>
                    </div>

                    {/* Multipliers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ZCR Decay</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.dsp_metrics.component_scores.p_zcr < 1 ? 'var(--danger)' : 'var(--success)' }}>&times; {result.dsp_metrics.component_scores.p_zcr.toFixed(2)}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Noise Trapdoor</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.dsp_metrics.component_scores.p_noise < 1 ? 'var(--warning)' : 'var(--success)' }}>&times; {result.dsp_metrics.component_scores.p_noise.toFixed(2)}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Speech Gate</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.dsp_metrics.component_scores.p_speech < 0.5 ? 'var(--danger)' : 'var(--success)' }}>&times; {result.dsp_metrics.component_scores.p_speech.toFixed(2)}</span>
                        </div>
                    </div>

                  </div>
                </section>
              )}

              <section className="panel">
                <h3><Mic size={20} style={{ marginRight: '10px' }} /> Automated Transcription</h3>
                <div className="transcription-box">
                  {result.transcription || "[Transcription not available]"}
                </div>
              </section>
            </div>
          ) : (
            <div className="panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderStyle: 'dashed' }}>
              <div>
                <Hash size={72} color="rgba(255,255,255,0.05)" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ color: 'var(--text-muted)', fontWeight: '400', letterSpacing: '1px' }}>SYSTEM IDLE</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem', opacity: 0.6 }}>
                  Upload a signal to initialize standard evaluation metrics
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
