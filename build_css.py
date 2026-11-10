"""Сборка styles.css из scss файлов с меткой @generated для git hook."""
import os

def build():
    nav = open("_legacy-nav.scss", encoding="utf-8").read()
    base = open("_legacy-base.scss", encoding="utf-8").read()
    main_lines = [l for l in open("styles.scss", encoding="utf-8").readlines() 
                  if not l.strip().startswith("@import") and not l.strip().startswith("@charset")]
    comp = open("_components.scss", encoding="utf-8").read()
    inner = open("_inner-pages.scss", encoding="utf-8").read()
    widgets = open("_widgets.scss", encoding="utf-8").read()

    content = "/* @generated compiled from styles.scss */\n@charset \"UTF-8\";\n" + nav + "\n" + base + "\n" + "".join(main_lines) + "\n" + comp + "\n" + inner + "\n" + widgets
    with open("styles.css", "w", encoding="utf-8") as f:
        f.write(content)
    print("styles.css generated successfully, size:", os.path.getsize("styles.css"), "bytes")

if __name__ == "__main__":
    build()
