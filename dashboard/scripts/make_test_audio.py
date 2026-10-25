"""
Generate test audio wav files with distinct character names and famous dialogue lines
using Windows SAPI (via pywin32 or COM through ctypes / PowerShell) or synthetic signals.
"""
import subprocess
import os

output_wav1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_dialogue_heat.wav"))
output_wav2 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_dialogue_bladerunner.wav"))

ps_code = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$synth.SetOutputToWaveFile('{output_wav1}')
$synth.Speak('Vincent, he is walking into the terminal! Neil McCauley is armed and dangerous, Lieutenant Hanna. Tell Chris Shiherlis to hold his position.')

$synth.SetOutputToWaveFile('{output_wav2}')
$synth.Speak('Officer K, report immediately to Lieutenant Joshi. Sapper Morton has been neutralized. The child was born, not manufactured.')

$synth.Dispose()
Write-Output "GENERATED_ALL"
"""

res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_code], capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("Files:", os.path.exists(output_wav1), os.path.exists(output_wav2))

