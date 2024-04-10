# Monitor main.js, styles.css, manifest.json and automatically copy them to obsidian plugin folder.

import shutil  
import time  
import os
import datetime  
from watchdog.observers import Observer  
from watchdog.events import FileSystemEventHandler  

YELLOW = '\033[93m'  
GREEN = '\033[92m'   
RESET = '\033[0m'    
  
class MultiFileHandler(FileSystemEventHandler):  
    def __init__(self, file_mapping):  
        self.file_mapping = file_mapping  
  
    def on_modified(self, event):  
        if not event.is_directory:  
            src_file = event.src_path  
            if src_file in self.file_mapping:  
                dest_file = self.file_mapping[src_file]  
                print(f"{YELLOW}[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {src_file} has been modified{RESET}") 
                shutil.copy2(src_file, dest_file)  
                print(f"{GREEN}[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Copied successfully to {dest_file}.{RESET}")

obsidian_plugin_folder = "E:/Projects/vocabulary-view-test/.obsidian/plugins/vocabulary-view"

script_dir = os.path.dirname(os.path.abspath(__file__))  
source_dir = script_dir  
destination_dir = os.path.normpath(obsidian_plugin_folder)

  
if __name__ == "__main__":  
    # 创建一个字典，将源文件映射到目标文件
    file_mapping = {  
        os.path.join(source_dir, "main.js"): os.path.join(destination_dir, "main.js"),  
        os.path.join(source_dir, "styles.css"): os.path.join(destination_dir, "styles.css"),  
        os.path.join(source_dir, "manifest.json"): os.path.join(destination_dir, "manifest.json"),  
        # 添加更多文件映射...  
    }
  
    event_handler = MultiFileHandler(file_mapping)  
    observer = Observer()  
  
    # 对每个源文件所在的目录设置监视器  
    for src_file in file_mapping.keys():  
        directory_to_watch = os.path.dirname(src_file)  # 获取目录  
        observer.schedule(event_handler, path=directory_to_watch, recursive=False)  
  
    observer.start()  
  
    try:  
        while True:  
            time.sleep(2)  # 你可以根据需要调整sleep时间  
    except KeyboardInterrupt:  
        observer.stop()  
    observer.join()