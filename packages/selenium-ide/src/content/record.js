/* eslint no-unused-vars: off, no-useless-escape: off */
// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import browser from 'webextension-polyfill'
import goog, { bot } from './closure-polyfill'
import { Recorder, recorder, record } from './record-api'
import { attach } from './prompt-recorder'
import LocatorBuilders from './locatorBuilders'
import { isTest, isFirefox } from '../common/utils'

export { record }
export const locatorBuilders = new LocatorBuilders(window)

attach(record)

Recorder.inputTypes = [
  'text',
  'password',
  'file',
  'datetime',
  'datetime-local',
  'date',
  'month',
  'time',
  'week',
  'number',
  'range',
  'email',
  'url',
  'search',
  'tel',
  'color',
]
Recorder.addEventHandler('type', 'change', function(event) {
  // © Chen-Chieh Ping, SideeX Team
  if (
    event.target.tagName &&
    !this.recordingState.preventType &&
    this.recordingState.typeLock == 0 &&
    (this.recordingState.typeLock = 1)
  ) {
    // END
    let tagName = event.target.tagName.toLowerCase()
    let type = event.target.type
    if ('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
      if (event.target.value.length > 0) {
        record(
          'type',
          locatorBuilders.buildAll(event.target),
          event.target.value
        )

        // © Chen-Chieh Ping, SideeX Team
        if (this.recordingState.enterTarget != null) {
          let tempTarget = event.target.parentElement
          let formChk = tempTarget.tagName.toLowerCase()
          while (formChk != 'form' && formChk != 'body') {
            tempTarget = tempTarget.parentElement
            formChk = tempTarget.tagName.toLowerCase()
          }

          record(
            'sendKeys',
            locatorBuilders.buildAll(this.recordingState.enterTarget),
            '${KEY_ENTER}'
          )
          this.recordingState.enterTarget = null
        }
        // END
      } else {
        record(
          'type',
          locatorBuilders.buildAll(event.target),
          event.target.value
        )
      }
    } else if ('textarea' == tagName) {
      record('type', locatorBuilders.buildAll(event.target), event.target.value)
    }
  }
  this.recordingState.typeLock = 0
})

Recorder.addEventHandler('type', 'input', function(event) {
  this.recordingState.typeTarget = event.target
})

function eventIsTrusted(event) {
  return isTest ? true : event.isTrusted
}

// © Jie-Lin You, SideeX Team
Recorder.addEventHandler(
  'clickAt',
  'click',
  function(event) {
    if (
      event.button == 0 &&
      !this.recordingState.preventClick &&
      eventIsTrusted(event)
    ) {
      this.recordingState.preventClickTwice = false
      setTimeout(() => {
        if(this.recordingState.preventClickTwice) {
          return;
        }
        if(event.altKey) {
          const rect = event.target.getBoundingClientRect()
          const xy = [event.clientX-rect.x, event.clientY-rect.y]
          record('clickAt', locatorBuilders.buildAll(event.target), xy.join(','))
        } else {
          record('click', locatorBuilders.buildAll(event.target), '')
        }
      }, 200)
    }
  },
  true
)
// END

// © Chen-Chieh Ping, SideeX Team
Recorder.addEventHandler(
  'doubleClickAt',
  'dblclick',
  function(event) {
    this.recordingState.preventClickTwice = true
    if(event.altKey) {
      const rect = event.target.getBoundingClientRect()
      const xy = [event.clientX-rect.x, event.clientY-rect.y]
      record('doubleClickAt', locatorBuilders.buildAll(event.target), xy.join(','))
    } else {
      record('doubleClick', locatorBuilders.buildAll(event.target), '')
    }
  },
  true
)
// END

