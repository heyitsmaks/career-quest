"""Create the standalone local edition. Requires only Python's standard library."""
import base64
import json
import re
from pathlib import Path
root = Path(__file__).resolve().parent
private = root / "private"
data = json.loads((private / "plan.json").read_text(encoding="utf-8-sig"))
page = (root / "index.html").read_text(encoding="utf-8")
payload = json.dumps(data, ensure_ascii=False).replace("<", r"\u003c")
page = re.sub(r'(<script id="plan" type="application/json">).*?(</script>)',
              lambda m: m[1] + payload + m[2], page, flags=re.S)
page = page.replace('<link rel="stylesheet" href="app.css">', '<style>' + (root / "app.css").read_text(encoding="utf-8") + '</style>')
art = base64.b64encode((root / "assets/archipelago.png").read_bytes()).decode()
page = page.replace('src="assets/archipelago.png"', 'src="data:image/png;base64,' + art + '"')
for script in ("world.bundle.js", "cloud.js", "app.js"):
    code = (root / script).read_text(encoding="utf-8").replace("</script", r"<\/script")
    page = page.replace(f'<script src="{script}"></script>', '<script>' + code + '</script>')
(private / "Моя карта.html").write_text(page, encoding="utf-8")