import './index.scss';

document.getElementById('app').innerHTML = `<div id="wrap" style="margin: 0 auto;"></div>
  <div id="clip" style="margin: 0 auto;background-image:url(tb.png);background-size:10%;"></div>`;

let Circle = airglass.extend(airglass.Renderable, {
  _constructor: function (params) {
    this.path = null;
    this.x = params.x || 0;
    this.y = params.y || 0;
    this.size = params.size || 100;
  },
  updatePath: function () {
    let path = new Path2D;
    path.arc(this.x, this.y, this.size, 0, Math.PI * 2, true);
    this.path = path;
  },
  draw: function (ctx) {
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = this.line;
    ctx.fillStyle = this.fill;
    ctx.fill(this.path);
    ctx.stroke(this.path);
  }
});

let Polygon = airglass.extend(airglass.Renderable, {
  _constructor: function (params) {
    this.path = null;
    this.points = params.points || [];
  },
  updatePath: function () {
    let path = new Path2D;
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      if (i == 0) {
        path.moveTo(point.x, point.y);
        continue;
      }
      path.lineTo(point.x, point.y);
    }
    this.path = path;
  },
  addPoint: function (point) {
    this.points.push(point);
  },
  draw: function (ctx) {
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = this.line;
    ctx.fillStyle = this.fill;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fill(this.path);
    ctx.stroke(this.path);
  }
});

let getTwoImage = function (cb) {
  getImage(img1 => {
    getImage(img2 => {
      cb(img1, img2);
    }, [
      '1501417834415.jpg',
      '1501417773478.jpg',
      '1503799613777.jpeg',
      '1503808779808.jpeg'
    ]);
  }, [
    '1501429301363.jpg',
    '1503743861858.jpeg',
    '1514096555755.jpeg',
    '1515801065220.jpeg'
  ]);

  function getImage(cb, images) {
    let img = new Image;
    img.onload = function () {
      cb(img);
    };
    img.src = '/public/gallery/' + images[Math.floor(Math.random() * images.length)];
  }
};

let ag, imageRenderer, polygonRenderer, controllerRenderer,
  clipAg, clipRenderer;

getTwoImage(function (img1, img2) {
  let agHeight = 300;
  let DPR = window.devicePixelRatio;
  let img1ResizeWidth = img1.width / img1.height * agHeight;
  let img2ResizeWidth = img2.width / img2.height * agHeight;
  ag = new airglass.Airglass({
    element: document.querySelector('#wrap'),
    width: img1ResizeWidth + img2ResizeWidth,
    height: agHeight,
    DPR: DPR
  });
  imageRenderer = ag.addRenderer();
  polygonRenderer = ag.addRenderer();
  controllerRenderer = ag.addRenderer();

  let ctx = imageRenderer.element.getContext('2d');
  ctx.drawImage(img1, 0, 0, img1ResizeWidth * DPR, agHeight * DPR);
  ctx.drawImage(img2, img1ResizeWidth * DPR, 0, img2ResizeWidth * DPR, agHeight * DPR);

  clipAg = new airglass.Airglass({
    element: document.querySelector('#clip'),
    width: img1ResizeWidth + img2ResizeWidth,
    height: agHeight,
    DPR: DPR
  });
  clipRenderer = clipAg.addRenderer();

  ag.subscribe(agSubscribe);
});

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
let currentColor = 'hsl(0, 100%, 50%)';

