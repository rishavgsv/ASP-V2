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
        wsnr_score: number
        sf_score: number
        formant_score: number
        zcr_penalty: number
    }
  }
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)

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
            <h3><Upload size={20} style={{marginRight: '10px'}}/> Upload Source</h3>
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
                  <h3><BarChart2 size={20} style={{ marginRight: '10px' }} /> Equalizer & DSP Mapping</h3>
                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                    
                    {/* SNR Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600', letterSpacing: '1px' }}>Windowed SNR</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>+{result.dsp_metrics.component_scores.wsnr_score.toFixed(1)} / 40</span>
                      </div>
                      <div className="eq-bar-container">
                        <div className="eq-bar-fill" style={{ width: `${(result.dsp_metrics.component_scores.wsnr_score / 40) * 100}%`, background: 'var(--accent-blue)' }}></div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Dynamic burst contrast (Measured: {result.dsp_metrics.metrics.windowed_snr.toFixed(1)} dB)</p>
                      {renderFormula(result.dsp_metrics.metrics.windowed_snr, 5, 25, 40, result.dsp_metrics.component_scores.wsnr_score)}
                    </div>

                    {/* Flatness Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600', letterSpacing: '1px' }}>Spectral Flatness</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>+{result.dsp_metrics.component_scores.sf_score.toFixed(1)} / 25</span>
                      </div>
                      <div className="eq-bar-container">
                        <div className="eq-bar-fill" style={{ width: `${(result.dsp_metrics.component_scores.sf_score / 25) * 100}%`, background: 'var(--accent-purple)' }}></div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tonality depth vs hiss (Measured: {result.dsp_metrics.metrics.spectral_flatness.toFixed(3)})</p>
                      {renderFormula(result.dsp_metrics.metrics.spectral_flatness, 0.35, 0.05, 25, result.dsp_metrics.component_scores.sf_score, true)}
                    </div>

                    {/* Formant Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600', letterSpacing: '1px' }}>Formant Energy Density</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>+{result.dsp_metrics.component_scores.formant_score.toFixed(1)} / 35</span>
                      </div>
                      <div className="eq-bar-container">
                        <div className="eq-bar-fill" style={{ width: `${(result.dsp_metrics.component_scores.formant_score / 35) * 100}%`, background: 'var(--success)' }}></div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Power within vocal tract range (Measured: {result.dsp_metrics.metrics.formant_energy_ratio.toFixed(2)})</p>
                      {renderFormula(result.dsp_metrics.metrics.formant_energy_ratio, 0.2, 0.6, 35, result.dsp_metrics.component_scores.formant_score)}
                    </div>

                    {/* ZCR Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600', letterSpacing: '1px' }}>Zero-Crossing Penalty</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>-{result.dsp_metrics.component_scores.zcr_penalty.toFixed(1)}</span>
                      </div>
                      <div className="eq-bar-container">
                        <div className="eq-bar-fill" style={{ width: `${(result.dsp_metrics.component_scores.zcr_penalty / 30) * 100}%`, background: 'var(--danger)' }}></div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Distortion and harsh static rate (Measured: {result.dsp_metrics.metrics.zcr.toFixed(3)})</p>
                      {renderFormula(result.dsp_metrics.metrics.zcr, 0.1, 0.35, 30, result.dsp_metrics.component_scores.zcr_penalty)}
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
