"""Build build/icon.icns from build/icon.png (1024x1024) using PNG-encoded icon entries."""
import io, struct, sys
from PIL import Image

src = Image.open(sys.argv[1] if len(sys.argv) > 1 else 'build/icon.png').convert('RGBA')
entries = [(b'ic10', 1024), (b'ic14', 1024), (b'ic09', 512), (b'ic13', 512), (b'ic08', 256),
           (b'ic12', 64), (b'ic07', 128), (b'ic11', 32)]
chunks = b''
for code, size in entries:
    buf = io.BytesIO()
    src.resize((size, size), Image.LANCZOS).save(buf, 'PNG')
    data = buf.getvalue()
    chunks += code + struct.pack('>I', len(data) + 8) + data
open('build/icon.icns', 'wb').write(b'icns' + struct.pack('>I', len(chunks) + 8) + chunks)
print('wrote build/icon.icns', len(chunks) + 8, 'bytes')
