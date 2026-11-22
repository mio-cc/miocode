# -*- coding: utf-8 -*-
"""项目树检查脚本（G.01 §3.6）。只用标准库，Windows / macOS / Linux 都能直接运行。

用法（在 项目树_v0.5 目录或任意目录下）：
  python tools/check_tree.py              进度 + 错误 + 警告；有错误时退出码为 1
  python tools/check_tree.py --refs W.07.05   列出全树里引用这个编号的每一处（写这个节点前必须看）
  python tools/check_tree.py --next       按写作批次列出接下来该写的节点
  python tools/check_tree.py --quiet      只输出汇总和错误

检查项：
  E1 树索引.json 里的节点在磁盘上的文件（缺失 = 待写，只统计不报错）
  E2 磁盘上多出来的、不属于任何节点的文件（错误）
  E3 文件头：编号、类型、上级、状态、最后修改（错误）
  E4 00_树索引.md 与 树索引.json 的名称、文件路径一致（错误）
  E5 正文里引用的编号必须存在于树索引（错误）
  E6 术语：tools/术语检查.json 里登记的"不要叫"用词（错误；引述旧称的行会自动跳过）
  E7 demo 最新版本必须登记在 00_从这里开始.md 的回写记录里（错误）
  E8 00_树索引.md §1 的统计数字与 树索引.json 一致（错误）
  W1 实施类叶子缺少"实施卡"（警告）
"""
import io, json, os, re, sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 项目树_v0.5
SJ = os.path.dirname(ROOT)                                            # sj/
ALLOWED_ROOT_FILES = {"00_从这里开始.md", "00_树索引.md", "树索引.json", "01_文档模板.md", "接力日志.md"}
STATES = {"待写", "草稿", "已审", "冻结", "已废弃"}
TYPES = {"总": "总则", "规": "规范", "实": "实施", "说": "说明"}
BATCHES = ["P", "G", "C", "U", "S", "E", "B", "W", "Q", "O", "X", "T", "D", "R"]
REF_RE = re.compile(r"(?<![A-Za-z0-9_./])([PGCEBWUSQOXTDR](?:\.\d{2}){1,4})(?![\d.])")


def read(p):
    with io.open(p, encoding="utf-8") as f:
        return f.read()


def load_nodes():
    data = json.loads(read(os.path.join(ROOT, "树索引.json")))
    nodes, order = {}, []

    def walk(n, parent):
        nodes[n["id"]] = dict(n, parent=parent)
        order.append(n["id"])
        for c in n.get("children", []):
            walk(c, n["id"])

    for n in data:
        walk(n, None)
    return nodes, order


def header(text):
    """读第一张表格（文件头）里的 项 / 内容。"""
    h = {}
    for line in text.splitlines()[:20]:
        m = re.match(r"^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$", line)
        if m and m.group(1) not in ("项", "---"):
            h.setdefault(m.group(1), m.group(2))
        elif h and not line.startswith("|"):
            break
    return h


def all_md_files():
    out = []
    for d, dirs, fs in os.walk(ROOT):
        dirs[:] = [x for x in dirs if not x.startswith(".") and x != "tools"]
        for f in fs:
            out.append(os.path.relpath(os.path.join(d, f), ROOT).replace("\\", "/"))
    return out


def term_rules():
    p = os.path.join(ROOT, "tools", "术语检查.json")
    if not os.path.exists(p):
        return [], [], []
    cfg = json.loads(read(p))
    return cfg.get("rules", []), cfg.get("skip_files", []), cfg.get("skip_line_if", [])


def demo_latest():
    """找 sj/ 下版本最高的 demo_v*/README.md 里的"最新版本：vX.Y.Z"。"""
    best = None
    if not os.path.isdir(SJ):
        return None
    for d in os.listdir(SJ):
        p = os.path.join(SJ, d, "README.md")
        if d.startswith("demo_v") and os.path.exists(p):
            m = re.search(r"最新版本[：:]\s*(v[\d.]+)", read(p))
            if m:
                v = tuple(int(x) for x in m.group(1)[1:].split("."))
                if best is None or v > best[0]:
                    best = (v, m.group(1), d)
    return best


