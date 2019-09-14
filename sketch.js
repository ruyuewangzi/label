let imageRenderer = new airglass.Renderer(
  document.querySelector('#imageRenderer').getContext('2d'),
  new airglass.Scene()
);

let borderRenderer = new airglass.Renderer(
  document.querySelector('#borderRenderer').getContext('2d'),
  new airglass.Scene()
);

let polygonRenderer = new airglass.Renderer(
  document.querySelector('#polygonRenderer').getContext('2d'),
  new airglass.Scene()
);

// 为上层的Glass开启交互模式
let controllerRenderer = new airglass.Renderer(
  document.querySelector('#controllerRenderer').getContext('2d'),
  new airglass.Scene()
).setInteractable();

// 初始化变量
// 激活中的控制点 = touchstart事件落在控制点上
let activeControllerPoint;
// 开始绘制多边形后，当还不够3个控制点时，用来临时存储控制点，足够3个则置为空数组
let currentGroupPoints = [];
// 当前多边形 = 当前未结束绘制的多边形
let currentPolygon;
// 激活的多边形 = touchstart事件落在多边形上
let activePolygon;
// 记录上次事件发生的位置[x,y]
let lastEventPosition;
// 记录上次touchstart事件发生的位置[x,y]
let lastTouchstartPosition;
// 为了让拖拽控制点看起来不抖动，需要记录控制点touchstart时的位置
let activeControllerPointPositionWhenTouchstart;
// 是否正在绘制多边形
let isDrawingPolygon = false;
// 当前颜色
let currentColor = 'hsl(60, 100%, 50%)';

// controller拖拽控制点
controllerRenderer.subscribe(controllerRenderer, subscribeEvent);