Recorder.addEventHandler(
  'sendKeys',
  'keydown',
  function(event) {
    if (event.target.tagName) {
      let key = event.keyCode
      let tagName = event.target.tagName.toLowerCase()
      let type = event.target.type
      if (tagName == 'input' && Recorder.inputTypes.indexOf(type) >= 0) {
        if (key == 13) {
          this.recordingState.enterTarget = event.target
          this.recordingState.enterValue = this.recordingState.enterTarget.value
          let tempTarget = event.target.parentElement
          let formChk = tempTarget.tagName.toLowerCase()
          if (
            this.recordingState.tempValue ==
              this.recordingState.enterTarget.value &&
            this.recordingState.tabCheck == this.recordingState.enterTarget
          ) {
            record(
              'sendKeys',
              locatorBuilders.buildAll(this.recordingState.enterTarget),
              '${KEY_ENTER}'
            )
            this.recordingState.enterTarget = null
            this.recordingState.preventType = true
          } else if (
            this.recordingState.focusValue == this.recordingState.enterValue
          ) {
            while (formChk != 'form' && formChk != 'body') {
              tempTarget = tempTarget.parentElement
              formChk = tempTarget.tagName.toLowerCase()
            }
            record(
              'sendKeys',
              locatorBuilders.buildAll(this.recordingState.enterTarget),
              '${KEY_ENTER}'
            )
            this.recordingState.enterTarget = null
          }
          if (
            this.recordingState.typeTarget &&
            this.recordingState.typeTarget.tagName &&
            !this.recordingState.preventType &&
            (this.recordingState.typeLock = 1)
          ) {
            // END
            tagName = this.recordingState.typeTarget.tagName.toLowerCase()
            type = this.recordingState.typeTarget.type
            if ('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
              if (this.recordingState.typeTarget.value.length > 0) {
                record(
                  'type',
                  locatorBuilders.buildAll(this.recordingState.typeTarget),
                  this.recordingState.typeTarget.value
                )

                // © Chen-Chieh Ping, SideeX Team
                if (this.recordingState.enterTarget != null) {
                  tempTarget = this.recordingState.typeTarget.parentElement
                  formChk = tempTarget.tagName.toLowerCase()
                  while (formChk != 'form' && formChk != 'body') {
                    tempTarget = tempTarget.parentElement
                    formChk = tempTarget.tagName.toLowerCase()
                  }
                  record(
                    'sendKeys',
                    locatorBuilders.buildAll(this.recordingState.enterTarget),
                    '${KEY_ENTER}'
                  )
                  this.recordingState.enterTarget = null
                }
                // END
              } else {
                record(
                  'type',
                  locatorBuilders.buildAll(this.recordingState.typeTarget),
                  this.recordingState.typeTarget.value
                )
              }
            } else if ('textarea' == tagName) {
              record(
                'type',
                locatorBuilders.buildAll(this.recordingState.typeTarget),
                this.recordingState.typeTarget.value
              )
            }
          }
          skipClick.call(this)
          setTimeout(() => {
            if (this.recordingState.enterValue != event.target.value)
              this.recordingState.enterTarget = null
          }, 50)
        }

        let tempbool = false
        if ((key == 38 || key == 40) && event.target.value != '') {
          if (
            this.recordingState.focusTarget != null &&
            this.recordingState.focusTarget.value !=
              this.recordingState.tempValue
          ) {
            tempbool = true
            this.recordingState.tempValue = this.recordingState.focusTarget.value
          }
          if (tempbool) {
            record(
              'type',
              locatorBuilders.buildAll(event.target),
              this.recordingState.tempValue
            )
          }

          setTimeout(() => {
            this.recordingState.tempValue = this.recordingState.focusTarget.value
          }, 250)

          if (key == 38)
            record(
              'sendKeys',
              locatorBuilders.buildAll(event.target),
              '${KEY_UP}'
            )
          else
            record(
              'sendKeys',
              locatorBuilders.buildAll(event.target),
              '${KEY_DOWN}'
            )
          this.recordingState.tabCheck = event.target
        }
        if (key == 9) {
          if (this.recordingState.tabCheck == event.target) {
            record(
              'sendKeys',
              locatorBuilders.buildAll(event.target),
              '${KEY_TAB}'
            )
            this.recordingState.preventType = true
          }
        }
      }
    }
  },
  true
)
// END

let mouseoverQ = [], mousedownLastTime = 0

