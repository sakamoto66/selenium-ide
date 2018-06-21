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

import PlaybackState from "../../../stores/view/PlaybackState";
import UiState from "../../../stores/view/UiState";
import ProjectStore from "../../../stores/domain/ProjectStore";
import TestCase from "../../../models/TestCase";

describe("Playback State Call Stack", () => {
  afterEach(() => {
    PlaybackState.clearStack();
  });
  it("should have a callstack", () => {
    expect(PlaybackState.callstack.length).toBe(0);
  });
  it("should push a test case to the callstack", () => {
    const test = new TestCase();
    const pushed = new TestCase();
    PlaybackState.currentRunningTest = test;
    PlaybackState.currentPlayingIndex = 5;
    PlaybackState.callTestCase(pushed);
    expect(PlaybackState.callstack[0].position).toBe(5);
    expect(PlaybackState.callstack[0].caller).toBe(test);
    expect(PlaybackState.callstack[0].callee).toBe(pushed);
  });
  it("should unwind a test case from the callstack", () => {
    const test = new TestCase();
    const pushed = new TestCase();
    PlaybackState.currentRunningTest = test;
    PlaybackState.currentPlayingIndex = 5;
    PlaybackState.callTestCase(pushed, 5);
    const { caller, callee, position } = PlaybackState.unwindTestCase();
    expect(callee).toBe(pushed);
    expect(caller).toBe(test);
    expect(position).toBe(5);
  });
  it("should keep the caller-callee structure", () => {
    const test = new TestCase();
    const routine = new TestCase();
    const finalRoutine = new TestCase();
    PlaybackState.currentRunningTest = test;
    PlaybackState.currentPlayingIndex = 5;
    PlaybackState.callTestCase(routine);
    PlaybackState.callTestCase(finalRoutine);

    expect(PlaybackState.callstack[0].position).toBe(5);
    expect(PlaybackState.callstack[0].caller).toBe(test);
    expect(PlaybackState.callstack[0].callee).toBe(routine);

    expect(PlaybackState.callstack[1].position).toBe(-1);
    expect(PlaybackState.callstack[1].caller).toBe(routine);
    expect(PlaybackState.callstack[1].callee).toBe(finalRoutine);
  });
  it("should push a test case to the stack by name", () => {
    UiState.setProject(new ProjectStore());
    const first = UiState._project.createTestCase("first");
    const second = UiState._project.createTestCase("second");
    PlaybackState.currentRunningTest = first;
    PlaybackState.currentPlayingIndex = 1;
    PlaybackState.callTestCase("second");
    expect(PlaybackState.callstack[0].callee).toBe(second);
  });
});
