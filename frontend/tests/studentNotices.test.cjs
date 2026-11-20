const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { createPinia, setActivePinia } = require('pinia')
const typescript = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/stores/studentNotices.ts'), 'utf8')
const compiled = typescript.transpileModule(source, {
  compilerOptions: { module: typescript.ModuleKind.CommonJS }
}).outputText

function createStore(api) {
  const storeExports = {}
  const loadModule = name => name === '@/api/student' ? { studentApi: api } : require(name)
  new Function('require', 'exports', compiled)(loadModule, storeExports)
  setActivePinia(createPinia())
  return storeExports.useStudentNoticesStore()
}

test('unread count updates after a notice is read', async () => {
  const store = createStore({
    myNotices: async () => [{ id: 1, read: false }, { id: 2, read: true }],
    readNotice: async () => {}
  })
  await store.load()
  assert.equal(store.unreadCount, 1)
  await store.markRead(1)
  assert.equal(store.unreadCount, 0)
})

test('failed read requests preserve the unread indicator', async () => {
  const store = createStore({
    myNotices: async () => [{ id: 1, read: false }],
    readNotice: async () => { throw new Error('Request failed') }
  })
  await store.load()
  await assert.rejects(store.markRead(1), /Request failed/)
  assert.equal(store.unreadCount, 1)
})

test('a stale refresh cannot restore a notice that was marked read', async () => {
  let finishRefresh
  let requests = 0
  const store = createStore({
    myNotices: () => {
      requests += 1
      if (requests === 1) return Promise.resolve([{ id: 1, read: false }])
      return new Promise(resolve => { finishRefresh = resolve })
    },
    readNotice: async () => {}
  })
  await store.load()
  const refresh = store.load()
  await store.markRead(1)
  finishRefresh([{ id: 1, read: false }])
  await refresh
  assert.equal(store.unreadCount, 0)
})

test('the header and messages page share a pending refresh', async () => {
  let requests = 0
  let resolve
  const store = createStore({
    myNotices: () => {
      requests += 1
      return new Promise(finish => { resolve = finish })
    }
  })
  const first = store.load()
  const second = store.load()
  assert.equal(requests, 1)
  resolve([{ id: 1, read: false }])
  await Promise.all([first, second])
  assert.equal(store.unreadCount, 1)
})

test('reset clears unread state and ignores responses from the old session', async () => {
  const pending = []
  const store = createStore({
    myNotices: () => new Promise(resolve => pending.push(resolve))
  })
  const old = store.load()
  store.reset()
  const current = store.load()
  pending[1]([{ id: 2, read: true }])
  await current
  pending[0]([{ id: 1, read: false }])
  await old
  assert.equal(store.notices[0].id, 2)
  assert.equal(store.unreadCount, 0)
})