const resetMouseoverQ = function() {
  mouseoverQ = []
}
const addMouseoverQ = function(event) {
  const curr = (new Date()).getTime()
  const rect = event.target.getBoundingClientRect()
  const xy = [event.clientX-rect.x, event.clientY-rect.y]
  if(0==mouseoverQ.length) {
    if('mousedown' != event.type) {
      return
    }
  } else {
    const last = mouseoverQ[mouseoverQ.length-1];
    const dx = Math.abs(last[2][0] - xy[0])
    const dy = Math.abs(last[2][1] - xy[1])
    if(last[0].type == event.type && last[0].target === event.target) {
      if(dx < 5 && dy < 5) {
        return
      }
      if(curr < last[1]+50) {
        return
      }
    }
  }
  mouseoverQ.push([event, curr, xy])
}

function skipClick(){
  this.recordingState.preventClick = true
  setTimeout(() => {
    this.recordingState.preventClick = false
  }, 500)
}

function getSelectionText() {
  let text = ''
  let activeEl = window.document.activeElement
  let activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null
  if (activeElTagName == 'textarea' || activeElTagName == 'input') {
    text = activeEl.value.slice(
      activeEl.selectionStart,
      activeEl.selectionEnd
    )
  } else if (window.getSelection) {
    text = window.getSelection().toString()
  }
  return text.trim()
}