// 接收任何订阅的事件
function subscribeEvent(actor) {
  let event = actor.event;
  let type = event.type;

  let controllersContainPoint = controllerRenderer.getElementsContainPoint(event);
  let polygonsContainPoint = polygonRenderer.getElementsContainPoint(event);

  if (type == 'mousemove') {
    mousemove: {
      if (!lastEventPosition || !lastEventPosition[0] || !lastEventPosition[1]) {
        break mousemove;
      }

      // 移除重复的拖拽事件
      if (lastEventPosition[0] == event.x && lastEventPosition[1] == event.y) {
        break mousemove;
      }

      // 正在绘制多边形
      if (isDrawingPolygon) {

      }
    }
  }

  if (type == 'touchstart') {
    touchstart: {
      lastTouchstartPosition = [event.x, event.y];
      // 初始化上次事件位置
      !lastEventPosition && (lastEventPosition = [event.x, event.y]);

      // 落在任意控制点上
      if (controllersContainPoint.length) {
        // 激活中的控制点 = 最上面的控制点
        activeControllerPoint = controllersContainPoint[controllersContainPoint.length - 1];
        // 记录下激活中的控制点touchstart时的位置
        activeControllerPointPositionWhenTouchstart = [activeControllerPoint.x, activeControllerPoint.y];
        // 当前正在绘制多边形，还没有闭合多边形
        if (currentPolygon) {
          activePolygon = null;
          // 如果该控制点就是当前正在绘制的polygon的第一个控制点
          if (activeControllerPoint === currentPolygon.points[0]) {
            // 只执行一次
            if (actor === controllerRenderer) {
              // 正在绘制多边形的状态设置为false
              isDrawingPolygon = false;
              // 从外观上将多边形闭合
              currentPolygon.addPoint(currentPolygon.points[0]);
              // 设置一个标志，说明多边形已经闭合
              currentPolygon.__isPathClosed = true;
              // 清除激活中的多边形
              activePolygon = currentPolygon;
              // 结束绘制，清除当前正在绘制的多边形
              currentPolygon = null;
              // 重新渲染
              polygonRenderer.render();
              controllerRenderer.render();
            }
          }
        }

        break touchstart;
      }

      // 落在任意多边形上
      if (polygonsContainPoint.length) {
        // 第一个击中的多边形
        _activePolygon = polygonsContainPoint[polygonsContainPoint.length - 1];

        // 将这个多边形置于渲染器的最顶层
        polygonRenderer.scene.children.forEach((child, i) => {
          if (child == _activePolygon) {
            polygonRenderer.scene.children.splice(i, 1);
            polygonRenderer.scene.children.push(_activePolygon);
            polygonRenderer.render();

            // 击中的多边形已经完成闭合，即完成了绘制
            if (_activePolygon.__isPathClosed) {
              activePolygon = _activePolygon;
              currentPolygon = null;
              // 当前没有绘制多边形
              isDrawingPolygon = false;
            } else {
              // 击中的多边形未闭合，即未完成了绘制
              currentPolygon = _activePolygon;
              activePolygon = null;
              // 当前在绘制多边形
              isDrawingPolygon = true;
            }
            controllerRenderer.scene.children = _activePolygon.points;
          }
        });

        // 渲染
        controllerRenderer.render();
        break touchstart;
      }

      // 既没有落在控制点 && 也没有落在多边形上

      // 激活中的控制点 = 新创建的控制点
      activeControllerPoint = new airglass.Ellipse({
        x: event.x,
        y: event.y,
        width: 6,
        height: 6,
        fillStyle: 'transparent',
        strokeStyle: currentColor,
      })

      // 如果存在当前正在绘制的
      if (currentPolygon) {
        // 将新创建的控制点添加到当前正在绘制的多边形中
        currentPolygon.addPoint(activeControllerPoint);
      } else {
        // 将新创建的激活中的控制点添加到临时的控制点组中
        currentGroupPoints.push(activeControllerPoint);
        // 控制点渲染器的场景中只显示正在绘制中的多边形的控制点
        controllerRenderer.scene.children = currentGroupPoints;
      }

      if (currentGroupPoints.length == 1) {
        isDrawingPolygon = true;
        currentGroupPoints[0].set({
          fillStyle: currentColor,
          lineWidth: 4,
        })
      }

      // 已经创建了第3个控制点
      if (currentGroupPoints.length == 3) {
        // 当前正在绘制的多边形 = 新创建的多边形
        let _fillStyle = currentColor.split('');
        _fillStyle.splice(_fillStyle.length - 1, 0, ', 0.2');
        _fillStyle.splice(3, 0, 'a');

        currentPolygon = new airglass.Polygon({
          points: currentGroupPoints,
          fillStyle: _fillStyle.join(''),
          strokeStyle: currentColor,
          lineWidth: 1,
        });
        // 清空临时控制点组
        currentGroupPoints = [];
        // 向渲染多边形的渲染器场景中添加当前绘制的多边形
        polygonRenderer.scene.add(currentPolygon);
        // 渲染多边形
      }

      controllerRenderer.render();
      polygonRenderer.render();
    }
  }

  if (type == 'touchmove') {
    touchmove: {
      // 移除重复的拖拽事件
      if (lastEventPosition[0] == event.x && lastEventPosition[1] == event.y) {
        break touchmove;
      }

      // 需要更新绘制激活中状态的多边形，则使用activePolygon
      // 需要更新绘制正在绘制中的多边形，则使用currentPolygon
      let _needUpdatePolygon = activePolygon || currentPolygon;

      // 优先拖拽控制点
      if (activeControllerPoint) {
        // 给激活中的控制点设置新的拖拽后的位置
        activeControllerPoint.set({
          x: activeControllerPointPositionWhenTouchstart[0] + event.x - lastTouchstartPosition[0],
          y: activeControllerPointPositionWhenTouchstart[1] + event.y - lastTouchstartPosition[1],
        });

        // 如果存在上方描述的两种多边形
        if (_needUpdatePolygon) {
          // 渲染需要更新绘制路径的多边形
          _needUpdatePolygon.updatePath();
        }
        // 渲染
        polygonRenderer.render();
        controllerRenderer.render();
        break touchmove;
      }

      // 拖拽多边形
      if (_needUpdatePolygon) {
        let offsetX = event.x - lastEventPosition[0];
        let offsetY = event.y - lastEventPosition[1];

        let pointsLength = _needUpdatePolygon.__isPathClosed ? _needUpdatePolygon.points.length - 1 : _needUpdatePolygon.points.length;
        for (let i = 0; i < pointsLength; i++) {
          let point = _needUpdatePolygon.points[i];
          point.set({
            x: point.x + offsetX,
            y: point.y + offsetY,
          })
          controllerRenderer.render();
          _needUpdatePolygon.updatePath();
          polygonRenderer.render();
        }
      }
    }
  }

  if (type == 'touchend') {
    touchend: {
      // 清除激活中的控制点
      activeControllerPoint = null;
    }
  }

  lastEventPosition = [event.x, event.y];
}

