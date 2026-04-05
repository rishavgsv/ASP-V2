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
        
        # Smooth mapping function
        def map_score(val, min_val, max_val, max_points):
            # If min_val > max_val, it means lower variable values give higher points (e.g. flatness)
            if min_val > max_val:
                ratio = (min_val - val) / (min_val - max_val)
            else:
                ratio = (val - min_val) / (max_val - min_val)
            return min(max_points, max(0.0, ratio * max_points))

        # 1. Windowed SNR Score: 0 to 40 max points.
        # Below 5dB = 0 pts. Above 25dB = 40 pts.
        wsnr_score = map_score(windowed_snr, 5.0, 25.0, 40.0)
        
        # 2. Spectral Flatness Score: 0 to 25 max points.
        # Flatness 0.4 (hiss/noise) = 0 pts. Flatness 0.05 (pure speech) = 25 pts.
        sf_score = map_score(spectral_flatness, 0.35, 0.05, 25.0)
        
        # 3. Formant Structure Score: 0 to 35 max points.
        # Power within human vocal range 300Hz-3400Hz.
        # Ratio 0.2 = 0 pts, Ratio 0.6+ = 35 pts.
        formant_score = map_score(formant_energy_ratio, 0.2, 0.6, 35.0)

        # 4. Zero-Crossing Rate Penalty: up to 30 points deducted.
        # ZCR 0.1 (normal) = 0 penalty. ZCR 0.4 (heavy static) = 30 penalty.
        zcr_penalty = map_score(zcr, 0.1, 0.35, 30.0)
        
        raw_quality_score = wsnr_score + sf_score + formant_score - zcr_penalty
        final_score = min(100.0, max(0.0, raw_quality_score))
        
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
            
        if spectral_flatness > 0.25:
            feedback.append("🛑 Heavy broadband hiss/drone overshadowing the voice.")
            
        if zcr > 0.15:
            feedback.append("🛑 Harsh static or wind distortion detected in the waveform.")
            
        if formant_energy_ratio < 0.35:
            feedback.append("📉 Frequency distribution indicates deeply muffled or 'underwater' audio.")
        else:
            feedback.append("Strong organic human vocal tonality located.")

        if final_score > 75:
            label = "Good"
        elif final_score > 40:
            label = "Moderate"
        else:
            label = "Poor"
            
        return {
            "score": round(final_score, 1),
            "label": label,
            "snr": round(windowed_snr, 1), # Send windowed SNR as the primary SNR metric
            "transcription": transcription,
            "confidence": round((final_score / 100.0), 2),
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
                    "wsnr_score": round(wsnr_score, 1),
                    "sf_score": round(sf_score, 1),
                    "formant_score": round(formant_score, 1),
                    "zcr_penalty": round(zcr_penalty, 1)
                }
            }
        }

if __name__ == "__main__":
    pass

