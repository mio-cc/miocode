# 拼装脚本：按文件名顺序把 src/ 拼成 ../画布_旗舰demo.html；01_tokens 直接读取 ../tokens.css
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
order = ['00_head.html', 'TOKENS', '02_base.css', '03_node.css', '04_edge.css', '05_panels.css', '06_controls.css', '07_extra.css', '10_body.html',
         '20_icons.js', '21_defs.js', '22_state.js', '23_geom.js', '24_render.js', '25_pointer.js', '26_keys.js', '27_panels.js', '28_run.js', '29_model.js', '30_embed.js', '99_tail.html']
out = []
for f in order:
    if f == 'TOKENS':
        out.append(open(os.path.join(here, '..', 'tokens.css'), encoding='utf8').read())
    else:
        out.append('/* ---- src/' + f + ' ---- */\n' if f.endswith(('.js', '.css')) else '')
        out.append(open(os.path.join(here, f), encoding='utf8').read())
html = '\n'.join(out)
open(os.path.join(here, '..', '画布_旗舰demo.html'), 'w', encoding='utf8').write(html)
print('built', len(html))
