# 拼装脚本：v0.4 布局 demo
# 复用 ../设计规范_v0.3/src/ 下的全部模块，只替换三处：
#   10_body.html   → 本目录 src/10_body.html（新布局 DOM）
#   新增 08_layout.css（布局覆盖，接在 07_extra.css 之后）
#   30_embed.js    → 本目录 src/30_layout.js（画布常驻、侧栏、浮动回复、初始化）
#   新增 29_nest.js（嵌套系统：预览 / 进入 / 结构树 / 父图位置卡；示例图加第三层）
# 用法：python build.py   产物：./画布_布局demo.html
import os
here = os.path.dirname(os.path.abspath(__file__))
base = os.path.join(here, '..', '设计规范_v0.3')
mine = os.path.join(here, 'src')
order = ['00_head.html', 'TOKENS', '02_base.css', '03_node.css', '04_edge.css', '05_panels.css', '06_controls.css', '07_extra.css',
         '*08_layout.css', '*10_body.html',
         '20_icons.js', '21_defs.js', '22_state.js', '23_geom.js', '24_render.js', '25_pointer.js', '26_keys.js', '27_panels.js', '28_run.js', '29_model.js',
         '*29_nest.js', '*30_layout.js', '99_tail.html']
out = []
for f in order:
    if f == 'TOKENS':
        out.append(open(os.path.join(base, 'tokens.css'), encoding='utf8').read()); continue
    own = f.startswith('*'); f = f.lstrip('*')
    p = os.path.join(mine if own else os.path.join(base, 'src'), f)
    if f.endswith(('.js', '.css')):
        out.append('/* ---- ' + ('布局demo_v0.4/src/' if own else '设计规范_v0.3/src/') + f + ' ---- */\n')
    out.append(open(p, encoding='utf8').read())
html = '\n'.join(out).replace('<title>Harness · 画布旗舰 demo v0.3</title>', '<title>Harness · 布局 demo v0.4</title>', 1)
open(os.path.join(here, '画布_布局demo.html'), 'w', encoding='utf8').write(html)
print('built', len(html))
