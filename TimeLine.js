"use strict"

import dayjs from 'dayjs'

export default class TimeLine {
  option = {
    // 时间轴显示范围 单位: 小时
    timeRange: 24,
    // 时间刻度数量
    timescaleCount: 48,
    // 时间刻度高度
    timeScaleLarge: 15,
    timeScaleSmall: 10,
    timeScaleMini: 5,
    // 时间片段
    timeSegments: [],
    textColor: 'rgba(151,158,167,1)',
    timeScaleLineColor: 'rgba(151,158,167,1)',
    tooltipColor: 'rgb(194, 202, 215)'
  }
  events = {}

  constructor(el, option) {
    this.container = typeof el instanceof Element ? el : document.getElementById(el)
    this.option = Object.assign({}, this.option, option)
    this.#initCanvas()
    this.#initEvents()
    this.setTimeRange(this.option.timeRange)
    this.startTimestamp = new Date(dayjs().format('YYYY-MM-DD 00:00:00')).getTime() - this.totalMillisecond / 2
    this.setTimeSegments(this.option.timeSegments)
    this.setTimescales()
    this.setTimeMiddleLine()
  }

  #initCanvas() {
    const { width, height } = this.container.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.container.appendChild(canvas)
  }

  #initEvents() {
    // 鼠标状态
    const mouse = {
      down: false,
      dx: 0,
      dy: 0,
      mx: 0,
      my: 0
    }
    let preStartTimestamp = 0

    function onMousedown(e) {
      const { x, y } = this.getMouseOffset(e)
      mouse.dx = x
      mouse.dy = y
      mouse.down = true
      preStartTimestamp = this.startTimestamp
    }

    function onMouseup(e) {
      this.container.style.cursor = 'pointer'
      // 触发click事件
      const { x, y } = this.getMouseOffset(e)
      // single click
      if(Math.abs(x - mouse.dx + y - mouse.dy) <= 2) {
        // this.onClick(...pos)

      } else {
        const time = this.startTimestamp + this.totalMillisecond / 2
        this.emit('timeChange', time)
      }
      mouse.dx = 0
      mouse.dy = 0
      mouse.down = false
      preStartTimestamp = 0
    }

    function onMousemove(e) {
      const { x } = this.getMouseOffset(e)
      const pxs = this.canvas.width / this.totalMillisecond // px/ms
      mouse.mx = x

      // 按下拖动
      if(mouse.down) {
        this.container.style.cursor = 'move'
        let diffX = x - mouse.dx
        // TODO 边界处理
        this.startTimestamp = preStartTimestamp - Math.round(diffX / pxs)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.render()
      } else {
        // 鼠标hover显示时间文本
        let time = this.startTimestamp + x / pxs
        let h = this.option.timeScaleLarge
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.render()
        this.#drawLine(x, 0, x, 5, 1, this.option.timeScaleLineColor)
        this.ctx.fillStyle = this.option.tooltipColor
        let t = dayjs(time).format('YYYY-MM-DD HH:mm:ss')
        let w = this.ctx.measureText(t).width
        this.ctx.fillText(t, x - w / 2, h + 3)
      }
    }

    function onMouseleave() {
      mouse.mx = -1
      mouse.dx = 0
      mouse.dy = 0
      mouse.down = false
      preStartTimestamp = 0
      this.container.style.cursor = 'pointer'
      this.render()
    }

    this.container.addEventListener('mousedown', onMousedown.bind(this))
    this.container.addEventListener('mouseup', onMouseup.bind(this))
    this.container.addEventListener('mousemove', onMousemove.bind(this))
    this.container.addEventListener('mouseleave', onMouseleave.bind(this))
  }

  #drawLine(x1, y1, x2, y2, lineWidth = 1, color = '#fff') {
    this.ctx.beginPath()
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()
  }

  /**
   *
   * @param {'timeChange' | 'click'} event
   * @param callback
   */
  on(event, callback) {
    if(!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if(this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }

  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  emit(event, ...args) {
    const eventListeners = this.events[event]
    if(eventListeners) {
      eventListeners.forEach(callback => {
        callback(...args)
      })
    }
  }

  render() {
    this.setTimeRange(this.option.timeRange)
    this.setTimeSegments(this.option.timeSegments)
    this.setTimescales()
    this.setTimeMiddleLine()
  }

  /**
   * 设置时间范围
   * @param range
   * @return void
   */
  setTimeRange(range) {
    if(!isNaN(range) && (range = +range)) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.totalMillisecond = 60 * 60 * 1000 * range
      this.option.timeRange = range
    }
  }

  /**
   * 时间轴刻度
   */
  setTimescales() {
    this.ctx.beginPath()
    const gridNum = this.option.timescaleCount
    // 一格多少毫秒
    const gridMs = this.option.timeRange / gridNum * (60 * 60 * 1000)
    const gridSpace = this.canvas.width / gridNum
    // 起始偏移距离
    let msOffset = gridMs - (this.startTimestamp % gridMs)
    let pxOffset = (msOffset / gridMs) * gridSpace
    for (let i = 0; i < gridNum; i++) {
      let graduationTime = this.startTimestamp + msOffset + i * gridMs
      let x = pxOffset + i * gridSpace
      let h = this.option.timeScaleMini
      let date = new Date(graduationTime)
      // 0点显示日期
      if(date.getHours() === 0 && date.getMinutes() === 0) {
        h = this.option.timeScaleLarge
        this.ctx.fillStyle = this.option.textColor
        this.ctx.fillText(
          this.formatTime(graduationTime),
          x - 13,
          h + 15
        )
      } else if(date.getHours() % 2 === 0 && date.getMinutes() === 0) {
        // 其余时间根据各自规则显示
        h = this.option.timeScaleSmall
        this.ctx.fillStyle = this.option.textColor
        this.ctx.fillText(
          this.formatTime(graduationTime),
          x - 13,
          this.canvas.height - h - 8
        )
      }
      this.#drawLine(x, this.canvas.height - h, x, this.canvas.height, 1, this.option.timeScaleLineColor)
    }
  }

  /**
   * 设置时间片段
   * @param segments
   * @return {[]}
   */
  setTimeSegments(segments) {
    const timeSegments = []
    if(Array.isArray(segments) && segments.length) {
      const pxs = this.canvas.width / this.totalMillisecond
      segments.forEach(segment => {
        if(segment.beginTime <= this.startTimestamp + this.totalMillisecond) {
          const hasEnd = segment.endTime <= this.startTimestamp + this.totalMillisecond
          this.ctx.beginPath()
          let x = (segment.beginTime - this.startTimestamp) * pxs
          let w = hasEnd ?
            (segment.endTime - segment.beginTime) * pxs :
            // 超出结束时间则渲染到结束点
            (this.startTimestamp + this.totalMillisecond - segment.beginTime) * pxs
          // 避免时间段小于1px绘制不出来
          w = Math.max(1, Math.round(w))
          x = Math.round(x)
          this.ctx.fillStyle = segment.color
          this.ctx.fillRect(x, this.canvas.height - 10, w, 10)
          segment.x = x
          segment.w = w
          timeSegments.push(segment)
        }
      })
      this.option.timeSegments = timeSegments
    }
    return timeSegments
  }

  /**
   * 设置中线样式
   * @param style {width: number, color: string}
   */
  setTimeMiddleLine(style) {
    this.ctx.beginPath()
    const { width, color } = Object.assign({ width: 2, color: 'red' }, style)
    let x = this.canvas.width / 2
    this.#drawLine(x, this.canvas.height, x, this.canvas.height / 2, width, color)
  }

  getMouseOffset(e) {
    const { left, top } = this.container.getBoundingClientRect()
    return {
      x: e.clientX - left,
      y: e.clientY - top
    }
  }

  formatTime(datetime) {
    const time = dayjs(datetime)
    if(!time.hour() && !time.minute() && !time.millisecond()) {
      return time.format('MM-DD')
    } else {
      return time.format('HH:mm')
    }
  }
}