document.querySelector('#exportLabel').addEventListener('click', exportLabel);

// 导出标注数据
function exportLabel() {
  let polygons = polygonRenderer.scene.children.map(polygon => {
    return {
      x: polygon.x,
      y: polygon.y,
      width: polygon.width,
      height: polygon.height,
      points: polygon.points.map(point => [point.x, point.y]),
    }
  })
  console.log(JSON.stringify(polygons, null, 2))
}

// 导入标注数据
function importLabel() {

}

// 设置大小
loadImage('img1.jpg');

function loadImage(src) {
  let img = new Image;
  img.src = src;
  img.onload = function() {
    let maxWidth = 300;
    let ratio = img.width / img.height;
    let width = img.width > maxWidth ? maxWidth : img.width;
    let height = width == img.width ? height : width / ratio;
    setSize(width, height);
    imageRenderer.ctx.drawImage(img, 0, 0, width, height);
  }
}

function setSize(width, height) {
  document.querySelector('#wrap').style = `width:${width}px;height:${height}px;`;
  document.querySelector('#imageRenderer').style = `width:${width}px;height:${height}px;`;
  document.querySelector('#polygonRenderer').style = `width:${width}px;height:${height}px;`;
  document.querySelector('#borderRenderer').style = `width:${width}px;height:${height}px;`;
  document.querySelector('#controllerRenderer').style = `width:${width}px;height:${height}px;`;

  document.querySelector('#imageRenderer').width = document.querySelector('#polygonRenderer').width = document.querySelector('#controllerRenderer').width = document.querySelector('#borderRenderer').width = width;
  document.querySelector('#imageRenderer').height = document.querySelector('#polygonRenderer').height = document.querySelector('#controllerRenderer').height = document.querySelector('#borderRenderer').height = height;
}

document.querySelector('#previewLabel').addEventListener('click', preview);

function preview() {
  polygonRenderer.clean();
  controllerRenderer.clean();
  polygonRenderer.scene.children.forEach(polygon => {
    let path = new Path2D();
    path.rect(polygon.minX, polygon.minY, polygon.width, polygon.height)
    borderRenderer.ctx.strokeStyle = polygon.strokeStyle;
    borderRenderer.ctx.lineWidth = 4;
    borderRenderer.ctx.stroke(path);

    path = new Path2D();
    path.rect(polygon.minX, polygon.minY - 20, 30, 20);
    borderRenderer.ctx.fillStyle = polygon.strokeStyle;
    borderRenderer.ctx.fill(path);
    borderRenderer.ctx.stroke(path);

    borderRenderer.ctx.fillStyle = '#333';
    borderRenderer.ctx.font = 'normal 18px "微软雅黑"';
    borderRenderer.ctx.baseLine = 'bottom';
    borderRenderer.ctx.fillText('云', polygon.minX + 4, polygon.minY - 4);
  })
}