def main(argv):
    nodes, order = load_nodes()
    errors, warns = [], []
    files = all_md_files()
    texts = {}
    for f in files:
        if f.endswith(".md"):
            texts[f] = read(os.path.join(ROOT, f))

    # --refs
    if "--refs" in argv:
        target = argv[argv.index("--refs") + 1]
        own = nodes.get(target, {}).get("path")
        print("全树里引用 %s 的位置（%s）：" % (target, nodes.get(target, {}).get("name", "不在树索引里")))
        pat = re.compile(r"(?<![\d.])" + re.escape(target) + r"(?![\d]|\.\d)")
        n = 0
        for f in sorted(texts):
            if f == own or f.startswith("00_树索引"):
                continue
            for i, line in enumerate(texts[f].splitlines(), 1):
                if pat.search(line):
                    n += 1
                    print("  %s:%d  %s" % (f, i, line.strip()[:200]))
        print("共 %d 处。写 %s 之前逐条落实；还要读祖先链和索引\"素材\"列。" % (n, target))
        return 0

    path_to_id = {nodes[i]["path"]: i for i in order}

    # E1 / E3 / W1
    status = {}
    for nid in order:
        n = nodes[nid]
        p = n["path"]
        if p not in texts:
            status[nid] = "待写"
            continue
        h = header(texts[p])
        if not h:
            errors.append("E3 %s：没有文件头表" % p)
            status[nid] = "?"
            continue
        if h.get("编号", "").strip("`") != nid:
            errors.append("E3 %s：文件头编号是「%s」，应为 %s" % (p, h.get("编号"), nid))
        t = TYPES.get(n.get("type"), n.get("type"))
        if h.get("类型") != t:
            errors.append("E3 %s：类型是「%s」，树索引里是「%s」" % (p, h.get("类型"), t))
        parent = n["parent"]
        up = h.get("上级", "")
        if parent is None:
            if "无" not in up:
                errors.append("E3 %s：一级分支的上级应写「无」" % p)
        elif not up.startswith(parent + " ") and up != parent:
            errors.append("E3 %s：上级是「%s」，应以 %s 开头" % (p, up, parent))
        st = h.get("状态", "")
        if st not in STATES:
            errors.append("E3 %s：状态「%s」不在 %s 里" % (p, st, "/".join(sorted(STATES))))
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", h.get("最后修改", "")):
            errors.append("E3 %s：最后修改「%s」不是 YYYY-MM-DD" % (p, h.get("最后修改")))
        status[nid] = st
        if n.get("type") == "实" and not n.get("children") and "实施卡" not in texts[p]:
            warns.append("W1 %s：实施类叶子没有实施卡（G.01-R12）" % p)

    # E2
    for f in files:
        if f in path_to_id or f in ALLOWED_ROOT_FILES:
            continue
        errors.append("E2 %s：不属于任何节点（放进对应节点，或在 00_树索引.md §3.2 登记）" % f)

    # E4
    md = texts.get("00_树索引.md", "")
    for line in md.splitlines():
        m = re.match(r"^\|\s*`([A-Z](?:\.\d{2})*)`\s*\|(.*?)\|.*\|\s*`([^`]+)`\s*\|\s*$", line)
        if not m:
            continue
        nid, name, path = m.group(1), m.group(2).replace("*", "").replace("　", "").strip(), m.group(3)
        if nid not in nodes:
            errors.append("E4 00_树索引.md 有 %s，树索引.json 里没有" % nid)
            continue
        if nodes[nid]["path"] != path:
            errors.append("E4 %s：00_树索引.md 路径「%s」≠ 树索引.json「%s」" % (nid, path, nodes[nid]["path"]))
        if nodes[nid]["name"] != name:
            errors.append("E4 %s：00_树索引.md 名称「%s」≠ 树索引.json「%s」" % (nid, name, nodes[nid]["name"]))
    for nid in order:
        if ("| `%s` |" % nid) not in md:
            errors.append("E4 %s：树索引.json 有，00_树索引.md 没有" % nid)

    # E8 00_树索引.md §1 的统计数字与 树索引.json 一致
    leaves = [i for i in order if not nodes[i].get("children")]
    expect = {"文档总数": len(order), "叶子（最细一层）": len(leaves),
              "其中：实施类（要产出代码，带实施卡）": sum(1 for i in leaves if nodes[i].get("type") == "实"),
              "其中：规范类（只定规则）": sum(1 for i in leaves if nodes[i].get("type") == "规"),
              "其中：说明类（背景、指南、用户文档）": sum(1 for i in leaves if nodes[i].get("type") == "说")}
    for line in md.splitlines():
        m = re.match(r"^\|\s*([^|]+?)\s*\|\s*\**(\d+)\**\s*\|\s*$", line)
        if m and m.group(1) in expect and int(m.group(2)) != expect[m.group(1)]:
            errors.append("E8 00_树索引.md §1「%s」写的是 %s，实际 %d" % (m.group(1), m.group(2), expect[m.group(1)]))
        m = re.match(r"^\|\s*\*\*([A-Z])\*\*\s*\|.*\|\s*(\d+)\s*\|\s*$", line)
        if m:
            real = sum(1 for i in order if i.split(".")[0] == m.group(1))
            if int(m.group(2)) != real:
                errors.append("E8 00_树索引.md §1 %s 枝写的是 %s 份，实际 %d 份" % (m.group(1), m.group(2), real))

    # E5
    for f, t in texts.items():
        for i, line in enumerate(t.splitlines(), 1):
            for ref in REF_RE.findall(line):
                if ref not in nodes:
                    errors.append("E5 %s:%d：引用了不存在的编号 %s" % (f, i, ref))

    # E6
    rules, skip_files, skip_line_if = term_rules()
    for f, t in texts.items():
        if any(f.endswith(s) for s in skip_files):
            continue
        for i, line in enumerate(t.splitlines(), 1):
            if any(k in line for k in skip_line_if):
                continue
            for r in rules:
                if re.search(r["pattern"], line):
                    errors.append("E6 %s:%d：「%s」应写作「%s」 · %s" % (f, i, r.get("show", r["pattern"]), r["use"], line.strip()[:80]))

    # E7
    best = demo_latest()
    start = texts.get("00_从这里开始.md", "")
    if best:
        if not re.search(r"^\|[^|\n]*" + re.escape(best[1]) + r"(?![\d.])", start, re.M):
            errors.append("E7 %s/README.md 最新版本是 %s，00_从这里开始.md 的回写记录里没有这一版（G.01-R27）" % (best[2], best[1]))

    # --next
    if "--next" in argv:
        todo = [i for i in order if status.get(i) == "待写"]
        todo.sort(key=lambda i: (BATCHES.index(i[0]), order.index(i)))
        print("接下来该写的（按批次与树顺序，前 20 个）：")
        for i in todo[:20]:
            n = nodes[i]
            print("  %-10s %s  ·  %s  ·  素材：%s" % (i, n["name"], n.get("desc", ""), n.get("src", "")))
        print("（共 %d 份待写）" % len(todo))
        return 0

    # 汇总
    print("== 项目树进度 ==")
    print("%-3s %5s %5s %5s %5s %5s" % ("枝", "总数", "待写", "草稿", "已审", "冻结"))
    tot = [0, 0, 0, 0, 0]
    for b in BATCHES:
        ids = [i for i in order if i.split(".")[0] == b]
        row = [len(ids)] + [sum(1 for i in ids if status.get(i) == s) for s in ("待写", "草稿", "已审", "冻结")]
        tot = [a + c for a, c in zip(tot, row)]
        print("%-3s %5d %5d %5d %5d %5d" % ((b,) + tuple(row)))
    print("%-3s %5d %5d %5d %5d %5d" % (("合计",) + tuple(tot)))
    if best:
        print("demo 最新版本：%s（%s）" % (best[1], best[2]))
    print("\n== 错误 %d ==" % len(errors))
    for e in errors[:300]:
        print("  " + e)
    if len(errors) > 300:
        print("  …… 另有 %d 条" % (len(errors) - 300))
    if "--quiet" not in argv:
        print("\n== 警告 %d ==" % len(warns))
        for w in warns[:100]:
            print("  " + w)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
