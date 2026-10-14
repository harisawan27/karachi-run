"""Use the official public TRELLIS.2 Gradio API; never replace live models."""
import sys
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tmp' / 'gradio-client'))
from gradio_client import Client, handle_file

source = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
if destination.exists():
    raise SystemExit('Refusing to overwrite an existing candidate.')
client = Client('microsoft/TRELLIS.2')
print('Starting free generation session', flush=True)
client.predict(api_name='/start_session')
prepared = client.predict(input=handle_file(str(source)), api_name='/preprocess_image')
print('Image prepared; requesting 3D generation', flush=True)
client.predict(image=handle_file(prepared), seed=42, resolution='1024', api_name='/image_to_3d')
print('Extracting textured GLB', flush=True)
result = client.predict(decimation_target=100000, texture_size=2048, api_name='/extract_glb')
destination.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(result[0], destination)
print(f'Saved candidate: {destination}', flush=True)
