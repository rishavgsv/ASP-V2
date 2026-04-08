import math
import numpy as np

cases = [
    ('CLEAN STUDIO',       22, 0.04, 0.5,  0.09),
    ('GOOD RAILWAY ANNC',  18, 0.08, 0.42, 0.11),
    ('MODERATE NOISE',     13, 0.15, 0.3,  0.18),
    ('NOISY DISTORTED',     7, 0.35, 0.12, 0.35),
    ('HEAVY NOISE',         3, 0.55, 0.05, 0.5),
]

SPEECH_THRESH = 0.45

results = []
for lbl, snr, flatness, formant, zcr in cases:
    wsnr_score = 40.0 / (1.0 + math.exp(-0.5 * (snr - 12.0)))
    cf = max(0.0, min(1.0, formant / 0.45))
    fs = 35.0 * (cf ** 1.5)
    fd = float(-10 * np.log10(np.clip(flatness, 1e-6, 1.0)))
    sf = 25.0 * float(np.clip(fd / 30.0, 0.0, 1.0))
    base = wsnr_score + fs + sf
    pz = 1.0 if zcr <= 0.12 else math.exp(-8.0 * (zcr - 0.12))
    pz = max(0.0, min(1.0, pz))
    pn = 0.4 if snr < 10 else (0.5 if flatness > 0.2 else 1.0)
    ps = min(1.0, (formant / SPEECH_THRESH) ** 0.7)
    final = min(100.0, max(0.0, base * (0.5 + 0.5 * ps) * pz * pn))
    results.append((lbl, final, base, ps, pn, pz, wsnr_score, fs, sf))

with open('score_results.txt', 'w') as f:
    f.write("=" * 80 + "\n")
    f.write("SCORE CALIBRATION MATRIX\n")
    f.write("=" * 80 + "\n\n")
    for lbl, final, base, ps, pn, pz, wsnr, fs, sf in results:
        f.write(f"{lbl:26s}  FINAL={final:5.1f}  base={base:5.1f}  wsnr={wsnr:5.1f}  form={fs:5.1f}  flat={sf:5.1f}  ps={ps:.2f}  pn={pn:.1f}  pz={pz:.2f}\n")
    f.write("\nEXPECTED: Clean=85-95, Good=60-80, Moderate=40-60, Noisy<25\n")
