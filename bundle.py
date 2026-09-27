import os

# Настройки
OUTPUT_FILE = "_llm_context.txt"
ALLOWED_EXTENSIONS = {'.html', '.css', '.js', '.json', '.md'}
IGNORE_DIRS = {'node_modules', '.git', '.electron-data'}
IGNORE_FILES = {'package-lock.json', OUTPUT_FILE, 'bundle.py'}

def should_process_file(filepath):
    filename = os.path.basename(filepath)
    if filename in IGNORE_FILES:
        return False
    _, ext = os.path.splitext(filename)
    return ext.lower() in ALLOWED_EXTENSIONS

def main():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Проходим по всем папкам
        for root, dirs, files in os.walk('.'):
            # Исключаем ненужные директории
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                filepath = os.path.join(root, file)
                
                if should_process_file(filepath):
                    # Приводим путь к красивому относительному виду (например js/app.js)
                    rel_path = os.path.relpath(filepath, '.').replace('\\', '/')
                    
                    try:
                        with open(filepath, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                        outfile.write(f"--- START OF FILE {rel_path} ---\n\n")
                        outfile.write(content)
                        outfile.write("\n\n")
                        print(f"Добавлен: {rel_path}")
                    except Exception as e:
                        print(f"Ошибка чтения {rel_path}: {e}")
                        
    print(f"\n✅ Готово! Весь проект собран в файл: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()