/*
 * Copyright 2017 SideeX committers
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import browser from 'webextension-polyfill'
import { calculateFrameIndex } from './utils'
import LocatorBuilders from './locatorBuilders'

let contentSideexTabId = -1
let frameLocation = ''
let recordingIndicator

function Recorder(window) {
  this.window = window
  this.eventListeners = {}
  this.attached = false
  this.recordingState = {}
}

Recorder.eventHandlers = {}
Recorder.mutationObservers = {}
Recorder.addEventHandler = function(handlerName, eventName, handler, options) {
  handler.handlerName = handlerName
  if (!options) options = false
  let key = options ? 'C_' + eventName : eventName
  if (!this.eventHandlers[key]) {
    this.eventHandlers[key] = []
  }
  this.eventHandlers[key].push(handler)
}

Recorder.addMutationObserver = function(observerName, callback, config) {
  const observer = new MutationObserver(callback)
  observer.observerName = observerName
  observer.config = config
  this.mutationObservers[observerName] = observer
}

Recorder.prototype.parseEventKey = function(eventKey) {
  if (eventKey.match(/^C_/)) {
    return { eventName: eventKey.substring(2), capture: true }
  } else {
    return { eventName: eventKey, capture: false }
  }
}

function updateInputElementsOfRelevantType(action) {
  let inp = window.document.getElementsByTagName('input')
  for (let i = 0; i < inp.length; i++) {
    if (Recorder.inputTypes.indexOf(inp[i].type) >= 0) {
      action(inp[i])
    }
  }
}

function focusEvent(recordingState, event) {
  recordingState.focusTarget = event.target
  recordingState.focusValue = recordingState.focusTarget.value
  recordingState.tempValue = recordingState.focusValue
  recordingState.preventType = false
}

function blurEvent(recordingState) {
  recordingState.focusTarget = null
  recordingState.focusValue = null
  recordingState.tempValue = null
}

function attachInputListeners(recordingState) {
  updateInputElementsOfRelevantType(input => {
    input.addEventListener('focus', focusEvent.bind(null, recordingState))
    input.addEventListener('blur', blurEvent.bind(null, recordingState))
  })
}

function detachInputListeners(recordingState) {
  updateInputElementsOfRelevantType(input => {
    input.removeEventListener('focus', focusEvent.bind(null, recordingState))
    input.removeEventListener('blur', blurEvent.bind(null, recordingState))
  })
}

Recorder.prototype.attach = function() {
  if (!this.attached) {
    for (let eventKey in Recorder.eventHandlers) {
      const eventInfo = this.parseEventKey(eventKey)
      const eventName = eventInfo.eventName
      const capture = eventInfo.capture

      const handlers = Recorder.eventHandlers[eventKey]
      this.eventListeners[eventKey] = []
      for (let i = 0; i < handlers.length; i++) {
        let handler = handlers[i].bind(this)
        this.window.document.addEventListener(eventName, handler, capture)
        this.eventListeners[eventKey].push(handler)
      }
    }
    for (let observerName in Recorder.mutationObservers) {
      const observer = Recorder.mutationObservers[observerName]
      observer.observe(this.window.document.body, observer.config)
    }
    this.attached = true
    this.recordingState = {
      typeTarget: undefined,
      typeLock: 0,
      focusTarget: null,
      focusValue: null,
      tempValue: null,
      preventType: false,
      preventClickTwice: false,
      preventClick: false,
      enterTarget: null,
      enterValue: null,
      tabCheck: null,
    }
    attachInputListeners(this.recordingState)
    addRecordingIndicator()
  }
}

Recorder.prototype.detach = function() {
  for (let eventKey in this.eventListeners) {
    const eventInfo = this.parseEventKey(eventKey)
    const eventName = eventInfo.eventName
    const capture = eventInfo.capture
    for (let i = 0; i < this.eventListeners[eventKey].length; i++) {
      this.window.document.removeEventListener(
        eventName,
        this.eventListeners[eventKey][i],
        capture
      )
    }
  }
  for (let observerName in Recorder.mutationObservers) {
    const observer = Recorder.mutationObservers[observerName]
    observer.disconnect()
  }
  this.eventListeners = {}
  this.attached = false
  removeRecordingIndicator()
  detachInputListeners(this.recordingState)
}

function attachRecorderHandler(message, _sender, sendResponse) {
  if (message.attachRecorder) {
    recorder.attach()
    sendResponse(true)
  }
}

function detachRecorderHandler(message, _sender, sendResponse) {
  if (message.detachRecorder) {
    recorder.detach()
    sendResponse(true)
  }
}

const recorder = new Recorder(window)

// recorder event handlers
browser.runtime.onMessage.addListener(attachRecorderHandler)
browser.runtime.onMessage.addListener(detachRecorderHandler)
 
function addRecordingIndicator() {
  if (frameLocation !== 'root' || recordingIndicator) return
  for(let ename in recordingIndicatorHandles) {
    window.document.addEventListener(ename, recordingIndicatorHandles[ename], false)
  }
  const style = `
  #root {
    position: fixed;
    bottom: 36px;
    right: 36px;
    width: 400px;
    height: 250px;
    border: 1px solid #d30100;
    border-radius: 10px;
    background-color: #f7f7f7;
    box-shadow: 0 7px 10px 0 rgba(0,0,0,0.1);
    z-index:1000000000000000;
    transition:bottom 100ms linear;
    font-family: system, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    overflow:hidden;
    padding:5px;
  }
  #root.hidden {
    display: none;
  }

  #root.recorded {
    animation: recorded 1s step-end;
  }
  #root.recorded #content {
    display:none;
  }
  #root.recorded #content2 {
    display:block;
  }
  #root.recorded #circle {
    visibility: hidden;
  }

  @keyframes recorded {
    from {
      border-color:#000000;
    }
    to {
      border-color:#d30100;
    }
  }

  #root.record {
    border-color:black;
  }
  #root > div {
    display: flex;
    padding: 5px;
  }
  
  #circle {
    height: 10px;
    width: 10px;
    background: #E80600;
    border-radius: 50%;
    margin: 0 10px;
    animation: fadeIn 1s infinite alternate;
    visibility: visible;
  }
  
  #content {
    display:block;
    color: #E80600;
    text-align: center;
  }
  #content2 {
    display:none;
    color: #114990;
    text-align: center;
  }
  #targets {
    font-size:0.8rem;
    line-height:1.8em;
    width:100%;
    height:10rem;
  }
  div.notice {
    font-size:1rem;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
  }
  div.message {
    font-size: 1.5rem;
    display: flex;
    align-items:center;
    flex-direction: row;
  }
  #ide-img {
    width: 28px;
  }
  div.line {
    height: 28px;
    border-left: 1px solid #c6c6c6;
  }`
  const body = `
  <div class="message" aria-live="assertive">
      <img id="ide-img" src="${(window.chrome ? chrome : browser).runtime.getURL('/icons/icon_light128.png')}"/>
      <div class="line"></div>
      <div id="circle"></div>
      <span id="content" aria-label="Selenium IDE is recording..." role="alert">Selenium IDE is recording...</span>
      <span id="content2"></span>
  </div>
  <div>
    <textarea id="targets" readonly></textarea>
  </div>
  <div>
    <div class="notice">[shift + mouseover] show locator</div>
  </div>
  `
  recordingIndicator = window.document.createElement('selenium-ide-indicator')
  recordingIndicator.style.position = 'fixed'
  recordingIndicator.style.left = '-1px'
  recordingIndicator.style.top = '-1px'
  recordingIndicator.style.width = '1px'
  recordingIndicator.style.height = '1px'
  window.document.body.appendChild(recordingIndicator)

  //
  const shadow = recordingIndicator.attachShadow({mode: 'open'});
  const styletag = document.createElement('style');
  styletag.innerHTML = style
  const bodytag = document.createElement('div');
  bodytag.id = 'root'
  bodytag.innerHTML = body
  shadow.appendChild(styletag);
  shadow.appendChild(bodytag);

  setTimeout( () => {recordingIndicator.rect = bodytag.getBoundingClientRect()},0)
}

function removeRecordingIndicator() {
  if (frameLocation !== 'root' || !recordingIndicator) return
  for(let ename in recordingIndicatorHandles) {
    window.document.removeEventListener(ename, recordingIndicatorHandles[ename], false)
  }
  recordingIndicator.parentElement.removeChild(recordingIndicator)
  recordingIndicator = undefined
}

function onMessageForRecordingIndicator(message, sender, sendResponse) {
  if (!recordingIndicator || !message.recordNotification) return
  showRecordingIndicator(recordingIndicator.shadowRoot, message)
  sendResponse(true)
}
browser.runtime.onMessage.addListener(onMessageForRecordingIndicator)

function showRecordingIndicator(doc, message) {
  const root = doc.getElementById('root')
  const content = doc.getElementById('content2')
  const targets = doc.getElementById('targets')
  if(message.command) {
    clearTimeout(showRecordingIndicator.timer);
    content.innerText = 'Recorded ' + message.command
    root.className = "recorded"
    showRecordingIndicator.timer = setTimeout(function(){root.className = ""},1000)
  }
  targets.value = message.target.map( t => t[0]).join("\n")
}
showRecordingIndicator.timer = null;

let recordingIndicatorLastShiftKeyTime = 0
const recordingIndicatorHandles = {}
recordingIndicatorHandles['mouseover'] = function(event) {
  if(!recordingIndicator || !event.shiftKey)return
  recordingIndicatorLastShiftKeyTime = (new Date()).getTime()
  let p = event.target
  while(p){
    if(p===recordingIndicator) return
    p = p.parentElement
  }
  showRecordingIndicator(recordingIndicator.shadowRoot, {
    target: locatorBuilders.buildAll(event.target),
  })
}

recordingIndicatorHandles['mousemove'] = function(event) {
  if(!recordingIndicator)return
  const r = recordingIndicator.rect
  const x = event.clientX, y = event.clientY
  const root = recordingIndicator.shadowRoot.getElementById("root")
  const delaytime = recordingIndicatorLastShiftKeyTime > (new Date()).getTime() - 5000
  const intoarea = r.left <= x && x <= r.right && r.top <= y && y <= r.bottom
  root.className = (delaytime || !intoarea) ? '' : 'hidden'
}

function getFrameCount() {
  return browser.runtime.sendMessage({
    requestFrameCount: true,
  })
}

// set frame id
async function getFrameLocation() {
  let currentWindow = window
  let currentParentWindow
  let recordingIndicatorIndex
  let frameCount

  while (currentWindow !== window.top) {
    currentParentWindow = currentWindow.parent
    if (!currentParentWindow.frames.length) {
      break
    }

    if (currentParentWindow === window.top) {
      frameCount = await getFrameCount().catch(() => {})
      if (frameCount) recordingIndicatorIndex = frameCount.indicatorIndex
    }

    for (let idx = 0; idx < currentParentWindow.frames.length; idx++) {
      const frame = currentParentWindow.frames[idx]

      if (frame === currentWindow) {
        frameLocation =
          ':' +
          calculateFrameIndex({
            indicatorIndex: recordingIndicatorIndex,
            targetFrameIndex: idx,
          }) +
          frameLocation
        currentWindow = currentParentWindow
        break
      }
    }
  }
  frameLocation = 'root' + frameLocation
  await browser.runtime
    .sendMessage({ frameLocation: frameLocation })
    .catch(() => {})
}

function recalculateFrameLocation(message, _sender, sendResponse) {
  if (message.recalculateFrameLocation) {
    ;(async () => {
      frameLocation = ''
      await getFrameLocation()
      sendResponse(true)
    })()
    return true
  }
}

browser.runtime.onMessage.addListener(recalculateFrameLocation)

// runs in the content script of each frame
// e.g., once on load
;(async () => {
  await getFrameLocation()
})()

window.recorder = recorder
window.contentSideexTabId = contentSideexTabId
window.Recorder = Recorder

/* record */
export function record(
  command,
  target,
  value,
  insertBeforeLastCommand,
  actualFrameLocation
) {
  if(target.find( t => 'css=selenium-ide-indicator'== t[0])) return
  browser.runtime
    .sendMessage({
      command: command,
      target: target,
      value: value,
      insertBeforeLastCommand: insertBeforeLastCommand,
      frameLocation:
        actualFrameLocation != undefined ? actualFrameLocation : frameLocation,
      commandSideexTabId: contentSideexTabId,
    })
    .catch(() => {
      recorder.detach()
    })
}

window.record = record

export { Recorder, recorder }
