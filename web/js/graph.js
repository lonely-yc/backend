/**
 * graph.js — G6 Tree Visualization (Compact Spouse Display)
 * 改进：只显示原配，多配偶在详情中查看
 */

const GraphManager = (() => {
  let graph = null;
  let nodeRegistered = false;

  /* ---------- Register custom node ---------- */
  function registerNode() {
    if (nodeRegistered) return;
    nodeRegistered = true;

    G6.registerNode('person-card', {
      setState(name, value, item) {
        if (!item || !item.getContainer) return;
        const group = item.getContainer();
        const bg = group.find(e => e.get('name') === 'bg');
        if (!bg) return;
        const cfg = item.getModel();

        // Reset to base style
        const isMale = cfg.gender === 'male';
        bg.attr('stroke', isMale ? 'rgba(79,70,229,.4)' : 'rgba(236,72,153,.4)');
        bg.attr('lineWidth', 2);
        bg.attr('shadowColor', 'rgba(0,0,0,.08)');
        bg.attr('shadowBlur', 10);

        if (value) {
          if (name === 'isTarget') {
            bg.attr('stroke', '#4f46e5');
            bg.attr('lineWidth', 4);
            bg.attr('shadowColor', 'rgba(79,70,229,.5)');
            bg.attr('shadowBlur', 16);
          } else if (name === 'isAncestor') {
            bg.attr('stroke', '#f59e0b');
            bg.attr('lineWidth', 3);
            bg.attr('shadowColor', 'rgba(245,158,11,.4)');
            bg.attr('shadowBlur', 12);
          } else if (name === 'isDescendant') {
            bg.attr('stroke', '#3b82f6');
            bg.attr('lineWidth', 3);
            bg.attr('shadowColor', 'rgba(59,130,246,.4)');
            bg.attr('shadowBlur', 12);
          }
        }
      },

      draw(cfg, group) {
        const isVirtual = cfg._isVirtual;
        const isMale = cfg.gender === 'male';
        const spouses = cfg._spouses || [];
        const spouseCount = spouses.length;
        const mainSpouse = spouseCount > 0 ? spouses[0] : null;
        const extraSpouseCount = spouseCount - 1;  // 除原配外的数量
        const w = mainSpouse ? 224 : 134;  // 有配偶就宽一些
        const h = 68;

        if (isVirtual) {
          const bg = group.addShape('rect', {
            attrs: {
              x: -46, y: -18, width: 92, height: 36,
              radius: 18,
              fill: '#f3f4f6',
              stroke: 'rgba(79,70,229,.3)',
              lineWidth: 1,
            }, name: 'bg',
          });
          group.addShape('text', {
            attrs: {
              text: cfg.name, x: 0, y: 3,
              fontSize: 13, fill: '#6b7280',
              textAlign: 'center', textBaseline: 'middle',
              fontWeight: '700',
            }, name: 'name',
          });
          return bg;
        }

        // ===== 主卡片背景 =====
        group.addShape('rect', {
          attrs: {
            x: -w / 2, y: -h / 2, width: w, height: h,
            radius: 12,
            fill: '#ffffff',
            stroke: isMale ? 'rgba(79,70,229,.4)' : 'rgba(236,72,153,.4)',
            lineWidth: 2,
            shadowColor: 'rgba(0,0,0,.08)',
            shadowBlur: 10,
            shadowOffsetY: 4,
            cursor: 'pointer',
          }, name: 'bg',
        });

        // ===== 主人物 (左侧) =====
        const ax = -w / 2 + 38;
        const avatarUrl = cfg.avatarUrl ? Store.avatarFull(cfg.avatarUrl) : null;

        if (avatarUrl) {
          group.addShape('image', {
            attrs: { x: ax - 20, y: -20, width: 40, height: 40, img: avatarUrl, cursor: 'pointer' },
            name: 'avatar-img',
            clipCfg: { show: true, type: 'circle', r: 20, x: ax, y: 0 },
          });
          group.addShape('circle', {
            attrs: { cx: ax, cy: 0, r: 20, fill: 'transparent',
              stroke: isMale ? 'rgba(79,70,229,.3)' : 'rgba(236,72,153,.3)', lineWidth: 2 },
            name: 'avatar-border',
          });
        } else {
          group.addShape('circle', {
            attrs: { cx: ax, cy: 0, r: 20, fill: isMale ? '#4f46e5' : '#db2777', cursor: 'pointer' },
            name: 'avatar',
          });
          group.addShape('text', {
            attrs: { text: cfg.name.slice(-1), x: ax, y: 1, fontSize: 16, fill: '#fff',
              textAlign: 'center', textBaseline: 'middle', fontWeight: '800', cursor: 'pointer' },
            name: 'avatar-t',
          });
        }

        // 主姓名
        group.addShape('text', {
          attrs: { text: cfg.name, x: ax + 28, y: -10, fontSize: 13, fill: '#1a1a2e',
            textAlign: 'left', textBaseline: 'middle', fontWeight: '700', cursor: 'pointer' },
          name: 'name',
        });

        // 主世代
        group.addShape('text', {
          attrs: { text: '第' + cfg.generation + '代' + (cfg.birthDate ? ' ' + cfg.birthDate.slice(0, 4) : ''),
            x: ax + 28, y: 12, fontSize: 10.5, fill: '#9ca3af',
            textAlign: 'left', textBaseline: 'middle', cursor: 'pointer' },
          name: 'gen',
        });

        // 重点人物
        if (cfg.isStarred) {
          group.addShape('text', {
            attrs: { text: '\u2605', x: w / 2 - 14, y: -h / 2 + 14, fontSize: 14, fill: '#f59e0b',
              textAlign: 'center', textBaseline: 'middle' },
            name: 'star',
          });
        }

        // ===== 配偶 (右侧，固定只显示1个) =====
        if (mainSpouse) {
          const sm = mainSpouse.gender === 'male';
          const sx = 0;

          // 分隔线
          group.addShape('line', {
            attrs: {
              x1: -20, y1: -h / 2 + 12,
              x2: -20, y2: h / 2 - 12,
              stroke: '#f59e0b', lineWidth: 1.5, opacity: 0.5,
            }, name: 'div',
          });
          group.addShape('text', {
            attrs: { text: '\u2764', x: -20, y: 0, fontSize: 12, fill: '#f59e0b',
              textAlign: 'center', textBaseline: 'middle', opacity: 0.7 },
            name: 'heart',
          });

          // 配偶头像
          const spouseAvatar = mainSpouse.avatarUrl ? Store.avatarFull(mainSpouse.avatarUrl) : null;
          if (spouseAvatar) {
            group.addShape('image', {
              attrs: { x: sx - 16, y: -16, width: 32, height: 32, img: spouseAvatar, cursor: 'pointer' },
              name: 'spouse-avatar-img',
              clipCfg: { show: true, type: 'circle', r: 16, x: sx, y: 0 },
            });
            group.addShape('circle', {
              attrs: { cx: sx, cy: 0, r: 16, fill: 'transparent',
                stroke: sm ? 'rgba(79,70,229,.2)' : 'rgba(236,72,153,.2)', lineWidth: 1.5 },
              name: 'spouse-border',
            });
          } else {
            group.addShape('circle', {
              attrs: { cx: sx, cy: 0, r: 16, fill: sm ? '#818cf8' : '#f472b6', cursor: 'pointer' },
              name: 'spouse-avatar',
            });
            group.addShape('text', {
              attrs: { text: mainSpouse.name.slice(-1), x: sx, y: 1, fontSize: 13, fill: '#fff',
                textAlign: 'center', textBaseline: 'middle', fontWeight: '700', cursor: 'pointer' },
              name: 'spouse-avatar-t',
            });
          }

          // 配偶姓名
          group.addShape('text', {
            attrs: { text: mainSpouse.name, x: sx + 22, y: -6, fontSize: 12, fill: '#374151',
              textAlign: 'left', textBaseline: 'middle', cursor: 'pointer' },
            name: 'spouse-name',
          });
          group.addShape('text', {
            attrs: { text: '第' + mainSpouse.generation + '代',
              x: sx + 22, y: 12, fontSize: 10, fill: '#9ca3af',
              textAlign: 'left', textBaseline: 'middle', cursor: 'pointer' },
            name: 'spouse-gen',
          });

          // 多配偶提示
          if (extraSpouseCount > 0) {
            group.addShape('text', {
              attrs: { text: '+' + extraSpouseCount + '位',
                x: w / 2 - 30, y: h / 2 - 12, fontSize: 11, fill: '#f59e0b',
                textAlign: 'right', textBaseline: 'middle', fontWeight: '600' },
              name: 'extra-spouses',
            });
          }
        } else {
          // 无配偶时显示空位提示
          group.addShape('text', {
            attrs: { text: '点击添加配偶',
              x: w / 2 - 10, y: 0, fontSize: 10, fill: '#d1d5db',
              textAlign: 'right', textBaseline: 'middle', opacity: 0 },
            name: 'no-spouse',
          });
        }

        return group.addShape('rect', {
          attrs: { x: -w / 2, y: -h / 2, width: w, height: h, radius: 12, fill: 'transparent', stroke: 'transparent' },
          name: 'hit-bg',
        });
      },
      getAnchorPoints(cfg) {
        return [[0.5, 0], [0.5, 1]];
      },
    }, 'single-node');
  }

  /* ---------- Build tree data ---------- */
  function buildTree(persons, relations) {
    const map = {};
    persons.forEach(p => { map[p.id] = { ...p, children: [], _spouses: [] }; });

    const childOf = {};
    const spouseSet = new Set();

    relations.forEach(r => {
      if (r.type === 'spouse') {
        if (map[r.fromId] && map[r.toId]) {
          map[r.fromId]._spouses.push(map[r.toId]);
          spouseSet.add(r.toId);
        }
      } else {
        childOf[r.toId] = r.fromId;
      }
    });

    // 按关系创建时间排序，原配排第一
    persons.forEach(p => {
      const pid = childOf[p.id];
      if (pid && map[pid]) map[pid].children.push(map[p.id]);
    });

    const roots = persons.filter(p => !childOf[p.id] && !spouseSet.has(p.id));

    if (!roots.length && persons.length) {
      const noParent = persons.filter(p => !childOf[p.id]);
      return vRoot(noParent.length ? noParent.map(p => map[p.id]) : Object.values(map));
    }
    if (roots.length === 1) return map[roots[0].id];
    return vRoot(roots.map(r => map[r.id]));
  }

  function vRoot(children) {
    return { id: '__vr__', name: '家族', gender: 'male', generation: 0, _spouses: [], _isVirtual: true, children };
  }

  /* ---------- Initialize graph ---------- */
  function initOrUpdate(treeData, onClick) {
    const el = document.getElementById('mountGraph');
    if (!el) return;

    if (graph) {
      graph.changeData(treeData);
      setTimeout(() => graph.fitView(50), 150);
      return;
    }

    registerNode();

    graph = new G6.TreeGraph({
      container: 'mountGraph',
      width: el.clientWidth,
      height: el.clientHeight,
      fitView: true,
      fitViewPadding: [80, 60, 80, 60],
      animate: true,
      animateCfg: { duration: 500, easing: 'easeCubic' },
      modes: {
        default: [
          'drag-canvas',
          'zoom-canvas',
          { type: 'drag-node', enableDelegate: false },
        ],
      },
      defaultNode: { type: 'person-card' },
      defaultEdge: {
        type: 'cubic-vertical',
        style: { stroke: '#10b981', lineWidth: 2, opacity: .6, endArrow: false },
      },
      layout: {
        type: 'compactBox',
        direction: 'TB',
        getId: d => d.id,
        getHeight: () => 68,
        getWidth: d => (d._spouses && d._spouses.length > 0) ? 224 : 134,
        getVGap: () => 52,
        getHGap: () => 32,
      },
    });

    graph.data(treeData);
    graph.render();
    graph.fitView(50);

    graph.on('node:click', ev => {
      const m = ev.item.getModel();
      if (!m._isVirtual && onClick) onClick(m.id);
    });

    const ro = new ResizeObserver(() => {
      if (graph && el) graph.changeSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
  }

  /* ---------- Public API ---------- */
  return {
    renderTree(treeData, onClick) {
      if (!treeData) { this.destroy(); return; }
      this._onClick = onClick;
      initOrUpdate(treeData, onClick);
    },

    render(persons, relations, onClick) {
      if (!persons.length) { this.destroy(); return; }
      this._cachedPersons = persons;
      this._cachedRelations = relations;
      this._onClick = onClick;
      const tree = buildTree(persons, relations);
      initOrUpdate(tree, onClick);
    },

    zoom(ratio) { if (graph) graph.zoom(ratio); },
    fitView() { if (graph) graph.fitView(50); },
    fitCenter() { if (graph) graph.fitCenter(); },
    beautify() {
      if (!graph) return;
      // 先销毁再重新创建，使用更大的间距
      const persons = this._cachedPersons || [];
      const relations = this._cachedRelations || [];
      if (persons.length) {
        this.destroy();
        setTimeout(() => {
          const tree = buildTree(persons, relations);
          // 使用美化参数重新初始化
          graph = new G6.TreeGraph({
            container: 'mountGraph',
            width: document.getElementById('mountGraph')?.clientWidth || 1200,
            height: document.getElementById('mountGraph')?.clientHeight || 800,
            fitView: true,
            fitViewPadding: [100, 100, 100, 100],
            animate: true,
            animateCfg: { duration: 600, easing: 'easeCubic' },
            modes: {
              default: [
                'drag-canvas',
                'zoom-canvas',
                { type: 'drag-node', enableDelegate: false },
              ],
            },
            defaultNode: { type: 'person-card' },
            defaultEdge: {
              type: 'cubic-vertical',
              style: { stroke: '#10b981', lineWidth: 2, opacity: .6, endArrow: false },
            },
            layout: {
              type: 'compactBox',
              direction: 'TB',
              getId: d => d.id,
              getHeight: () => 68,
              getWidth: d => (d._spouses && d._spouses.length > 0) ? 224 : 134,
              getVGap: () => 64,    // 加大垂直间距
              getHGap: () => 48,    // 加大水平间距
            },
          });
          registerNode();
          graph.data(tree);
          graph.render();
          graph.fitView(60);
          // Re-add click handler
          graph.on('node:click', ev => {
            const m = ev.item.getModel();
            if (!m._isVirtual && this._onClick) this._onClick(m.id);
          });
          const ro = new ResizeObserver(() => {
            if (graph) graph.changeSize(
              document.getElementById('mountGraph')?.clientWidth || 1200,
              document.getElementById('mountGraph')?.clientHeight || 800
            );
          });
          const el = document.getElementById('mountGraph');
          if (el) ro.observe(el);
        }, 50);
      }
    },
    destroy() { if (graph) { graph.destroy(); graph = null; } },

    /* ========== Linkage Methods ========== */
    focusNode(id, animate = true) {
      if (!graph) return;
      const node = graph.findById(id);
      if (node) {
        graph.focusItem(node, animate, { duration: animate ? 500 : 0, easing: 'easeCubic' });
      }
    },

    highlightPath(personId, persons = [], relations = []) {
      if (!graph) return;
      this.clearHighlight();

      // Find ancestors and descendants
      const ancestors = new Set();
      const descendants = new Set();
      const processed = new Set();

      function findAncestors(id) {
        if (processed.has(id)) return;
        processed.add(id);
        relations.forEach(r => {
          if (r.toId === id && r.type !== 'spouse') {
            ancestors.add(r.fromId);
            findAncestors(r.fromId);
          }
        });
      }

      function findDescendants(id) {
        if (processed.has(id)) return;
        processed.add(id);
        relations.forEach(r => {
          if (r.fromId === id && r.type !== 'spouse') {
            descendants.add(r.toId);
            findDescendants(r.toId);
          }
        });
      }

      findAncestors(personId);
      processed.clear();
      findDescendants(personId);

      // Highlight target node
      const targetNode = graph.findById(personId);
      if (targetNode) {
        graph.setItemState(targetNode, 'highlighted', true);
        graph.setItemState(targetNode, 'isTarget', true);
      }

      // Highlight ancestors (orange)
      ancestors.forEach(id => {
        const node = graph.findById(id);
        if (node) {
          graph.setItemState(node, 'highlighted', true);
          graph.setItemState(node, 'isAncestor', true);
        }
      });

      // Highlight descendants (blue)
      descendants.forEach(id => {
        const node = graph.findById(id);
        if (node) {
          graph.setItemState(node, 'highlighted', true);
          graph.setItemState(node, 'isDescendant', true);
        }
      });
    },

    clearHighlight() {
      if (!graph) return;
      graph.getNodes().forEach(node => {
        graph.clearItemStates(node, ['highlighted', 'isTarget', 'isAncestor', 'isDescendant']);
      });
    },

    /* ========== Jump to person (switch view + focus) ========== */
    jumpToPerson(id) {
      this.focusNode(id);
    },
  };
})();
