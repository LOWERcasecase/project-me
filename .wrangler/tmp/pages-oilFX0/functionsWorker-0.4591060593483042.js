var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// api/garmin.js
var JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };
var BASE = "https://personal.connectapi.garmin.com";
var TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";
function allowed(request, env2) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  if (!email) return false;
  if (!env2.ALLOWED_EMAILS) return true;
  return env2.ALLOWED_EMAILS.toLowerCase().split(",").map((s) => s.trim()).includes(email);
}
__name(allowed, "allowed");
var json = /* @__PURE__ */ __name((o, status = 200) => new Response(JSON.stringify(o), { status, headers: JSON_HEADERS }), "json");
function jwtExp(t) {
  try {
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return (p.exp || 0) * 1e3;
  } catch {
    return Date.now() + 20 * 3600 * 1e3;
  }
}
__name(jwtExp, "jwtExp");
async function getToken(env2, force) {
  if (!force && env2.PROJECT_ME) {
    const c = await env2.PROJECT_ME.get("garmin:token", "json");
    if (c && c.exp - Date.now() > 3600 * 1e3) return c.t;
  }
  const r = await fetch(BASE + TOKEN_PATH, { method: "POST", headers: { Accept: "*/*", Authorization: `ApiKey ${env2.GARMIN_API_KEY.trim()}` } });
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "Garmin rejected the API key (expired or deleted?)" : `Garmin token request failed (${r.status})`);
  const t = (await r.text()).trim().replace(/^"|"$/g, "");
  if (env2.PROJECT_ME) await env2.PROJECT_ME.put("garmin:token", JSON.stringify({ t, exp: jwtExp(t) }), { expirationTtl: 86400 });
  return t;
}
__name(getToken, "getToken");
function rows(j) {
  if (Array.isArray(j)) return j;
  if (j && typeof j === "object") {
    for (const v of Object.values(j)) if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
  }
  return [];
}
__name(rows, "rows");
function deepPick(o, keys, depth = 3) {
  if (!o || typeof o !== "object" || depth < 0) return void 0;
  for (const k of keys) if (o[k] != null && typeof o[k] !== "object") return o[k];
  for (const k of keys) if (o[k] && typeof o[k] === "object" && o[k].value != null) return o[k].value;
  for (const v of Object.values(o)) if (v && typeof v === "object" && !Array.isArray(v)) {
    const r = deepPick(v, keys, depth - 1);
    if (r !== void 0) return r;
  }
  return void 0;
}
__name(deepPick, "deepPick");
var dateOf = /* @__PURE__ */ __name((r) => String(deepPick(r, ["calendarDate", "summaryDate", "date", "calendarDateString", "startDate", "startDateLocal"], 2) || "").slice(0, 10), "dateOf");
var num = /* @__PURE__ */ __name((v) => v == null || v === "" || isNaN(Number(v)) ? null : Number(v), "num");
async function onRequestGet({ request, env: env2 }) {
  if (!allowed(request, env2)) return json({ error: "not signed in" }, 401);
  if (!env2.GARMIN_API_KEY) return json({ connected: false });
  const url = new URL(request.url);
  const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return json({ error: "bad range" }, 400);
  if ((Date.parse(to) - Date.parse(from)) / 864e5 > 31) return json({ error: "range too long (max 31 days)" }, 400);
  const cacheKey = `garmin:cache:${from}:${to}`;
  if (env2.PROJECT_ME && !url.searchParams.has("fresh")) {
    const c = await env2.PROJECT_ME.get(cacheKey);
    if (c) return new Response(c, { headers: JSON_HEADERS });
  }
  let token;
  try {
    token = await getToken(env2);
  } catch (e) {
    return json({ connected: true, ok: false, error: e.message });
  }
  const get = /* @__PURE__ */ __name(async (path) => {
    let r = await fetch(BASE + path, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    if (r.status === 401) {
      token = await getToken(env2, true);
      r = await fetch(BASE + path, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }, "get");
  const q = /* @__PURE__ */ __name((o) => new URLSearchParams(o).toString(), "q");
  const sources = {
    activities: `/activitylist-service/activities/search/activities?${q({ start: 0, limit: 100, startDate: from, endDate: to })}`,
    steps: `/usersummary-service/stats/steps/daily/${from}/${to}`,
    stress: `/usersummary-service/stats/stress/daily/${from}/${to}`,
    sleep: `/sleep-service/sleep/dailySleepSummariesByDate?${q({ startDate: from, endDate: to })}`,
    bodyBattery: `/wellness-service/wellness/bodyBattery/reports/daily?${q({ startDate: from, endDate: to })}`,
    hrv: `/hrv-service/hrv/daily/${from}/${to}`,
    weight: `/weight-service/weight/range/${from}/${to}?includeAll=true`,
    summaries: `/usersummary-service/v2/dailysummaries?${q({ startDate: from, endDate: to })}`
  };
  const raw = {}, errors = {};
  await Promise.all(Object.entries(sources).map(async ([k, p]) => {
    try {
      raw[k] = await get(p);
    } catch (e) {
      errors[k] = e.message;
    }
  }));
  const days = {};
  const day = /* @__PURE__ */ __name((d) => days[d] = days[d] || { date: d }, "day");
  const put = /* @__PURE__ */ __name((k, src, fields, tf = (x) => x) => rows(raw[src]).forEach((r) => {
    const d = dateOf(r);
    const v = num(deepPick(r, fields));
    if (d && v != null) day(d)[k] = tf(v);
  }), "put");
  put("steps", "steps", ["totalSteps", "steps"]);
  put("steps", "summaries", ["totalSteps"]);
  put("stress", "stress", ["overallStressLevel", "averageStressLevel", "avgStressLevel", "stressLevel"]);
  put("stress", "summaries", ["averageStressLevel"]);
  put("restingHR", "summaries", ["restingHeartRate", "restingHR"]);
  put("sleepHours", "sleep", ["sleepTimeSeconds", "totalSleepSeconds", "sleepTimeInSeconds"], (v) => Math.round(v / 3600 * 10) / 10);
  put("sleepScore", "sleep", ["overallSleepScore", "sleepScore", "overall"]);
  put("bbHigh", "bodyBattery", ["highest", "bodyBatteryHighestValue", "maxValue", "charged"]);
  put("bbLow", "bodyBattery", ["lowest", "bodyBatteryLowestValue", "minValue"]);
  put("hrv", "hrv", ["lastNightAvg", "lastNight", "hrvValue"]);
  rows(raw.hrv).forEach((r) => {
    const d = dateOf(r);
    const s = deepPick(r, ["status", "hrvStatus"]);
    if (d && s && typeof s === "string") day(d).hrvStatus = s.toLowerCase();
  });
  put("weightKg", "weight", ["weight"], (v) => Math.round((v > 1e3 ? v / 1e3 : v) * 10) / 10);
  const activities = rows(raw.activities).map((a) => {
    const start = String(a.startTimeLocal || a.startTimeGMT || "");
    return {
      id: a.activityId,
      name: a.activityName || "",
      type: a.activityType && a.activityType.typeKey || a.activityTypeDTO && a.activityTypeDTO.typeKey || "",
      start,
      date: start.slice(0, 10),
      durationMin: num(a.duration || a.elapsedDuration || a.movingDuration) != null ? Math.round(num(a.duration || a.elapsedDuration || a.movingDuration) / 60) : null,
      distanceKm: num(a.distance) != null ? Math.round(num(a.distance) / 10) / 100 : null,
      avgHR: num(a.averageHR || a.averageHr),
      calories: num(a.calories)
    };
  }).filter((a) => a.date);
  const shapes = {};
  for (const [k, v] of Object.entries(raw)) {
    const r = rows(v)[0] || v;
    shapes[k] = r && typeof r === "object" ? Object.keys(r).slice(0, 40) : typeof v;
  }
  const body = JSON.stringify({ connected: true, ok: true, from, to, days: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)), activities, errors, shapes, fetchedAt: Date.now() });
  if (env2.PROJECT_ME) await env2.PROJECT_ME.put(cacheKey, body, { expirationTtl: 900 });
  return new Response(body, { headers: JSON_HEADERS });
}
__name(onRequestGet, "onRequestGet");

// api/gcal.js
var JSON_HEADERS2 = { "content-type": "application/json", "cache-control": "no-store" };
function allowed2(request, env2) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  if (!email) return false;
  if (!env2.ALLOWED_EMAILS) return true;
  return env2.ALLOWED_EMAILS.toLowerCase().split(",").map((s) => s.trim()).includes(email);
}
__name(allowed2, "allowed");
function tzOffsetMs(tz, utcMs) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
    const g = /* @__PURE__ */ __name((t) => Number(parts.find((p) => p.type === t).value), "g");
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) - utcMs;
  } catch {
    return 0;
  }
}
__name(tzOffsetMs, "tzOffsetMs");
function zonedToUtc(w, tz) {
  const guess = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
  if (!tz) return guess;
  let utc = guess - tzOffsetMs(tz, guess);
  utc = guess - tzOffsetMs(tz, utc);
  return utc;
}
__name(zonedToUtc, "zonedToUtc");
function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}
__name(unfold, "unfold");
function parseProp(line) {
  const i = line.indexOf(":");
  if (i < 0) return null;
  const left = line.slice(0, i), value = line.slice(i + 1);
  const [name, ...ps] = left.split(";");
  const params = {};
  ps.forEach((p) => {
    const [k, v] = p.split("=");
    params[(k || "").toUpperCase()] = (v || "").replace(/^"|"$/g, "");
  });
  return { name: name.toUpperCase(), params, value };
}
__name(parseProp, "parseProp");
var unesc = /* @__PURE__ */ __name((s) => (s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1"), "unesc");
function parseDT(p, calTz) {
  if (!p) return null;
  const v = p.value.trim();
  if (p.params.VALUE === "DATE" || /^\d{8}$/.test(v)) return { allDay: true, y: +v.slice(0, 4), m: +v.slice(4, 6), d: +v.slice(6, 8), h: 0, mi: 0, s: 0 };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  return { allDay: false, y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], tz: m[7] ? "UTC" : p.params.TZID || calTz || "UTC" };
}
__name(parseDT, "parseDT");
function parseICS(text) {
  const lines = unfold(text).split("\n");
  let calName = "", calTz = "", cur = null, depth = 0;
  const events = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (line === "BEGIN:VEVENT") {
      cur = { props: {}, multi: { EXDATE: [] } };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (/^BEGIN:/.test(line)) {
      if (!cur) depth++;
      continue;
    }
    if (/^END:/.test(line)) {
      if (!cur) depth--;
      continue;
    }
    const p = parseProp(line);
    if (!p) continue;
    if (!cur) {
      if (p.name === "X-WR-CALNAME") calName = unesc(p.value);
      if (p.name === "X-WR-TIMEZONE") calTz = p.value;
      continue;
    }
    if (p.name === "EXDATE") cur.multi.EXDATE.push(p);
    else cur.props[p.name] = p;
  }
  return { calName, calTz, events };
}
__name(parseICS, "parseICS");
var DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
var wallKey = /* @__PURE__ */ __name((w) => `${w.y}-${w.m}-${w.d}T${w.h}:${w.mi}`, "wallKey");
function addDaysW(w, n) {
  const t = new Date(Date.UTC(w.y, w.m - 1, w.d + n));
  return { ...w, y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
__name(addDaysW, "addDaysW");
var dow = /* @__PURE__ */ __name((w) => new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay(), "dow");
var daysIn = /* @__PURE__ */ __name((y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(), "daysIn");
function expand(start, rrule, untilMs, toUtc, maxN = 1500) {
  const r = Object.fromEntries(rrule.split(";").map((x) => x.split("=")));
  const freq = r.FREQ, interval = +(r.INTERVAL || 1), count3 = r.COUNT ? +r.COUNT : Infinity;
  let until = untilMs;
  if (r.UNTIL) {
    const u = parseDT({ value: r.UNTIL, params: {} });
    if (u) until = Math.min(until, u.allDay ? Date.UTC(u.y, u.m - 1, u.d, 23, 59) : zonedToUtc(u, u.tz === "UTC" ? null : u.tz));
  }
  const byday = r.BYDAY ? r.BYDAY.split(",") : null;
  const bymd = r.BYMONTHDAY ? r.BYMONTHDAY.split(",").map(Number) : null;
  const out = [];
  let n = 0;
  const push = /* @__PURE__ */ __name((w) => {
    if (n >= count3) return false;
    const ms = toUtc(w);
    if (ms > until) return false;
    n++;
    out.push(w);
    return out.length < maxN;
  }, "push");
  if (freq === "DAILY") {
    for (let w = start, i = 0; i < 2e4; i++, w = addDaysW(w, interval)) if (!push(w)) break;
  } else if (freq === "WEEKLY") {
    const days = byday ? byday.map((d) => DAYS.indexOf(d.slice(-2))).sort() : [dow(start)];
    let weekStart = addDaysW(start, -dow(start));
    outer: for (let i = 0; i < 5e3; i++, weekStart = addDaysW(weekStart, 7 * interval)) {
      for (const d of days) {
        const w = addDaysW(weekStart, d);
        if (toUtc(w) < toUtc(start)) continue;
        if (!push(w)) break outer;
      }
    }
  } else if (freq === "MONTHLY") {
    let y = start.y, m = start.m;
    outer: for (let i = 0; i < 2e3; i++) {
      const cands = [];
      if (byday) byday.forEach((bd) => {
        const mm = bd.match(/^([+-]?\d+)?(\w\w)$/);
        const wd = DAYS.indexOf(mm[2]);
        const ord = mm[1] ? +mm[1] : 0;
        const all = [];
        for (let d = 1; d <= daysIn(y, m); d++) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === wd) all.push(d);
        (ord ? [ord > 0 ? all[ord - 1] : all[all.length + ord]] : all).forEach((d) => d && cands.push(d));
      });
      else (bymd || [start.d]).forEach((d) => {
        const dd = d < 0 ? daysIn(y, m) + d + 1 : d;
        if (dd <= daysIn(y, m)) cands.push(dd);
      });
      for (const d of cands.sort((a, b) => a - b)) {
        const w = { ...start, y, m, d };
        if (toUtc(w) < toUtc(start)) continue;
        if (!push(w)) break outer;
      }
      m += interval;
      while (m > 12) {
        m -= 12;
        y++;
      }
    }
  } else if (freq === "YEARLY") {
    for (let y = start.y, i = 0; i < 300; i++, y += interval) {
      if (start.m === 2 && start.d === 29 && daysIn(y, 2) < 29) continue;
      if (!push({ ...start, y })) break;
    }
  } else push(start);
  return out;
}
__name(expand, "expand");
async function onRequestGet2({ request, env: env2 }) {
  if (!allowed2(request, env2)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS2 });
  const feeds = (env2.GCAL_FEEDS || "").split(/[\s,]+/).filter((u) => /^https:\/\//.test(u));
  if (!feeds.length) return new Response(JSON.stringify({ connected: false, calendars: [], events: [] }), { headers: JSON_HEADERS2 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  const fromMs = Date.parse(from + "T00:00:00Z") - 2 * 864e5, toMs = Date.parse(to + "T23:59:59Z") + 2 * 864e5;
  if (!fromMs || !toMs || toMs - fromMs > 400 * 864e5) return new Response(JSON.stringify({ error: "bad range" }), { status: 400, headers: JSON_HEADERS2 });
  const calendars = [], events = [], errors = [];
  await Promise.all(feeds.map(async (feed, fi) => {
    try {
      const res = await fetch(feed, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { calName, calTz, events: vevents } = parseICS(await res.text());
      const name = calName || `Google calendar ${fi + 1}`;
      calendars.push({ name, index: fi });
      const overrides = {};
      vevents.filter((e) => e.props["RECURRENCE-ID"]).forEach((e) => {
        const rid = parseDT(e.props["RECURRENCE-ID"], calTz);
        if (rid) overrides[e.props.UID?.value + "|" + wallKey(rid)] = true;
      });
      for (const e of vevents) {
        const P = e.props;
        if ((P.STATUS?.value || "").toUpperCase() === "CANCELLED") continue;
        const st = parseDT(P.DTSTART, calTz);
        if (!st) continue;
        const tz = st.tz === "UTC" ? null : st.tz;
        const toUtc = /* @__PURE__ */ __name((w) => st.allDay ? Date.UTC(w.y, w.m - 1, w.d) : zonedToUtc(w, tz), "toUtc");
        let en = parseDT(P.DTEND, calTz);
        let durMs;
        if (en) durMs = toUtc(en) - toUtc(st);
        else if (P.DURATION) {
          const m = P.DURATION.value.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/) || [];
          durMs = (((+m[1] || 0) * 7 + (+m[2] || 0)) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60) * 1e3;
        } else durMs = st.allDay ? 864e5 : 0;
        const ex = new Set(e.multi.EXDATE.flatMap((p) => p.value.split(",").map((v) => {
          const d = parseDT({ value: v, params: p.params }, calTz);
          return d ? wallKey(d) : "";
        })));
        const isOverride = !!P["RECURRENCE-ID"];
        const occ = P.RRULE && !isOverride ? expand(st, P.RRULE.value, toMs, toUtc) : [st];
        for (const w of occ) {
          if (P.RRULE && !isOverride && (ex.has(wallKey(w)) || overrides[P.UID?.value + "|" + wallKey(w)])) continue;
          const s = toUtc(w), f = s + durMs;
          if (f < fromMs || s > toMs) continue;
          events.push({
            id: `${fi}:${P.UID?.value || ""}:${s}`,
            cal: name,
            title: unesc(P.SUMMARY?.value || "(no title)"),
            allDay: !!st.allDay,
            start: st.allDay ? `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}` : s,
            end: st.allDay ? null : f,
            days: st.allDay ? Math.max(1, Math.round(durMs / 864e5)) : null,
            location: unesc(P.LOCATION?.value || ""),
            notes: unesc(P.DESCRIPTION?.value || "").slice(0, 600)
          });
        }
      }
    } catch (err) {
      errors.push(`Calendar ${fi + 1}: ${err.message}`);
    }
  }));
  calendars.sort((a, b) => a.index - b.index);
  return new Response(JSON.stringify({ connected: true, calendars, events, errors }), { headers: JSON_HEADERS2 });
}
__name(onRequestGet2, "onRequestGet");

// api/state.js
var JSON_HEADERS3 = { "content-type": "application/json", "cache-control": "no-store" };
function allowed3(request, env2) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  if (!email) return false;
  if (!env2.ALLOWED_EMAILS) return true;
  return env2.ALLOWED_EMAILS.toLowerCase().split(",").map((s) => s.trim()).includes(email);
}
__name(allowed3, "allowed");
async function onRequestGet3({ request, env: env2 }) {
  if (!allowed3(request, env2)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS3 });
  if (!env2.PROJECT_ME) return new Response(JSON.stringify({ error: "KV binding PROJECT_ME missing" }), { status: 500, headers: JSON_HEADERS3 });
  const value = await env2.PROJECT_ME.get("state");
  return new Response(value || "{}", { headers: JSON_HEADERS3 });
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPut({ request, env: env2 }) {
  if (!allowed3(request, env2)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS3 });
  if (!env2.PROJECT_ME) return new Response(JSON.stringify({ error: "KV binding PROJECT_ME missing" }), { status: 500, headers: JSON_HEADERS3 });
  const body = await request.text();
  if (body.length > 5e6) return new Response(JSON.stringify({ error: "too large" }), { status: 413, headers: JSON_HEADERS3 });
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: JSON_HEADERS3 });
  }
  if (!parsed || typeof parsed !== "object" || typeof parsed.updatedAt !== "number") {
    return new Response(JSON.stringify({ error: "not a Project Me state" }), { status: 400, headers: JSON_HEADERS3 });
  }
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const backupKey = `backup:${day}`;
  if (!await env2.PROJECT_ME.get(backupKey)) {
    const previous = await env2.PROJECT_ME.get("state");
    if (previous) await env2.PROJECT_ME.put(backupKey, previous, { expirationTtl: 60 * 24 * 3600 });
  }
  await env2.PROJECT_ME.put("state", body);
  return new Response(JSON.stringify({ ok: true, savedAt: Date.now() }), { headers: JSON_HEADERS3 });
}
__name(onRequestPut, "onRequestPut");

// ../.wrangler/tmp/pages-oilFX0/functionsRoutes-0.03990103170857451.mjs
var routes = [
  {
    routePath: "/api/garmin",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/gcal",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/state",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/state",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  }
];

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../home/codespace/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