// controller拖拽控制点
function agSubscribe(event, originEvent) {
  originEvent.preventDefault();
  let type = event.type;

  let controllersContainPoint = controllerRenderer.getElementsContainPoint(event);
  let polygonsContainPoint = polygonRenderer.getElementsContainPoint(event);

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
            // 正在绘制多边形的状态设置为false
            isDrawingPolygon = false;
            // 从外观上将多边形闭合
            currentPolygon.addPoint(currentPolygon.points[0]);
            currentPolygon.updatePath();
            // 设置一个标志，说明多边形已经闭合
            currentPolygon.__isPathClosed = true;
            // 清除激活中的多边形
            activePolygon = currentPolygon;
            // 结束绘制，清除当前正在绘制的多边形
            currentPolygon = null;
            // 重新渲染
            polygonRenderer.reRender();
            controllerRenderer.reRender();

            drawClip();
          }
        }
        break touchstart;
      }

      // 落在任意多边形上
      if (polygonsContainPoint.length) {
        // 第一个击中的多边形
        let _activePolygon = polygonsContainPoint[polygonsContainPoint.length - 1];

        // 将这个多边形置于渲染器的最顶层
        polygonRenderer.scene.children.forEach((child, i) => {
          if (child == _activePolygon) {
            polygonRenderer.scene.children.splice(i, 1);
            polygonRenderer.scene.children.push(_activePolygon);
            polygonRenderer.reRender();

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
        controllerRenderer.reRender();

        drawClip();
        break touchstart;
      }

      // 既没有落在控制点 && 也没有落在多边形上

      // 激活中的控制点 = 新创建的控制点
      activeControllerPoint = new Circle({
        x: event.x,
        y: event.y,
        size: 8 * ag.DPR,
        stroke: 'transparent',
      });

      // 记录下激活中的控制点touchstart时的位置
      activeControllerPointPositionWhenTouchstart = [activeControllerPoint.x, activeControllerPoint.y];

      // 如果存在当前正在绘制的
      if (currentPolygon) {
        // 将新创建的控制点添加到当前正在绘制的多边形中
        currentPolygon.addPoint(activeControllerPoint);
        currentPolygon.updatePath();
      } else {
        // 将新创建的激活中的控制点添加到临时的控制点组中
        currentGroupPoints.push(activeControllerPoint);
        // 控制点渲染器的场景中只显示正在绘制中的多边形的控制点
        controllerRenderer.scene.children = currentGroupPoints;
      }
      activeControllerPoint.updatePath();

      if (currentGroupPoints.length == 1) {
        isDrawingPolygon = true;
        currentGroupPoints[0].fill = currentColor;
        currentGroupPoints[0].line = 2 * ag.DPR;
      }

      // 已经创建了第3个控制点
      if (currentGroupPoints.length == 3) {
        // 当前正在绘制的多边形 = 新创建的多边形
        let _fillStyle = currentColor.split('');
        _fillStyle.splice(_fillStyle.length - 1, 0, ', 0.2');
        _fillStyle.splice(3, 0, 'a');

        currentPolygon = new Polygon({
          points: currentGroupPoints,
          fill: _fillStyle.join(''),
          stroke: currentColor,
          line: 4 * ag.DPR,
        });
        currentPolygon.updatePath();
        // 激活中的多边形置为null
        activePolygon = null;
        // 清空临时控制点组
        currentGroupPoints = [];
        // 向渲染多边形的渲染器场景中添加当前绘制的多边形
        polygonRenderer.scene.add(currentPolygon);
        // 渲染多边形
      }
      controllerRenderer.reRender();
      polygonRenderer.reRender();

      drawClip();
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
        activeControllerPoint.x = activeControllerPointPositionWhenTouchstart[0] + event.x - lastTouchstartPosition[0];
        activeControllerPoint.y = activeControllerPointPositionWhenTouchstart[1] + event.y - lastTouchstartPosition[1];
        activeControllerPoint.updatePath();
        // 如果存在上方描述的两种多边形
        if (_needUpdatePolygon) {
          // 渲染需要更新绘制路径的多边形
          _needUpdatePolygon.updatePath();
        }
        // 渲染
        polygonRenderer.reRender();
        controllerRenderer.reRender();

        drawClip();
        break touchmove;
      }

      // 拖拽多边形
      if (_needUpdatePolygon) {
        let offsetX = event.x - lastEventPosition[0];
        let offsetY = event.y - lastEventPosition[1];

        let pointsLength = _needUpdatePolygon.__isPathClosed ? _needUpdatePolygon.points.length - 1 : _needUpdatePolygon.points.length;
        for (let i = 0; i < pointsLength; i++) {
          let point = _needUpdatePolygon.points[i];
          point.x = point.x + offsetX;
          point.y = point.y + offsetY;
          point.updatePath();
        }
        controllerRenderer.reRender();
        _needUpdatePolygon.updatePath();
        polygonRenderer.reRender();

        drawClip();
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

function drawClip() {
  let waitDrawToClipPolygon = currentPolygon || activePolygon;
  if (waitDrawToClipPolygon) {
    let ctx = clipRenderer.element.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, clipRenderer.element.width, clipRenderer.element.height);
    let path = new Path2D;
    let xs = [];
    let ys = [];
    for (let i = 0; i < waitDrawToClipPolygon.points.length; i++) {
      let point = waitDrawToClipPolygon.points[i];
      xs.push(point.x);
      ys.push(point.y);
      if (i == 0) {
        path.moveTo(point.x, point.y);
        continue;
      }
      path.lineTo(point.x, point.y);
    }
    ctx.clip(path);
    ctx.drawImage(imageRenderer.element, 0, 0);
    ctx.restore();

    ctx.save();
    let minX = min(xs);
    let maxX = max(xs);
    let minY = min(ys);
    let maxY = max(ys);
    path = new Path2D;
    path.rect(minX, minY, maxX - minX, maxY - minY);
    ctx.lineWidth = 2 * clipAg.DPR;
    ctx.strokeStyle = currentColor;
    ctx.stroke(path);
    ctx.restore();
  }
}

function max(array) {
  let max = -1;
  for (const value of array) {
    if (value != null && (max < value || (max == -1 && value >= value))) {
      max = value;
    }
  }
  return max;
}
function min(array) {
  let min = -1;
  for (const value of array) {
    if (value != null && (min > value || (min === -1 && value >= value))) {
      min = value;
    }
  }
  return min;
}