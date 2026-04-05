import numpy as np
import scipy.io.wavfile as wavfile
import os

def create_synthetic_test_file(output_path="test_announcement.wav"):
    """Creates a synthetic noisy announcement for testing."""
    # 1. Generate a sine sweep or some 'speech-like' noise if no clean sample exists
    sr = 16000
    duration = 5.0
    t = np.linspace(0, duration, int(sr * duration))
    
    # Simple 'speech' placeholder: modulated sine waves
    speech = np.sin(2 * np.pi * 440 * t) * np.sin(2 * np.pi * 2 * t)
    speech = speech * 0.5
    
    # 2. Add 'Station North' (White noise + Hum)
    noise = np.random.normal(0, 0.1, len(t)) # White noise
    hum = np.sin(2 * np.pi * 50 * t) * 0.05 # 50Hz hum
    
    noisy_speech = speech + noise + hum
    
    # Convert to 16-bit PCM for savety
    noisy_speech_int = np.int16(noisy_speech / np.max(np.abs(noisy_speech)) * 32767)
    
    # 3. Save
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    wavfile.write(output_path, sr, noisy_speech_int)
    print(f"Synthetic test file created at: {output_path}")


if __name__ == "__main__":
    create_synthetic_test_file("aaqa/data/test_noisy.wav")
