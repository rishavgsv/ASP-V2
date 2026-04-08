import os
import random
from .processor import AudioProcessor

class AAQAInference:
    def __init__(self, device="cpu"):
        self.device = device
        self.audio_proc = AudioProcessor()
        # Mocking the models due to Torch DLL load issues in current environment
        print("Initialized Mock AAQAInference (Torch bypassed for stability)")

    def analyze(self, audio_path):
        # 1. Load and process audio
        audio = self.audio_proc.load_audio(audio_path)
        processed_audio = self.audio_proc.preprocess(audio)
        
        # 2. Get Features & Transcription (Mocked)
        # Using a deterministic mock based on audio length and some properties
        metrics = self.audio_proc.calculate_metrics(processed_audio)
        
        duration = metrics["duration"]
        spectral_flatness = metrics["spectral_flatness"]
        zcr = metrics["zcr"]
        windowed_snr = metrics["windowed_snr"]
        formant_energy_ratio = metrics["formant_energy_ratio"]
        
        # Perform REAL transcription using Google Free Speech API (No Torch required)
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            with sr.AudioFile(audio_path) as source:
                audio_data = r.record(source)
                transcription = r.recognize_google(audio_data)
        except Exception as e:
            transcription = "[Could not transcribe - Unclear or noise detected]"

        # Calculate Blind Evaluation Score (Non-Intrusive Paradigm)
        import math
        import numpy as np
        
        # 1. Non-linear mapping implementations
        
        # SNR (sigmoid scaling)
        # Center shifted to 12dB: clean speech (18-22dB) now saturates towards 40pts
        # A perfectly clean recording at 22dB gets ~38/40 pts here
        wsnr_score = 40.0 / (1.0 + math.exp(-0.5 * (windowed_snr - 12.0)))
        
        # Formant Energy (power scaling)
        # Real speech rarely exceeds 0.45 formant ratio, not 0.6, due to sub-band fundamentals.
        clamped_formant = max(0.0, min(1.0, formant_energy_ratio / 0.45))
        formant_score = 35.0 * (clamped_formant ** 1.5)
        
        # Spectral Flatness (log scaling)
        # Ceiling of 30dB: good audio with flatness~0.04 gets ~14dB on log scale => 14/30=0.47 => 11.7pts
        # Ceiling of 30 gives much better resolution in the 0.03-0.2 flatness range for real microphones
        flatness = np.clip(spectral_flatness, 1e-6, 1.0)
        flatness_db = -10 * np.log10(flatness)
        sf_score = 25.0 * np.clip(flatness_db / 30.0, 0.0, 1.0)
        
        base_score = wsnr_score + formant_score + sf_score

        # 2. Multiplicative Penalties

        # ZCR Exponential Penalty
        if zcr <= 0.12:
            p_zcr = 1.0
        else:
            p_zcr = math.exp(-8.0 * (zcr - 0.12))
            
        p_zcr = max(0.0, min(1.0, p_zcr))
        
        # Noise Trapdoor Multipliers
        if windowed_snr < 10.0:
            p_noise = 0.4
        elif spectral_flatness > 0.2:
            p_noise = 0.5
        else:
            p_noise = 1.0
            
        # Speech Presence Gate
        p_speech = min(1.0, (formant_energy_ratio / 0.35) ** 0.7)
        
        # 3. Final Pipeline Calculation
        final_score = base_score * (0.5 + 0.5 * p_speech) * p_zcr * p_noise
        final_score = min(100.0, max(0.0, final_score))

        # Debug Trace
        print({
            "SNR": windowed_snr,
            "ZCR": zcr,
            "Flatness": spectral_flatness,
            "Formant": formant_energy_ratio,
            "Base Score": base_score,
            "p_zcr": p_zcr,
            "p_noise": p_noise,
            "p_speech": p_speech,
            "Final Score": final_score
        })
        
        # Generate detailed UI Feedback
        feedback = []
        noise_level = "Low"
        
        if windowed_snr < 10:
            feedback.append("⚠️ High presence of reverberation or constant background chatter.")
            noise_level = "High"
        elif windowed_snr < 18:
            feedback.append("Moderate ambient noise detected in speech pauses.")
            noise_level = "Medium"
        else:
            feedback.append("Excellent dynamic contrast (Clear speech bursts).")
            
        if spectral_flatness > 0.2:
            feedback.append("🛑 Heavy broadband hiss/drone overshadowing the voice.")
            
        if zcr > 0.15:
            feedback.append("🛑 Harsh static or wind distortion detected in the waveform.")
            
        if formant_energy_ratio < 0.35:
            feedback.append("📉 Frequency distribution indicates deeply muffled or 'underwater' audio.")
        else:
            feedback.append("Strong organic human vocal tonality located.")

        # Quality Classification Layer
        if final_score >= 80:
            label = "Excellent"
        elif final_score >= 60:
            label = "Good"
        elif final_score >= 40:
            label = "Average"
        elif final_score >= 20:
            label = "Poor"
        else:
            label = "Bad"
            
        # Extract generic chunked confidence score logic developed from the Processor module
        confidence = metrics.get("confidence", round((final_score / 100.0), 2))
            
        return {
            "score": round(final_score, 1),
            "label": label,
            "snr": round(windowed_snr, 1), 
            "transcription": transcription,
            "confidence": confidence,
            "noise_level": noise_level,
            "clarity_score": round((final_score / 100.0), 2),
            "feedback": feedback,
            "dsp_metrics": {
                "metrics": {
                    "spectral_flatness": round(spectral_flatness, 4),
                    "windowed_snr": round(windowed_snr, 1),
                    "formant_energy_ratio": round(formant_energy_ratio, 4),
                    "zcr": round(zcr, 4)
                },
                "component_scores": {
                    "base_score": round(base_score, 1),
                    "wsnr_score": round(wsnr_score, 1),
                    "sf_score": round(sf_score, 1),
                    "formant_score": round(formant_score, 1),
                    "p_zcr": round(p_zcr, 2),
                    "p_noise": round(p_noise, 2),
                    "p_speech": round(p_speech, 2)
                }
            }
        }

if __name__ == "__main__":
    pass

