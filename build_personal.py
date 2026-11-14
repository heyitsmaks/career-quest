"""Build a portable private map from private/plan.json and the public interface."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
data = json.loads((root / "private/plan.json").read_text(encoding="utf-8-sig"))
page = (root / "index.html").read_text(encoding="utf-8")
payload = json.dumps(data, ensure_ascii=False).replace("<", r"\u003c")
page = re.sub(r'(?<=id="plan">).*?(?=</script>)', lambda _: payload, page, flags=re.S)
page = page.replace("Демонстрационная карта", "Личная карта")
page = page.replace('<link rel="stylesheet" href="app.css">', "<style>" + (root / "app.css").read_text(encoding="utf-8") + "</style>")
for script in ("atlas.js", "app.js"):
    page = page.replace(f'<script src="{script}"></script>', "<script>" + (root / script).read_text(encoding="utf-8") + "</script>")
(root / "private/Моя карта.html").write_text(page, encoding="utf-8")
