# 拼装脚本：demo v0.5（v0.5.11）
# 产物：./画布_demo_v0.5.html（默认压缩：去注释和缩进，体积控制在 600KB 以内——Quick 的页面预览超过约 600KB 会显示空白）
# 用法：python build.py          生成压缩版
#       python build.py --full   生成不压缩的版本（便于调试，体积约 620KB）
# 模块来源：../设计规范_v0.3/src/（无前缀）、../布局demo_v0.4/src/（@）、本目录 src/（#）
#   09_palettes.css  4 套内置主题        11_sessions.css  多会话             12_center.css  设置中心 / 资源库 / 通知 / 输入框
#   13_polish.css    框架与画布背景      14_nodes.css     节点库树 / 参数框   15_art.css     顶部条 / 节点卡片 / 输入栏
#   16_monitor.css   会话监控            17_fix.css       U.24 修正          18_rebalance.css 侧栏分区
#   19_hier.css      侧栏三级层级        20_newsess.css   新建会话独立成行    21_flow.css    滚动条 / 流动高亮 / 思考挡位
#   22_drag.css      可拖动面板          23_tab.css       回复与输入框的小标签、流动线条、新建会话图标
#   25_pointer.js / 29_nest.js  指针捕获后按坐标取元素（子图单击预览、双击进入）
#   31_palette.js 主题  33_config.js 配置数据  32_sessions.js 多会话  34_center.js 设置中心 + 资源库  35_inbox.js 通知 / 账户 / 引导
#   36_composer.js 输入框  37_nodes.js 参数 / 提示词 / 节点库  38_hub.js 包 / 连接  39_monitor.js 会话监控  40_tidy.js 减法
#   41_fix.js 左栏滚动等  42_hier.js 分区图标  43_float.js 回复线条收拢 / 展开 + 流动高亮  44_drag.js 面板拖动
import os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
v03 = os.path.join(here, '..', '设计规范_v0.3')
v04 = os.path.join(here, '..', '布局demo_v0.4', 'src')
mine = os.path.join(here, 'src')
order = ['00_head.html', 'TOKENS', '02_base.css', '03_node.css', '04_edge.css', '05_panels.css', '06_controls.css', '07_extra.css',
         '@08_layout.css', '#09_palettes.css', '#11_sessions.css', '#12_center.css', '#13_polish.css', '#14_nodes.css', '#15_art.css', '#16_monitor.css',
         '#17_fix.css', '#18_rebalance.css', '#19_hier.css', '#20_newsess.css', '#21_flow.css', '#22_drag.css', '#23_tab.css', '#10_body.html',
         '20_icons.js', '21_defs.js', '22_state.js', '23_geom.js', '24_render.js', '#25_pointer.js', '#26_keys.js', '27_panels.js', '28_run.js', '29_model.js',
         '#29_nest.js', '@30_layout.js', '#31_palette.js', '#33_config.js', '#32_sessions.js', '#34_center.js', '#35_inbox.js', '#36_composer.js', '#37_nodes.js',
         '#38_hub.js', '#39_monitor.js', '#40_tidy.js', '#41_fix.js', '#42_hier.js', '#43_float.js', '#44_drag.js', '99_tail.html']

def min_css(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s*([{};,>])\s*', r'\1', s)
    return s.replace(';}', '}').strip() + '\n'

def min_js(s):
    s = re.sub(r'^[ \t]*/\*.*?\*/[ \t]*\n', '', s, flags=re.S | re.M)
    out = []
    for line in s.split('\n'):
        t = line.strip()
        if not t or t.startswith('//'):
            continue
        out.append(t)
    return '\n'.join(out) + '\n'

minify = '--full' not in sys.argv
out = []
for f in order:
    if f == 'TOKENS':
        t = open(os.path.join(v03, 'tokens.css'), encoding='utf8').read()
        out.append(min_css(t) if minify else t); continue
    if f[0] == '#': p = os.path.join(mine, f[1:]); f = f[1:]
    elif f[0] == '@': p = os.path.join(v04, f[1:]); f = f[1:]
    else: p = os.path.join(v03, 'src', f)
    t = open(p, encoding='utf8').read()
    if minify and f.endswith('.css'): t = min_css(t)
    if minify and f.endswith('.js'): t = min_js(t)
    if f.endswith(('.js', '.css')):
        out.append('/* ---- ' + f + ' ---- */\n')
    out.append(t)
html = '\n'.join(out).replace('<title>Harness · 画布旗舰 demo v0.3</title>', '<title>Harness · demo v0.5</title>', 1)
open(os.path.join(here, '画布_demo_v0.5.html'), 'w', encoding='utf8').write(html)
print('built', len(html.encode('utf8')), 'bytes', '(minified)' if minify else '(full)')
