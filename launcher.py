import sys
import os
import shutil

# 🌟 路径定位逻辑
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    EXE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXE_DIR = BASE_DIR

import webview
import threading
import uvicorn
import time
import socket
import json
import subprocess
import traceback
from cms_core.main import app

frontend_process = None
WINDOW_CONFIG_FILE = os.path.join(EXE_DIR, 'window_config.json')

def release_port(port):
    try:
        command = f'netstat -ano | findstr :{port}'
        result = subprocess.check_output(command, shell=True).decode()
        lines = result.strip().split('\n')
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 5 and parts[3] == 'LISTENING':
                pid = parts[-1]
                subprocess.run(f'taskkill /PID {pid} /F /T', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(0.5)
    except:
        pass

def load_window_size():
    try:
        if os.path.exists(WINDOW_CONFIG_FILE):
            with open(WINDOW_CONFIG_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {"width": 1440, "height": 900}

def save_window_size(width, height):
    try:
        with open(WINDOW_CONFIG_FILE, 'w') as f:
            json.dump({"width": int(width), "height": int(height)}, f)
    except:
        pass

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def write_port_config(port):
    # 写入解压目录供前端读取
    public_dir = os.path.join(BASE_DIR, 'public')
    os.makedirs(public_dir, exist_ok=True)
    with open(os.path.join(public_dir, 'backend_config.json'), 'w', encoding='utf-8') as f:
        json.dump({"api_port": port}, f)

    standalone_public = os.path.join(BASE_DIR, '.next', 'standalone', 'public')
    if os.path.exists(os.path.join(BASE_DIR, '.next', 'standalone')):
        os.makedirs(standalone_public, exist_ok=True)
        with open(os.path.join(standalone_public, 'backend_config.json'), 'w', encoding='utf-8') as f:
            json.dump({"api_port": port}, f)

def wait_for_port(port, timeout=60):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=1):
                return True
        except (ConnectionRefusedError, socket.timeout, OSError):
            time.sleep(1)
    return False

class WindowAPI:
    def resize_window(self, width, height):
        save_window_size(width, height)
        webview.windows[0].resize(int(width), int(height))
        return True
    def minimize_window(self): webview.windows[0].minimize()
    def maximize_window(self): webview.windows[0].toggle_fullscreen()
    def close_window(self): on_closed()

def run_api(port):
    # 🌟 强制后端在 EXE 所在的真实目录工作，确保能读取到旁边的 data/ 等数据
    os.chdir(EXE_DIR)
    print(f"🟢 [后端] 工作路径已锁定: {EXE_DIR}")
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    except Exception as e:
        print("❌ [后端] 崩溃报错：")
        traceback.print_exc()

def on_closed():
    if frontend_process:
        subprocess.run(f"taskkill /F /T /PID {frontend_process.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    release_port(frontend_port)
    release_port(backend_port)
    os._exit(0)

def on_shown():
    win_size = load_window_size()
    webview.windows[0].resize(int(win_size["width"]), int(win_size["height"]))

if __name__ == "__main__":
    frontend_port = get_free_port()
    backend_port = get_free_port()

    env_vars = os.environ.copy()
    env_vars["PORT"] = str(frontend_port)

    standalone_dir = os.path.join(BASE_DIR, '.next', 'standalone')
    server_js = os.path.join(standalone_dir, 'server.js')

    # 🌟 核心自适应逻辑：判断是"打包运行"还是"开发运行"
    if os.path.exists(server_js):
        print("🚀 [生产模式] 检测到 standalone 构建...")

        # 修复 Next.js standalone 缺失静态资源的问题
        standalone_next = os.path.join(standalone_dir, '.next')
        main_next_static = os.path.join(BASE_DIR, '.next', 'static')
        standalone_static = os.path.join(standalone_next, 'static')

        if not os.path.exists(standalone_static) and os.path.exists(main_next_static):
            print("📦 [修复] 正在复制静态资源到 standalone 目录 (首次启动可能需要) ...")
            os.makedirs(standalone_next, exist_ok=True)
            shutil.copytree(main_next_static, standalone_static)
            print("✅ 静态资源复制完成")

        # 同步 BUILD_ID
        main_build_id = os.path.join(BASE_DIR, '.next', 'BUILD_ID')
        standalone_build_id = os.path.join(standalone_next, 'BUILD_ID')
        if os.path.exists(main_build_id) and not os.path.exists(standalone_build_id):
            shutil.copy2(main_build_id, standalone_build_id)

        # 同步关键 manifest 文件
        for fname in ['routes-manifest.json', 'prerender-manifest.json', 'images-manifest.json',
                     'server-reference-manifest.json', 'app-path-routes-manifest.json',
                     'export-marker.json', 'required-server-files.json']:
            src = os.path.join(BASE_DIR, '.next', fname)
            dst_dir = standalone_next
            if os.path.exists(src):
                os.makedirs(dst_dir, exist_ok=True)
                shutil.copy2(src, os.path.join(dst_dir, fname))

        # 同步 server 子目录 (如果 standalone 中缺失)
        main_server_dir = os.path.join(BASE_DIR, '.next', 'server')
        standalone_server_dir = os.path.join(standalone_next, 'server')
        if os.path.exists(main_server_dir) and not os.path.exists(standalone_server_dir):
            print("📦 [修复] 正在复制 server 目录 ...")
            shutil.copytree(main_server_dir, standalone_server_dir)

        # 同步 public 资源
        main_public = os.path.join(BASE_DIR, 'public')
        standalone_public = os.path.join(standalone_dir, 'public')
        if os.path.exists(main_public):
            if not os.path.exists(standalone_public):
                shutil.copytree(main_public, standalone_public)
            else:
                for f in os.listdir(main_public):
                    src_f = os.path.join(main_public, f)
                    dst_f = os.path.join(standalone_public, f)
                    if os.path.isfile(src_f) and not os.path.exists(dst_f):
                        shutil.copy2(src_f, dst_f)

        # 同步 deploy_config.json (确保博客物理路径一致)
        main_deploy_config = os.path.join(BASE_DIR, 'data', 'deploy_config.json')
        standalone_data_dir = os.path.join(standalone_dir, 'data')
        if os.path.exists(main_deploy_config):
            os.makedirs(standalone_data_dir, exist_ok=True)
            shutil.copy2(main_deploy_config, os.path.join(standalone_data_dir, 'deploy_config.json'))

        # 同步 siteConfig.ts (确保前端配置一致)
        main_site_config = os.path.join(BASE_DIR, 'siteConfig.ts')
        if os.path.exists(main_site_config):
            shutil.copy2(main_site_config, os.path.join(standalone_dir, 'siteConfig.ts'))

        env_vars["HOSTNAME"] = "127.0.0.1"
        frontend_process = subprocess.Popen(["node", "server.js"], cwd=standalone_dir, env=env_vars, shell=True)
        window_url = f"http://127.0.0.1:{frontend_port}"
    else:
        print("🛠️ [开发模式] 使用 localhost 保持兼容...")
        frontend_process = subprocess.Popen("npm run dev", shell=True, cwd=BASE_DIR, env=env_vars)
        window_url = f"http://localhost:{frontend_port}"

    write_port_config(backend_port)
    threading.Thread(target=run_api, args=(backend_port,), daemon=True).start()

    if not wait_for_port(backend_port) or not wait_for_port(frontend_port):
        print(">>> ❌ 前后端启动失败！")
        on_closed()
        sys.exit(1)

    time.sleep(1.5)

    api = WindowAPI()
    window = webview.create_window(
        title='星辉云端·控制台',
        url=window_url,
        width=1440, height=900, min_size=(1024, 768),
        background_color='#0f172a', resizable=True, frameless=True, easy_drag=False, js_api=api
    )

    window.events.shown += on_shown
    window.events.closed += on_closed

    try:
        webview.start(debug=True)
    except KeyboardInterrupt:
        on_closed()