Recorder.addEventHandler(
  'mouseMove','mousemove', function(event) {
    addMouseoverQ(event)
  }
)

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDrop',
  'mousedown',
  function(event) {
    resetMouseoverQ()
    addMouseoverQ(event)

    if (event.target.nodeName) {
      let tagName = event.target.nodeName.toLowerCase()
      if ('option' == tagName) {
        let parent = event.target.parentNode
        if (parent.multiple) {
          let options = parent.options
          for (let i = 0; i < options.length; i++) {
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDrop',
  'mouseup',
  function(event) {
    addMouseoverQ(event)
    if(1<mouseoverQ.length) {
      const first = mouseoverQ[0]
      const last = mouseoverQ[mouseoverQ.length-1]
      const time = last[1] - first[1]
      if(200 < time) {
        skipClick.call(this)
        if (last[0].button === 0 && getSelectionText() === '') {
          if(event.altKey) {
            mouseoverQ.filter(q => -1<['mousedown','mouseup','mousemove'].indexOf(q[0].type)).forEach(q => {
              const cmd = `mouse${q[0].type.charAt(5).toUpperCase()}${q[0].type.substring(6)}At`
              record(cmd, locatorBuilders.buildAll(q[0].target), q[2].join(','))
            })
          } else if(first[0].target !== last[0].target) {
            mouseoverQ.filter(q => q[0].type != 'mousemove').forEach(q => {
              const cmd = `mouse${q[0].type.charAt(5).toUpperCase()}${q[0].type.substring(6)}`
              record(cmd, locatorBuilders.buildAll(q[0].target), '')
            })
          }
        }
      }
    }
    resetMouseoverQ()
  },
  true
)
// END

let dropLocator, dragstartLocator
// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDropToObject',
  'dragstart',
  function(event) {
    dropLocator = setTimeout(() => {
      dragstartLocator = event
    }, 200)
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'dragAndDropToObject',
  'drop',
  function(event) {
    clearTimeout(dropLocator)
    if (
      dragstartLocator &&
      event.button == 0 &&
      dragstartLocator.target !== event.target
    ) {
      //value no option
      record(
        'dragAndDropToObject',
        locatorBuilders.buildAll(dragstartLocator.target),
        locatorBuilders.build(event.target)
      )
    }
    dragstartLocator = undefined
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
let prevTimeOut = null,
  scrollDetector
Recorder.addEventHandler(
  'runScript',
  'scroll',
  function(event) {
    if (pageLoaded === true) {
      scrollDetector = event.target
      clearTimeout(prevTimeOut)
      prevTimeOut = setTimeout(() => {
        scrollDetector = undefined
      }, 500)
    }
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
let nowNode = 0,
  mouseoverLocator,
  nodeInsertedLocator,
  nodeInsertedAttrChange
Recorder.addEventHandler(
  'mouseOver',
  'mouseover',
  function(event) {
    if (window.document.documentElement)
      nowNode = window.document.documentElement.getElementsByTagName('*').length
    if (pageLoaded === true) {
      let clickable = findClickableElement(event.target)
      if (clickable) {
        nodeInsertedLocator = event.target
        nodeInsertedAttrChange = locatorBuilders.buildAll(event.target)
        setTimeout(() => {
          nodeInsertedLocator = undefined
          nodeInsertedAttrChange = undefined
        }, 500)
      }
      addMouseoverQ(event)
    }
  },
  true
)
// END

let mouseoutLocator = undefined
// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  'mouseOut',
  'mouseout',
  function(event) {
    addMouseoverQ(event)
    if (mouseoutLocator !== null && event.target === mouseoutLocator) {
      record('mouseOut', locatorBuilders.buildAll(event.target), '')
    }
    mouseoutLocator = undefined
  },
  true
)
// END

Recorder.addMutationObserver(
  'FrameDeleted',
  function(mutations) {
    mutations.forEach(async mutation => {
      const removedNodes = await mutation.removedNodes
      if (
        removedNodes.length &&
        removedNodes[0].nodeName === 'IFRAME' &&
        removedNodes[0].id !== 'selenium-ide-indicator'
      ) {
        browser.runtime.sendMessage({ frameRemoved: true }).catch(() => {})
      }
    })
  },
  { childList: true }
)

Recorder.addMutationObserver(
  'DOMNodeInserted',
  function(mutations) {
    if (
      pageLoaded === true &&
      window.document.documentElement.getElementsByTagName('*').length > nowNode
    ) {
      // Get list of inserted nodes from the mutations list to simulate 'DOMNodeInserted'.
      const insertedNodes = mutations.reduce((nodes, mutation) => {
        if (mutation.type === 'childList') {
          nodes.push.apply(nodes, mutation.addedNodes)
        }
        return nodes
      }, [])
      // If no nodes inserted, just bail.
      if (!insertedNodes.length) {
        return
      }

      if (scrollDetector) {
        //TODO: fix target
        record('runScript', [['window.scrollTo(0,' + window.scrollY + ')']], '')
        pageLoaded = false
        setTimeout(() => {
          pageLoaded = true
        }, 550)
        scrollDetector = undefined
        nodeInsertedLocator = undefined
      }
      if (nodeInsertedLocator) {
        record('mouseOver', nodeInsertedAttrChange, '')
        mouseoutLocator = nodeInsertedLocator
        nodeInsertedLocator = undefined
        nodeInsertedAttrChange = undefined
        mouseoverLocator = undefined
      }
    }
  },
  { childList: true, subtree: true }
)

// © Shuo-Heng Shih, SideeX Team
let readyTimeOut = null
let pageLoaded = true
Recorder.addEventHandler(
  'checkPageLoaded',
  'readystatechange',
  function(event) {
    if (window.document.readyState === 'loading') {
      pageLoaded = false
    } else {
      pageLoaded = false
      clearTimeout(readyTimeOut)
      readyTimeOut = setTimeout(() => {
        pageLoaded = true
      }, 1500) //setReady after complete 1.5s
    }
  },
  true
)
// END

// © Ming-Hung Hsu, SideeX Team
Recorder.addEventHandler(
  'contextMenu',
  'contextmenu',
  function(event) {
    let myPort = browser.runtime.connect()
    myPort.onMessage.addListener(function(m) {
      const tmpTarget = locatorBuilders.buildAll(event.target, m.cmd)
      if (m.cmd.includes('Text') || m.cmd.includes('Label')) {
        let tmpText = bot.dom.getVisibleText(event.target)
        record(m.cmd, tmpTarget, tmpText)
      } else if (m.cmd.includes('Title')) {
        let tmpTitle = goog.string.normalizeSpaces(
          event.target.ownerDocument.title
        )
        record(m.cmd, [[tmpTitle]], '')
      } else if (
        m.cmd.includes('Present') ||
        m.cmd.includes('Checked') ||
        m.cmd.includes('Editable') ||
        m.cmd.includes('Selected') ||
        m.cmd.includes('Visible') ||
        m.cmd === 'mouseOver'
      ) {
        record(m.cmd, tmpTarget, '')
      } else if (m.cmd.includes('Value')) {
        let tmpValue = event.target.value
        record(m.cmd, tmpTarget, tmpValue)
      }
      myPort.onMessage.removeListener(this)
    })
  },
  true
)
// END

// © Yun-Wen Lin, SideeX Team
let getEle
let checkFocus = 0
let contentTest
Recorder.addEventHandler(
  'editContent',
  'focus',
  function(event) {
    let editable = event.target.contentEditable
    if (editable == 'true') {
      getEle = event.target
      contentTest = getEle.innerHTML
      checkFocus = 1
    }
  },
  true
)
// END

// © Yun-Wen Lin, SideeX Team
Recorder.addEventHandler(
  'editContent',
  'blur',
  function(event) {
    if (checkFocus == 1) {
      if (event.target == getEle) {
        if (getEle.innerHTML != contentTest) {
          record(
            'editContent',
            locatorBuilders.buildAll(event.target),
            getEle.innerHTML
          )
        }
        checkFocus = 0
      }
    }
  },
  true
)
// END

browser.runtime
  .sendMessage({
    attachRecorderRequest: true,
  })
  .catch(function(reason) {
    // Failed silently if receiveing end does not exist
  })

// Copyright 2005 Shinya Kasatani
Recorder.prototype.getOptionLocator = function(option) {
  let label = option.text.replace(/^ *(.*?) *$/, '$1')
  if (label.match(/\xA0/)) {
    // if the text contains &nbsp;
    return (
      'label=regexp:' +
      label
        .replace(/[\(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function(str) {
          // eslint-disable-line no-useless-escape
          return '\\' + str
        })
        .replace(/\s+/g, function(str) {
          if (str.match(/\xA0/)) {
            if (str.length > 1) {
              return '\\s+'
            } else {
              return '\\s'
            }
          } else {
            return str
          }
        })
    )
  } else {
    return 'label=' + label
  }
}

function findClickableElement(e) {
  if (!e.tagName) return null
  let tagName = e.tagName.toLowerCase()
  let type = e.type
  if (
    e.hasAttribute('onclick') ||
    e.hasAttribute('href') ||
    tagName == 'button' ||
    (tagName == 'input' &&
      (type == 'submit' ||
        type == 'button' ||
        type == 'image' ||
        type == 'radio' ||
        type == 'checkbox' ||
        type == 'reset'))
  ) {
    return e
  } else {
    if (e.parentNode != null) {
      return findClickableElement(e.parentNode)
    } else {
      return null
    }
  }
}

//select / addSelect / removeSelect
Recorder.addEventHandler(
  'select',
  'focus',
  function(event) {
    if (event.target.nodeName) {
      let tagName = event.target.nodeName.toLowerCase()
      if ('select' == tagName && event.target.multiple) {
        let options = event.target.options
        for (let i = 0; i < options.length; i++) {
          if (options[i]._wasSelected == null) {
            // is the focus was gained by mousedown event, _wasSelected would be already set
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  },
  true
)

Recorder.addEventHandler('select', 'change', function(event) {
  if (event.target.tagName) {
    let tagName = event.target.tagName.toLowerCase()
    if ('select' == tagName) {
      if (!event.target.multiple) {
        let option = event.target.options[event.target.selectedIndex]
        record(
          'select',
          locatorBuilders.buildAll(event.target),
          getOptionLocator(option)
        )
      } else {
        let options = event.target.options
        for (let i = 0; i < options.length; i++) {
          if (options[i]._wasSelected != options[i].selected) {
            let value = getOptionLocator(options[i])
            if (options[i].selected) {
              record(
                'addSelection',
                locatorBuilders.buildAll(event.target),
                value
              )
            } else {
              record(
                'removeSelection',
                locatorBuilders.buildAll(event.target),
                value
              )
            }
            skipClick.call(this)
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  }
})

function getOptionLocator(option) {
  let label = option.text.replace(/^ *(.*?) *$/, '$1')
  if (label.match(/\xA0/)) {
    // if the text contains &nbsp;
    return (
      'label=regexp:' +
      label
        .replace(/[(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function(str) {
          // eslint-disable-line no-useless-escape
          return '\\' + str
        })
        .replace(/\s+/g, function(str) {
          if (str.match(/\xA0/)) {
            if (str.length > 1) {
              return '\\s+'
            } else {
              return '\\s'
            }
          } else {
            return str
          }
        })
    )
  } else {
    return 'label=' + label
  }
}

browser.runtime
  .sendMessage({
    attachRecorderRequest: true,
  })
  .then(shouldAttach => {
    if (shouldAttach) {
      recorder.attach()
    }
  })
  .catch(() => {})
