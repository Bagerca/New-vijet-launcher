import os

# Имя выходного файла
OUTPUT_FILE = "_llm_context.txt"

# Папки, в которые скрипт ВООБЩЕ не должен заглядывать
IGNORE_DIRS = {
    'node_modules',
    'dist',
    'build',
    '.git',
    '.electron-data',
    '.vscode',
    '__pycache__',
    '.idea'
}

# Расширения файлов, которые мы НЕ хотим читать (бинарники, картинки, музыка)
IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico',
    '.mp3', '.wav', '.ogg',
    '.exe', '.zip', '.tar', '.gz',
    '.woff', '.woff2', '.ttf', '.eot'
}

# Файлы, которые нужно пропустить
IGNORE_FILES = {
    OUTPUT_FILE,
    'bundle.py',
    'package-lock.json'
}

def is_text_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext not in IGNORE_EXTENSIONS

def generate_context():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        for root, dirs, files in os.walk(root_dir):
            # ВАЖНО: Модифицируем dirs на месте, чтобы os.walk НЕ заходил в эти папки!
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                if not is_text_file(file):
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir).replace('\\', '/')
                
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        out.write(f"\n--- START OF FILE {rel_path} ---\n\n")
                        out.write(content)
                        out.write("\n")
                        print(f"[+] Добавлен: {rel_path}")
                except Exception as e:
                    print(f"[-] Пропущен (ошибка чтения): {rel_path} ({e})")

    print(f"\n Готово! Проект собран в '{OUTPUT_FILE}' без мусора из dist и node_modules.")

if __name__ == '__main__':
    generate_context()