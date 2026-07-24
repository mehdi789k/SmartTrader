import win32gui

def callback(hwnd, extra):
    title = win32gui.GetWindowText(hwnd)
    if title:
        print(hwnd, title)
    return True

win32gui.EnumWindows(callback, None)
